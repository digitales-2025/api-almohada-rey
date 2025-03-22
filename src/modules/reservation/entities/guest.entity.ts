import { ApiProperty } from '@nestjs/swagger';
import {
  DocumentType,
  DocumentTypeAccepetedValues,
} from './document-type.enum';

export class Guest {
  @ApiProperty({ description: 'The name of the guest' })
  name: string;

  @ApiProperty({ description: 'The age of the guest', required: false })
  age?: number;

  @ApiProperty({ description: 'The document ID of the guest', required: false })
  documentId?: string;

  @ApiProperty({
    description: 'The type of document',
    required: false,
    enum: DocumentType,
  })
  documentType?: DocumentTypeAccepetedValues;

  @ApiProperty({
    description: 'The phone number of the guest',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'The email address of the guest',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'The birth date of the guest',
    required: false,
    type: Date,
  })
  birthDate?: Date;

  @ApiProperty({
    description: 'Additional information about the guest',
    required: false,
    type: Object,
  })
  additionalInfo?: string;

  constructor(
    name: string,
    age?: number,
    documentId?: string,
    documentType?: DocumentTypeAccepetedValues,
    phone?: string,
    email?: string,
    birthDate?: Date,
    additionalInfo?: string,
  ) {
    this.name = name;
    this.age = age;
    this.documentId = documentId;
    this.documentType = documentType;
    this.phone = phone;
    this.email = email;
    this.birthDate = birthDate;
    this.additionalInfo = additionalInfo;
  }

  static builder(): GuestBuilder {
    return new GuestBuilder();
  }

  /**
   * Converts a JSON string to a Guest instance
   */
  static fromJSON(jsonString: string): Guest {
    const json = JSON.parse(jsonString);
    return new Guest(
      json.name,
      json.age,
      json.documentId,
      json.documentType,
      json.phone,
      json.email,
      json.birthDate ? new Date(json.birthDate) : undefined,
      json.additionalInfo,
    );
  }

  /**
   * Converts the Guest instance to a JSON string
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      age: this.age,
      documentId: this.documentId,
      documentType: this.documentType,
      phone: this.phone,
      email: this.email,
      birthDate: this.birthDate,
      additionalInfo: this.additionalInfo,
    };
  }

  /**
   * Returns a JSON string representation of the Guest
   */
  stringify(): string {
    return JSON.stringify(this);
  }
}

export class GuestBuilder {
  private name!: string;
  private age?: number;
  private documentId?: string;
  private documentType?: DocumentTypeAccepetedValues;
  private phone?: string;
  private email?: string;
  private birthDate?: Date;
  private additionalInfo?: string;

  withName(name: string | undefined): GuestBuilder {
    if (name !== undefined) this.name = name;
    return this;
  }

  withAge(age: number | undefined): GuestBuilder {
    if (age !== undefined) this.age = age;
    return this;
  }

  withDocumentId(documentId: string | undefined): GuestBuilder {
    if (documentId !== undefined) this.documentId = documentId;
    return this;
  }

  withDocumentType(
    documentType: DocumentTypeAccepetedValues | undefined,
  ): GuestBuilder {
    if (documentType !== undefined) this.documentType = documentType;
    return this;
  }

  withPhone(phone: string | undefined): GuestBuilder {
    if (phone !== undefined) this.phone = phone;
    return this;
  }

  withEmail(email: string | undefined): GuestBuilder {
    if (email !== undefined) this.email = email;
    return this;
  }

  withBirthDate(birthDate: Date | undefined): GuestBuilder {
    if (birthDate !== undefined) this.birthDate = birthDate;
    return this;
  }

  withAdditionalInfo(additionalInfo: string | undefined): GuestBuilder {
    if (additionalInfo !== undefined) this.additionalInfo = additionalInfo;
    return this;
  }

  build(): Guest {
    if (!this.name) {
      throw new Error('Name is required to build a Guest');
    }

    return new Guest(
      this.name,
      this.age,
      this.documentId,
      this.documentType,
      this.phone,
      this.email,
      this.birthDate,
      this.additionalInfo,
    );
  }
}

export class Guests {
  guests: Guest[];

  constructor(guests: Guest[] = []) {
    this.guests = guests;
  }

  static builder(): GuestsBuilder {
    return new GuestsBuilder();
  }

  /**
   * Converts a JSON string to a Guests instance
   */
  static fromJSON(jsonString: string): Guests {
    const jsonArray = JSON.parse(jsonString);
    const guests = jsonArray.map(
      (json: any) =>
        new Guest(
          json.name,
          json.documentId,
          json.age,
          json.documentType,
          json.phone,
          json.email,
          json.birthDate ? new Date(json.birthDate) : undefined,
          json.additionalInfo,
        ),
    );
    return new Guests(guests);
  }

  /**
   * Converts the Guests instance to an array of JSON objects
   */
  toJSON(): Record<string, any>[] {
    return this.guests.map((guest) => guest.toJSON());
  }

  /**
   * Returns a JSON string representation of the Guests
   */
  stringify(): string {
    return JSON.stringify(this);
  }
}

export class GuestsBuilder {
  private guests: Guest[] = [];

  addGuest(guest: Guest): GuestsBuilder {
    this.guests.push(guest);
    return this;
  }

  addGuests(guests: Guest[]): GuestsBuilder {
    this.guests = [...this.guests, ...guests];
    return this;
  }

  build(): Guests {
    return new Guests(this.guests);
  }
}
