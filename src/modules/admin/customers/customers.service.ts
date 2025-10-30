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
import { HttpService } from '@nestjs/axios';
import {
  AuditActionType,
  CustomerDocumentType,
  CustomerMaritalStatus,
  ReservationStatus,
} from '@prisma/client';
import {
  createDynamicUpdateObject,
  hasNoChanges,
} from 'src/utils/update-validations.util';
import { DeleteCustomerDto } from './dto/delete-customer.dto';
import { Customer } from './entity/customer.entity';
import { CustomerRepository } from './repository/customer.repository';
import { BaseErrorHandler } from 'src/utils/error-handlers/service-error.handler';
import {
  HistoryCustomerData,
  ResponseApiCustomer,
} from 'src/interfaces/customer.interface';
import * as excelJs from 'exceljs';
import { PaginationService } from 'src/pagination/pagination.service';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';
import { lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import * as cheerio from 'cheerio';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);
  private readonly errorHandler: BaseErrorHandler;
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly audit: AuditService,
    private readonly customerRepository: CustomerRepository,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * Buscar un cliente por su número de documento
   * @param documentNumber Número de documento del cliente
   * @param id Id del cliente
   * @returns Cliente encontrado
   */
  async findByDocumentNumber(
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
        isBlacklist: true,
        blacklistReason: true,
        blacklistDate: true,
        blacklistedById: true,
        createdByLandingPage: true,
        mustCompleteData: true,
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
      birthDate,
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
      await this.findByDocumentNumber(documentNumber);

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
            maritalStatus,
            occupation,
            phone,
            ...(email && { email }),
            ...(birthDate && { birthDate }),
            ...(ruc && { ruc, companyAddress, companyName }),
            ...(department && { department }),
            ...(province && { province }),
          },
          select: {
            id: true,
            name: true,
            address: true,
            birthPlace: true,
            birthDate: true,
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
            isBlacklist: true,
            blacklistReason: true,
            blacklistDate: true,
            blacklistedById: true,
            createdByLandingPage: true,
            mustCompleteData: true,
          },
        });

        // Registrar la auditoría de la creación del cliente
        await this.audit.create({
          entityId: customer.id,
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
          ...(newCustomer.email && { email: newCustomer.email }),
          ...(newCustomer.birthDate && { birthDate: newCustomer.birthDate }),
          maritalStatus: newCustomer.maritalStatus,
          occupation: newCustomer.occupation,
          phone: newCustomer.phone,
          ...(newCustomer.department && { department: newCustomer.department }),
          ...(newCustomer.province && { province: newCustomer.province }),
          isActive: newCustomer.isActive,
          isBlacklist: newCustomer.isBlacklist,
          ...(newCustomer.blacklistReason && {
            blacklistReason: newCustomer.blacklistReason,
          }),
          ...(newCustomer.blacklistDate && {
            blacklistDate: newCustomer.blacklistDate,
          }),
          ...(newCustomer.blacklistedById && {
            blacklistedById: newCustomer.blacklistedById,
          }),
          createdByLandingPage: newCustomer.createdByLandingPage,
          mustCompleteData: newCustomer.mustCompleteData,
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
   * Consultar datos de un cliente por su DNI usando la API de Perú
   * @param dni Número de DNI a consultar
   * @returns Datos del cliente obtenidos desde la API de Perú
   */
  async getDataByDni(dni: string): Promise<ResponseApiCustomer> {
    // 1) Consultar en caché primero
    const cachedData = await this.prisma.apiPeruCache.findUnique({
      where: { dni },
    });
    if (cachedData) {
      this.logger.log(`DNI ${dni} encontrado en caché local`);
      return { name: cachedData.name, dni: cachedData.dni };
    }

    // 2) Intentar scraping (eldni.com) si no hay caché
    try {
      const scraped = await this.scrapDniFromEldni(dni);
      if (scraped?.name) {
        const capitalizedName = this.capitalizeWithAccents(scraped.name);
        await this.prisma.apiPeruCache.upsert({
          where: { dni: scraped.dni },
          create: { dni: scraped.dni, name: capitalizedName },
          update: { name: capitalizedName },
        });
        this.logger.log(`DNI ${dni} obtenido por scraping y cacheado`);
        return { name: capitalizedName, dni: scraped.dni };
      }
    } catch (error) {
      this.logger.warn(
        `Scraping DNI falló, se usará API Peru: ${error.message}`,
      );
    }

    // Si no está en caché, consultar la API de Perú
    const token = this.configService.get<string>('API_PERU_TOKEN');
    const baseUrl = this.configService.get<string>('API_PERU_BASE_URL');

    if (!token) {
      throw new Error('API Peru token is not configured');
    }

    const url = `${baseUrl}/api/dni`;

    try {
      const response$ = this.httpService.post(
        url,
        { dni },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const response = await lastValueFrom(response$);
      const data = response.data?.data;

      if (!data || !data.nombre_completo) {
        throw new Error('DNI no encontrado o inválido.');
      }

      // Usar el nombre completo que viene de la API
      const fullName = data.nombre_completo;

      // Convertir a formato capitalizado (primera letra de cada palabra en mayúscula)
      const capitalizedName = this.capitalizeWithAccents(fullName);

      // Guardar en la base de datos para futuras consultas
      await this.prisma.apiPeruCache.create({
        data: {
          dni: data.numero,
          name: capitalizedName,
        },
      });

      this.logger.log(`DNI ${dni} consultado en API Peru y guardado en caché`);

      return {
        name: capitalizedName,
        dni: data.numero,
      };
    } catch (error) {
      this.logger.error(
        'Error consultando DNI en API Peru:',
        error.response?.data || error.message,
      );

      if (error.response?.status === 401) {
        throw new Error('Token de API Peru inválido o expirado');
      }

      if (error.response?.status === 404) {
        throw new Error('DNI no encontrado en la base de datos de RENIEC');
      }

      throw new Error('No se pudo obtener los datos del DNI desde API Peru');
    }
  }

  /**
   * Scraping de https://eldni.com/pe/buscar-datos-por-dni para obtener nombre por DNI
   */
  private async scrapDniFromEldni(dni: string): Promise<ResponseApiCustomer> {
    try {
      // 1) GET inicial para obtener cookies y token CSRF
      const url = 'https://eldni.com/pe/buscar-datos-por-dni';
      const getResponse = await lastValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          },
          // Important: allow redirects to complete and keep headers
          maxRedirects: 3,
        }),
      );

      const $get = cheerio.load(getResponse.data);
      const csrfToken = $get('input[name="_token"]').attr('value') || '';

      // Preparar cookies de sesión devueltas por el servidor
      const setCookieHeader = getResponse.headers?.['set-cookie'] as
        | string[]
        | undefined;
      const cookieJar = setCookieHeader
        ? setCookieHeader.map((c) => c.split(';')[0]).join('; ')
        : '';

      // 2) POST del formulario con el DNI
      const formData = new URLSearchParams({
        _token: csrfToken,
        dni,
      });

      const postResponse = await lastValueFrom(
        this.httpService.post(url, formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            Origin: 'https://eldni.com',
            Referer: url,
            ...(cookieJar ? { Cookie: cookieJar } : {}),
          },
          maxRedirects: 3,
        }),
      );

      const $ = cheerio.load(postResponse.data);

      // Preferimos el nombre completo que aparece en el <samp> grande si existe
      let fullName = $('samp.inline-block').first().text().trim();

      // Si no hay <samp>, intentamos desde la tabla de resultados
      if (!fullName) {
        const table = $('table.table.table-striped.table-scroll').first();
        const row = table.find('tbody tr').first();
        const tds = row.find('td');
        const nombres = tds.eq(1).text().trim();
        const apellidoP = tds.eq(2).text().trim();
        const apellidoM = tds.eq(3).text().trim();
        if (nombres || apellidoP || apellidoM) {
          fullName = [nombres, apellidoP, apellidoM].filter(Boolean).join(' ');
        }
      }

      const dniOut = dni;

      if (!fullName) {
        throw new Error('No se pudo extraer el nombre del HTML');
      }

      return { name: fullName, dni: dniOut };
    } catch (error) {
      this.logger.error('Error en scraping de DNI (eldni):', error);
      throw new Error('Scraping DNI falló');
    }
  }

  /**
   * Convierte un texto a formato capitalizado preservando las tildes y caracteres especiales
   * @param text Texto a convertir
   * @returns Texto capitalizado
   */
  private capitalizeWithAccents(text: string): string {
    if (!text) return '';

    return text
      .toLowerCase()
      .split(' ')
      .map((word) => {
        if (word.length === 0) return word;

        // Convertir la primera letra a mayúscula preservando tildes
        const firstChar = word.charAt(0).toUpperCase();
        const restOfWord = word.slice(1);

        return firstChar + restOfWord;
      })
      .join(' ')
      .trim();
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
          birthDate: true,
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
        ...(customer.email && { email: customer.email }),
        ...(customer.birthDate && { birthDate: customer.birthDate }),
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
   * Obtiene todos los clientes de forma paginada.
   * @param user Usuario que realiza la consulta
   * @param options Opciones de paginación (página y tamaño de página)
   * @param filterOptions Opciones de filtrado avanzado
   * @param sortOptions Opciones de ordenamiento
   * @returns Lista paginada de clientes
   */
  async findAllPaginated(
    user: UserPayload,
    options: { page: number; pageSize: number },
    filterOptions?: any,
    sortOptions?: any,
  ): Promise<PaginatedResponse<CustomerData>> {
    try {
      const { page, pageSize } = options;

      // Definir campos que son enums y fechas
      const enumFields = ['documentType', 'maritalStatus'];
      const dateFields = ['birthDate', 'createdAt', 'updatedAt'];

      // Filtros base para usuarios no super admin
      const baseFilters: any = {};
      if (!user.isSuperAdmin) {
        baseFilters.searchByField = { isActive: true };
      }

      // Combinar filtros base con los proporcionados
      const combinedFilterOptions = {
        ...baseFilters,
        ...filterOptions,
      };

      return await this.paginationService.paginateAdvanced<any, CustomerData>({
        model: 'customer',
        page,
        pageSize,
        where: {
          // Filtrar por isActive solo si no es super admin
          ...(user.isSuperAdmin ? {} : { isActive: true }),
        },
        orderBy: {
          createdAt: 'asc',
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
          birthDate: true,
          maritalStatus: true,
          occupation: true,
          phone: true,
          ruc: true,
          companyAddress: true,
          companyName: true,
          department: true,
          province: true,
          isActive: true,
          isBlacklist: true,
          blacklistReason: true,
          blacklistDate: true,
          blacklistedById: true,
          createdByLandingPage: true,
          mustCompleteData: true,
        },
        transformer: (customer) => ({
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
          ...(customer.email && { email: customer.email }),
          ...(customer.birthDate && { birthDate: customer.birthDate }),
          maritalStatus: customer.maritalStatus,
          occupation: customer.occupation,
          phone: customer.phone,
          ...(customer.department && { department: customer.department }),
          ...(customer.province && { province: customer.province }),
          isActive: customer.isActive,
          isBlacklist: customer.isBlacklist,
          ...(customer.blacklistReason && {
            blacklistReason: customer.blacklistReason,
          }),
          ...(customer.blacklistDate && {
            blacklistDate: customer.blacklistDate,
          }),
          ...(customer.blacklistedById && {
            blacklistedById: customer.blacklistedById,
          }),
          createdByLandingPage: customer.createdByLandingPage,
          mustCompleteData: customer.mustCompleteData,
        }),
        filterOptions: combinedFilterOptions,
        sortOptions,
        enumFields,
        dateFields,
      });
    } catch (error) {
      this.logger.error('Error getting paginated customers', error.stack);
      handleException(error, 'Error getting paginated customers');
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
   * Buscar un cliente por su número de documento
   * @param documentNumber Número de documento del cliente
   * @returns Datos del cliente
   */
  async findDocumentNumber(documentNumber: string): Promise<CustomerData> {
    try {
      const customerDb = await this.prisma.customer.findUnique({
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
          isBlacklist: true,
          blacklistReason: true,
          blacklistDate: true,
          blacklistedById: true,
          createdByLandingPage: true,
          mustCompleteData: true,
        },
      });
      if (!customerDb) {
        throw new BadRequestException('This document number is not assigned');
      }

      if (!!customerDb && !customerDb.isActive) {
        throw new BadRequestException(
          'This document number is assigned but the customer is inactive',
        );
      }

      return {
        ...customerDb,
        ...(customerDb.blacklistReason && {
          blacklistReason: customerDb.blacklistReason,
        }),
        ...(customerDb.blacklistDate && {
          blacklistDate: customerDb.blacklistDate,
        }),
        ...(customerDb.blacklistedById && {
          blacklistedById: customerDb.blacklistedById,
        }),
        createdByLandingPage: customerDb.createdByLandingPage,
        mustCompleteData: customerDb.mustCompleteData,
      };
    } catch (error) {
      this.logger.error('Error get customer by document number');
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error get customer by document number');
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
        isBlacklist: true,
        blacklistReason: true,
        blacklistDate: true,
        blacklistedById: true,
        createdByLandingPage: true,
        mustCompleteData: true,
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

  async findCustomerHistoryById(
    id: string,
    year?: number,
    reservationStatus?: ReservationStatus,
  ): Promise<HistoryCustomerData> {
    try {
      const customerDb = await this.prisma.customer.findFirst({
        where: { id },
        select: {
          id: true,
          name: true,
          isActive: true,
          reservations: {
            where: {
              ...(year && {
                OR: [
                  {
                    reservationDate: {
                      gte: new Date(`${year}-01-01`),
                      lte: new Date(`${year}-12-31`),
                    },
                  },
                  {
                    checkInDate: {
                      gte: new Date(`${year}-01-01`),
                      lte: new Date(`${year}-12-31`),
                    },
                  },
                  {
                    checkOutDate: {
                      gte: new Date(`${year}-01-01`),
                      lte: new Date(`${year}-12-31`),
                    },
                  },
                ],
              }),
              // Usar la condición separada para status para evitar el error de tipado
              ...(reservationStatus && {
                status: {
                  equals: reservationStatus,
                },
              }),
            },
            select: {
              id: true,
              reservationDate: true,
              checkInDate: true,
              checkOutDate: true,
              guests: true,
              reason: true,
              observations: true,
              status: true,
              room: {
                select: {
                  id: true,
                  number: true,
                  RoomTypes: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                    },
                  },
                },
              },
              payment: {
                select: {
                  id: true,
                  date: true,
                  amount: true,
                  amountPaid: true,
                  paymentDetail: {
                    select: {
                      id: true,
                      paymentDate: true,
                      description: true,
                      type: true,
                      method: true,
                      status: true,
                      unitPrice: true,
                      subtotal: true,
                      quantity: true,
                      service: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                      days: true,
                      room: {
                        select: {
                          id: true,
                          number: true,
                          RoomTypes: {
                            select: {
                              id: true,
                              name: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!customerDb) {
        throw new BadRequestException('This customer doesnt exist');
      }

      if (!!customerDb && !customerDb.isActive) {
        throw new BadRequestException('This customer exist, but is inactive');
      }

      // Transformar el resultado para que coincida con la interfaz HistoryCustomerData
      const transformedCustomer: HistoryCustomerData = {
        ...customerDb,
        reservations: customerDb.reservations.map((reservation) => {
          // Calcular numberGuests con manejo adecuado para JSON en formato string
          let guestsCount = 1; // Por defecto contamos al cliente principal

          try {
            if (reservation.guests) {
              // Si es string, intentar parsearlo como JSON
              if (typeof reservation.guests === 'string') {
                const parsedGuests = JSON.parse(reservation.guests);
                if (Array.isArray(parsedGuests)) {
                  guestsCount += parsedGuests.length;
                }
              }
              // Si ya es array (por si acaso)
              else if (Array.isArray(reservation.guests)) {
                guestsCount += reservation.guests.length;
              }
            }
          } catch (error) {
            // Si hay error al parsear, usar solo el cliente principal
            this.logger.warn(`Error parsing guests JSON: ${error.message}`);
          }

          return {
            ...reservation,
            numberGuests: guestsCount,
            room: {
              ...reservation.room,
              number: Number(reservation.room.number),
            },
            payment: Array.isArray(reservation.payment)
              ? reservation.payment[0]
              : reservation.payment,
          };
        }),
      };

      return transformedCustomer;
    } catch (error) {
      this.logger.error('Error get customer');
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error get customer');
    }
  }

  async searchCustomerByDocumentIdCoincidence(
    docId: string,
  ): Promise<Customer[]> {
    try {
      const results =
        docId === 'None'
          ? await this.customerRepository.findLastCreated()
          : await this.customerRepository.searchByCoincidenceField<Customer>({
              field: 'documentNumber',
              value: docId,
              onlyActive: true,
            });
      return results;
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
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
    // Extraemos hasCompany separadamente, dejando todos los demás campos en updateData
    const { hasCompany, ...updateData } = updateCustomerDto;

    try {
      const customerDB = await this.findById(id);

      // if (updateData.email) await this.findByEmail(updateData.email, id);
      if (updateData.documentNumber)
        await this.findByDocumentNumber(updateData.documentNumber, id);

      // Modificar updateData si country es diferente de "Perú"
      if (updateData.country && updateData.country !== 'Perú') {
        updateData.department = null;
        updateData.province = null;
      }

      // Si hasCompany es falso, limpiar los campos relacionados con la empresa
      if (hasCompany === false) {
        updateData.ruc = null;
        updateData.companyAddress = null;
        updateData.companyName = null;
      }

      // Validar si hay cambios
      if (hasNoChanges(updateData, customerDB)) {
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
      const dynamicUpdateData = createDynamicUpdateObject(
        updateData,
        customerDB,
      );

      // Filtrar campos de blacklist que no deben estar en la actualización
      const finalUpdateData: any = { ...dynamicUpdateData };
      delete finalUpdateData.isBlacklist;
      delete finalUpdateData.blacklistReason;
      delete finalUpdateData.blacklistDate;
      delete finalUpdateData.blacklistedById;
      delete finalUpdateData.createdByLandingPage;
      delete finalUpdateData.mustCompleteData;

      // Transacción para realizar la actualización
      const updatedCustomer = await this.prisma.$transaction(async (prisma) => {
        const customer = await prisma.customer.update({
          where: { id },
          data: finalUpdateData,
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
            isBlacklist: true,
            blacklistReason: true,
            blacklistDate: true,
            blacklistedById: true,
            createdByLandingPage: true,
            mustCompleteData: true,
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
          ...(updateData.email && { email: updateData.email }),
          ...(updateData.birthDate && { birthDate: updateData.birthDate }),
          ...(updatedCustomer.department && {
            department: updatedCustomer.department,
          }),
          ...(updatedCustomer.province && {
            province: updatedCustomer.province,
          }),
          isActive: updatedCustomer.isActive,
          isBlacklist: updatedCustomer.isBlacklist,
          ...(updatedCustomer.blacklistReason && {
            blacklistReason: updatedCustomer.blacklistReason,
          }),
          ...(updatedCustomer.blacklistDate && {
            blacklistDate: updatedCustomer.blacklistDate,
          }),
          ...(updatedCustomer.blacklistedById && {
            blacklistedById: updatedCustomer.blacklistedById,
          }),
          createdByLandingPage: updatedCustomer.createdByLandingPage,
          mustCompleteData: updatedCustomer.mustCompleteData,
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
            isBlacklist: true,
            blacklistReason: true,
            blacklistDate: true,
            blacklistedById: true,
            createdByLandingPage: true,
            mustCompleteData: true,
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
            isBlacklist: true,
            blacklistReason: true,
            blacklistDate: true,
            blacklistedById: true,
            createdByLandingPage: true,
            mustCompleteData: true,
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

  /**
   * Importar clientes desde un archivo Excel
   * @param file Archivo Excel
   * @param continueOnError Continuar con la importación si hay errores no relacionados con duplicados
   * @param user Usuario que realiza la acción
   * @returns Reporte de la importación
   */
  async importFromExcel(
    file: Express.Multer.File,
    continueOnError: boolean,
    user: UserData,
  ): Promise<
    HttpResponse<{
      total: number;
      successful: number;
      failed: number;
      skipped: number;
      errors: Array<{
        row: number;
        data: Record<string, unknown>;
        error: string;
        type: 'error' | 'duplicate';
      }>;
    }>
  > {
    try {
      // Leer el archivo Excel usando exceljs (más consistente con cómo generamos las plantillas)
      const workbook = new excelJs.Workbook();
      await workbook.xlsx.load(file.buffer);

      // Obtener la primera hoja del workbook (que debería ser "Plantilla")
      const worksheet = workbook.worksheets[0];

      if (!worksheet || worksheet.rowCount <= 1) {
        throw new BadRequestException(
          'El archivo no contiene datos o está vacío',
        );
      }

      // Mapear las cabeceras esperadas (indice a nombre de campo)
      const headerMap = {
        0: 'name', // Nombre completo
        1: 'address', // Dirección
        2: 'birthPlace', // Lugar de nacimiento
        3: 'birthDate', // Fecha nacimiento
        4: 'country', // País
        5: 'department', // Departamento
        6: 'province', // Provincia
        7: 'phone', // Teléfono
        8: 'occupation', // Ocupación
        9: 'documentType', // Tipo documento
        10: 'documentNumber', // Número documento
        11: 'email', // Email
        12: 'maritalStatus', // Estado civil
        13: 'companyName', // Nombre empresa
        14: 'ruc', // RUC
        15: 'companyAddress', // Dirección empresa
      };

      const data: Record<string, unknown>[] = [];

      // Procesar cada fila (omitiendo la cabecera)
      let firstRow = true;
      worksheet.eachRow((row) => {
        // Omitir la fila de cabecera
        if (firstRow) {
          firstRow = false;
          return;
        }

        // Crear un objeto con los datos de la fila usando el mapeo de cabeceras
        const rowData: Record<string, unknown> = {};

        row.eachCell((cell, colIndex) => {
          const fieldName = headerMap[colIndex - 1]; // exceljs usa índices base-1
          if (fieldName) {
            // Convertir el valor de la celda al tipo adecuado
            let value: unknown = cell.value;

            // Manejar diferentes tipos de valores de celda
            if (value && typeof value === 'object') {
              // Si es un objeto con propiedad 'result' (fechas en Excel), usar result
              if ('result' in value) {
                value = value.result;
              }
              // Si es un hipervínculo (como un correo electrónico), extraer el texto
              else if ('text' in value && value.text) {
                value = value.text;
              }
              // Si es un objeto RichText (texto con formato)
              else if ('richText' in value) {
                value = String(cell.text);
              }
              // Si tiene hyperlink (especialmente para emails)
              else if ('hyperlink' in value) {
                const hyperlink = String(value.hyperlink);
                if (hyperlink.startsWith('mailto:')) {
                  value = hyperlink.substring(7); // Eliminar 'mailto:'
                } else {
                  value = hyperlink;
                }
              }
            }

            // Si es una fecha, formatearla como string YYYY-MM-DD
            if (value instanceof Date) {
              value = value.toISOString().split('T')[0];
            }

            rowData[fieldName] = value;
          } else if (colIndex - 1 >= 16) {
            // Para columnas a partir de la Q (índice 16), guardar como fechas de historial
            let value: unknown = cell.value;

            // Manejar diferentes tipos de valores de celda
            if (value && typeof value === 'object') {
              if ('result' in value) {
                value = value.result;
              } else if ('text' in value && value.text) {
                value = value.text;
              } else if ('richText' in value) {
                value = String(cell.text);
              }
            }

            // Si es una fecha, formatearla como string YYYY-MM-DD
            if (value instanceof Date) {
              value = value.toISOString().split('T')[0];
            }

            // Solo guardar si hay un valor
            if (value && String(value).trim()) {
              rowData[`history_date_${colIndex - 16}`] = value;
            }
          }
        });

        // Solo agregar filas que tengan al menos un valor
        const hasValues = Object.values(rowData).some(
          (val) => val !== undefined && val !== null && val !== '',
        );

        if (hasValues) {
          data.push(rowData);
        }
      });

      if (data.length === 0) {
        throw new BadRequestException(
          'No se encontraron datos válidos para importar',
        );
      }

      // Procesar los datos convertidos
      const total = data.length;
      let successful = 0;
      let failed = 0;
      let skipped = 0;
      const errors: Array<{
        row: number;
        data: Record<string, unknown>;
        error: string;
        type: 'error' | 'duplicate';
      }> = [];

      // Procesar cada registro
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Normalizar y validar datos
          const customerData = this.mapExcelRowToDto(row);

          // Verificar duplicados sin lanzar excepciones
          const duplicateInfo = await this.checkForDuplicates(
            customerData.documentNumber,
          );

          if (duplicateInfo) {
            // Es un duplicado, lo omitimos
            skipped++;
            errors.push({
              row: i + 2, // +2 porque la fila 1 es la cabecera
              data: row,
              error: duplicateInfo,
              type: 'duplicate',
            });
            continue; // Pasar al siguiente registro
          }

          // Si no es duplicado, crear el cliente
          const newCustomer = await this.createCustomerWithoutValidation(
            customerData,
            user,
          );

          // Procesar fechas de reservas anteriores si existen
          await this.processReservationHistoryDates(row, newCustomer.id);

          successful++;
        } catch (error) {
          failed++;

          // Registrar el error
          errors.push({
            row: i + 2, // +2 porque la fila 1 es la cabecera
            data: row,
            error: error.message || 'Error desconocido',
            type: 'error',
          });

          // Si no debe continuar con errores (que no sean duplicados), parar
          if (!continueOnError) {
            break;
          }
        }
      }

      return {
        statusCode: HttpStatus.OK,
        message: `Importación completada: ${successful} de ${total} clientes importados correctamente. ${skipped} duplicados omitidos.`,
        data: {
          total,
          successful,
          failed,
          skipped,
          errors,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error en importación de Excel: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Error al procesar el archivo: ${error.message}`,
      );
    }
  }

  /**
   * Generar plantilla Excel para importación de clientes
   * @returns Buffer con el archivo Excel
   */
  async generateCustomerTemplate(): Promise<excelJs.Workbook> {
    // Crear libro de trabajo
    const workbook = new excelJs.Workbook();

    // Definir opciones para los dropdowns
    const documentTypes = ['DNI', 'PASSPORT', 'FOREIGNER_CARD'];
    const maritalStatuses = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];

    // Crear solo la hoja de Plantilla (con todo el contenido de Ejemplo)
    const templateSheet = workbook.addWorksheet('Plantilla');

    // Configurar la plantilla con el contenido que antes estaba en "Ejemplo"
    this.configureTemplateWithExampleContent(
      templateSheet,
      documentTypes,
      maritalStatuses,
    );

    // Hoja de Instrucciones
    const instructionsSheet = workbook.addWorksheet('Instrucciones');
    this.configureInstructionsSheet(
      instructionsSheet,
      documentTypes,
      maritalStatuses,
    );

    return workbook;
  }

  /**
   *
   * @param sheet Sheet de Excel
   * @param documentTypes Tipos de documentos
   * @param maritalStatuses Estados civiles
   */
  private configureTemplateWithExampleContent(
    sheet: excelJs.Worksheet,
    documentTypes: string[],
    maritalStatuses: string[],
  ) {
    // Encabezados
    const headers = [
      'Nombre completo',
      'Dirección',
      'Lugar de nacimiento',
      'Fecha nacimiento (YYYY-MM-DD)',
      'País',
      'Departamento',
      'Provincia',
      'Teléfono (+51987654321)',
      'Ocupación',
      'Tipo documento',
      'Número documento',
      'Email',
      'Estado civil',
      'Nombre empresa',
      'RUC',
      'Dirección empresa',
    ];

    // Agregar encabezados
    sheet.addRow(headers);

    // Estilo encabezados
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
      cell.font = { bold: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Agregar datos de ejemplo
    sheet.addRow([
      'Juan Pérez',
      'Av. Principal 123',
      'Lima',
      '1990-01-01',
      'Perú',
      'Lima',
      'Lima',
      '+51987654321',
      'Ingeniero',
      'DNI',
      '12345678',
      'juan@example.com',
      'SINGLE',
      'Empresa S.A.',
      '20123456789',
      'Av. Comercial 456',
    ]);

    // Configurar anchos de columnas
    sheet.columns = headers.map(() => ({ width: 25 }));

    // Agregar listas desplegables (columna 10 = J, columna 13 = M)
    // @ts-expect-error Property 'add' is not defined on type 'DataValidations'
    sheet.dataValidations.add('J2:J100', {
      type: 'list',
      allowBlank: true,
      formulae: [`"${documentTypes.join(',')}"`],
      showDropDown: true,
    });

    // @ts-expect-error Property 'add' is not defined on type 'DataValidations'
    sheet.dataValidations.add('M2:M100', {
      type: 'list',
      allowBlank: true,
      formulae: [`"${maritalStatuses.join(',')}"`],
      showDropDown: true,
    });
  }

  /**
   *
   * @param sheet Sheet de Excel
   * @param documentTypes Tipos de documentos
   * @param maritalStatuses Estados civiles
   */
  private configureInstructionsSheet(
    sheet: excelJs.Worksheet,
    documentTypes: string[],
    maritalStatuses: string[],
  ) {
    // Encabezados para la tabla de instrucciones
    sheet.addRow([
      'CAMPO',
      'DESCRIPCIÓN',
      'OBLIGATORIO',
      'FORMATO / VALORES VÁLIDOS',
    ]);

    // Datos para la tabla de instrucciones
    const instructionsData = [
      ['Nombre completo', 'Nombre completo del cliente', 'Sí', ''],
      ['Dirección', 'Dirección del cliente', 'Sí', ''],
      ['Lugar de nacimiento', 'Lugar de nacimiento', 'Sí', ''],
      [
        'Fecha nacimiento',
        'Fecha de nacimiento',
        'No',
        'YYYY-MM-DD (ej: 1990-01-01)',
      ],
      ['País', 'País de residencia', 'Sí', ''],
      ['Departamento', 'Departamento', 'No', 'Solo para Perú'],
      ['Provincia', 'Provincia', 'No', 'Solo para Perú'],
      ['Teléfono', 'Teléfono con código de país', 'Sí', '+51987654321'],
      ['Ocupación', 'Ocupación o profesión', 'Sí', ''],
      [
        'Tipo documento',
        'Tipo de documento de identidad',
        'Sí',
        documentTypes.join(', '),
      ],
      ['Número documento', 'Número de documento', 'Sí', ''],
      ['Email', 'Correo electrónico', 'No', ''],
      [
        'Estado civil',
        'Estado civil del cliente',
        'Sí',
        maritalStatuses.join(', '),
      ],
      ['Nombre empresa', 'Nombre de la empresa', 'No', ''],
      ['RUC', 'RUC de la empresa', 'No', 'Solo números, 11 dígitos'],
      ['Dirección empresa', 'Dirección de la empresa', 'No', ''],
    ];

    // Agregar cada fila a la hoja
    instructionsData.forEach((row) => {
      sheet.addRow(row);
    });

    // Añadir espacio antes de la información de fechas de reservas
    sheet.addRow([]);
    sheet.addRow([]);

    // INFORMACIÓN SOBRE FECHAS DE RESERVAS ANTERIORES
    sheet.addRow(['FECHAS DE RESERVAS ANTERIORES', '', '', '']);
    const historyHeaderRow = sheet.lastRow;
    historyHeaderRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' },
    };
    historyHeaderRow.getCell(1).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    historyHeaderRow.getCell(1).alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${historyHeaderRow.number}:D${historyHeaderRow.number}`);

    // Instrucciones para fechas de reservas anteriores
    sheet.addRow(['COLUMNA', 'DESCRIPCIÓN', 'OBLIGATORIO', 'FORMATO']);
    sheet.addRow([
      'Q en adelante',
      'Fechas de reservas anteriores del cliente',
      'No',
      'YYYY-MM-DD (ej: 2023-12-25)',
    ]);
    sheet.addRow([
      '',
      'Se pueden agregar múltiples fechas en columnas consecutivas',
      'No',
      'Una fecha por columna',
    ]);
    sheet.addRow([
      '',
      'Solo se procesarán fechas válidas (formato YYYY-MM-DD)',
      'No',
      'Las fechas inválidas serán ignoradas',
    ]);
    sheet.addRow([
      '',
      'Estas fechas se guardarán en el historial del cliente',
      'No',
      'Para consultas futuras',
    ]);

    // Añadir espacio antes de la tabla de traducciones
    sheet.addRow([]);
    sheet.addRow([]);

    // TABLA DE TRADUCCIONES DE OPCIONES
    sheet.addRow(['TABLA DE TRADUCCIONES', '', '', '']);
    const headerRow = sheet.lastRow;
    headerRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F81BD' },
    };
    headerRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.getCell(1).alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${headerRow.number}:D${headerRow.number}`);

    // Encabezados para tabla de traducciones
    sheet.addRow(['CAMPO', 'VALOR', 'TRADUCCIÓN', 'DESCRIPCIÓN']);

    // Datos para la tabla de traducciones: Tipos de documento
    sheet.addRow([
      'Tipo documento',
      'DNI',
      'DNI',
      'Documento Nacional de Identidad',
    ]);
    sheet.addRow(['Tipo documento', 'PASSPORT', 'PASAPORTE', 'Pasaporte']);
    sheet.addRow([
      'Tipo documento',
      'FOREIGNER_CARD',
      'CARNÉ DE EXTRANJERÍA',
      'Documento para extranjeros',
    ]);

    // Datos para la tabla de traducciones: Estado civil
    sheet.addRow([
      'Estado civil',
      'SINGLE',
      'SOLTERO/A',
      'Persona que no ha contraído matrimonio',
    ]);
    sheet.addRow([
      'Estado civil',
      'MARRIED',
      'CASADO/A',
      'Persona unida en matrimonio',
    ]);
    sheet.addRow([
      'Estado civil',
      'DIVORCED',
      'DIVORCIADO/A',
      'Persona que ha disuelto legalmente su matrimonio',
    ]);
    sheet.addRow([
      'Estado civil',
      'WIDOWED',
      'VIUDO/A',
      'Persona cuyo cónyuge ha fallecido',
    ]);

    // Estilo para la tabla de traducciones
    const translationStartRow = headerRow.number + 2; // +1 para el encabezado, +1 para empezar en datos
    const translationEndRow = translationStartRow + 7; // 4 tipos doc + 4 estados civiles - 1

    // Aplicar estilos al encabezado de la tabla de traducciones
    sheet.getRow(translationStartRow - 1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' },
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Aplicar estilos a los datos de la tabla de traducciones
    for (let i = translationStartRow; i <= translationEndRow; i++) {
      sheet.getRow(i).eachCell((cell, colNumber) => {
        // Agrupar por secciones con colores
        const isTipoDocumento = i <= translationStartRow + 2; // Primeras 3 filas son tipo documento

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: isTipoDocumento ? 'FFE6EFF7' : 'FFFCE4D6', // Azul claro para doc, naranja claro para estado civil
          },
        };

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Resaltar los valores originales (columna 2)
        if (colNumber === 2) {
          cell.font = { bold: true };
        }

        // Alineación
        if (colNumber === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else if (colNumber === 4) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    }

    // Espacio antes de las notas finales
    sheet.addRow([]);

    // Agregar notas adicionales
    sheet.addRow([
      'NOTA:',
      'Las celdas con listas desplegables están disponibles en la hoja "Plantilla" para "Tipo documento" y "Estado civil"',
    ]);

    sheet.addRow([
      'IMPORTANTE:',
      'Los campos marcados como obligatorios deben completarse para cada cliente',
    ]);

    // Estilos para las notas finales (resaltadas)
    const notesStartRow = translationEndRow + 3;
    for (let i = notesStartRow; i <= notesStartRow + 1; i++) {
      sheet.getRow(i).getCell(1).font = {
        bold: true,
        color: { argb: 'FF4F81BD' },
      };
      sheet.getRow(i).getCell(2).font = { italic: true };
    }

    // Ajustar anchos de columna
    sheet.columns = [
      { width: 18 }, // Campo
      { width: 20 }, // Descripción/Valor
      { width: 20 }, // Obligatorio/Traducción
      { width: 40 }, // Formato/Descripción
    ];

    // Estilos para la tabla principal
    // Estilo para encabezados de la primera tabla
    sheet.getRow(1).eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }, // Azul más oscuro para los encabezados
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // Texto blanco
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Estilo para las celdas de datos de la primera tabla
    for (let i = 2; i <= instructionsData.length + 1; i++) {
      sheet.getRow(i).eachCell((cell, colNumber) => {
        // Fondo alternado para mejor legibilidad
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: i % 2 === 0 ? 'FFE6EFF7' : 'FFFFFFFF' }, // Alternamos azul claro y blanco
        };

        // Resaltar la columna de obligatorio
        if (colNumber === 3) {
          cell.font = {
            bold: cell.value === 'Sí',
            color: { argb: cell.value === 'Sí' ? 'FFFF0000' : 'FF000000' }, // Rojo para "Sí", negro para "No"
          };
        }

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        // Alineación
        if (colNumber === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    }

    // Congelar la primera fila (encabezados)
    sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
  }

  /**
   * Mapear una fila de Excel a un DTO de cliente
   * @param row Fila del Excel
   * @returns DTO del cliente
   */
  private mapExcelRowToDto(row: Record<string, unknown>): CreateCustomerDto {
    // Validar campos obligatorios
    if (
      !row.name ||
      !row.address ||
      !row.birthPlace ||
      !row.country ||
      !row.documentNumber ||
      !row.documentType ||
      !row.phone ||
      !row.occupation ||
      !row.maritalStatus
    ) {
      throw new BadRequestException('Faltan campos obligatorios en la fila');
    }

    // Validar tipo de documento
    const documentType = String(row.documentType).toUpperCase();
    if (!['DNI', 'PASSPORT', 'FOREIGNER_CARD'].includes(documentType)) {
      throw new BadRequestException(
        `Tipo de documento inválido: ${documentType}`,
      );
    }

    // Validar estado civil
    const maritalStatus = String(row.maritalStatus).toUpperCase();
    if (!['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'].includes(maritalStatus)) {
      throw new BadRequestException(`Estado civil inválido: ${maritalStatus}`);
    }

    // Mapear datos a DTO
    const customerDto: CreateCustomerDto = {
      name: String(row.name).trim().toLowerCase(),
      address: String(row.address).trim(),
      birthPlace: String(row.birthPlace).trim(),
      country: String(row.country).trim(),
      documentNumber: String(row.documentNumber).trim(),
      documentType: documentType as CustomerDocumentType,
      maritalStatus: maritalStatus as CustomerMaritalStatus,
      occupation: String(row.occupation).trim(),
      phone: String(row.phone).trim(),
    };

    // Campos opcionales
    if (row.email) {
      // Manejar el caso de emails como hipervínculos
      let email = row.email;

      // Para hipervínculos: { text: 'correo@example.com', hyperlink: 'mailto:correo@example.com' }
      if (typeof email === 'object' && email !== null) {
        if ('text' in email) {
          email = email.text;
        } else if ('hyperlink' in email) {
          // Si tiene hyperlink de tipo mailto:, extraer la parte del email
          const hyperlink = String(email.hyperlink);
          if (hyperlink.startsWith('mailto:')) {
            email = hyperlink.substring(7); // Quitar 'mailto:'
          }
        }
      }

      customerDto.email = String(email).trim().toLowerCase();
    }

    if (row.birthDate) {
      customerDto.birthDate = this.parseExcelDate(row.birthDate);
    }

    if (row.department) {
      customerDto.department = String(row.department).trim();
    }

    if (row.province) {
      customerDto.province = String(row.province).trim();
    }

    if (row.ruc) {
      customerDto.ruc = String(row.ruc).trim();

      if (row.companyName) {
        customerDto.companyName = String(row.companyName).trim();
      }

      if (row.companyAddress) {
        customerDto.companyAddress = String(row.companyAddress).trim();
      }
    }

    return customerDto;
  }

  /**
   * Procesar fechas de reservas anteriores desde las columnas del Excel
   * @param row Fila del Excel con los datos
   * @param customerId ID del cliente creado
   */
  private async processReservationHistoryDates(
    row: Record<string, unknown>,
    customerId: string,
  ): Promise<void> {
    try {
      // Procesar columnas a partir de la M (índice 12) en busca de fechas válidas
      const validDates: string[] = [];

      // Iterar desde la columna Q (índice 16) hasta el final
      for (let i = 0; i < 50; i++) {
        // Límite de 50 columnas para evitar bucles infinitos
        const columnKey = `history_date_${i}`;
        const dateValue = row[columnKey];

        if (dateValue && typeof dateValue === 'string' && dateValue.trim()) {
          const trimmedDate = dateValue.trim();

          // Validar formato de fecha YYYY-MM-DD
          if (this.isValidDateFormat(trimmedDate)) {
            validDates.push(trimmedDate);
          }
        }
      }

      // Crear registros de historial para cada fecha válida
      if (validDates.length > 0) {
        await this.prisma.customerReservationHistory.createMany({
          data: validDates.map((date) => ({
            customerId,
            date,
          })),
        });

        this.logger.log(
          `Creado historial de reservas para cliente ${customerId}: ${validDates.length} fechas`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error procesando fechas de historial para cliente ${customerId}: ${error.message}`,
        error.stack,
      );
      // No lanzar error para no interrumpir la importación
    }
  }

  /**
   * Validar si una cadena tiene formato de fecha YYYY-MM-DD
   * @param dateString Cadena a validar
   * @returns true si es una fecha válida
   */
  private isValidDateFormat(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const date = new Date(dateString);
    return (
      !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateString
    );
  }

  /**
   * Convertir una fecha de Excel al formato ISO
   * @param excelDate Fecha en formato Excel
   * @returns Fecha en formato ISO
   */
  private parseExcelDate(excelDate: unknown): string {
    // Si ya es string y tiene formato ISO, devolverlo
    if (
      typeof excelDate === 'string' &&
      excelDate.match(/^\d{4}-\d{2}-\d{2}/)
    ) {
      return excelDate;
    }

    // Si es un número de Excel, convertirlo a fecha
    if (typeof excelDate === 'number') {
      // Excel usa días desde el 1 de enero de 1900
      const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }

    // Si es una fecha de JavaScript
    if (excelDate instanceof Date) {
      return excelDate.toISOString().split('T')[0];
    }

    throw new BadRequestException(`Formato de fecha inválido: ${excelDate}`);
  }

  /**
   * Verificar si un cliente sería duplicado
   * @param documentNumber Número de documento
   * @param email Email (opcional)
   * @param ruc RUC (opcional)
   * @returns Mensaje de duplicado o null si no es duplicado
   */
  private async checkForDuplicates(
    documentNumber: string,
  ): Promise<string | null> {
    // Verificar documento
    const existingByDocument = await this.prisma.customer.findUnique({
      where: { documentNumber },
      select: { id: true, isActive: true },
    });

    if (existingByDocument) {
      return `Número de documento ${documentNumber} ya existe${!existingByDocument.isActive ? ' (inactivo)' : ''}`;
    }

    return null;
  }

  /**
   * Crea un cliente sin validaciones adicionales de duplicados
   * @param createCustomerDto Datos del cliente a crear
   * @param user Usuario que realiza la acción
   * @returns Cliente creado
   */
  private async createCustomerWithoutValidation(
    createCustomerDto: CreateCustomerDto,
    user: UserData,
  ): Promise<CustomerData> {
    const {
      name,
      address,
      birthPlace,
      country,
      documentNumber,
      documentType,
      email,
      birthDate,
      maritalStatus,
      occupation,
      phone,
      companyAddress,
      companyName,
      department,
      province,
      ruc,
    } = createCustomerDto;

    try {
      // Crear el cliente y registrar la auditoría sin validaciones de duplicados
      const newCustomer = await this.prisma.$transaction(async () => {
        // Crear el nuevo cliente
        const customer = await this.prisma.customer.create({
          data: {
            name,
            address,
            birthPlace,
            country,
            documentNumber,
            documentType,
            maritalStatus,
            occupation,
            phone,
            ...(email && { email }),
            ...(birthDate && { birthDate }),
            ...(ruc && { ruc, companyAddress, companyName }),
            ...(department && { department }),
            ...(province && { province }),
          },
          select: {
            id: true,
            name: true,
            address: true,
            birthPlace: true,
            birthDate: true,
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
            isBlacklist: true,
            blacklistReason: true,
            blacklistDate: true,
            blacklistedById: true,
            createdByLandingPage: true,
            mustCompleteData: true,
          },
        });

        // Registrar la auditoría de la creación del cliente
        await this.audit.create({
          entityId: customer.id,
          entityType: 'customer',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return customer;
      });

      return {
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
        ...(newCustomer.email && { email: newCustomer.email }),
        ...(newCustomer.birthDate && { birthDate: newCustomer.birthDate }),
        maritalStatus: newCustomer.maritalStatus,
        occupation: newCustomer.occupation,
        phone: newCustomer.phone,
        ...(newCustomer.department && { department: newCustomer.department }),
        ...(newCustomer.province && { province: newCustomer.province }),
        isActive: newCustomer.isActive,
        isBlacklist: newCustomer.isBlacklist,
        ...(newCustomer.blacklistReason && {
          blacklistReason: newCustomer.blacklistReason,
        }),
        ...(newCustomer.blacklistDate && {
          blacklistDate: newCustomer.blacklistDate,
        }),
        ...(newCustomer.blacklistedById && {
          blacklistedById: newCustomer.blacklistedById,
        }),
        createdByLandingPage: newCustomer.createdByLandingPage,
        mustCompleteData: newCustomer.mustCompleteData,
      };
    } catch (error) {
      this.logger.error(
        `Error creating customer: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
