import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsDate } from 'class-validator';
import {
  DocumentType,
  DocumentTypeAccepetedValues,
} from '../entities/document-type.enum';

export class GuestDto {
  @ApiProperty({ description: 'Guest full name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Guest age' })
  @IsOptional()
  @Type(() => Number)
  age?: number;

  @ApiPropertyOptional({ description: 'Guest document identification' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Type of document',
    enum: DocumentType,
  })
  @IsOptional()
  documentType?: DocumentTypeAccepetedValues;

  @ApiPropertyOptional({ description: 'Guest phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Guest email address' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Guest date of birth', type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthDate?: Date;

  @ApiPropertyOptional({ description: 'Additional guest information' })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
