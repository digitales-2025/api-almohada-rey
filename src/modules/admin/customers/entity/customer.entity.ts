import { ApiProperty } from '@nestjs/swagger';
import { CustomerDocumentType, CustomerMaritalStatus } from '@prisma/client';
import { BaseEntity } from 'src/prisma/src/abstract/base.entity';
export class Customer extends BaseEntity {
  @ApiProperty({ description: 'Customer name' })
  name: string;

  @ApiProperty({ description: 'Customer address' })
  address: string;

  @ApiProperty({ description: 'Customer birth place' })
  birthPlace: string;

  @ApiProperty({ description: 'Customer birth date', required: false })
  birthDate?: string;

  @ApiProperty({ description: 'Customer country' })
  country: string;

  @ApiProperty({ description: 'Customer department', required: false })
  department?: string;

  @ApiProperty({ description: 'Customer province', required: false })
  province?: string;

  @ApiProperty({ description: 'Customer phone number' })
  phone: string;

  @ApiProperty({ description: 'Customer occupation' })
  occupation: string;

  @ApiProperty({
    description: 'Customer document type',
    enum: ['DNI', 'PASSPORT', 'FOREIGNER_CARD'],
  })
  documentType: CustomerDocumentType;

  @ApiProperty({ description: 'Customer document number' })
  documentNumber: string;

  @ApiProperty({ description: 'Customer email' })
  email: string;

  @ApiProperty({
    description: 'Customer marital status',
    enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'],
  })
  maritalStatus: CustomerMaritalStatus;

  @ApiProperty({ description: 'Customer company name', required: false })
  companyName?: string;

  @ApiProperty({ description: 'Customer RUC number', required: false })
  ruc?: string;

  @ApiProperty({ description: 'Customer company address', required: false })
  companyAddress?: string;

  @ApiProperty({
    description: 'Customer created by landing page',
    required: false,
    default: false,
  })
  createdByLandingPage?: boolean;

  @ApiProperty({
    description: 'Indicates if the customer is blacklisted',
    required: false,
    default: false,
  })
  isBlacklist?: boolean;

  @ApiProperty({
    description: 'Reason for blacklisting the customer',
    required: false,
  })
  blacklistReason?: string;

  @ApiProperty({
    description: 'Date when the customer was blacklisted',
    required: false,
  })
  blacklistDate?: Date;

  @ApiProperty({
    description: 'ID of the user who blacklisted the customer',
    required: false,
  })
  blacklistedById?: string;

  @ApiProperty({
    description: 'User who blacklisted the customer',
    required: false,
  })
  blacklistedBy?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiProperty({
    description: 'Indicates if the admin needs to complete missing data',
    required: false,
    default: false,
  })
  mustCompleteData?: boolean;

  constructor(partial: Partial<Customer>) {
    super(partial);
    Object.assign(this, partial);
  }
}
