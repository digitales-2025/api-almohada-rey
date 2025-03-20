import { PartialType } from '@nestjs/swagger';
import { CreateUpdateHistoryDto } from './create-up-history.dto';

export class UpdateUpdateHistoryDto extends PartialType(
  CreateUpdateHistoryDto,
) {}
