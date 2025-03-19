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

  update(id: number, updateCustomerDto: UpdateCustomerDto) {
    return `This action updates a #${id} ${updateCustomerDto} customer`;
  }

  remove(id: number) {
    return `This action removes a #${id} customer`;
  }
}
