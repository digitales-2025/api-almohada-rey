import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { PrescriptionService } from '../services/room.service';
import { Auth, GetUser } from '@login/login/admin/auth/decorators';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UserData } from '@login/login/interfaces';
import {
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  DeletePrescriptionDto,
} from '../dto';
import { Prescription, PrescriptionWithPatient } from '../entities/room.entity';
import { BaseApiResponse } from 'src/dto/BaseApiResponse.dto';
import { PatientPrescriptions } from '@pacient/pacient/pacient/entities/pacient.entity';

/**
 * Controlador REST para gestionar recetas médicas.
 * Expone endpoints para operaciones CRUD sobre recetas.
 */
@ApiTags('Recipe')
@ApiBadRequestResponse({
  description:
    'Bad Request - Error en la validación de datos o solicitud incorrecta',
})
@ApiUnauthorizedResponse({
  description: 'Unauthorized - No autorizado para realizar esta operación',
})
@Controller({ path: 'receta', version: '1' })
@Auth()
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  /**
   * Crea una nueva receta médica
   */
  @Post()
  @ApiOperation({ summary: 'Crear nueva receta médica' })
  @ApiResponse({
    status: 201,
    description: 'Receta médica creada exitosamente',
    type: BaseApiResponse<Prescription>,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos o receta ya existe',
  })
  create(
    @Body() createPrescriptionDto: CreatePrescriptionDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Prescription>> {
    return this.prescriptionService.create(createPrescriptionDto, user);
  }

  /**
   * Obtiene todas las recetas médicas
   */
  @Get()
  @ApiOperation({ summary: 'Obtener todas las recetas médicas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las recetas médicas',
    type: [Prescription],
  })
  findAll(): Promise<Prescription[]> {
    return this.prescriptionService.findAll();
  }

  /**
   * Obtiene una recetas médicas por DNI del paciente
   */
  @Get('/patients')
  @ApiOperation({ summary: 'Obtener receta médica de los pacientes' })
  @ApiOkResponse({
    status: 200,
    description: 'Recetas médicas encontrada',
    type: [PatientPrescriptions],
  })
  @ApiNotFoundResponse({
    description: 'Recetas médicas no encontrada',
  })
  findByPatientsPrescriptions(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<PatientPrescriptions[]> {
    return this.prescriptionService.findPatientsPrescriptions(limit, offset);
  }

  /**
   * Obtiene una recetas médicas por DNI del paciente
   */
  @Get('/withPatient')
  @ApiOperation({ summary: 'Obtener receta médica de los pacientes' })
  @ApiOkResponse({
    status: 200,
    description: 'Recetas médicas encontrada',
    type: [PrescriptionWithPatient],
  })
  @ApiNotFoundResponse({
    description: 'Recetas médicas no encontrada',
  })
  findByPrescriptionsWithPatients(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<PrescriptionWithPatient[]> {
    return this.prescriptionService.findPrescriptionsWithPatient(limit, offset);
  }

  /**
   * Obtiene una recetas médicas por DNI del paciente
   */
  @Get('/patient/:dni')
  @ApiOperation({ summary: 'Obtener receta médica por ID' })
  @ApiParam({
    name: 'dni',
    description: 'Número de DNI y deberia tambien el CE',
  })
  @ApiOkResponse({
    status: 200,
    description: 'Recetas médicas encontrada',
    type: PatientPrescriptions,
  })
  @ApiNotFoundResponse({
    description: 'Recetas médicas no encontrada',
  })
  findByPatientIdCard(
    @Param('dni') dni: string,
  ): Promise<PatientPrescriptions> {
    return this.prescriptionService.findPrescriptionsByPatientIdCard(dni);
  }

  /**
   * Obtiene una receta médica por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener receta médica por ID' })
  @ApiParam({ name: 'id', description: 'ID de la receta médica' })
  @ApiOkResponse({
    description: 'Receta médica encontrada',
    type: Prescription,
  })
  @ApiNotFoundResponse({
    description: 'Receta médica no encontrada',
  })
  findOne(@Param('id') id: string): Promise<Prescription> {
    return this.prescriptionService.findOne(id);
  }

  /**
   * Actualiza una receta médica existente
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar receta médica existente' })
  @ApiResponse({
    status: 200,
    description: 'Receta médica actualizada exitosamente',
    type: Prescription,
  })
  update(
    @Param('id') id: string,
    @Body() updatePrescriptionDto: UpdatePrescriptionDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Prescription>> {
    return this.prescriptionService.update(id, updatePrescriptionDto, user);
  }

  /**
   * Desactiva múltiples recetas médicas
   */
  @Delete('remove/all')
  @ApiOperation({ summary: 'Desactivar múltiples recetas médicas' })
  @ApiResponse({
    status: 200,
    description: 'Recetas médicas desactivadas exitosamente',
    type: BaseApiResponse<Prescription[]>,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o recetas no existen',
  })
  deleteMany(
    @Body() deletePrescriptionDto: DeletePrescriptionDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Prescription[]>> {
    return this.prescriptionService.deleteMany(deletePrescriptionDto, user);
  }

  /**
   * Reactiva múltiples recetas médicas
   */
  @Patch('reactivate/all')
  @ApiOperation({ summary: 'Reactivar múltiples recetas médicas' })
  @ApiOkResponse({
    description: 'Recetas médicas reactivadas exitosamente',
    type: BaseApiResponse<Prescription[]>,
  })
  @ApiBadRequestResponse({
    description: 'IDs inválidos o recetas no existen',
  })
  reactivateAll(
    @Body() deletePrescriptionDto: DeletePrescriptionDto,
    @GetUser() user: UserData,
  ): Promise<BaseApiResponse<Prescription[]>> {
    return this.prescriptionService.reactivateMany(
      deletePrescriptionDto.ids,
      user,
    );
  }
}
