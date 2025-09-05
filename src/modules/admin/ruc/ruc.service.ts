import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { lastValueFrom } from 'rxjs';
import {
  ResponseApiRuc,
  SunatQueryResponse,
  ApiPeruRucRepresentantesResponse,
} from 'src/interfaces/ruc.interface';
import * as cheerio from 'cheerio';

@Injectable()
export class RucService {
  private readonly logger = new Logger(RucService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Obtener datos de RUC con caché
   */
  async getDataByRuc(ruc: string): Promise<ResponseApiRuc> {
    // 1. Buscar en caché local
    const cachedData = await this.prisma.rucCache.findUnique({
      where: { ruc },
      include: {
        representantes: true,
      },
    });

    if (cachedData) {
      this.logger.log(`RUC ${ruc} encontrado en caché local`);
      return {
        ruc: cachedData.ruc,
        nombreORazonSocial: cachedData.nombreORazonSocial,
        tipoContribuyente: cachedData.tipoContribuyente || undefined,
        nombreComercial: cachedData.nombreComercial || undefined,
        fechaInscripcion: cachedData.fechaInscripcion || undefined,
        fechaInicioActividades: cachedData.fechaInicioActividades || undefined,
        estado: cachedData.estado || undefined,
        condicion: cachedData.condicion || undefined,
        domicilioFiscal: cachedData.domicilioFiscal || undefined,
        sistemaEmisionComprobante:
          cachedData.sistemaEmisionComprobante || undefined,
        actividadComercioExterior:
          cachedData.actividadComercioExterior || undefined,
        sistemaContabilidad: cachedData.sistemaContabilidad || undefined,
        actividadPrincipal: cachedData.actividadPrincipal || undefined,
        actividadSecundaria1: cachedData.actividadSecundaria1 || undefined,
        actividadSecundaria2: cachedData.actividadSecundaria2 || undefined,
        comprobantesAutorizados:
          cachedData.comprobantesAutorizados || undefined,
        sistemaEmisionElectronica:
          cachedData.sistemaEmisionElectronica || undefined,
        emisorElectronicoDesde: cachedData.emisorElectronicoDesde || undefined,
        comprobantesElectronicos:
          cachedData.comprobantesElectronicos || undefined,
        afiliadoPLEDesde: cachedData.afiliadoPLEDesde || undefined,
        padrones: cachedData.padrones || undefined,
        representantes: cachedData.representantes.map((rep) => ({
          tipoDocumento: rep.tipoDocumento || undefined,
          numeroDocumento: rep.numeroDocumento || undefined,
          nombre: rep.nombre,
          cargo: rep.cargo || undefined,
          fechaDesde: rep.fechaDesde || undefined,
        })),
      };
    }

    // 2. Scraping SUNAT para datos principales
    const sunatData = await this.scrapSunat(ruc);

    // 3. Obtener representantes legales de SUNAT
    const representantesSunat = await this.getRepresentantesSunat(ruc);

    // 4. Obtener representantes legales de API Perú (como respaldo)
    const representantesApiPeru =
      representantesSunat.length > 0
        ? []
        : await this.getRepresentantesLegales(ruc);

    const representantes = [...representantesSunat, ...representantesApiPeru];

    // 4. Guardar en caché
    const rucCacheData = await this.prisma.rucCache.create({
      data: {
        ruc,
        nombreORazonSocial: sunatData.razonSocial || '',
        tipoContribuyente: sunatData.tipoContribuyente,
        nombreComercial: sunatData.nombreComercial,
        fechaInscripcion: sunatData.fechaInscripcion,
        fechaInicioActividades: sunatData.fechaInicioActividades,
        estado: sunatData.estado,
        condicion: sunatData.condicion,
        domicilioFiscal: sunatData.domicilioFiscal,
        sistemaEmisionComprobante: sunatData.sistemaEmisionComprobante,
        actividadComercioExterior: sunatData.actividadComercioExterior,
        sistemaContabilidad: sunatData.sistemaContabilidad,
        actividadPrincipal: sunatData.actividadPrincipal,
        actividadSecundaria1: sunatData.actividadSecundaria1,
        actividadSecundaria2: sunatData.actividadSecundaria2,
        comprobantesAutorizados: sunatData.comprobantesAutorizados,
        sistemaEmisionElectronica: sunatData.sistemaEmisionElectronica,
        emisorElectronicoDesde: sunatData.emisorElectronicoDesde,
        comprobantesElectronicos: sunatData.comprobantesElectronicos,
        afiliadoPLEDesde: sunatData.afiliadoPLEDesde,
        padrones: sunatData.padrones,
        representantes: {
          create: representantes.map((rep) => ({
            tipoDocumento: rep.tipoDocumento,
            numeroDocumento: rep.numeroDocumento,
            nombre: rep.nombre,
            cargo: rep.cargo,
            fechaDesde: rep.fechaDesde,
          })),
        },
      },
      include: {
        representantes: true,
      },
    });

    this.logger.log(`RUC ${ruc} consultado y guardado en caché`);

    return {
      ruc: rucCacheData.ruc,
      nombreORazonSocial: rucCacheData.nombreORazonSocial,
      tipoContribuyente: rucCacheData.tipoContribuyente || undefined,
      nombreComercial: rucCacheData.nombreComercial || undefined,
      fechaInscripcion: rucCacheData.fechaInscripcion || undefined,
      fechaInicioActividades: rucCacheData.fechaInicioActividades || undefined,
      estado: rucCacheData.estado || undefined,
      condicion: rucCacheData.condicion || undefined,
      domicilioFiscal: rucCacheData.domicilioFiscal || undefined,
      sistemaEmisionComprobante:
        rucCacheData.sistemaEmisionComprobante || undefined,
      actividadComercioExterior:
        rucCacheData.actividadComercioExterior || undefined,
      sistemaContabilidad: rucCacheData.sistemaContabilidad || undefined,
      actividadPrincipal: rucCacheData.actividadPrincipal || undefined,
      actividadSecundaria1: rucCacheData.actividadSecundaria1 || undefined,
      actividadSecundaria2: rucCacheData.actividadSecundaria2 || undefined,
      comprobantesAutorizados:
        rucCacheData.comprobantesAutorizados || undefined,
      sistemaEmisionElectronica:
        rucCacheData.sistemaEmisionElectronica || undefined,
      emisorElectronicoDesde: rucCacheData.emisorElectronicoDesde || undefined,
      comprobantesElectronicos:
        rucCacheData.comprobantesElectronicos || undefined,
      afiliadoPLEDesde: rucCacheData.afiliadoPLEDesde || undefined,
      padrones: rucCacheData.padrones || undefined,
      representantes: rucCacheData.representantes.map((rep) => ({
        tipoDocumento: rep.tipoDocumento || undefined,
        numeroDocumento: rep.numeroDocumento || undefined,
        nombre: rep.nombre,
        cargo: rep.cargo || undefined,
        fechaDesde: rep.fechaDesde || undefined,
      })),
    };
  }

  /**
   * Scraping de SUNAT para obtener datos básicos del RUC
   */
  private async scrapSunat(ruc: string): Promise<SunatQueryResponse> {
    try {
      // Configurar cliente HTTP con cookies
      await lastValueFrom(
        this.httpService.get(
          'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp',
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
              Host: 'e-consultaruc.sunat.gob.pe',
            },
          },
        ),
      );

      // Generar token aleatorio
      const sunatToken = this.generateSunatToken(52);

      // Datos del formulario
      const formData = new URLSearchParams({
        accion: 'consPorRuc',
        razSoc: '',
        nroRuc: ruc,
        nrodoc: '',
        token: sunatToken,
        contexto: 'ti-it',
        modo: '1',
        rbtnTipo: '1',
        search1: ruc,
        tipdoc: '1',
        search2: '',
        search3: '',
        codigo: '',
      });

      // Realizar consulta
      const postResponse = await lastValueFrom(
        this.httpService.post(
          'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias',
          formData.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
              Host: 'e-consultaruc.sunat.gob.pe',
            },
          },
        ),
      );

      // Parsear HTML con Cheerio
      const $ = cheerio.load(postResponse.data);
      const listGroupItems = $('.list-group .list-group-item');

      if (listGroupItems.length === 0) {
        throw new Error('RUC no encontrado');
      }

      const returnData: SunatQueryResponse = {};

      listGroupItems.each((_, element) => {
        const title = $(element).find('.col-sm-5 h4').text().trim();
        let value = $(element).find('.col-sm-7 p').text().trim();

        if (!value) {
          value = $(element).find('.col-sm-7 h4').text().trim();
        }

        if (!value) {
          value = $(element).find('.col-sm-7 table tbody tr td').text().trim();
        }

        switch (title) {
          case 'Número de RUC:': {
            // value = "20493096436 - EMPRESA S.A.C."
            const dashIndex = value.indexOf('-');
            if (dashIndex !== -1) {
              returnData.razonSocial = value.substring(dashIndex + 1).trim();
            }
            break;
          }
          case 'Tipo Contribuyente:': {
            returnData.tipoContribuyente = value;
            break;
          }
          case 'Nombre Comercial:': {
            returnData.nombreComercial = value === '-' ? undefined : value;
            break;
          }
          case 'Fecha de Inscripción:': {
            returnData.fechaInscripcion = value;
            break;
          }
          case 'Fecha de Inicio de Actividades:': {
            returnData.fechaInicioActividades = value;
            break;
          }
          case 'Estado del Contribuyente:': {
            returnData.estado = value;
            break;
          }
          case 'Condición del Contribuyente:': {
            returnData.condicion = value;
            break;
          }
          case 'Domicilio Fiscal:': {
            returnData.domicilioFiscal = value;
            break;
          }
          case 'Sistema Emisión de Comprobante:': {
            returnData.sistemaEmisionComprobante = value;
            break;
          }
          case 'Actividad Comercio Exterior:': {
            returnData.actividadComercioExterior = value;
            break;
          }
          case 'Sistema Contabilidad:': {
            returnData.sistemaContabilidad = value;
            break;
          }
          case 'Actividad(es) Económica(s):': {
            // Capturar actividades principal y secundarias
            const lines = value
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line);
            lines.forEach((line) => {
              if (line.includes('Principal -')) {
                const dashIndex = line.indexOf('-', line.indexOf('-') + 1);
                if (dashIndex !== -1) {
                  returnData.actividadPrincipal = line
                    .substring(dashIndex + 1)
                    .trim();
                }
              } else if (line.includes('Secundaria 1 -')) {
                const dashIndex = line.indexOf('-', line.indexOf('-') + 1);
                if (dashIndex !== -1) {
                  returnData.actividadSecundaria1 = line
                    .substring(dashIndex + 1)
                    .trim();
                }
              } else if (line.includes('Secundaria 2 -')) {
                const dashIndex = line.indexOf('-', line.indexOf('-') + 1);
                if (dashIndex !== -1) {
                  returnData.actividadSecundaria2 = line
                    .substring(dashIndex + 1)
                    .trim();
                }
              }
            });
            break;
          }
          case 'Comprobantes de Pago c/aut. de impresión (F. 806 u 816):': {
            returnData.comprobantesAutorizados = value;
            break;
          }
          case 'Sistema de Emisión Electrónica:': {
            returnData.sistemaEmisionElectronica = value;
            break;
          }
          case 'Emisor electrónico desde:': {
            returnData.emisorElectronicoDesde = value;
            break;
          }
          case 'Comprobantes Electrónicos:': {
            returnData.comprobantesElectronicos = value;
            break;
          }
          case 'Afiliado al PLE desde:': {
            returnData.afiliadoPLEDesde = value === '-' ? undefined : value;
            break;
          }
          case 'Padrones:': {
            returnData.padrones = value;
            break;
          }
        }
      });

      return returnData;
    } catch (error) {
      this.logger.error('Error en scraping SUNAT:', error);
      throw new Error('No se pudo obtener datos de SUNAT');
    }
  }

  /**
   * Obtener representantes legales de SUNAT
   */
  private async getRepresentantesSunat(ruc: string) {
    try {
      // Primera request para obtener cookies
      await lastValueFrom(
        this.httpService.get(
          'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/FrameCriterioBusquedaWeb.jsp',
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
              Host: 'e-consultaruc.sunat.gob.pe',
            },
          },
        ),
      );

      // Primero hacer la consulta básica del RUC para obtener los datos principales
      const sunatToken1 = this.generateSunatToken(52);
      const formData1 = new URLSearchParams({
        accion: 'consPorRuc',
        razSoc: '',
        nroRuc: ruc,
        nrodoc: '',
        token: sunatToken1,
        contexto: 'ti-it',
        modo: '1',
        rbtnTipo: '1',
        search1: ruc,
        tipdoc: '1',
        search2: '',
        search3: '',
        codigo: '',
      });

      await lastValueFrom(
        this.httpService.post(
          'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias',
          formData1.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
              Host: 'e-consultaruc.sunat.gob.pe',
            },
          },
        ),
      );

      // Ahora hacer la consulta específica de representantes legales
      const formDataRepresentantes = new URLSearchParams({
        accion: 'getRepLeg',
        contexto: 'ti-it',
        modo: '1',
        desRuc: '', // Se llenará automáticamente con el nombre de la empresa
        nroRuc: ruc,
      });

      const representantesResponse = await lastValueFrom(
        this.httpService.post(
          'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias',
          formDataRepresentantes.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
              Host: 'e-consultaruc.sunat.gob.pe',
            },
          },
        ),
      );

      // Parsear HTML con Cheerio para obtener representantes
      const $ = cheerio.load(representantesResponse.data);
      const representantes = [];

      // Buscar la tabla con los representantes legales
      $('table').each((_, table) => {
        const $table = $(table);
        const headers = $table.find('thead th, tr:first-child th');

        // Verificar si es la tabla de representantes (debe tener headers como Documento, Nro. Documento, Nombre, etc.)
        let isRepresentantesTable = false;
        headers.each((_, header) => {
          const headerText = $(header).text().trim().toLowerCase();
          if (
            headerText.includes('documento') ||
            headerText.includes('nombre') ||
            headerText.includes('cargo')
          ) {
            isRepresentantesTable = true;
          }
        });

        if (isRepresentantesTable) {
          $table.find('tbody tr').each((_, row) => {
            const cells = $(row).find('td');
            if (cells.length >= 3) {
              const tipoDoc = $(cells[0]).text().trim();
              const numeroDoc = $(cells[1]).text().trim();
              const nombre = $(cells[2]).text().trim();
              const cargo = cells.length > 3 ? $(cells[3]).text().trim() : '';
              const fecha = cells.length > 4 ? $(cells[4]).text().trim() : '';

              // Verificar que no sean headers y que tengan contenido válido
              if (
                nombre &&
                nombre !== 'Nombre' &&
                numeroDoc &&
                numeroDoc !== 'Nro. Documento' &&
                tipoDoc !== 'Documento'
              ) {
                representantes.push({
                  tipoDocumento: tipoDoc || 'DNI',
                  numeroDocumento: numeroDoc,
                  nombre: nombre.trim(),
                  cargo: cargo || 'REPRESENTANTE LEGAL',
                  fechaDesde: fecha,
                });
              }
            }
          });
        }
      });

      this.logger.log(
        `Encontrados ${representantes.length} representantes en SUNAT para RUC ${ruc}`,
      );
      return representantes;
    } catch (error) {
      this.logger.error('Error obteniendo representantes de SUNAT:', error);
      return [];
    }
  }

  /**
   * Obtener representantes legales de API Perú
   */
  private async getRepresentantesLegales(ruc: string) {
    const token = this.configService.get<string>('API_PERU_TOKEN');
    const baseUrl = this.configService.get<string>('API_PERU_BASE_URL');

    if (!token) {
      this.logger.warn(
        'API Peru token no configurado, omitiendo representantes',
      );
      return [];
    }

    try {
      const url = `${baseUrl}/ruc_representantes/${ruc}?api_token=${token}`;
      const response = await lastValueFrom(this.httpService.get(url));

      const data = response.data as ApiPeruRucRepresentantesResponse;

      return (data.data || []).map((rep) => ({
        tipoDocumento: rep.tipo_de_documento,
        numeroDocumento: rep.numero_de_documento,
        nombre: rep.nombre,
        cargo: rep.cargo,
        fechaDesde: rep.fecha_desde,
      }));
    } catch (error) {
      if (error.response?.status === 404) {
        this.logger.log(`No se encontraron representantes para RUC ${ruc}`);
        return [];
      }
      this.logger.error('Error obteniendo representantes:', error);
      return [];
    }
  }

  /**
   * Generar token aleatorio para SUNAT
   */
  private generateSunatToken(length: number): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Limpiar caché de RUC
   */
  async clearRucCache(): Promise<number> {
    try {
      const result = await this.prisma.rucCache.deleteMany({});
      this.logger.log(
        `Caché de RUC limpiado. ${result.count} registros eliminados`,
      );
      return result.count;
    } catch (error) {
      this.logger.error('Error al limpiar el caché de RUC:', error);
      throw new Error('No se pudo limpiar el caché de RUC');
    }
  }

  /**
   * Obtener estadísticas del caché de RUC
   */
  async getRucCacheStats(): Promise<{
    total: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
  }> {
    try {
      const total = await this.prisma.rucCache.count();
      const oldestRecord = await this.prisma.rucCache.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });
      const newestRecord = await this.prisma.rucCache.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      return {
        total,
        oldestRecord: oldestRecord?.createdAt || null,
        newestRecord: newestRecord?.createdAt || null,
      };
    } catch (error) {
      this.logger.error(
        'Error al obtener estadísticas del caché de RUC:',
        error,
      );
      throw new Error(
        'No se pudieron obtener las estadísticas del caché de RUC',
      );
    }
  }
}
