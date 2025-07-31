import { BaseEntity } from 'src/prisma/src/abstract/base.entity';
import { ApiProperty } from '@nestjs/swagger';

export class AuditEntity extends BaseEntity {
  @ApiProperty({ description: 'The ID of the entity being audited' })
  entityId: string;

  @ApiProperty({ description: 'The type of entity being audited' })
  entityType: string;

  @ApiProperty({
    description: 'The action performed on the entity',
    example: 'CREATE',
  })
  action: string; // This would be from an enum AuditActionType

  @ApiProperty({ description: 'The ID of the user who performed the action' })
  performedById: string;

  @ApiProperty({
    description: 'The timestamp when the audit record was created',
  })
  createdAt?: Date;
}
