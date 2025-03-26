import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/prisma/src/abstract/base.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { Customer } from '../entity/customer.entity';

@Injectable()
export class CustomerRepository extends BaseRepository<Customer> {
  constructor(prisma: PrismaService) {
    super(prisma, 'reservation');
  }
}
