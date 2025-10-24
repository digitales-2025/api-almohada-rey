import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ImportExcelDto } from './dto/import-excel.dto';
import { UserData } from 'src/interfaces';
import * as ExcelJS from 'exceljs';
import {
  PaymentDetailMethod,
  PaymentDetailStatus,
  ReservationStatus,
} from '@prisma/client';
import { NormalizationUtils } from './utils/normalization.utils';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Función auxiliar para dividir array en lotes
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async importExcelData(importExcelDto: ImportExcelDto, user: UserData) {
    const { data, batchNumber = 1, totalBatches = 1 } = importExcelDto;

    // Validar límite de 1000 registros
    if (data.length > 1000) {
      throw new BadRequestException('Máximo 1000 registros por request');
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      batchNumber,
      totalBatches,
      processingTime: 0,
      internalBatches: [] as any[],
      unnormalizedNationalities: [] as string[],
    };

    const startTime = Date.now();
    const startTimeISO = new Date().toISOString();

    // OPTIMIZACIÓN: Procesar en lotes internos de 100 registros
    const internalBatchSize = 100;
    const internalBatches = this.chunkArray(data, internalBatchSize);

    this.logger.log(
      `🚀 INICIANDO IMPORTACIÓN - Batch ${batchNumber}/${totalBatches}`,
      {
        totalRecords: data.length,
        internalBatches: internalBatches.length,
        batchSize: internalBatchSize,
        startTime: startTimeISO,
        batchNumber,
        totalBatches,
      },
    );

    // Procesar cada lote interno
    for (
      let internalBatchIndex = 0;
      internalBatchIndex < internalBatches.length;
      internalBatchIndex++
    ) {
      const internalBatch = internalBatches[internalBatchIndex];
      const batchStartTime = Date.now();

      const batchStartTimeISO = new Date().toISOString();
      this.logger.log(
        `📦 PROCESANDO LOTE INTERNO ${internalBatchIndex + 1}/${internalBatches.length}`,
        {
          records: internalBatch.length,
          startTime: batchStartTimeISO,
          progress: `${((internalBatchIndex / internalBatches.length) * 100).toFixed(1)}%`,
        },
      );

      const internalBatchResults = {
        internalBatchNumber: internalBatchIndex + 1,
        totalRecords: internalBatch.length,
        successful: 0,
        failed: 0,
        errors: [] as any[],
        processingTime: 0,
      };

      // Procesar cada registro del lote interno (MANTENIENDO LA LÓGICA INDIVIDUAL)
      for (const [recordIndex, record] of internalBatch.entries()) {
        const globalRecordIndex =
          internalBatchIndex * internalBatchSize + recordIndex;

        try {
          // MANTENER TODA LA LÓGICA COMPLEJA INTACTA
          await this.processSingleRecord(record, user, results);
          internalBatchResults.successful++;
          results.successful++;
        } catch (error) {
          internalBatchResults.failed++;
          results.failed++;

          const errorInfo = {
            recordIndex: globalRecordIndex,
            internalBatchIndex: internalBatchIndex + 1,
            error: error.message,
            data: record,
          };

          internalBatchResults.errors.push(errorInfo);
          results.errors.push(errorInfo);

          this.logger.error(
            `Error procesando registro ${globalRecordIndex + 1} (lote interno ${internalBatchIndex + 1}): ${error.message}`,
            error.stack,
          );
        }
        results.processed++;
      }

      internalBatchResults.processingTime = Date.now() - batchStartTime;
      results.internalBatches.push(internalBatchResults);

      const batchEndTimeISO = new Date().toISOString();
      const avgTimePerRecord =
        internalBatchResults.processingTime / internalBatch.length;

      this.logger.log(`✅ LOTE INTERNO ${internalBatchIndex + 1} COMPLETADO`, {
        successful: internalBatchResults.successful,
        failed: internalBatchResults.failed,
        totalRecords: internalBatch.length,
        processingTime: `${internalBatchResults.processingTime}ms`,
        avgTimePerRecord: `${avgTimePerRecord.toFixed(2)}ms`,
        endTime: batchEndTimeISO,
        successRate: `${((internalBatchResults.successful / internalBatch.length) * 100).toFixed(1)}%`,
      });
    }

    results.processingTime = Date.now() - startTime;
    const endTimeISO = new Date().toISOString();
    const avgTimePerRecord = results.processingTime / data.length;
    const avgTimePerBatch = results.processingTime / internalBatches.length;

    this.logger.log(`🎉 BATCH ${batchNumber}/${totalBatches} COMPLETADO`, {
      totalRecords: data.length,
      successful: results.successful,
      failed: results.failed,
      successRate: `${((results.successful / data.length) * 100).toFixed(1)}%`,
      totalProcessingTime: `${results.processingTime}ms (${(results.processingTime / 1000).toFixed(2)}s)`,
      avgTimePerRecord: `${avgTimePerRecord.toFixed(2)}ms`,
      avgTimePerBatch: `${avgTimePerBatch.toFixed(2)}ms`,
      internalBatches: internalBatches.length,
      startTime: startTimeISO,
      endTime: endTimeISO,
      duration: `${(results.processingTime / 1000 / 60).toFixed(2)} minutos`,
    });

    // Crear reporte completo de nacionalidades
    const normalizationReport = {
      totalRecords: data.length,
      nationalitiesProcessed: results.processed,
      unnormalizedCount: results.unnormalizedNationalities.length,
      unnormalizedList: results.unnormalizedNationalities,
      normalizationRate:
        results.processed > 0
          ? `${(((results.processed - results.unnormalizedNationalities.length) / results.processed) * 100).toFixed(1)}%`
          : '0%',
    };

    return {
      success: true,
      ...results,
      normalizationReport,
    };
  }

  private async processSingleRecord(
    record: any,
    user: UserData,
    results?: any,
  ) {
    // Validar que no sea un registro corrupto (headers como datos)
    if (this.isCorruptRecord(record)) {
      this.logger.warn(
        'Registro corrupto detectado (headers como datos) - Procesando de todas formas',
      );
      // No lanzar error, continuar con el procesamiento
    }

    return await this.prisma.$transaction(
      async (prisma) => {
        // 1. Calcular fechas primero (necesario para createdAt del cliente)
        const { checkInDate, checkOutDate } =
          await this.calculateDatesWithStrategy(record, prisma);

        // 2. Normalizar y crear/buscar cliente (con fecha de check-in como createdAt)
        const customer = await this.findOrCreateCustomer(
          record,
          prisma,
          results,
          checkInDate,
        );

        // 3. Buscar habitación
        const room = await this.findRoomByNumberOrPrice(record, prisma);

        // 4. Buscar usuario
        const receptionist = await this.findUserByNameOrRandom(record, prisma);

        // 5. Crear reserva
        const reservation = await this.createReservation(
          record,
          customer,
          room,
          receptionist,
          prisma,
          checkInDate,
          checkOutDate,
        );

        // 5. Crear pago con detalles inteligentes
        const { payment, paymentDetails } = await this.createPaymentWithDetails(
          record,
          reservation,
          room,
          prisma,
        );

        // 6. Registrar auditoría
        await this.audit.create({
          entityId: reservation.id,
          entityType: 'reservation',
          action: 'CREATE',
          performedById: user.id,
          createdAt: new Date(),
        });

        return { customer, reservation, payment, paymentDetails };
      },
      {
        timeout: 30000, // 30 segundos para operaciones complejas de importación
      },
    );
  }

  private async findOrCreateCustomer(
    record: any,
    prisma: any,
    results?: any,
    checkInDate?: Date,
  ) {
    // Debug: Log del record para ver qué datos llegan
    this.logger.debug(
      'Processing customer record:',
      JSON.stringify(record, null, 2),
    );

    // Normalizar datos del cliente
    let documentType = NormalizationUtils.normalizeDocumentType(
      record['TIPO DOCUMENTO'],
    );
    let documentNumber = NormalizationUtils.normalizeDocumentNumber(
      record['Nº DOCUMENTO'],
      documentType,
    );

    // Si se generó un documento temporal, forzar tipo DNI y verificar unicidad
    if (documentNumber.startsWith('TEMP_')) {
      documentType = 'DNI';
      // Verificar que el documento temporal no exista ya
      documentNumber = await this.ensureUniqueDocumentNumber(
        documentNumber,
        prisma,
      );
    }

    // Validar que tenemos datos mínimos requeridos
    if (!record['APELLIDOS Y NOMBRES'] || !documentNumber) {
      throw new Error(
        `Datos insuficientes para crear cliente: nombre=${record['APELLIDOS Y NOMBRES']}, documento=${documentNumber}`,
      );
    }

    // Buscar cliente existente
    let customer = await prisma.customer.findUnique({
      where: { documentNumber },
    });

    if (!customer) {
      // Verificar si es un departamento/provincia/ciudad del Perú
      const peruvianDepartment = NormalizationUtils.detectPeruvianDepartment(
        record['NACIONALIDAD'],
      );

      let normalizedCountry: string | null;
      let normalizedDepartment: string | null = null;

      if (peruvianDepartment) {
        // Si es un departamento peruano, asignar Perú como país y el departamento correspondiente
        normalizedCountry = 'Perú';
        normalizedDepartment = peruvianDepartment;
      } else {
        // Normalizar como nacionalidad regular
        normalizedCountry = NormalizationUtils.normalizeNationality(
          record['NACIONALIDAD'],
          documentType,
        );
      }

      // Log nacionalidades que no pudieron normalizarse completamente
      // Solo si NO es un departamento peruano reconocido
      if (
        record['NACIONALIDAD'] &&
        record['NACIONALIDAD'].trim() &&
        !peruvianDepartment
      ) {
        const isStandardized = this.isStandardizedCountry(normalizedCountry);
        if (!isStandardized) {
          NormalizationUtils.logUnnormalizedNationality(
            record['NACIONALIDAD'],
            this.logger,
          );
          // Agregar a la lista de nacionalidades no normalizadas si results está disponible
          if (results && results.unnormalizedNationalities) {
            const nationality = record['NACIONALIDAD'].trim();
            if (!results.unnormalizedNationalities.includes(nationality)) {
              results.unnormalizedNationalities.push(nationality);
            }
          }
        }
      }

      // Crear nuevo cliente
      customer = await prisma.customer.create({
        data: {
          name: record['APELLIDOS Y NOMBRES'],
          documentType,
          documentNumber,
          address: record['DOMICILIO'] || null,
          phone: NormalizationUtils.normalizePhone(record['TELEFONO']),
          occupation: record['OCUPACIÓN'] || null,
          email: record['EMAIL'] || null,
          maritalStatus: NormalizationUtils.normalizeMaritalStatus(
            record['ESTADO CIVIL'],
          ),
          companyName: record['EMPRESA'] || null,
          ruc: NormalizationUtils.validateRUC(record['RUC']),
          companyAddress: record['DIRECCION'] || null,
          isBlacklist: NormalizationUtils.normalizeBlacklist(
            record['LISTA NEGRA'],
          ),
          country: normalizedCountry,
          department: normalizedDepartment,
          isActive: true,
          mustCompleteData: true,
          createdByLandingPage: false,
          createdAt:
            checkInDate && !isNaN(checkInDate.getTime())
              ? checkInDate
              : new Date(), // Validar que checkInDate sea válido
        },
      });
    }

    return customer;
  }

  private async findRoomByNumberOrPrice(record: any, prisma: any) {
    const roomNumber = record['HABITACION'];
    const roomType = record['TIPO HABITACION'];
    const price = parseFloat(record['PRECIO']) || 0;
    const days = parseInt(record['DIAS DE ALOJAMIENTO']) || 1;

    // 1. Buscar por número de habitación exacto
    if (roomNumber && !isNaN(parseInt(roomNumber))) {
      const room = await prisma.room.findFirst({
        where: {
          number: parseInt(roomNumber),
          isActive: true,
        },
        include: { RoomTypes: true },
      });

      if (room) {
        return room;
      }
    }

    // 2. Buscar por tipo de habitación
    let roomTypes = [];
    if (roomType) {
      roomTypes = await prisma.roomTypes.findMany({
        where: {
          isActive: true,
          name: {
            contains: roomType,
            mode: 'insensitive',
          },
        },
      });
    }

    // 3. Si no encontró por tipo, buscar por precio
    if (roomTypes.length === 0) {
      const allRoomTypes = await prisma.roomTypes.findMany({
        where: { isActive: true },
      });

      if (allRoomTypes.length > 0) {
        // Calcular precio por noche
        const pricePerNight = price / days;

        // Encontrar el tipo con precio más cercano
        const closestType = allRoomTypes.reduce((closest, current) => {
          const currentDiff = Math.abs(current.price - pricePerNight);
          const closestDiff = Math.abs(closest.price - pricePerNight);
          return currentDiff < closestDiff ? current : closest;
        });

        roomTypes = [closestType];
      }
    }

    // 4. Buscar habitación del tipo encontrado
    if (roomTypes.length > 0) {
      const closestRoomType = roomTypes[0];

      const room = await prisma.room.findFirst({
        where: {
          roomTypeId: closestRoomType.id,
          isActive: true,
        },
        include: { RoomTypes: true },
      });

      if (room) {
        return room;
      }
    }

    // 5. Como último recurso, buscar cualquier habitación disponible (aleatoria)
    const allRooms = await prisma.room.findMany({
      where: {
        isActive: true,
      },
      include: { RoomTypes: true },
    });

    if (allRooms.length > 0) {
      // Seleccionar habitación aleatoria
      const randomIndex = Math.floor(Math.random() * allRooms.length);
      const randomRoom = allRooms[randomIndex];
      this.logger.warn(
        `No se encontró habitación específica, asignando habitación aleatoria: ${randomRoom.number}`,
      );
      return randomRoom;
    }

    // 6. Si no hay habitaciones en la BD, lanzar error
    throw new BadRequestException(
      'No hay habitaciones disponibles en la base de datos',
    );
  }

  private async findUserByNameOrRandom(record: any, prisma: any) {
    const receptionistName = record['RECEPCIONISTA CHECK IN'];

    if (receptionistName) {
      // Buscar usuario por nombre
      const user = await prisma.user.findFirst({
        where: {
          userRol: 'RECEPCIONIST',
          name: {
            contains: receptionistName,
            mode: 'insensitive',
          },
        },
      });

      if (user) {
        return user;
      }
    }

    // Si no se encuentra, asignar aleatoriamente
    const receptionists = await prisma.user.findMany({
      where: { userRol: 'RECEPCIONIST' },
    });

    if (receptionists.length === 0) {
      throw new BadRequestException('No hay recepcionistas disponibles');
    }

    const randomIndex = Math.floor(Math.random() * receptionists.length);
    return receptionists[randomIndex];
  }

  private async createReservation(
    record: any,
    customer: any,
    room: any,
    user: any,
    prisma: any,
    checkInDate: Date,
    checkOutDate: Date,
  ) {
    // Fechas ya calculadas desde processSingleRecord

    // ✅ CORRECCIÓN: Convertir fechas Date a ISO string para Prisma
    const reservation = await prisma.reservation.create({
      data: {
        customerId: customer.id,
        roomId: room.id,
        userId: user.id,
        reservationDate: checkInDate.toISOString(), // ✅ Convertir a ISO
        checkInDate: checkInDate.toISOString(), // ✅ Convertir a ISO
        checkOutDate: checkOutDate.toISOString(), // ✅ Convertir a ISO
        status: ReservationStatus.CHECKED_OUT,
        origin: record['PROCEDENCIA'] || null,
        reason: record['MOTIVO DE VIAJE'] || null,
        guests: NormalizationUtils.createGuestsJSON(
          record['ACOMPAÑANTE'],
          record['DOCUMENTO ACOMPAÑANTE'],
        ),
        observations: record['OBSERVACIONES'] || null,
        isActive: false, // ✅ CORRECCIÓN: CHECKED_OUT debe tener isActive: false
        createdByLandingPage: false,
        createdAt:
          checkInDate && !isNaN(checkInDate.getTime())
            ? checkInDate
            : new Date(), // Validar que checkInDate sea válido
      },
    });

    return reservation;
  }

  private async createPaymentWithDetails(
    record: any,
    reservation: any,
    room: any,
    prisma: any,
  ) {
    const priceStr = record['PRECIO']?.toString().trim() || '';

    // Limpiar formato de precio (S/ 25,84 → 25.84)
    const cleanPriceStr = priceStr
      .replace(/S\/\s*/g, '') // Quitar "S/ "
      .replace(/,/g, '.') // Cambiar comas por puntos
      .replace(/\s+/g, '') // Quitar espacios
      .trim();

    let excelAmount = parseFloat(cleanPriceStr);

    // Si no hay precio válido, usar el precio de la habitación
    if (isNaN(excelAmount) || excelAmount <= 0) {
      excelAmount = room.RoomTypes.price;
      this.logger.warn(
        `Precio inválido "${priceStr}", usando precio de habitación: ${excelAmount}`,
      );
    }

    const roomPrice = room.RoomTypes.price;

    // ✅ Convertir fechas ISO string a Date para calcular noches
    const checkInDateObj = new Date(reservation.checkInDate);
    const checkOutDateObj = new Date(reservation.checkOutDate);
    const nights = NormalizationUtils.calculateNights(
      checkInDateObj,
      checkOutDateObj,
    );
    const roomTotal = roomPrice * nights;

    // Generar código de pago basado en la fecha del pago
    const paymentCode = await this.generatePaymentCode(checkInDateObj);

    // ✅ CORRECCIÓN: Usar el utils para generar fecha random entre check-in y check-out
    const paymentDateISO = NormalizationUtils.generateRandomDateInRange(
      checkInDateObj,
      checkOutDateObj,
      'date', // Usar formato de fecha para compatibilidad con frontend
    );

    // Crear pago principal
    const payment = await prisma.payment.create({
      data: {
        code: paymentCode,
        amount: excelAmount,
        amountPaid: excelAmount, // 100% pagado
        status: PaymentDetailStatus.PAID,
        date: paymentDateISO, // ✅ Ya es string ISO
        reservationId: reservation.id,
        createdAt:
          checkInDateObj &&
          !isNaN(checkInDateObj.getTime()) &&
          checkOutDateObj &&
          !isNaN(checkOutDateObj.getTime())
            ? new Date(
                NormalizationUtils.generateRandomDateInRange(
                  checkInDateObj,
                  checkOutDateObj,
                  'iso', // Usar ISO completo para createdAt
                ),
              )
            : new Date(), // Validar que las fechas sean válidas
      },
    });

    const paymentDetails = [];

    // 1. Siempre crear detalle de habitación
    const roomDetail = await prisma.paymentDetail.create({
      data: {
        paymentId: payment.id,
        paymentDate: paymentDateISO, // ✅ Usar fecha ISO
        description: `Habitación ${room.number} - ${nights} noche(s)`,
        type: 'ROOM_RESERVATION',
        method: NormalizationUtils.normalizePaymentMethod(
          record['FORMA DE PAGO'],
        ),
        status: PaymentDetailStatus.PAID,
        roomId: room.id,
        unitPrice: roomPrice,
        subtotal: roomTotal,
        days: nights,
        createdAt:
          checkInDateObj &&
          !isNaN(checkInDateObj.getTime()) &&
          checkOutDateObj &&
          !isNaN(checkOutDateObj.getTime())
            ? new Date(
                NormalizationUtils.generateRandomDateInRange(
                  checkInDateObj,
                  checkOutDateObj,
                  'iso', // Usar ISO completo para createdAt
                ),
              )
            : new Date(), // Validar que las fechas sean válidas
      },
    });
    paymentDetails.push(roomDetail);

    // 2. Calcular sobrante y distribuirlo
    const remainingAmount = excelAmount - roomTotal;

    if (remainingAmount > 0) {
      const additionalDetails = await this.distributeRemainingAmount(
        remainingAmount,
        nights,
        payment.id,
        NormalizationUtils.normalizePaymentMethod(record['FORMA DE PAGO']),
        checkInDateObj, // ✅ Pasar Date object
        checkOutDateObj, // ✅ Pasar Date object
        prisma,
      );
      paymentDetails.push(...additionalDetails);
    }

    // 3. Si hay tipo de documento, crear detalle adicional
    const documentType = NormalizationUtils.normalizePaymentDocumentType(
      record['TIPO DE DOCUMENTO'],
    );
    if (documentType) {
      const documentDetail = await prisma.paymentDetail.create({
        data: {
          paymentId: payment.id,
          paymentDate: paymentDateISO, // ✅ Usar fecha ISO
          description: `Documento: ${documentType}`,
          type: 'EXTRA_SERVICE',
          method: NormalizationUtils.normalizePaymentMethod(
            record['FORMA DE PAGO'],
          ),
          status: PaymentDetailStatus.PAID,
          unitPrice: 0,
          subtotal: 0,
          typePaymentDetail: documentType,
          createdAt:
            checkInDateObj &&
            !isNaN(checkInDateObj.getTime()) &&
            checkOutDateObj &&
            !isNaN(checkOutDateObj.getTime())
              ? new Date(
                  NormalizationUtils.generateRandomDateInRange(
                    checkInDateObj,
                    checkOutDateObj,
                    'iso', // Usar ISO completo para createdAt
                  ),
                )
              : new Date(), // Validar que las fechas sean válidas
        },
      });
      paymentDetails.push(documentDetail);
    }

    return { payment, paymentDetails };
  }

  private async distributeRemainingAmount(
    remainingAmount: number,
    nights: number,
    paymentId: string,
    paymentMethod: PaymentDetailMethod,
    checkIn: Date,
    checkOut: Date,
    prisma: any,
  ) {
    const paymentDetails = [];

    // 1. Buscar servicio de desayuno
    const breakfastService = await prisma.service.findFirst({
      where: {
        name: {
          contains: 'desayuno',
          mode: 'insensitive',
        },
      },
    });

    let remainingForProducts = remainingAmount;

    // 2. Si hay servicio de desayuno, calcular cuántos podemos pagar
    if (breakfastService) {
      const breakfastPrice = breakfastService.price;
      const maxBreakfasts = Math.floor(remainingAmount / breakfastPrice);
      const breakfastsToAdd = Math.min(maxBreakfasts, nights);

      if (breakfastsToAdd > 0) {
        const breakfastDetail = await prisma.paymentDetail.create({
          data: {
            paymentId,
            paymentDate: NormalizationUtils.generateRandomDateInRange(
              checkIn,
              checkOut,
              'date', // Usar formato de fecha para compatibilidad con frontend
            ),
            description: `Desayuno - ${breakfastsToAdd} día(s)`,
            type: 'EXTRA_SERVICE',
            method: paymentMethod,
            status: PaymentDetailStatus.PAID,
            serviceId: breakfastService.id,
            unitPrice: breakfastPrice,
            subtotal: breakfastPrice * breakfastsToAdd,
            quantity: breakfastsToAdd,
            createdAt:
              checkIn &&
              !isNaN(checkIn.getTime()) &&
              checkOut &&
              !isNaN(checkOut.getTime())
                ? new Date(
                    NormalizationUtils.generateRandomDateInRange(
                      checkIn,
                      checkOut,
                      'iso', // Usar ISO completo para createdAt
                    ),
                  )
                : new Date(), // Validar que las fechas sean válidas
          },
        });
        paymentDetails.push(breakfastDetail);
        remainingForProducts -= breakfastPrice * breakfastsToAdd;
      }
    }

    // 3. Distribuir el resto en productos
    if (remainingForProducts > 0) {
      const productDetails = await this.distributeInProducts(
        remainingForProducts,
        paymentId,
        paymentMethod,
        checkIn,
        checkOut,
        prisma,
      );
      paymentDetails.push(...productDetails);
    }

    return paymentDetails;
  }

  private async distributeInProducts(
    amount: number,
    paymentId: string,
    paymentMethod: PaymentDetailMethod,
    checkIn: Date,
    checkOut: Date,
    prisma: any,
  ) {
    const paymentDetails = [];

    // Buscar productos disponibles (ordenados por precio)
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        type: 'COMMERCIAL',
      },
      orderBy: { unitCost: 'asc' },
    });

    let remainingAmount = amount;

    // Distribuir en productos de menor a mayor precio
    for (const product of products) {
      if (remainingAmount <= 0) break;

      // Calcular cuántas unidades de este producto podemos comprar
      const maxQuantity = Math.floor(remainingAmount / product.unitCost);

      if (maxQuantity > 0) {
        const quantity = Math.min(maxQuantity, 5); // Máximo 5 unidades por producto
        const subtotal = product.unitCost * quantity;

        const productDetail = await prisma.paymentDetail.create({
          data: {
            paymentId,
            paymentDate: NormalizationUtils.generateRandomDateInRange(
              checkIn,
              checkOut,
              'date', // Usar formato de fecha para compatibilidad con frontend
            ),
            description: `${product.name} - ${quantity} unidad(es)`,
            type: 'EXTRA_SERVICE',
            method: paymentMethod,
            status: PaymentDetailStatus.PAID,
            productId: product.id,
            unitPrice: product.unitCost,
            subtotal: subtotal,
            quantity: quantity,
            createdAt:
              checkIn &&
              !isNaN(checkIn.getTime()) &&
              checkOut &&
              !isNaN(checkOut.getTime())
                ? new Date(
                    NormalizationUtils.generateRandomDateInRange(
                      checkIn,
                      checkOut,
                      'iso', // Usar ISO completo para createdAt
                    ),
                  )
                : new Date(), // Validar que las fechas sean válidas
          },
        });

        paymentDetails.push(productDetail);
        remainingAmount -= subtotal;
      }
    }

    // Si queda sobrante muy pequeño, agregarlo al último producto
    if (remainingAmount > 0 && paymentDetails.length > 0) {
      const lastDetail = paymentDetails[paymentDetails.length - 1];
      await prisma.paymentDetail.update({
        where: { id: lastDetail.id },
        data: {
          subtotal: lastDetail.subtotal + remainingAmount,
          description: `${lastDetail.description} + ajuste`,
        },
      });
    }

    return paymentDetails;
  }

  private async generatePaymentCode(paymentDate: Date): Promise<string> {
    const paymentYear = paymentDate.getFullYear();
    const prefix = `PAG-${paymentYear}-`;

    let lastIncrement = 0;
    let paymentCode = '';
    let isUnique = false;

    while (!isUnique) {
      const lastPayment = await this.prisma.payment.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: 'desc' },
      });

      if (lastPayment && lastPayment.code.split('.').length === 3) {
        lastIncrement = parseInt(lastPayment.code.split('.')[2], 10);
      }

      paymentCode = `${prefix}${String(lastIncrement + 1).padStart(3, '0')}`;

      const existingPayment = await this.prisma.payment.findUnique({
        where: { code: paymentCode },
      });

      if (!existingPayment) {
        isUnique = true;
      } else {
        lastIncrement++;
      }
    }

    return paymentCode;
  }

  async importExcelFile(file: Express.Multer.File, user: UserData) {
    if (!file) {
      throw new BadRequestException('Archivo Excel requerido');
    }

    // Validar tipo de archivo
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten archivos Excel (.xlsx, .xls)',
      );
    }

    try {
      // Leer el archivo Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException(
          'El archivo Excel no contiene hojas de trabajo',
        );
      }

      // Obtener los headers (primera fila) - forzar como texto
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Forzar lectura como texto, colNumber empieza en 1
        headers[colNumber - 1] = cell.text || cell.value?.toString() || '';
      });

      // Convertir datos a formato esperado
      const data = [];
      const rowCount = worksheet.rowCount;

      for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const record: any = {};

        // Iterar sobre cada header y obtener el valor de la celda correspondiente
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const header = headers[colIndex];
          if (header) {
            // colIndex es 0-based, pero getCell usa 1-based
            const cell = row.getCell(colIndex + 1);
            // Usar cell.text para obtener el valor original como texto
            let cellValue = cell.text;

            // Si cell.text está vacío, intentar con cell.value
            if (!cellValue && cell.value !== null && cell.value !== undefined) {
              if (cell.value instanceof Date) {
                // Para fechas, usar formato específico
                cellValue = this.formatDateForExcel(cell.value);
              } else {
                cellValue = cell.value.toString();
              }
            }

            record[header] = cellValue || '';
          }
        }

        // Solo agregar filas que tengan al menos un campo con valor
        if (
          Object.values(record).some(
            (value) =>
              value && typeof value === 'string' && value.trim() !== '',
          )
        ) {
          data.push(record);
        }
      }

      if (data.length === 0) {
        throw new BadRequestException(
          'No se encontraron datos válidos en el archivo Excel',
        );
      }

      // Procesar en lotes de 1000
      const BATCH_SIZE = 1000;
      const totalBatches = Math.ceil(data.length / BATCH_SIZE);
      const results = {
        totalRecords: data.length,
        totalBatches,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        batches: [],
      };

      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

        try {
          const batchResult = await this.importExcelData(
            {
              data: batch,
              batchNumber,
              totalBatches,
            },
            user,
          );

          results.processed += batchResult.processed;
          results.successful += batchResult.successful;
          results.failed += batchResult.failed;
          results.errors.push(...batchResult.errors);
          results.batches.push({
            batchNumber,
            ...batchResult,
          });
        } catch (error) {
          results.failed += batch.length;
          results.errors.push({
            batchNumber,
            error: error.message,
            records: batch.length,
          });
          results.batches.push({
            batchNumber,
            processed: batch.length,
            successful: 0,
            failed: batch.length,
            error: error.message,
          });
        }
      }

      // Generar resumen de errores
      const errorSummary = this.generateErrorSummary(results.errors);

      return {
        success: true,
        message: `Importación completada: ${results.successful} exitosos, ${results.failed} fallidos`,
        errorSummary,
        ...results,
      };
    } catch (error) {
      this.logger.error(
        `Error processing Excel file: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Error al procesar el archivo Excel: ${error.message}`,
      );
    }
  }

  private generateErrorSummary(errors: any[]) {
    const errorCounts: { [key: string]: number } = {};
    const sampleErrors: { [key: string]: any[] } = {};

    errors.forEach((error) => {
      const errorMessage = error.error || 'Error desconocido';
      const errorType = this.categorizeError(errorMessage);

      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;

      if (!sampleErrors[errorType]) {
        sampleErrors[errorType] = [];
      }

      if (sampleErrors[errorType].length < 3) {
        sampleErrors[errorType].push({
          recordIndex: error.recordIndex,
          error: errorMessage,
          sampleData: error.data
            ? {
                nombre: error.data['APELLIDOS Y NOMBRES'],
                documento: error.data['Nº DOCUMENTO'],
                habitacion: error.data['HABITACION'],
              }
            : null,
        });
      }
    });

    return {
      totalErrors: errors.length,
      errorTypes: Object.keys(errorCounts).map((errorType) => ({
        type: errorType,
        count: errorCounts[errorType],
        percentage: ((errorCounts[errorType] / errors.length) * 100).toFixed(1),
        samples: sampleErrors[errorType],
      })),
    };
  }

  private categorizeError(errorMessage: string): string {
    if (errorMessage.includes('Datos insuficientes para crear cliente')) {
      return 'Datos de cliente incompletos';
    }
    if (errorMessage.includes('Habitación no encontrada')) {
      return 'Habitación no encontrada';
    }
    if (errorMessage.includes('Usuario no encontrado')) {
      return 'Usuario no encontrado';
    }
    if (errorMessage.includes('Error al crear reserva')) {
      return 'Error al crear reserva';
    }
    if (errorMessage.includes('Error al crear pago')) {
      return 'Error al crear pago';
    }
    if (errorMessage.includes('Fecha inválida')) {
      return 'Fecha inválida';
    }
    if (errorMessage.includes('Precio inválido')) {
      return 'Precio inválido';
    }
    return 'Otros errores';
  }

  private formatDateForExcel(date: Date): string {
    // Formatear fecha como dd/mm/yyyy para mantener consistencia con Excel
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private async ensureUniqueDocumentNumber(
    documentNumber: string,
    prisma: any,
  ): Promise<string> {
    let currentDocument = documentNumber;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { documentNumber: currentDocument },
      });

      if (!existingCustomer) {
        return currentDocument;
      }

      // Si existe, generar uno nuevo
      currentDocument = NormalizationUtils.generateTemporaryDocumentNumber();
      attempts++;
    }

    // Si después de 10 intentos no encontramos uno único, usar timestamp
    const timestamp = Date.now().toString().slice(-8);
    return `TEMP_${timestamp}`;
  }

  private async calculateDaysFromPrice(
    record: any,
    prisma: any,
  ): Promise<number> {
    // PRIMERO: Intentar usar DIAS DE ALOJAMIENTO si está disponible
    const daysStr = record['DIAS DE ALOJAMIENTO']?.toString().trim();
    const days = parseInt(daysStr);
    if (!isNaN(days) && days > 0) {
      return Math.min(days, 30); // Máximo 30 días
    }

    // SEGUNDO: Calcular basado en precio
    const priceStr = record['PRECIO']?.toString().trim() || '';
    const cleanPriceStr = priceStr
      .replace(/S\/\s*/g, '')
      .replace(/,/g, '.')
      .replace(/\s+/g, '')
      .trim();

    const totalPrice = parseFloat(cleanPriceStr);

    if (isNaN(totalPrice) || totalPrice <= 0) {
      return 1; // Por defecto 1 día si no hay precio válido
    }

    const roomType = record['TIPO HABITACION'];

    // Buscar el tipo de habitación más cercano al precio
    let roomTypes = [];
    if (roomType) {
      roomTypes = await prisma.roomTypes.findMany({
        where: {
          isActive: true,
          name: { contains: roomType, mode: 'insensitive' },
        },
      });
    }

    // Si no encontró por tipo, buscar todos los tipos activos
    if (roomTypes.length === 0) {
      roomTypes = await prisma.roomTypes.findMany({
        where: { isActive: true },
      });
    }

    if (roomTypes.length === 0) {
      return 1; // Por defecto 1 día si no hay tipos de habitación
    }

    // Encontrar el tipo de habitación con precio más cercano
    const closestRoomType = roomTypes.reduce((closest, current) => {
      const currentDiff = Math.abs(current.price - totalPrice);
      const closestDiff = Math.abs(closest.price - totalPrice);
      return currentDiff < closestDiff ? current : closest;
    });

    // Calcular días basado en el precio total y precio por noche
    const calculatedDays = Math.floor(totalPrice / closestRoomType.price);

    // Asegurar que sea al menos 1 día y máximo 30 días
    return Math.max(1, Math.min(calculatedDays, 30));
  }

  private isCorruptRecord(record: any): boolean {
    // Detectar si el registro contiene headers como datos
    const headerValues = [
      'COMPROBANTE',
      'Nº',
      'TIPO DE CLIENTE',
      'TIPO HABITACION',
      'DIAS DE ALOJAMIENTO',
      'PRECIO',
      'FORMA DE PAGO',
      'PAGO',
      'OBSERVACIONES',
    ];

    // Si más de 3 campos contienen valores que son headers, es corrupto
    let headerCount = 0;
    for (const header of headerValues) {
      if (record[header] && headerValues.includes(record[header])) {
        headerCount++;
      }
    }

    return headerCount >= 3;
  }

  /**
   * Verifica si un país está en la lista de países estandarizados
   * @param country País a verificar
   * @returns true si está estandarizado, false si es un valor no reconocido
   */
  private isStandardizedCountry(country: string | null): boolean {
    if (!country) return true; // null está permitido

    const standardizedCountries = [
      'Perú',
      'Argentina',
      'Bolivia',
      'Brasil',
      'Chile',
      'Colombia',
      'Ecuador',
      'Paraguay',
      'Uruguay',
      'Venezuela',
      'México',
      'Panamá',
      'Costa Rica',
      'Nicaragua',
      'Honduras',
      'El Salvador',
      'Guatemala',
      'Belice',
      'Cuba',
      'República Dominicana',
      'Puerto Rico',
      'Estados Unidos',
      'Canadá',
      'España',
      'Francia',
      'Italia',
      'Alemania',
      'Reino Unido',
      'Portugal',
      'Países Bajos',
      'Bélgica',
      'Suecia',
      'Noruega',
      'Dinamarca',
      'Finlandia',
      'Irlanda',
      'Austria',
      'Suiza',
      'Polonia',
      'República Checa',
      'Rusia',
      'Ucrania',
      'China',
      'Japón',
      'Corea del Sur',
      'Corea del Norte',
      'India',
      'Tailandia',
      'Filipinas',
      'Vietnam',
      'Indonesia',
      'Australia',
      'Nueva Zelanda',
      'Líbano',
      'Siria',
      'Irak',
      'Irán',
      'Israel',
      'Otro',
    ];

    return standardizedCountries.includes(country);
  }

  private async calculateDatesWithStrategy(
    record: any,
    prisma: any,
  ): Promise<{ checkInDate: Date; checkOutDate: Date }> {
    // PRIORIDAD 1: DIAS DE ALOJAMIENTO
    const daysStr = record['DIAS DE ALOJAMIENTO']?.toString().trim();
    const days = parseInt(daysStr);
    const hasValidDays = !isNaN(days) && days > 0;

    // PRIORIDAD 2: FECHAS DIRECTAS
    let checkInDate: Date | null = null;
    let checkOutDate: Date | null = null;

    // Intentar parsear fecha de entrada
    try {
      if (
        record['FECHA'] &&
        record['FECHA'].trim() !== '' &&
        record['FECHA'].trim() !== ' '
      ) {
        checkInDate = NormalizationUtils.parseDateTime(
          record['FECHA'],
          record['HORA'],
        );
      }
    } catch (error) {
      this.logger.warn(`Error parseando fecha de entrada: ${error.message}`);
    }

    // Intentar parsear fecha de salida
    try {
      if (
        record['FECHA DE SALIDA'] &&
        record['FECHA DE SALIDA'].trim() !== ''
      ) {
        checkOutDate = NormalizationUtils.parseDateTime(
          record['FECHA DE SALIDA'],
          record['HORA DE SALIDA'],
        );
      }
    } catch (error) {
      this.logger.warn(`Error parseando fecha de salida: ${error.message}`);
    }

    // ESTRATEGIA DE CÁLCULO
    if (hasValidDays) {
      // CASO 1: Tenemos días válidos

      if (checkInDate && checkOutDate) {
        // Verificar si la fecha de salida es razonable (no más de 1 año de diferencia)
        const daysDifference = Math.abs(
          (checkOutDate.getTime() - checkInDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysDifference > 365) {
          // Fecha de salida muy lejana, recalcular usando días
          checkOutDate = new Date(checkInDate);
          checkOutDate.setDate(checkOutDate.getDate() + days);
          checkOutDate.setHours(12, 0, 0, 0);
        }
        // Si la diferencia es razonable, usar las fechas tal como están
      } else if (checkInDate && !checkOutDate) {
        // Solo tenemos check-in, calcular check-out
        checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + days);
        checkOutDate.setHours(12, 0, 0, 0);
      } else if (!checkInDate && checkOutDate) {
        // Solo tenemos check-out, calcular check-in
        checkInDate = new Date(checkOutDate);
        checkInDate.setDate(checkInDate.getDate() - days);
        checkInDate.setHours(12, 0, 0, 0);
      } else {
        // No tenemos fechas, usar fecha por defecto y calcular
        checkInDate = new Date('2022-01-01T12:00:00');
        checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + days);
        checkOutDate.setHours(12, 0, 0, 0);
      }
    } else {
      // CASO 2: No tenemos días válidos

      if (checkInDate && checkOutDate) {
        // Usar las fechas tal como están
      } else if (checkInDate && !checkOutDate) {
        // Calcular días basado en DIAS DE ALOJAMIENTO o precio
        const calculatedDays = await this.calculateDaysFromPrice(
          record,
          prisma,
        );
        checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + calculatedDays);
        checkOutDate.setHours(12, 0, 0, 0);
      } else if (!checkInDate && checkOutDate) {
        // Calcular días basado en DIAS DE ALOJAMIENTO o precio
        const calculatedDays = await this.calculateDaysFromPrice(
          record,
          prisma,
        );
        checkInDate = new Date(checkOutDate);
        checkInDate.setDate(checkInDate.getDate() - calculatedDays);
        checkInDate.setHours(12, 0, 0, 0);
      } else {
        // No tenemos nada, usar valores por defecto
        checkInDate = new Date('2022-01-01T12:00:00');
        checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        checkOutDate.setHours(12, 0, 0, 0);
      }
    }

    // VALIDACIÓN FINAL: Asegurar que las fechas sean diferentes
    if (checkInDate && checkOutDate) {
      const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
      if (timeDiff <= 0) {
        // Si check-out es igual o anterior a check-in, agregar 1 día
        checkOutDate = new Date(checkInDate);
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        checkOutDate.setHours(12, 0, 0, 0);
      }
    }

    return { checkInDate, checkOutDate };
  }

  async deleteDataByExcel(file: Express.Multer.File, user: UserData) {
    if (!file) {
      throw new BadRequestException('Archivo Excel requerido');
    }

    // Verificaciones de seguridad
    if (!user || !user.id) {
      throw new BadRequestException(
        'Usuario no válido para realizar la eliminación',
      );
    }

    if (user.userRol !== 'ADMIN') {
      throw new BadRequestException(
        'Solo los administradores pueden realizar eliminaciones',
      );
    }

    // Validar tipo de archivo
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten archivos Excel (.xlsx, .xls)',
      );
    }

    try {
      // Leer el archivo Excel (reutilizar lógica de importExcelFile)
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException(
          'El archivo Excel no contiene hojas de trabajo',
        );
      }

      // Obtener los headers (primera fila)
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = cell.text || cell.value?.toString() || '';
      });

      // Convertir datos a formato esperado
      const data = [];
      const rowCount = worksheet.rowCount;

      for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const record: any = {};

        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const header = headers[colIndex];
          if (header) {
            const cell = row.getCell(colIndex + 1);
            let cellValue = cell.text;

            if (!cellValue && cell.value !== null && cell.value !== undefined) {
              if (cell.value instanceof Date) {
                cellValue = this.formatDateForExcel(cell.value);
              } else {
                cellValue = cell.value.toString();
              }
            }

            record[header] = cellValue || '';
          }
        }

        // Solo agregar filas que tengan al menos un campo con valor
        if (
          Object.values(record).some(
            (value) =>
              value && typeof value === 'string' && value.trim() !== '',
          )
        ) {
          data.push(record);
        }
      }

      if (data.length === 0) {
        throw new BadRequestException(
          'No se encontraron datos válidos en el archivo Excel',
        );
      }

      this.logger.log(`Iniciando eliminación de ${data.length} registros...`, {
        userId: user.id,
        totalRecords: data.length,
      });

      // OPTIMIZACIÓN: Procesar en lotes internos de 50 registros para eliminación
      const internalBatchSize = 50;
      const internalBatches = this.chunkArray(data, internalBatchSize);

      this.logger.log(
        `Procesando en ${internalBatches.length} lotes internos de ${internalBatchSize} registros cada uno`,
      );

      const results = {
        processed: 0,
        deleted: 0,
        notFound: 0,
        errors: [],
        deletedCounts: {
          customers: 0,
          reservations: 0,
          payments: 0,
          paymentDetails: 0,
          auditLogs: 0,
        },
        internalBatches: [] as any[],
      };

      // Procesar cada lote interno
      for (
        let internalBatchIndex = 0;
        internalBatchIndex < internalBatches.length;
        internalBatchIndex++
      ) {
        const internalBatch = internalBatches[internalBatchIndex];
        const batchStartTime = Date.now();

        this.logger.log(
          `🗑️ PROCESANDO LOTE DE ELIMINACIÓN ${internalBatchIndex + 1}/${internalBatches.length}`,
          {
            records: internalBatch.length,
            startTime: new Date().toISOString(),
            progress: `${((internalBatchIndex / internalBatches.length) * 100).toFixed(1)}%`,
          },
        );

        const internalBatchResults = {
          internalBatchNumber: internalBatchIndex + 1,
          totalRecords: internalBatch.length,
          deleted: 0,
          notFound: 0,
          errors: [] as any[],
          processingTime: 0,
        };

        // Procesar cada registro del lote interno
        for (const [recordIndex, record] of internalBatch.entries()) {
          const globalRecordIndex =
            internalBatchIndex * internalBatchSize + recordIndex;

          try {
            const deleteResult = await this.prisma.$transaction(
              async (prisma) => {
                return await this.deleteSingleRecord(record, prisma, user);
              },
              {
                timeout: 30000, // 30 segundos por registro individual
              },
            );

            if (deleteResult.found) {
              internalBatchResults.deleted++;
              results.deleted++;
              results.deletedCounts.customers +=
                deleteResult.deletedCounts.customers || 0;
              results.deletedCounts.reservations +=
                deleteResult.deletedCounts.reservations || 0;
              results.deletedCounts.payments +=
                deleteResult.deletedCounts.payments || 0;
              results.deletedCounts.paymentDetails +=
                deleteResult.deletedCounts.paymentDetails || 0;
              results.deletedCounts.auditLogs +=
                deleteResult.deletedCounts.auditLogs || 0;
            } else {
              internalBatchResults.notFound++;
              results.notFound++;
            }

            results.processed++;
          } catch (error) {
            const errorInfo = {
              recordIndex: globalRecordIndex + 1,
              internalBatchIndex: internalBatchIndex + 1,
              error: error.message,
              data: {
                nombre: record['APELLIDOS Y NOMBRES'],
                documento: record['Nº DOCUMENTO'],
                fecha: record['FECHA'],
              },
            };

            internalBatchResults.errors.push(errorInfo);
            results.errors.push(errorInfo);

            this.logger.error(
              `Error eliminando registro ${globalRecordIndex + 1} (lote ${internalBatchIndex + 1}): ${error.message}`,
              error.stack,
            );
          }
        }

        internalBatchResults.processingTime = Date.now() - batchStartTime;
        results.internalBatches.push(internalBatchResults);

        this.logger.log(
          `✅ LOTE DE ELIMINACIÓN ${internalBatchIndex + 1} COMPLETADO`,
          {
            deleted: internalBatchResults.deleted,
            notFound: internalBatchResults.notFound,
            errors: internalBatchResults.errors.length,
            processingTime: `${internalBatchResults.processingTime}ms`,
          },
        );
      }

      this.logger.log('🎉 ELIMINACIÓN MASIVA COMPLETADA', {
        processed: results.processed,
        deleted: results.deleted,
        notFound: results.notFound,
        errors: results.errors.length,
        deletedCounts: results.deletedCounts,
        totalBatches: internalBatches.length,
      });

      return {
        success: true,
        message: `Eliminación completada: ${results.deleted} registros eliminados, ${results.notFound} no encontrados`,
        ...results,
      };
    } catch (error) {
      this.logger.error(
        `Error procesando archivo Excel para eliminación: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Error al procesar el archivo Excel: ${error.message}`,
      );
    }
  }

  private async deleteSingleRecord(
    record: any,
    prisma: any,
    user: UserData,
  ): Promise<{
    found: boolean;
    deletedCounts: {
      customers: number;
      reservations: number;
      payments: number;
      paymentDetails: number;
      auditLogs: number;
    };
  }> {
    // Normalizar documento para buscar
    const documentNumber = NormalizationUtils.normalizeDocumentNumber(
      record['Nº DOCUMENTO'],
      NormalizationUtils.normalizeDocumentType(record['TIPO DOCUMENTO']),
    );

    if (!documentNumber || !record['APELLIDOS Y NOMBRES']) {
      throw new Error('Datos insuficientes para identificar el registro');
    }

    // Buscar cliente usando estrategia robusta (como en el import)
    const customer = await this.findCustomerForDeletion(
      record,
      documentNumber,
      prisma,
    );

    if (!customer) {
      return {
        found: false,
        deletedCounts: {
          customers: 0,
          reservations: 0,
          payments: 0,
          paymentDetails: 0,
          auditLogs: 0,
        },
      };
    }

    // Calcular fechas para buscar reservas específicas
    const { checkInDate } = await this.calculateDatesWithStrategy(
      record,
      prisma,
    );

    // Buscar reservas específicas del cliente que coincidan con las fechas del Excel
    const reservations = await prisma.reservation.findMany({
      where: {
        customerId: customer.id,
        // Buscar por rango de fechas para ser más específico
        checkInDate: {
          gte: new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000), // 1 día antes
          lte: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000), // 1 día después
        },
        // Solo reservas importadas (no de landing page)
        createdByLandingPage: false,
        // Solo reservas en estado CHECKED_OUT (importadas)
        status: 'CHECKED_OUT',
      },
      include: {
        payment: {
          include: {
            paymentDetail: true,
          },
        },
      },
    });

    const deletedCounts = {
      customers: 0, // ✅ NO eliminar customers
      reservations: 0,
      payments: 0,
      paymentDetails: 0,
      auditLogs: 0,
    };

    // Si no hay reservas específicas que coincidan, no eliminar nada
    if (reservations.length === 0) {
      return {
        found: false,
        deletedCounts,
      };
    }

    // Eliminar en orden: PaymentDetails -> Payments -> Reservations
    // ✅ NO eliminar Customer
    for (const reservation of reservations) {
      // 1. Buscar y eliminar PaymentDetails primero
      if (reservation.payment && reservation.payment.id) {
        const deletedPaymentDetails = await prisma.paymentDetail.deleteMany({
          where: {
            paymentId: reservation.payment.id,
          },
        });
        deletedCounts.paymentDetails += deletedPaymentDetails.count;

        // 2. Eliminar Payment
        await prisma.payment.delete({
          where: { id: reservation.payment.id },
        });
        deletedCounts.payments++;
      } else {
        // Si no hay payment relacionado, buscar payments por reservationId
        const payments = await prisma.payment.findMany({
          where: { reservationId: reservation.id },
          include: { paymentDetail: true },
        });

        for (const payment of payments) {
          // Eliminar PaymentDetails
          if (payment.paymentDetail) {
            const deletedPaymentDetails = await prisma.paymentDetail.deleteMany(
              {
                where: { paymentId: payment.id },
              },
            );
            deletedCounts.paymentDetails += deletedPaymentDetails.count;
          }

          // Eliminar Payment
          await prisma.payment.delete({
            where: { id: payment.id },
          });
          deletedCounts.payments++;
        }
      }

      // 3. Eliminar Reservation
      await prisma.reservation.delete({
        where: { id: reservation.id },
      });
      deletedCounts.reservations++;
    }

    // Eliminar AuditLogs relacionados solo con las reservas eliminadas
    const deletedAuditLogs = await prisma.audit.deleteMany({
      where: {
        entityId: { in: reservations.map((r) => r.id) },
        entityType: 'reservation',
        action: 'CREATE', // Solo logs de creación de reservas
      },
    });
    deletedCounts.auditLogs = deletedAuditLogs.count;

    // Registrar auditoría de la eliminación de reservas (no de customer)
    for (const reservation of reservations) {
      await prisma.audit.create({
        data: {
          entityId: reservation.id,
          entityType: 'reservation',
          action: 'DELETE',
          performedById: user.id,
          createdAt: new Date(),
        },
      });
    }

    return { found: true, deletedCounts };
  }

  async generateImportAnalysisExcel(
    file: Express.Multer.File,
    user: UserData,
  ): Promise<ExcelJS.Workbook> {
    if (!file) {
      throw new BadRequestException('Archivo Excel requerido');
    }

    // Verificaciones de seguridad
    if (!user || !user.id) {
      throw new BadRequestException(
        'Usuario no válido para realizar el análisis',
      );
    }

    if (user.userRol !== 'ADMIN') {
      throw new BadRequestException(
        'Solo los administradores pueden realizar el análisis',
      );
    }

    // Validar tipo de archivo
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten archivos Excel (.xlsx, .xls)',
      );
    }

    try {
      // Leer el archivo Excel original
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer as any);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new BadRequestException(
          'El archivo Excel no contiene hojas de trabajo',
        );
      }

      // Obtener los headers (primera fila)
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = cell.text || cell.value?.toString() || '';
      });

      // Convertir datos a formato esperado
      const data = [];
      const rowCount = worksheet.rowCount;

      for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const record: any = {};

        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const header = headers[colIndex];
          if (header) {
            const cell = row.getCell(colIndex + 1);
            let cellValue = cell.text;

            if (!cellValue && cell.value !== null && cell.value !== undefined) {
              if (cell.value instanceof Date) {
                cellValue = this.formatDateForExcel(cell.value);
              } else {
                cellValue = cell.value.toString();
              }
            }

            record[header] = cellValue || '';
          }
        }

        // Solo agregar filas que tengan al menos un campo con valor
        if (
          Object.values(record).some(
            (value) =>
              value && typeof value === 'string' && value.trim() !== '',
          )
        ) {
          data.push(record);
        }
      }

      if (data.length === 0) {
        throw new BadRequestException(
          'No se encontraron datos válidos en el archivo Excel',
        );
      }

      this.logger.log(`Analizando ${data.length} registros del Excel...`, {
        userId: user.id,
        totalRecords: data.length,
      });

      // Analizar cada registro del Excel
      const importedRecords = [];
      const missingRecords = [];

      for (const [index, record] of data.entries()) {
        try {
          // Normalizar documento para buscar
          const documentNumber = NormalizationUtils.normalizeDocumentNumber(
            record['Nº DOCUMENTO'],
            NormalizationUtils.normalizeDocumentType(record['TIPO DOCUMENTO']),
          );

          if (!documentNumber || !record['APELLIDOS Y NOMBRES']) {
            missingRecords.push({
              ...record,
              _rowNumber: index + 2, // +2 porque empieza en fila 2 (después del header)
              _reason: 'Datos insuficientes',
            });
            continue;
          }

          // Buscar cliente por documento
          const customer = await this.prisma.customer.findUnique({
            where: { documentNumber },
          });

          if (!customer) {
            missingRecords.push({
              ...record,
              _rowNumber: index + 2,
              _reason: 'Cliente no encontrado',
            });
            continue;
          }

          // Calcular fechas para buscar reservas específicas
          const { checkInDate } = await this.calculateDatesWithStrategy(
            record,
            this.prisma,
          );

          // Buscar reservas específicas del cliente que coincidan con las fechas del Excel
          const reservations = await this.prisma.reservation.findMany({
            where: {
              customerId: customer.id,
              checkInDate: {
                gte: new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000), // 1 día antes
                lte: new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000), // 1 día después
              },
              createdByLandingPage: false,
              status: 'CHECKED_OUT',
            },
          });

          if (reservations.length === 0) {
            missingRecords.push({
              ...record,
              _rowNumber: index + 2,
              _reason: 'Reserva no encontrada',
            });
          } else {
            importedRecords.push({
              ...record,
              _rowNumber: index + 2,
              _reservationId: reservations[0].id,
              _customerId: customer.id,
            });
          }
        } catch (error) {
          missingRecords.push({
            ...record,
            _rowNumber: index + 2,
            _reason: `Error: ${error.message}`,
          });
        }
      }

      // Crear nuevo Excel con los resultados
      const resultWorkbook = new ExcelJS.Workbook();

      // Metadatos corporativos
      resultWorkbook.creator = 'Hotel La Almohada del Rey';
      resultWorkbook.company = 'Hotel La Almohada del Rey';
      resultWorkbook.subject = 'Análisis de Estado de Importación';
      resultWorkbook.description =
        'Análisis detallado de registros importados y faltantes';
      resultWorkbook.created = new Date();
      resultWorkbook.modified = new Date();

      // Hoja 1: Registros Importados
      const importedSheet = resultWorkbook.addWorksheet(
        'Registros Importados',
        {
          properties: {
            tabColor: { argb: 'FF4CAF50' }, // Verde para importados
          },
        },
      );
      this.addHeadersToSheet(
        importedSheet,
        'REGISTROS IMPORTADOS EXITOSAMENTE',
        importedRecords.length,
      );
      this.addRecordsToSheet(importedSheet, importedRecords);

      // Hoja 2: Registros Faltantes
      const missingSheet = resultWorkbook.addWorksheet('Registros Faltantes', {
        properties: {
          tabColor: { argb: 'FFFF5722' }, // Rojo para faltantes
        },
      });
      this.addHeadersToSheet(
        missingSheet,
        'REGISTROS NO IMPORTADOS (FALTANTES)',
        missingRecords.length,
      );
      this.addRecordsToSheet(missingSheet, missingRecords);

      this.logger.log('Análisis completado', {
        totalRecords: data.length,
        imported: importedRecords.length,
        missing: missingRecords.length,
        importedPercentage: (
          (importedRecords.length / data.length) *
          100
        ).toFixed(1),
      });

      return resultWorkbook;
    } catch (error) {
      this.logger.error(
        `Error analizando archivo Excel: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Error al analizar el archivo Excel: ${error.message}`,
      );
    }
  }

  private addHeadersToSheet(
    worksheet: ExcelJS.Worksheet,
    title: string,
    recordCount: number,
  ) {
    // Configuración de página
    worksheet.properties.defaultRowHeight = 22;
    worksheet.pageSetup = {
      paperSize: 9, // A4
      orientation: 'landscape',
      fitToPage: true,
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    };

    // === ENCABEZADO CORPORATIVO ===

    // Fila 1: Espacio superior
    worksheet.addRow([]);
    worksheet.getRow(1).height = 10;

    // Fila 2: Título principal
    const titleRow = worksheet.addRow(['HOTEL LA ALMOHADA DEL REY']);
    worksheet.mergeCells('A2:AJ2');
    const titleCell = worksheet.getCell('A2');
    titleCell.font = {
      bold: true,
      size: 24,
      color: { argb: 'FFFFFFFF' },
      name: 'Calibri',
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E7D32' }, // Verde corporativo
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
    titleRow.height = 35;

    // Fila 3: Subtítulo del análisis
    const subtitleRow = worksheet.addRow([title]);
    worksheet.mergeCells('A3:AJ3');
    const subtitleCell = worksheet.getCell('A3');
    subtitleCell.font = {
      bold: true,
      size: 14,
      color: { argb: 'FF2E7D32' },
      name: 'Calibri',
    };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleRow.height = 25;

    // Fila 4: Información del análisis
    const fecha = new Date();
    const currentDate = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
    const infoRow = worksheet.addRow([
      `Total de registros: ${recordCount} | Generado el: ${currentDate}`,
    ]);
    worksheet.mergeCells('A4:AJ4');
    const infoCell = worksheet.getCell('A4');
    infoCell.font = {
      italic: true,
      size: 11,
      color: { argb: 'FF666666' },
      name: 'Calibri',
    };
    infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    infoRow.height = 20;

    // Fila 5: Espacio
    worksheet.addRow([]);
    worksheet.getRow(5).height = 15;

    // === CABECERAS DE COLUMNAS ===
    const headers = [
      'ITEM',
      'HABITACION',
      'FECHA',
      'HORA',
      'APELLIDOS Y NOMBRES',
      'TIPO DOCUMENTO',
      'Nº DOCUMENTO',
      'DOMICILIO',
      'TELEFONO',
      'OCUPACIÓN',
      'EMAIL',
      'ESTADO CIVIL',
      'EMPRESA',
      'RUC',
      'DIRECCION',
      'LISTA NEGRA',
      'PERSONAS',
      'PROCEDENCIA',
      'ACOMPAÑANTE',
      'DOCUMENTO ACOMPAÑANTE',
      'MOTIVO DE VIAJE',
      'COMPROBANTE',
      'Nº',
      'TIPO DE CLIENTE',
      'TIPO HABITACION',
      'DIAS DE ALOJAMIENTO',
      'PRECIO',
      'FORMA DE PAGO',
      'PAGO',
      '¿CÓMO LLEGO EL CLIENTE?',
      'RECEPCIONISTA CHECK IN',
      'FECHA DE SALIDA',
      'HORA DE SALIDA',
      'RECEPCIONISTA CHECK OUT',
      'OBSERVACIONES',
      'NACIONALIDAD',
    ];

    // Fila 6: Headers de columnas
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        size: 10,
        name: 'Calibri',
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' },
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF2E7D32' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'medium', color: { argb: 'FF2E7D32' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
    });

    // Ajustar ancho de columnas
    headers.forEach((_, index) => {
      worksheet.getColumn(index + 1).width = 12;
    });
  }

  private addRecordsToSheet(worksheet: ExcelJS.Worksheet, records: any[]) {
    records.forEach((record, index) => {
      const row = [
        index + 1, // ITEM
        record['HABITACION'] || '',
        record['FECHA'] || '',
        record['HORA'] || '',
        record['APELLIDOS Y NOMBRES'] || '',
        record['TIPO DOCUMENTO'] || '',
        record['Nº DOCUMENTO'] || '',
        record['DOMICILIO'] || '',
        record['TELEFONO'] || '',
        record['OCUPACIÓN'] || '',
        record['EMAIL'] || '',
        record['ESTADO CIVIL'] || '',
        record['EMPRESA'] || '',
        record['RUC'] || '',
        record['DIRECCION'] || '',
        record['LISTA NEGRA'] || '',
        record['PERSONAS'] || '',
        record['PROCEDENCIA'] || '',
        record['ACOMPAÑANTE'] || '',
        record['DOCUMENTO ACOMPAÑANTE'] || '',
        record['MOTIVO DE VIAJE'] || '',
        record['COMPROBANTE'] || '',
        record['Nº'] || '',
        record['TIPO DE CLIENTE'] || '',
        record['TIPO HABITACION'] || '',
        record['DIAS DE ALOJAMIENTO'] || '',
        record['PRECIO'] || '',
        record['FORMA DE PAGO'] || '',
        record['PAGO'] || '',
        record['¿CÓMO LLEGO EL CLIENTE?'] || '',
        record['RECEPCIONISTA CHECK IN'] || '',
        record['FECHA DE SALIDA'] || '',
        record['HORA DE SALIDA'] || '',
        record['RECEPCIONISTA CHECK OUT'] || '',
        record['OBSERVACIONES'] || '',
        record['NACIONALIDAD'] || '',
      ];

      const dataRow = worksheet.addRow(row);
      dataRow.height = 24;

      // Estilo alternado para filas
      const isEven = index % 2 === 0;
      const rowColor = isEven ? 'FFFFFFFF' : 'FFF5F5F5';

      dataRow.eachCell((cell, colNumber) => {
        // Configuración base para todas las celdas
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowColor },
        };

        cell.font = {
          color: { argb: 'FF333333' },
          name: 'Calibri',
          size: 10,
        };

        // Configuración específica por columna
        switch (colNumber) {
          case 1: // ITEM
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { ...cell.font, bold: true };
            break;
          case 5: // APELLIDOS Y NOMBRES
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            cell.font = { ...cell.font, bold: true };
            break;
          case 7: // Nº DOCUMENTO
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.font = { ...cell.font, bold: true };
            break;
          case 27: // PRECIO
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '"S/ "#,##0.00';
            break;
          default:
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
            break;
        }
      });
    });
  }

  async cleanupImportedData(user: UserData) {
    this.logger.log('Iniciando limpieza de datos importados...', {
      userId: user.id,
    });

    // Verificaciones de seguridad
    if (!user || !user.id) {
      throw new BadRequestException(
        'Usuario no válido para realizar la limpieza',
      );
    }

    // Verificar que el usuario tenga permisos de administrador
    if (user.userRol !== 'ADMIN') {
      throw new BadRequestException(
        'Solo los administradores pueden realizar la limpieza',
      );
    }

    return await this.prisma.$transaction(async (prisma) => {
      const deletedCounts = {
        payments: 0,
        reservations: 0,
        customers: 0,
        auditLogs: 0,
      };

      try {
        // 1. Primero obtener TODAS las Reservations importadas que vamos a eliminar
        const reservationsToDelete = await prisma.reservation.findMany({
          where: {
            createdByLandingPage: false, // Solo reservas creadas por importación
            status: 'CHECKED_OUT', // Solo las que están en estado importado
            // ✅ ELIMINAR TODAS LAS RESERVAS IMPORTADAS (sin filtro de fecha)
          },
          select: { id: true },
        });

        const reservationIds = reservationsToDelete.map((r) => r.id);
        this.logger.log(
          `Encontradas ${reservationIds.length} reservas importadas para eliminar (TODAS)`,
        );

        // 2. Obtener los Payments que referencian estas Reservations
        const paymentsToDelete = await prisma.payment.findMany({
          where: {
            reservationId: {
              in: reservationIds,
            },
          },
          select: { id: true },
        });

        const paymentIds = paymentsToDelete.map((p) => p.id);
        this.logger.log(`Encontrados ${paymentIds.length} pagos para eliminar`);

        // 3. Eliminar PaymentDetails que referencian estos Payments
        const deletedPaymentDetails = await prisma.paymentDetail.deleteMany({
          where: {
            paymentId: {
              in: paymentIds,
            },
          },
        });
        this.logger.log(
          `Eliminados ${deletedPaymentDetails.count} PaymentDetails`,
        );

        // 4. Eliminar Payments que referencian estas Reservations
        const deletedPayments = await prisma.payment.deleteMany({
          where: {
            id: {
              in: paymentIds,
            },
          },
        });
        deletedCounts.payments = deletedPayments.count;
        this.logger.log(`Eliminados ${deletedPayments.count} Payments`);

        // 5. Ahora eliminar las Reservations
        const deletedReservations = await prisma.reservation.deleteMany({
          where: {
            id: {
              in: reservationIds,
            },
          },
        });
        deletedCounts.reservations = deletedReservations.count;
        this.logger.log(`Eliminadas ${deletedReservations.count} Reservations`);

        // 6. Eliminar TODOS los Customers (para pruebas)
        const deletedCustomers = await prisma.customer.deleteMany({});
        deletedCounts.customers = deletedCustomers.count;
        this.logger.log(
          `Eliminados ${deletedCustomers.count} Customers (TODOS para pruebas)`,
        );

        // 8. Eliminar AuditLogs relacionados con la importación
        const deletedAuditLogs = await prisma.audit.deleteMany({
          where: {
            OR: [
              {
                entityType: 'reservation',
                action: 'CREATE',
                performedById: user.id,
              },
              {
                entityType: 'customer',
                action: 'CREATE',
                performedById: user.id,
              },
              {
                entityType: 'payment',
                action: 'CREATE',
                performedById: user.id,
              },
            ],
          },
        });
        deletedCounts.auditLogs = deletedAuditLogs.count;
        this.logger.log(`Eliminados ${deletedAuditLogs.count} AuditLogs`);

        // 9. Registrar auditoría de la limpieza
        await prisma.audit.create({
          data: {
            entityId: 'CLEANUP_IMPORT',
            entityType: 'import',
            action: 'DELETE',
            performedById: user.id,
          },
        });

        this.logger.log('Limpieza completada exitosamente', { deletedCounts });

        return {
          success: true,
          message: 'Limpieza de datos importados completada exitosamente',
          deletedCounts,
        };
      } catch (error) {
        this.logger.error(
          `Error durante la limpieza: ${error.message}`,
          error.stack,
        );
        throw new BadRequestException(
          `Error durante la limpieza: ${error.message}`,
        );
      }
    });
  }

  /**
   * Busca cliente para eliminación usando la misma lógica robusta del import
   */
  private async findCustomerForDeletion(
    record: any,
    documentNumber: string,
    prisma: any,
  ) {
    // PRIORIDAD 1: Buscar por documento normalizado
    let customer = await prisma.customer.findUnique({
      where: { documentNumber },
    });

    if (customer) {
      return customer;
    }

    // PRIORIDAD 2: Buscar por variaciones del documento
    const documentVariations = this.generateDocumentVariations(
      record['Nº DOCUMENTO'],
      record['TIPO DOCUMENTO'],
    );

    for (const variation of documentVariations) {
      customer = await prisma.customer.findUnique({
        where: { documentNumber: variation },
      });
      if (customer) {
        this.logger.log(
          `Cliente encontrado por variación de documento: ${variation}`,
        );
        return customer;
      }
    }

    // PRIORIDAD 3: Buscar por nombre y documento (fuzzy matching)
    const normalizedName = this.normalizeName(record['APELLIDOS Y NOMBRES']);

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { documentNumber: { contains: record['Nº DOCUMENTO'] } },
          {
            AND: [
              { firstName: { contains: normalizedName.split(' ')[0] } },
              {
                lastName: {
                  contains: normalizedName.split(' ').slice(1).join(' '),
                },
              },
            ],
          },
        ],
      },
    });

    // Encontrar el mejor match usando similitud
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of customers) {
      const score = this.calculateNameSimilarity(
        normalizedName,
        `${candidate.firstName} ${candidate.lastName}`,
      );

      if (score > bestScore && score > 0.7) {
        // 70% de similitud mínima
        bestMatch = candidate;
        bestScore = score;
      }
    }

    if (bestMatch) {
      this.logger.log(
        `Cliente encontrado por similitud de nombre: ${bestMatch.firstName} ${bestMatch.lastName} (score: ${bestScore})`,
      );
      return bestMatch;
    }

    return null;
  }

  /**
   * Genera variaciones del documento para búsqueda más flexible
   */
  private generateDocumentVariations(
    documentNumber: string,
    documentType: string,
  ): string[] {
    const variations = [];

    if (!documentNumber) return variations;

    // Agregar ceros adelante si es DNI
    if (documentType === 'DNI' || !documentType) {
      const padded = documentNumber.padStart(8, '0');
      if (padded !== documentNumber) {
        variations.push(padded);
      }
    }

    // Agregar versión sin ceros
    const unpadded = documentNumber.replace(/^0+/, '');
    if (unpadded !== documentNumber && unpadded.length > 0) {
      variations.push(unpadded);
    }

    // Agregar versión con puntos y guiones
    const withDots = documentNumber.replace(
      /(\d{3})(\d{3})(\d{3})/,
      '$1.$2.$3',
    );
    if (withDots !== documentNumber) {
      variations.push(withDots);
    }

    return variations;
  }

  /**
   * Normaliza nombres para búsqueda
   */
  private normalizeName(name: string): string {
    if (!name) return '';

    return name
      .toLowerCase()
      .trim()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calcula similitud entre dos nombres usando algoritmo de Levenshtein
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const normalized1 = this.normalizeName(name1);
    const normalized2 = this.normalizeName(name2);

    if (normalized1 === normalized2) return 1.0;

    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    return maxLength === 0 ? 0 : (maxLength - distance) / maxLength;
  }

  /**
   * Calcula distancia de Levenshtein entre dos strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
