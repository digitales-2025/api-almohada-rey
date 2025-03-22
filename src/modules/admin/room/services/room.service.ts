import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrescriptionRepository } from '../repositories/room.repository';
import { Prescription, PrescriptionWithPatient } from '../entities/room.entity';
import {
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  DeletePrescriptionDto,
} from '../dto';
import { UserData } from '@login/login/interfaces';
import { validateArray, validateChanges } from '@prisma/prisma/utils';
import { BaseErrorHandler } from 'src/common/error-handlers/service-error.handler';
import { recipeErrorMessages } from '../errors/errors-room';
import {
  CreatePrescriptionUseCase,
  UpdatePrescriptionUseCase,
  DeletePrescriptionsUseCase,
  ReactivatePrescriptionUseCase,
} from '../use-cases';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';
import { PacientRepository } from '@pacient/pacient/pacient/repositories/pacient.repository';
import { PatientPrescriptions } from '@pacient/pacient/pacient/entities/pacient.entity';

// Constantes para nombres de tablas
const TABLE_NAMES = {
  UPDATE_HISTORIA: 'updateHistory',
  SUCURSAL: 'branch',
  PERSONAL: 'staff',
  PACIENTE: 'patient',
} as const;

@Injectable()
export class PrescriptionService {
  private readonly logger = new Logger(PrescriptionService.name);
  private readonly errorHandler: BaseErrorHandler;

  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly createPrescriptionUseCase: CreatePrescriptionUseCase,
    private readonly updatePrescriptionUseCase: UpdatePrescriptionUseCase,
    private readonly deletePrescriptionsUseCase: DeletePrescriptionsUseCase,
    private readonly reactivatePrescriptionUseCase: ReactivatePrescriptionUseCase,
    private readonly patientRepository: PacientRepository,
  ) {
    this.errorHandler = new BaseErrorHandler(
      this.logger,
      'Recipe',
      recipeErrorMessages,
    );
  }

  /**
   * Valida las referencias a otras tablas
   */
  private async validateReferences(
    dto: CreatePrescriptionDto | UpdatePrescriptionDto,
  ) {
    // Validar UpdateHistoria
    const updateHistoriaExists =
      await this.prescriptionRepository.findByIdValidate(
        TABLE_NAMES.UPDATE_HISTORIA,
        dto.updateHistoryId,
      );
    if (!updateHistoriaExists) {
      throw new BadRequestException(
        `Registro de Actualizacion de Historia Médica no encontrado`,
      );
    }

    // Validar Sucursal
    const sucursalExists = await this.prescriptionRepository.findByIdValidate(
      TABLE_NAMES.SUCURSAL,
      dto.branchId,
    );
    if (!sucursalExists) {
      throw new BadRequestException(`Registro de Sucursal no encontrado`);
    }

    // Validar Personal
    const personalExists = await this.prescriptionRepository.findByIdValidate(
      TABLE_NAMES.PERSONAL,
      dto.staffId,
    );
    if (!personalExists) {
      throw new BadRequestException(`Registro de Personal no encontrado`);
    }

    // Validar Paciente
    const pacienteExists = await this.prescriptionRepository.findByIdValidate(
      TABLE_NAMES.PACIENTE,
      dto.patientId,
    );

    if (!pacienteExists) {
      throw new BadRequestException(`Registro de Paciente no encontrado`);
    }
  }

  /**
   * Crea una nueva receta médica
   */
  // ... existing code ...

  async create(
    createPrescriptionDto: CreatePrescriptionDto,
    user: UserData,
  ): Promise<BaseApiResponse<Prescription>> {
    console.log(
      '🚀 ~ PrescriptionService en el bakend con el id  ~ createPrescriptionDto:',
      createPrescriptionDto,
    );
    try {
      await this.validateReferences(createPrescriptionDto);

      // Crear la receta y obtener la respuesta
      const prescriptionResponse = await this.createPrescriptionUseCase.execute(
        createPrescriptionDto,
        user,
      );

      // Extraer los IDs necesarios
      const prescriptionId = prescriptionResponse.data.id;
      const updateHistoryId = createPrescriptionDto.updateHistoryId;

      // Actualizar el historial
      if (updateHistoryId) {
        await this.prescriptionRepository.updatePrescriptionInHistory(
          updateHistoryId,
          prescriptionId,
        );
      }

      return prescriptionResponse;
    } catch (error) {
      this.errorHandler.handleError(error, 'creating');
    }
  }

  // ... existing code ...

  /**
   * Actualiza una receta médica existente
   */
  async update(
    id: string,
    updatePrescriptionDto: UpdatePrescriptionDto,
    user: UserData,
  ): Promise<BaseApiResponse<Prescription>> {
    try {
      const currentPrescription = await this.findById(id);

      if (!validateChanges(updatePrescriptionDto, currentPrescription)) {
        return {
          success: true,
          message: 'No se detectaron cambios en la receta médica',
          data: currentPrescription,
        };
      }

      // Validar referencias antes de actualizar
      await this.validateReferences(updatePrescriptionDto);
      return await this.updatePrescriptionUseCase.execute(
        id,
        updatePrescriptionDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'updating');
      throw error;
    }
  }

  /**
   * Busca una receta médica por su ID
   */
  async findOne(id: string): Promise<Prescription> {
    try {
      return this.findById(id);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Obtiene todas las recetas médicas
   */
  async findAll(): Promise<Prescription[]> {
    try {
      return this.prescriptionRepository.findMany();
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
      throw error;
    }
  }

  /**
   * Obtiene una receta médica por DNI del paciente
   */
  async findPrescriptionsByPatientIdCard(
    dni: string,
  ): Promise<PatientPrescriptions> {
    try {
      return await this.patientRepository.findPrescriptionsByPatientDNI(dni);
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  /**
   * Obtiene una receta médica por paciente
   */
  async findPatientsPrescriptions(
    limit = 10,
    offset = 0,
  ): Promise<PatientPrescriptions[]> {
    try {
      return await this.patientRepository.findPatientPrescriptions(
        limit,
        offset,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  async findPrescriptionsWithPatient(
    limit = 10,
    offset = 0,
  ): Promise<PrescriptionWithPatient[]> {
    try {
      return await this.prescriptionRepository.findPrescriptionsWithPatient(
        limit,
        offset,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }

  /**
   * Busca una receta médica por su ID
   */
  async findById(id: string): Promise<Prescription> {
    const prescription = await this.prescriptionRepository.findById(id);
    if (!prescription) {
      throw new BadRequestException('Receta médica no encontrada');
    }
    return prescription;
  }

  /**
   * Desactiva múltiples recetas médicas
   */
  async deleteMany(
    deletePrescriptionDto: DeletePrescriptionDto,
    user: UserData,
  ): Promise<BaseApiResponse<Prescription[]>> {
    try {
      validateArray(deletePrescriptionDto.ids, 'IDs de recetas médicas');
      return await this.deletePrescriptionsUseCase.execute(
        deletePrescriptionDto,
        user,
      );
    } catch (error) {
      this.errorHandler.handleError(error, 'deactivating');
      throw error;
    }
  }

  /**
   * Reactiva múltiples recetas médicas
   */
  async reactivateMany(
    ids: string[],
    user: UserData,
  ): Promise<BaseApiResponse<Prescription[]>> {
    try {
      validateArray(ids, 'IDs de recetas médicas');
      return await this.reactivatePrescriptionUseCase.execute(ids, user);
    } catch (error) {
      this.errorHandler.handleError(error, 'reactivating');
      throw error;
    }
  }

  async findByConsultaId(consultaId: string): Promise<Prescription> {
    try {
      const prescription =
        await this.prescriptionRepository.findById(consultaId);
      if (!prescription) {
        throw new NotFoundException('Receta no encontrada para esta consulta');
      }
      return prescription;
    } catch (error) {
      this.errorHandler.handleError(error, 'getting');
    }
  }
}
