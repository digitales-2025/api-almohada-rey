import { PartialType } from '@nestjs/swagger';
import { CreatePrescriptionDto } from './create-room.dto';

export class UpdatePrescriptionDto extends PartialType(CreatePrescriptionDto) {}
