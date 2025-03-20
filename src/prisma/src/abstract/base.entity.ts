import { ApiProperty } from '@nestjs/swagger';

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
  })
  id: string;

  /**
   * Timestamp when the entity was created.
   */
  @ApiProperty({
    description: 'Timestamp when the entity was created',
    example: new Date().toISOString(),
  })
  readonly createdAt: Date;

  /**
   * Timestamp when the entity was last updated.
   */
  @ApiProperty({
    description: 'Timestamp when the entity was last updated',
    example: new Date().toISOString(),
  })
  updatedAt: Date;

  constructor(partial: Partial<BaseEntity>) {
    Object.assign(this, partial);
  }

  /**
   * Abstract method to convert the entity to a plain object.
   */
  abstract toJSON(): Record<string, any>;

  /**
   * Updates the entity's updatedAt timestamp.
   */
  updateTimestamp(): void {
    this.updatedAt = new Date();
  }
}
