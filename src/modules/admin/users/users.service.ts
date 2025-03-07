import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dto';
import { SendEmailDto } from './dto/send-email.dto';
import { UpdatePasswordDto } from '../auth/dto/update-password.dto';
import { generate } from 'generate-password';
import { AuditService } from '../audit/audit.service';
import { AuditActionType, UserRolType } from '@prisma/client';
import { DeleteUsersDto } from './dto/delete-users.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { TypedEventEmitter } from 'src/event-emitter/typed-event-emitter.class';
import { HttpResponse, UserData, UserPayload } from 'src/interfaces';
import { handleException } from 'src/utils';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: TypedEventEmitter,
    private readonly audit: AuditService,
  ) {}

  /**
   * Crear un usuario en la base de datos
   * @param createUserDto Data del usuario a crear
   * @param user Usuario que crea el usuario
   * @returns Objetos con los datos del usuario creado
   */
  async create(
    createUserDto: CreateUserDto,
    user: UserData,
  ): Promise<HttpResponse<Omit<UserData, 'claims'>>> {
    try {
      const newUser = await this.prisma.$transaction(async (prisma) => {
        const { userRol, email, password, ...dataUser } = createUserDto;

        // Verificar que el rol exista y este activo
        if (!userRol) {
          throw new BadRequestException('Rol is required');
        }

        // Verificamos si el email ya existe y este activo
        const existEmail = await this.checkEmailExist(email);

        if (existEmail) {
          throw new BadRequestException('Email already exists');
        }

        // Verificamos si el email ya existe y esta inactivo
        const inactiveEmail = await this.checkEmailInactive(email);

        if (inactiveEmail) {
          throw new BadRequestException({
            statusCode: HttpStatus.CONFLICT,
            message:
              'Email already exists but inactive, contact the administrator to reactivate the account',
            data: {
              id: (await this.findByEmailInactive(email)).id,
            },
          });
        }

        // Encriptamos la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Creamos el usuario
        const newUser = await prisma.user.create({
          data: {
            email,
            ...dataUser,
            password: hashedPassword,
            mustChangePassword: false,
            userRol: userRol,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isSuperAdmin: true,
            userRol: true,
          },
        });

        // Enviamos el usuario al correo con la contraseña temporal
        //const emailResponse = await this.eventEmitter.emitAsync(
        //  'user.welcome-admin-first',
        //  {
        //    name: newUser.name.toUpperCase(),
        //    email,
        //    password,
        //    webAdmin: process.env.WEB_URL,
        //  },
        //);
        //
        //if (emailResponse.every((response) => response !== true)) {
        //  throw new BadRequestException('Failed to send email');
        //}

        await this.audit.create({
          entityId: newUser.id,
          entityType: 'user',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return {
          ...newUser,
        };
      });

      return {
        statusCode: HttpStatus.CREATED,
        message: 'User created',
        data: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          isSuperAdmin: newUser.isSuperAdmin,
          userRol: newUser.userRol,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error creating a user for email: ${createUserDto.email}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error creating a user');
    }
  }

  /**
   * Actualizar un usuario en la base de datos
   * @param updateUserDto Data del usuario a actualizar
   * @param id Id del usuario a actualizar
   * @param user Usuario que actualiza el usuario
   * @returns Data del usuario actualizado
   */
  async update(
    updateUserDto: UpdateUserDto,
    id: string,
    user: UserData,
  ): Promise<HttpResponse<Omit<UserData, 'claims'>>> {
    try {
      const userUpdate = await this.prisma.$transaction(async (prisma) => {
        // Verificar que el usuario exista
        const userDB = await prisma.user.findUnique({
          where: { id },
        });
        if (!userDB) {
          throw new NotFoundException('User not found or inactive');
        }

        // Actualizar los datos del usuario
        const updateUser = await prisma.user.update({
          where: { id },
          data: updateUserDto,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isSuperAdmin: true,
            userRol: true,
          },
        });

        await this.audit.create({
          entityId: id,
          entityType: 'user',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return updateUser;
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'User updated successfully',
        data: {
          id: userUpdate.id,
          name: userUpdate.name,
          email: userUpdate.email,
          phone: userUpdate.phone,
          isSuperAdmin: userUpdate.isSuperAdmin,
          userRol: userUpdate.userRol,
        },
      };
    } catch (error) {
      this.logger.error(`Error updating a user for id: ${id}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      handleException(error, 'Error updating a user');
    }
  }

  /**
   * Eliminar un usuario en la base de datos
   * @param id Id del usuario a eliminar
   * @param user Usuario que elimina el usuario
   * @returns  Datos del usuario eliminado
   */
  async remove(
    id: string,
    user: UserData,
  ): Promise<HttpResponse<Omit<UserData, 'claims'>>> {
    try {
      const userRemove = await this.prisma.$transaction(async (prisma) => {
        // Verificar que el usuario exista
        const userDB = await this.findById(id);
        if (!userDB) {
          throw new NotFoundException('User not found or inactive');
        }

        // No permitir que el usuario se elimine a sí mismo
        if (userDB.id === user.id) {
          throw new BadRequestException('You cannot delete yourself');
        }

        // Verificar si el usuario tiene algún rol de superadmin activo

        if (userDB.userRol == UserRolType.ADMIN) {
          throw new BadRequestException('You cannot delete an admin user');
        }

        // Marcar el usuario como inactivo
        await prisma.user.update({
          where: { id },
          data: {
            isActive: false,
          },
        });

        await this.audit.create({
          entityId: id,
          entityType: 'user',
          action: AuditActionType.DELETE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return {
          id: userDB.id,
          name: userDB.name,
          email: userDB.email,
          phone: userDB.phone,
          isSuperAdmin: userDB.isSuperAdmin,
          userRol: userDB.userRol,
        };
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'User deleted',
        data: userRemove,
      };
    } catch (error) {
      this.logger.error(`Error deleting a user for id: ${id}`, error.stack);
      handleException(error, 'Error deleting a user');
    }
  }

  /**
   * Desactivar todos los usuarios de un arreglo de usuarios
   * @param users Arreglo de usuarios a desactivar
   * @param user Usuario que desactiva los usuarios
   * @returns Retorna un mensaje de la desactivación correcta
   */
  async deactivate(
    users: DeleteUsersDto,
    user: UserData,
  ): Promise<Omit<HttpResponse, 'data'>> {
    try {
      await this.prisma.$transaction(async (prisma) => {
        // Buscar los usuarios en la base de datos
        const usersDB = await prisma.user.findMany({
          where: {
            id: { in: users.ids },
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            userRol: true,
          },
        });

        // Validar que se encontraron usuarios
        if (usersDB.length === 0) {
          throw new NotFoundException('Users not found or inactive');
        }

        // Validar si todos los usuarios ya están inactivos
        const activeUsers = usersDB.filter((u) => u.isActive === true);
        if (activeUsers.length === 0) {
          throw new BadRequestException(
            'All selected users are already inactive',
          );
        }

        // Filtrar solo usuarios activos para procesar
        const usersToProcess = usersDB.filter((u) => u.isActive === true);

        // Validar que ningún usuario sea el mismo que realiza la desactivación
        if (usersToProcess.some((u) => u.id === user.id)) {
          throw new BadRequestException('You cannot deactivate yourself');
        }

        // Validar si hay usuarios con rol ADMIN
        const adminUsers = usersToProcess.filter(
          (u) => u.userRol === UserRolType.ADMIN,
        );
        if (adminUsers.length > 0) {
          adminUsers.map((u) => u.email).join(', ');
          throw new BadRequestException(`Cannot deactivate admin users`);
        }

        // Desactivar usuarios y eliminar roles
        const deactivatePromises = usersToProcess.map(async (userDelete) => {
          //Validar que este usuario no haya hecho una accion en el sistema
          const userAction = await prisma.audit.findFirst({
            where: {
              performedById: userDelete.id,
            },
          });
          if (userAction) {
            // Desactivar usuario
            await prisma.user.update({
              where: { id: userDelete.id },
              data: { isActive: false },
            });
          } else {
            // Eliminar usuario
            await prisma.user.delete({
              where: { id: userDelete.id },
            });
          }

          // Auditoría
          await this.audit.create({
            entityId: user.id,
            entityType: 'user',
            action: AuditActionType.DELETE,
            performedById: user.id,
            createdAt: new Date(),
          });

          return {
            id: userDelete.id,
            name: userDelete.name,
            email: userDelete.email,
            phone: userDelete.phone,
            userRol: userDelete.userRol,
          };
        });

        return Promise.all(deactivatePromises);
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Users deactivated successfully',
      };
    } catch (error) {
      this.logger.error('Error deactivating users', error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      handleException(error, 'Error deactivating users');
    }
  }

  /**
   * Reactivar un usuario en la base de datos
   * @param id Id del usuario a reactivar
   * @param user Usuario que reactiva el usuario
   * @returns Retorna un objeto con los datos del usuario reactivado
   */
  async reactivate(
    id: string,
    user: UserData,
  ): Promise<HttpResponse<Omit<UserData, 'claims'>>> {
    try {
      const userReactivate = await this.prisma.$transaction(async (prisma) => {
        const userDB = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isSuperAdmin: true,
            isActive: true,
            userRol: true,
          },
        });

        if (!userDB) {
          throw new NotFoundException('User not found');
        }

        if (userDB.isActive) {
          throw new BadRequestException('User is already active');
        }

        await prisma.user.update({
          where: { id },
          data: {
            isActive: true,
          },
        });

        // Crear un registro de auditoria
        await this.audit.create({
          entityId: id,
          entityType: 'user',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return {
          id: userDB.id,
          name: userDB.name,
          email: userDB.email,
          phone: userDB.phone,
          isSuperAdmin: userDB.isSuperAdmin,
          userRol: userDB.userRol,
        };
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'User reactivated successfully',
        data: userReactivate,
      };
    } catch (error) {
      this.logger.error(`Error reactivating a user for id: ${id}`, error.stack);
      handleException(error, 'Error reactivating a user');
    }
  }

  /**
   * Reactivar varios usuarios seleccionadors en la base de datos
   * @param user Usuario que hara la reactivación
   * @param users Arreglo de los usuarios a reactivar
   * @return Retorna un mensaje de la reactivacion exitosa
   */
  async reactivateAll(
    user: UserData,
    users: DeleteUsersDto,
  ): Promise<Omit<HttpResponse, 'data'>> {
    try {
      await this.prisma.$transaction(async (prisma) => {
        // Buscar los usuarios en la base de datos
        const usersDB = await prisma.user.findMany({
          where: {
            id: { in: users.ids },
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            userRol: true,
          },
        });

        // Validar que se encontraron usuarios
        if (usersDB.length === 0) {
          throw new NotFoundException('Users not found');
        }

        // Validar si todos los usuarios ya están activos
        const inactiveUsers = usersDB.filter((u) => u.isActive === false);
        if (inactiveUsers.length === 0) {
          throw new BadRequestException(
            'All selected users are already active',
          );
        }

        // Filtrar solo usuarios inactivos para procesar
        const usersToProcess = usersDB.filter((u) => u.isActive === false);

        // Validar que ningún usuario sea el mismo que realiza la reactivación
        if (usersToProcess.some((u) => u.id === user.id)) {
          throw new BadRequestException('You cannot reactivate yourself');
        }

        // Reactivar usuarios
        const reactivatePromises = usersToProcess.map(
          async (userReactivate) => {
            // Reactivar usuario
            await prisma.user.update({
              where: { id: userReactivate.id },
              data: { isActive: true },
            });

            // Auditoría
            await this.audit.create({
              entityId: userReactivate.id,
              entityType: 'user',
              action: AuditActionType.UPDATE,
              performedById: user.id,
              createdAt: new Date(),
            });

            return {
              id: userReactivate.id,
              name: userReactivate.name,
              email: userReactivate.email,
              phone: userReactivate.phone,
              userRol: userReactivate.userRol,
            };
          },
        );

        return Promise.all(reactivatePromises);
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Users reactivated successfully',
      };
    } catch (error) {
      this.logger.error('Error reactivating users', error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      handleException(error, 'Error reactivating users');
    }
  }

  /**
   * Buscar todos los usuarios activos en la base de datos
   * @param user Usuario que busca los usuarios
   * @returns Retorna un array con los datos de los usuarios
   */
  async findAll(
    user: UserPayload,
  ): Promise<Array<Omit<UserPayload, 'claims'>>> {
    let usersDB: any[] = [];

    // Si es ADMIN puede ver todos los usuarios (activos e inactivos)
    if (user.userRol === UserRolType.ADMIN) {
      usersDB = await this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          lastLogin: true,
          isActive: true,
          isSuperAdmin: true,
          mustChangePassword: true,
          userRol: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } else {
      // Si no es ADMIN solo ve usuarios activos
      usersDB = await this.prisma.user.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          lastLogin: true,
          isActive: true,
          isSuperAdmin: true,
          mustChangePassword: true,
          userRol: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return usersDB.map((user) => {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        lastLogin: user.lastLogin,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        mustChangePassword: user.mustChangePassword,
        userRol: user.userRol,
      };
    });
  }

  /**
   * Buscar un usuario por su id
   * @param id Id del usuario
   * @returns Retorna un objeto con los datos del usuario
   */
  async findOne(id: string): Promise<Omit<UserData, 'claims'>> {
    const userDB = await this.findById(id);

    return {
      id: userDB.id,
      name: userDB.name,
      email: userDB.email,
      phone: userDB.phone,
      isSuperAdmin: userDB.isSuperAdmin,
      userRol: userDB.userRol,
    };
  }

  /**
   * Genera una contraseña aleatoria
   * @returns Contraseña aleatoria
   */
  generatePassword(): { password: string } {
    const password = generate({
      length: 10,
      numbers: true,
    });

    return {
      password,
    };
  }

  /**
   * Enviar un email al usuario con la contraseña temporal
   * @param sendEmailDto Data para enviar el email
   * @param user Usuario que envia el email
   * @returns Estado del envio del email
   */
  async sendNewPassword(
    sendEmailDto: SendEmailDto,
    user: UserData,
  ): Promise<HttpResponse<string>> {
    try {
      const { email, password } = sendEmailDto;

      const userDB = await this.findByEmail(email);
      // Encriptamos la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      const send = await this.prisma.$transaction(async (prisma) => {
        // Verificamos que el email ya existe y este activo
        const existEmail = await this.checkEmailExist(email);

        if (!existEmail) {
          throw new BadRequestException('Email not found');
        }

        // Verificamos si el email ya existe y esta inactivo
        const inactiveEmail = await this.checkEmailInactive(email);

        if (inactiveEmail) {
          throw new BadRequestException(
            'Email already exists but inactive, contact the administrator to reactivate the account',
          );
        }

        // Verificamos que no actualice su propia contraseña
        if (userDB.id === user.id) {
          throw new BadRequestException('You cannot update your own password');
        }

        await prisma.user.update({
          where: { id: userDB.id },
          data: {
            password: hashedPassword,
          },
        });
        const emailResponse = await this.eventEmitter.emitAsync(
          'user.new-password',
          {
            name: userDB.name.toUpperCase(),
            email,
            password,
            webAdmin: process.env.WEB_URL,
          },
        );

        if (emailResponse.every((response) => response === true)) {
          return {
            statusCode: HttpStatus.OK,
            message: `Email sent successfully`,
            data: sendEmailDto.email,
          };
        } else {
          throw new BadRequestException('Failed to send email');
        }
      });
      return send;
    } catch (error) {
      this.logger.error(
        `Error sending email to: ${sendEmailDto.email}`,
        error.stack,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error sending email');
    }
  }

  /**
   * Buscar un usuario por su email
   * @param email Email del usuario
   * @returns Retorna un objeto con los datos del usuario
   */
  async findByEmail(email: string): Promise<
    Omit<UserData, 'claims'> & {
      password: string;
      mustChangePassword: boolean;
      isSuperAdmin: boolean;
    }
  > {
    const clientDB = await this.prisma.user.findUnique({
      where: {
        email_isActive: {
          email,
          isActive: true,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        password: true,
        isSuperAdmin: true,
        mustChangePassword: true,
        userRol: true,
      },
    });

    if (!clientDB) {
      throw new NotFoundException('User not found');
    }

    return {
      id: clientDB.id,
      name: clientDB.name,
      email: clientDB.email,
      phone: clientDB.phone,
      password: clientDB.password,
      isSuperAdmin: clientDB.isSuperAdmin,
      mustChangePassword: clientDB.mustChangePassword,
      userRol: clientDB.userRol,
    };
  }

  /**
   * Verifica si el email ya existe en la base de datos
   * @param email Email del usuario
   * @return Retorna si el email ya existe o no
   */
  async checkEmailExist(email: string): Promise<boolean> {
    const clientDB = await this.prisma.user.findUnique({
      where: {
        email_isActive: {
          email,
          isActive: true,
        },
      },
    });

    return !!clientDB;
  }

  /**
   * Verifica si el email esta inactivo en la base de datos
   * @param email Email del usuario
   * @returns Retorna si el email esta inactivo o no
   */
  async checkEmailInactive(email: string): Promise<boolean> {
    const clientDB = await this.prisma.user.findUnique({
      where: {
        email_isActive: {
          email,
          isActive: false,
        },
      },
    });

    return !!clientDB;
  }

  /**
   * Busca un usuario inactivo por su email
   * @param email Email del usuario a buscar
   * @returns Datos del usuario encontrado
   */
  async findByEmailInactive(email: string): Promise<Omit<UserData, 'claims'>> {
    const clientDB = await this.prisma.user.findUnique({
      where: {
        email_isActive: {
          email,
          isActive: false,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isSuperAdmin: true,
        userRol: true,
      },
    });

    if (!clientDB) {
      throw new NotFoundException('User not found');
    }

    return {
      id: clientDB.id,
      name: clientDB.name,
      email: clientDB.email,
      phone: clientDB.phone,
      isSuperAdmin: clientDB.isSuperAdmin,
      userRol: clientDB.userRol,
    };
  }

  /**
   * Busca un usuario por su id y retorna un objeto con los datos del usuario
   * @param id Es el id del usuario
   * @returns  Retorna un objeto con los datos del usuario
   */
  async findById(id: string): Promise<UserPayload> {
    try {
      const userDB = await this.prisma.user.findUnique({
        where: { id, isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isSuperAdmin: true,
          lastLogin: true,
          isActive: true,
          mustChangePassword: true,
          userRol: true,
        },
      });

      if (!userDB) {
        throw new NotFoundException('User not found');
      }
      return {
        id: userDB.id,
        name: userDB.name,
        email: userDB.email,
        phone: userDB.phone,
        isSuperAdmin: userDB.isSuperAdmin,
        isActive: userDB.isActive,
        lastLogin: userDB.lastLogin,
        mustChangePassword: userDB.mustChangePassword,
        userRol: userDB.userRol,
      };
    } catch (error) {
      this.logger.error(`Error finding user for id: ${id}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      handleException(error, 'Error finding user');
    }
  }

  /**
   * Actualiza la fecha de ultimo login del usuario
   * @param id Id del usuario a actualizar la fecha de ultimo login
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLogin: new Date(),
      },
    });
  }

  /**
   * Actualiza la contraseña temporal del usuario
   * @param userId Id del usuario a actualizar la contraseña
   * @param updatePasswordDto Datos para actualizar la contraseña
   */
  async updatePasswordTemp(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<boolean> {
    try {
      const hashingPassword = bcrypt.hashSync(
        updatePasswordDto.newPassword,
        10,
      );

      const userUpdate = await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: hashingPassword,
          mustChangePassword: false,
        },
      });

      return !!userUpdate;
    } catch (error) {
      this.logger.error(
        `Error updating password for user: ${userId}`,
        error.stack,
      );
      handleException(error, 'Error updating password');
    }
  }
}
