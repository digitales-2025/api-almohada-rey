import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Auth, GetUser } from 'src/modules/admin/auth/decorators';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CustomerData,
  HttpResponse,
  UserData,
  UserPayload,
} from 'src/interfaces';
import { DeleteCustomerDto } from './dto/delete-customer.dto';
import { Customer } from './entity/customer.entity';

@ApiTags('Admin Customers')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@ApiBadRequestResponse({ description: 'Bad request' })
@Controller({
  path: 'customers',
  version: '1',
})
@Auth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiCreatedResponse({ description: 'Customer created successfully' })
  @Post()
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<CustomerData>> {
    return this.customersService.create(createCustomerDto, user);
  }

  @ApiOkResponse({ description: 'Customers found successfully' })
  @Get()
  findAll(@GetUser() user: UserPayload): Promise<CustomerData[]> {
    return this.customersService.findAll(user);
  }

  @Get('searchByDocNumber')
  @ApiOkResponse({
    description: 'Customers found successfully',
    type: [Customer],
  })
  @ApiOperation({
    summary:
      'Busqueda rápida de cliente por su número de documento de identidad, siempre se tiene que enviar un string o "None" al query param docNumber',
  })
  searchByDocNumber(
    @Query('docNumber') docNumber: string,
  ): Promise<Customer[]> {
    return this.customersService.searchCustomerByDocumentIdCoincidence(
      docNumber,
    );
  }

  @ApiOkResponse({ description: 'Customer found successfully' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @ApiOkResponse({ description: 'Customer found successfully' })
  @Get('document/number/:documentNumber')
  findDocumentNumber(@Param('documentNumber') documentNumber: string) {
    return this.customersService.findDocumentNumber(documentNumber);
  }

  @ApiOkResponse({ description: 'Customer updated successfully' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @GetUser() user: UserData,
  ) {
    return this.customersService.update(id, updateCustomerDto, user);
  }

  @ApiOkResponse({ description: 'Customers deactivated successfully' })
  @Delete('remove/all')
  deactivate(
    @Body() customers: DeleteCustomerDto,
    @GetUser() user: UserData,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.customersService.removeAll(customers, user);
  }

  @ApiOkResponse({ description: 'Customers reactivated successfully' })
  @Patch('reactivate/all')
  reactivateAll(
    @GetUser() user: UserData,
    @Body() customers: DeleteCustomerDto,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.customersService.reactivateAll(user, customers);
  }
}
