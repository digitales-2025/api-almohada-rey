import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { UpdatePasswordDto } from './auth/dto/update-password.dto';
import { HttpResponse, UserData } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { BetterAuthAdapter } from './auth/better-auth.adapter';

@Injectable()
export class AdminService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly betterAuthAdapter: BetterAuthAdapter,
  ) {}

  /**
   * Obtiene los datos del usuario logueado
   * @param user Usuario logueado
   * @returns Data del usuario logueado
   */
  getProfile(user: UserData): UserData {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isSuperAdmin: user.isSuperAdmin,
      userRol: user.userRol,
    };
  }
  /**
   * Actualizar la contraseña del usuario usando Better Auth
   * @param updatePassword Datos para actualizar la contraseña
   * @param user Usuario que realiza la actualización
   * @returns Datos de la actualización
   */
  async updatePassword(
    updatePassword: UpdatePasswordDto,
    user: UserData,
  ): Promise<HttpResponse<string>> {
    const { email } = user;
    const { password, newPassword, confirmPassword } = updatePassword;

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    // Validar que la nueva contraseña sea diferente a la actual
    if (newPassword === password) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la actual',
      );
    }

    // Verificar que el usuario existe y está activo
    const userDB = await this.prismaService.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    });

    if (!userDB || !userDB.isActive) {
      throw new BadRequestException('Usuario no encontrado o inactivo');
    }

    try {
      // Verificar la contraseña actual usando Better Auth
      const isValidPassword = await this.betterAuthAdapter.verifyPassword(
        email,
        password,
      );

      if (!isValidPassword) {
        throw new BadRequestException('La contraseña actual es incorrecta');
      }

      // Obtener el hash de la nueva contraseña usando Better Auth
      const hashedNewPassword =
        await this.betterAuthAdapter.hashPassword(newPassword);

      // Actualizar la contraseña en la tabla Account usando Better Auth
      const normalizedEmail = email.toLowerCase();

      // Buscar la cuenta existente
      const existingAccount = await this.prismaService.account.findFirst({
        where: {
          userId: userDB.id,
          providerId: { in: ['email', 'credential'] },
        },
      });

      if (existingAccount) {
        // Actualizar contraseña en la cuenta existente
        await this.prismaService.account.update({
          where: { id: existingAccount.id },
          data: { password: hashedNewPassword },
        });
      } else {
        // Crear nueva cuenta si no existe
        await this.prismaService.account.create({
          data: {
            userId: userDB.id,
            providerId: 'email',
            accountId: normalizedEmail,
            password: hashedNewPassword,
          },
        });
      }

      return {
        statusCode: HttpStatus.OK,
        message: 'Contraseña actualizada exitosamente',
        data: userDB.email,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Error al actualizar la contraseña');
    }
  }
}
