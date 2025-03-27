import { PartialType } from '@nestjs/swagger';
import { CreateCleaningChecklistDto } from './create-room-clean.dto';

export class UpdateCleaningChecklistDto extends PartialType(
  CreateCleaningChecklistDto,
) {
  // Todos los campos son opcionales gracias a PartialType
}
