import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
  @ApiOperation({ summary: 'Create a new customer' })
  @Post()
  create(
    @Body() createCustomerDto: CreateCustomerDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<CustomerData>> {
    return this.customersService.create(createCustomerDto, user);
  }

  @ApiOkResponse({ description: 'Customers found successfully' })
  @ApiOperation({ summary: 'Get all customers' })
  @Get()
  findAll(@GetUser() user: UserPayload): Promise<CustomerData[]> {
    return this.customersService.findAll(user);
  }

  @ApiOkResponse({ description: 'Customer found successfully' })
  @ApiOperation({ summary: 'Get a customer by id' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @ApiOkResponse({ description: 'Customer found successfully' })
  @ApiOperation({ summary: 'Get a customer by document number' })
  @Get('document/number/:documentNumber')
  findDocumentNumber(@Param('documentNumber') documentNumber: string) {
    return this.customersService.findDocumentNumber(documentNumber);
  }

  @ApiOkResponse({ description: 'Customer updated successfully' })
  @ApiOperation({ summary: 'Update a customer by id' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @GetUser() user: UserData,
  ) {
    return this.customersService.update(id, updateCustomerDto, user);
  }

  @ApiOkResponse({ description: 'Customers deactivated successfully' })
  @ApiOperation({ summary: 'Deactivate a customer by id' })
  @Delete('remove/all')
  deactivate(
    @Body() customers: DeleteCustomerDto,
    @GetUser() user: UserData,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.customersService.removeAll(customers, user);
  }

  @ApiOkResponse({ description: 'Customers reactivated successfully' })
  @ApiOperation({ summary: 'Reactivate a customer by id' })
  @Patch('reactivate/all')
  reactivateAll(
    @GetUser() user: UserData,
    @Body() customers: DeleteCustomerDto,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.customersService.reactivateAll(user, customers);
  }
}
