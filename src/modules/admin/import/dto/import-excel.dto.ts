import { IsArray, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExcelRecordDto {
  // Campos del Excel
  'ITEM'?: string;
  'HABITACION'?: string;
  'FECHA'?: string;
  'HORA'?: string;
  'APELLIDOS Y NOMBRES'?: string;
  'TIPO DOCUMENTO'?: string;
  'Nº DOCUMENTO'?: string;
  'DOMICILIO'?: string;
  'TELEFONO'?: string;
  'OCUPACIÓN'?: string;
  'EMAIL'?: string;
  'ESTADO CIVIL'?: string;
  'EMPRESA'?: string;
  'RUC'?: string;
  'DIRECCION'?: string;
  'LISTA NEGRA'?: string;
  'PERSONAS'?: string;
  'PROCEDENCIA'?: string;
  'ACOMPAÑANTE'?: string;
  'DOCUMENTO ACOMPAÑANTE'?: string;
  'MOTIVO DE VIAJE'?: string;
  'COMPROBANTE'?: string;
  'Nº'?: string;
  'TIPO DE CLIENTE'?: string;
  'TIPO HABITACION'?: string;
  'DIAS DE ALOJAMIENTO'?: string;
  'PRECIO'?: string;
  'FORMA DE PAGO'?: string;
  'PAGO'?: string;
  '¿CÓMO LLEGO EL CLIENTE?'?: string;
  'RECEPCIONISTA CHECK IN'?: string;
  'FECHA DE SALIDA'?: string;
  'HORA DE SALIDA'?: string;
  'RECEPCIONISTA CHECK OUT'?: string;
  'OBSERVACIONES'?: string;
}

export class ImportExcelDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExcelRecordDto)
  data: ExcelRecordDto[];

  @IsNumber()
  @IsOptional()
  batchNumber?: number;

  @IsNumber()
  @IsOptional()
  totalBatches?: number;
}
