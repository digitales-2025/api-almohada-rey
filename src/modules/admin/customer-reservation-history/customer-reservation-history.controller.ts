import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CustomerReservationHistoryService } from './customer-reservation-history.service';
import { CreateCustomerReservationHistoryDto } from './dto/create-customer-reservation-history.dto';
import { UpdateCustomerReservationHistoryDto } from './dto/update-customer-reservation-history.dto';
import { DeleteCustomerReservationHistoryDto } from './dto/delete-customer-reservation-history.dto';
import { Auth, GetUser } from '../auth/decorators';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HttpResponse, UserData } from 'src/interfaces';
import { CustomerReservationHistoryResponseDto } from './dto/customer-reservation-history-response.dto';

@ApiTags('Admin Customer Reservation History')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@ApiBadRequestResponse({ description: 'Bad request' })
@Controller({
  path: 'customer-reservation-history',
  version: '1',
})
@Auth()
export class CustomerReservationHistoryController {
  constructor(
    private readonly customerReservationHistoryService: CustomerReservationHistoryService,
  ) {}

  @ApiCreatedResponse({
    description: 'Customer reservation history created successfully',
    type: CustomerReservationHistoryResponseDto,
  })
  @ApiOperation({ summary: 'Create a new customer reservation history record' })
  @Post()
  create(
    @Body() createDto: CreateCustomerReservationHistoryDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<CustomerReservationHistoryResponseDto>> {
    return this.customerReservationHistoryService.create(createDto, user);
  }

  @ApiOkResponse({
    description: 'Customer reservation histories found successfully',
    type: [CustomerReservationHistoryResponseDto],
  })
  @ApiOperation({
    summary: 'Get all customer reservation histories by customer ID',
  })
  @ApiParam({
    name: 'customerId',
    description: 'ID del cliente',
    example: 'uuid-del-cliente',
  })
  @Get('customer/:customerId')
  findAllByCustomerId(
    @Param('customerId') customerId: string,
  ): Promise<CustomerReservationHistoryResponseDto[]> {
    return this.customerReservationHistoryService.findAllByCustomerId(
      customerId,
    );
  }

  @ApiOkResponse({
    description: 'Customer reservation history updated successfully',
    type: CustomerReservationHistoryResponseDto,
  })
  @ApiOperation({ summary: 'Update a customer reservation history record' })
  @ApiParam({
    name: 'id',
    description: 'ID del registro de historial',
    example: 'uuid-del-registro',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerReservationHistoryDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<CustomerReservationHistoryResponseDto>> {
    return this.customerReservationHistoryService.update(id, updateDto, user);
  }

  @ApiOkResponse({
    description: 'Customer reservation histories deleted successfully',
  })
  @ApiOperation({
    summary: 'Delete multiple customer reservation history records',
  })
  @Delete()
  removeAll(
    @Body() deleteDto: DeleteCustomerReservationHistoryDto,
    @GetUser() user: UserData,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.customerReservationHistoryService.removeAll(deleteDto, user);
  }
}
