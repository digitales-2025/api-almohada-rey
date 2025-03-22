import { ApiProperty } from '@nestjs/swagger';

// /**
//  * Type that represents the data structure of BaseEntity without methods
//  * Use this type when you only need the properties
//  */
// export type BaseEntityData = Omit<BaseEntity, 'toJSON' | 'updateTimestamp'>;

/**
 * Abstract base entity class that provides common properties and methods
 * for all entities in the application.
 */
export abstract class BaseEntity {
  /**
   * Unique identifier for the entity.
   */
  @ApiProperty({
    description: 'Unique identifier for the entity',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  id?: string;

  /**
   * Indicates whether the entity is active or not.
   */
  @ApiProperty({
    description: 'Indicates whether the entity is active or not',
    example: true,
    required: false,
  })
  isActive?: boolean;

  /**
   * Timestamp when the entity was created.
   */
  @ApiProperty({
    description: 'Timestamp when the entity was created',
    example: new Date().toISOString(),
    required: false,
  })
  readonly createdAt?: Date;

  /**
   * Timestamp when the entity was last updated.
   */
  @ApiProperty({
    description: 'Timestamp when the entity was last updated',
    example: new Date().toISOString(),
    required: false,
  })
  updatedAt?: Date;

  constructor(partial: Partial<BaseEntity>) {
    Object.assign(this, partial);
  }
}
