import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';

export class UpdateRoomDto extends PartialType(CreateRoomDto) {
  // Sin campos adicionales, todos son opcionales gracias a PartialType
}
