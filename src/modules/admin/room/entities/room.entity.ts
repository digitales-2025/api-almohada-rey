import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
export class PrescriptionItemResponse {
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  id?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  name?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  quantity?: number;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  description?: string;
}

export class Prescription {
  @ApiProperty()
  id: string;

  @ApiProperty()
  updateHistoryId: string;

  @ApiProperty()
  branchId: string;

  @ApiProperty()
  staffId: string;

  @ApiProperty()
  patientId: string;

  @ApiProperty()
  registrationDate: string;

  @ApiProperty({
    type: [PrescriptionItemResponse],
  })
  prescriptionMedicaments: PrescriptionItemResponse[];

  @ApiProperty({
    type: [PrescriptionItemResponse],
  })
  prescriptionServices: PrescriptionItemResponse[];

  @ApiProperty({
    required: false,
  })
  description?: string;

  @ApiProperty({
    required: false,
  })
  purchaseOrderId?: string;

  @ApiProperty()
  isActive: boolean;
}

export class PrescriptionPatient {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    required: false,
  })
  lastName?: string;

  @ApiProperty()
  dni: string;

  @ApiProperty()
  birthDate: string;

  @ApiProperty()
  gender: string;

  @ApiProperty({
    required: false,
  })
  address?: string;

  @ApiProperty({
    required: false,
  })
  phone?: string;

  @ApiProperty({
    required: false,
  })
  email?: string;

  @ApiProperty()
  isActive: boolean;
}

export class PrescriptionWithPatient extends Prescription {
  @ApiProperty({
    type: PrescriptionPatient,
  })
  patient: PrescriptionPatient;
}
