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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CustomerData,
  HttpResponse,
  UserData,
  UserPayload,
} from 'src/interfaces';

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

  @ApiOkResponse({ description: 'Customer found successfully' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(+id);
  }
}
