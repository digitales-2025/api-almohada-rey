import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';

export class Service extends BaseEntity {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  price: number;

  constructor(partial: Partial<Service> = {}) {
    super(partial);
    Object.assign(this, partial);
  }
}
