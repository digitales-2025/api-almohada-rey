import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/modules/admin/audit/audit.service';
import {
  CustomerData,
  HttpResponse,
  UserData,
  UserPayload,
} from 'src/interfaces';
import { handleException } from 'src/utils';
import { AuditActionType } from '@prisma/client';
import {
  createDynamicUpdateObject,
  hasNoChanges,
} from 'src/utils/update-validations.util';
import { DeleteCustomerDto } from './dto/delete-customer.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Validar la longitud del RUC
   * @param ruc RUC a validar
   */
  private validateLengthRuc(ruc: string): void {
    if (ruc.length !== 11) {
      throw new BadRequestException('The length of the RUC is incorrect');
    }
  }

  /**
   * Buscar un cliente por su número de documento
   * @param documentNumber Número de documento del cliente
   * @param id Id del cliente
   * @returns Cliente encontrado
   */
  async findBYDocumentNumber(
    documentNumber: string,
    id?: string,
  ): Promise<CustomerData> {
    const customerDB = await this.prisma.customer.findUnique({
      where: { documentNumber },
      select: {
        id: true,
        name: true,
        address: true,
        birthPlace: true,
        country: true,
        documentNumber: true,
        documentType: true,
        email: true,
        maritalStatus: true,
        occupation: true,
        phone: true,
        ruc: true,
        companyAddress: true,
        companyName: true,
        department: true,
        province: true,
        isActive: true,
      },
    });

    if (!!customerDB && customerDB.id !== id) {
      if (!customerDB.isActive) {
        throw new BadRequestException(
          'This document number is already in use but the customer is inactive',
        );
      }
      if (customerDB) {
        throw new BadRequestException('This document number is already in use');
      }
    }

    return customerDB;
  }

  /**
   * Buscar un cliente por su email
   * @param email Email del cliente
   * @param id Id del cliente
   */
  async findByEmail(email: string, id?: string) {
    const customerDB = await this.prisma.customer.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });
    if (!!customerDB && customerDB.id !== id) {
      if (!!customerDB && !customerDB.isActive) {
        throw new BadRequestException(
          'This email is already in use but the customer is inactive',
        );
      }
      if (customerDB) {
        throw new BadRequestException('This email is already in use');
      }
    }
  }

  /**
   * Buscar un cliente por su RUC
   * @param ruc RUC del cliente
   * @param id Id del cliente
   */
  async findByRuc(ruc: string, id?: string) {
    await this.validateLengthRuc(ruc);
    const customerDB = await this.prisma.customer.findUnique({
      where: { ruc },
      select: {
        id: true,
        ruc: true,
        isActive: true,
      },
    });

    if (!!customerDB && customerDB.id !== id) {
      if (!customerDB.isActive) {
        throw new BadRequestException(
          'This RUC is already in use but the customer is inactive',
        );
      }
      if (customerDB) {
        throw new BadRequestException('This RUC is already in use');
      }
    }
  }

  /**
   * Crear un nuevo cliente
   * @param createCustomerDto Datos del cliente a crear
   * @param user Usuario que realiza la acción
   * @returns Cliente creado
   */
  async create(
    createCustomerDto: CreateCustomerDto,
    user: UserData,
  ): Promise<HttpResponse<CustomerData>> {
    const {
      name,
      address,
      birthPlace,
      country,
      documentNumber,
      documentType,
      email,
      maritalStatus,
      occupation,
      phone,
      companyAddress,
      companyName,
      department,
      province,
      ruc,
    } = createCustomerDto;
    let newCustomer;

    try {
      // Crear el cliente y registrar la auditoría
      await this.findBYDocumentNumber(documentNumber);
      await this.findByEmail(email);
      if (ruc) await this.findByRuc(ruc);

      newCustomer = await this.prisma.$transaction(async () => {
        // Crear el nuevo cliente
        const customer = await this.prisma.customer.create({
          data: {
            name,
            address,
            birthPlace,
            country,
            documentNumber,
            documentType,
            email,
            maritalStatus,
            occupation,
            phone,
            ...(ruc && { ruc, companyAddress, companyName }),
            ...(department && { department }),
            ...(province && { province }),
          },
          select: {
            id: true,
            name: true,
            address: true,
            birthPlace: true,
            country: true,
            documentNumber: true,
            documentType: true,
            email: true,
            maritalStatus: true,
            occupation: true,
            phone: true,
            ruc: true,
            companyAddress: true,
            companyName: true,
            department: true,
            province: true,
            isActive: true,
          },
        });

        // Registrar la auditoría de la creación del cliente
        await this.audit.create({
          entityId: newCustomer.id,
          entityType: 'customer',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return customer;
      });

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Customer created successfully',
        data: {
          id: newCustomer.id,
          name: newCustomer.name,
          address: newCustomer.address,
          birthPlace: newCustomer.birthPlace,
          country: newCustomer.country,
          ...(newCustomer.ruc && {
            ruc: newCustomer.ruc,
            companyAddress: newCustomer.companyAddress,
            companyName: newCustomer.companyName,
          }),
          documentNumber: newCustomer.documentNumber,
          documentType: newCustomer.documentType,
          email: newCustomer.email,
          maritalStatus: newCustomer.maritalStatus,
          occupation: newCustomer.occupation,
          phone: newCustomer.phone,
          ...(newCustomer.department && { department: newCustomer.department }),
          ...(newCustomer.province && { province: newCustomer.province }),
          isActive: newCustomer.isActive,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error creating customer: ${error.message}`,
        error.stack,
      );

      if (newCustomer) {
        await this.prisma.customer.delete({ where: { id: newCustomer.id } });
        this.logger.error(
          `Customer has been deleted due to error in creation.`,
        );
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error creating a customer');
    }
  }

  /**
   * Listar todos los clientes
   * @param user Usuario que realiza la acción
   * @returns Lista de clientes
   */
  async findAll(user: UserPayload): Promise<CustomerData[]> {
    try {
      const customers = await this.prisma.customer.findMany({
        where: {
          ...(user.isSuperAdmin ? {} : { isActive: true }), // Filtrar por isActive solo si no es super admin
        },
        select: {
          id: true,
          name: true,
          address: true,
          birthPlace: true,
          country: true,
          documentNumber: true,
          documentType: true,
          email: true,
          maritalStatus: true,
          occupation: true,
          phone: true,
          ruc: true,
          companyAddress: true,
          companyName: true,
          department: true,
          province: true,
          isActive: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Mapea los resultados al tipo ClientData
      return customers.map((customer) => ({
        id: customer.id,
        name: customer.name,
        address: customer.address,
        birthPlace: customer.birthPlace,
        country: customer.country,
        ...(customer.ruc && {
          ruc: customer.ruc,
          companyAddress: customer.companyAddress,
          companyName: customer.companyName,
        }),
        documentNumber: customer.documentNumber,
        documentType: customer.documentType,
        email: customer.email,
        maritalStatus: customer.maritalStatus,
        occupation: customer.occupation,
        phone: customer.phone,
        ...(customer.department && { department: customer.department }),
        ...(customer.province && { province: customer.province }),
        isActive: customer.isActive,
      })) as CustomerData[];
    } catch (error) {
      this.logger.error('Error getting all customers');
      handleException(error, 'Error getting all customers');
    }
  }

  /**
   * Buscar un cliente por su id
   * @param id Id del cliente
   * @returns Datos del cliente
   */
  async findOne(id: string): Promise<CustomerData> {
    try {
      return await this.findById(id);
    } catch (error) {
      this.logger.error('Error get customer');
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error get customer');
    }
  }

  /**
   * Buscar un cliente por su id y validar si existe
   * @param id Id del cliente
   * @returns Datos del cliente
   */
  async findById(id: string): Promise<CustomerData> {
    const customerDb = await this.prisma.customer.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        address: true,
        birthPlace: true,
        country: true,
        documentNumber: true,
        documentType: true,
        email: true,
        maritalStatus: true,
        occupation: true,
        phone: true,
        ruc: true,
        companyAddress: true,
        companyName: true,
        department: true,
        province: true,
        isActive: true,
      },
    });
    if (!customerDb) {
      throw new BadRequestException('This customer doesnt exist');
    }

    if (!!customerDb && !customerDb.isActive) {
      throw new BadRequestException('This customer exist, but is inactive');
    }

    return customerDb;
  }

  /**
   * Actualizar un cliente
   * @param id Id del cliente
   * @param updateCustomerDto Datos del cliente a actualizar
   * @param user Usuario que realiza la acción
   * @returns Cliente actualizado
   */
  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    user: UserData,
  ): Promise<HttpResponse<CustomerData>> {
    const { documentNumber, email, ruc } = updateCustomerDto;

    try {
      const customerDB = await this.findById(id);

      if (ruc) await this.findByRuc(ruc, id);
      if (email) await this.findByEmail(email, id);
      if (documentNumber) await this.findBYDocumentNumber(documentNumber, id);

      // Validar si hay cambios
      if (hasNoChanges(updateCustomerDto, customerDB)) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Customer updated successfully',
          data: {
            ...customerDB,
            ...(customerDB.ruc && {
              ruc: customerDB.ruc,
              companyAddress: customerDB.companyAddress,
              companyName: customerDB.companyName,
            }),
            ...(customerDB.department && { department: customerDB.department }),
            ...(customerDB.province && { province: customerDB.province }),
          },
        };
      }

      // Construir el objeto de actualización dinámicamente solo con los campos presentes
      const updateData = createDynamicUpdateObject(
        updateCustomerDto,
        customerDB,
      );

      // Transacción para realizar la actualización
      const updatedCustomer = await this.prisma.$transaction(async (prisma) => {
        const customer = await prisma.customer.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            name: true,
            address: true,
            birthPlace: true,
            country: true,
            documentNumber: true,
            documentType: true,
            email: true,
            maritalStatus: true,
            occupation: true,
            phone: true,
            ruc: true,
            companyAddress: true,
            companyName: true,
            department: true,
            province: true,
            isActive: true,
          },
        });
        // Crear un registro de auditoría
        await this.audit.create({
          entityId: customer.id,
          entityType: 'customer',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return customer;
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Customer updated successfully',
        data: {
          ...updatedCustomer,
          ...(updatedCustomer.ruc && {
            ruc: updatedCustomer.ruc,
            companyAddress: updatedCustomer.companyAddress,
            companyName: updatedCustomer.companyName,
          }),
          ...(updatedCustomer.department && {
            department: updatedCustomer.department,
          }),
          ...(updatedCustomer.province && {
            province: updatedCustomer.province,
          }),
        },
      };
    } catch (error) {
      this.logger.error(
        `Error updating customer: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error updating a customer');
    }
  }

  /**
   * Reactivar todos los clientes inactivos
   * @param user Usuario que realiza la acción
   * @param customers Lista de clientes a reactivar
   * @returns Respuesta de la acción
   */
  async reactivateAll(
    user: UserData,
    customers: DeleteCustomerDto,
  ): Promise<Omit<HttpResponse, 'data'>> {
    try {
      await this.prisma.$transaction(async (prisma) => {
        // Buscar los clientes en la base de datos
        const customersDB = await prisma.customer.findMany({
          where: {
            id: { in: customers.ids },
          },
          select: {
            id: true,
            isActive: true,
          },
        });

        // Validar que se encontraron los clientes
        if (customersDB.length === 0) {
          throw new NotFoundException('Customers not found');
        }

        // Filtrar solo los clientes inactivos
        const inactiveCustomers = customersDB.filter(
          (customer) => !customer.isActive,
        );

        // Si no hay clientes inactivos, simplemente retornamos sin hacer cambios
        if (inactiveCustomers.length === 0) {
          return [];
        }

        // Reactivar solo los clientes inactivos
        const reactivatePromises = inactiveCustomers.map(async (customer) => {
          // Activar el cliente
          await prisma.customer.update({
            where: { id: customer.id },
            data: { isActive: true },
          });

          await this.audit.create({
            entityId: customer.id,
            entityType: 'customer',
            action: AuditActionType.REACTIVATE,
            performedById: user.id,
            createdAt: new Date(),
          });

          return {
            id: customer.id,
            isActive: true,
          };
        });

        return Promise.all(reactivatePromises);
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Customers reactivated successfully',
      };
    } catch (error) {
      this.logger.error('Error reactivating customers', error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      handleException(error, 'Error reactivating customers');
    }
  }

  /**
   * Desactivar clientes
   * @param customers Lista de clientes a desactivar
   * @param user Usuario que realiza la acción
   * @returns Respuesta de la acción
   */
  async removeAll(
    customers: DeleteCustomerDto,
    user: UserData,
  ): Promise<Omit<HttpResponse, 'data'>> {
    try {
      await this.prisma.$transaction(async (prisma) => {
        // Buscar los clientes en la base de datos
        const customersDB = await prisma.customer.findMany({
          where: {
            id: { in: customers.ids },
          },
          select: {
            id: true,
            isActive: true,
          },
        });

        // Validar que se encontraron los clientes
        if (customersDB.length === 0) {
          throw new NotFoundException('Customers not found');
        }

        // Filtrar solo los clientes activos
        const activeCustomers = customersDB.filter(
          (customer) => customer.isActive,
        );

        // Si no hay clientes activos, simplemente retornamos sin hacer cambios
        if (activeCustomers.length === 0) {
          return [];
        }

        // Desactivar solo los clientes activos
        const deactivatePromises = activeCustomers.map(async (customer) => {
          // Desactivar cliente
          await prisma.customer.update({
            where: { id: customer.id },
            data: { isActive: false },
          });

          await this.audit.create({
            entityId: customer.id,
            entityType: 'customer',
            action: AuditActionType.DELETE,
            performedById: user.id,
            createdAt: new Date(),
          });

          return {
            id: customer.id,
            isActive: false,
          };
        });

        return Promise.all(deactivatePromises);
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Customers deactivated successfully',
      };
    } catch (error) {
      this.logger.error('Error deactivating customers', error.stack);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      handleException(error, 'Error deactivating customers');
    }
  }
}
