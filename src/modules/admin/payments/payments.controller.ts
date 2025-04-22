import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Auth, GetUser } from '../auth/decorators';
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
  HttpResponse,
  PaymentData,
  PaymentDetailData,
  SummaryPaymentData,
  UserData,
} from 'src/interfaces';
import { CreateManyPaymentDetailDto } from './dto/create-many-payment-detail.dto';
import { UpdatePaymentDetailDto } from './dto/update-payment-detail.dto';
import { UpdatePaymentDetailsBatchDto } from './dto/updatePaymentDetailsBatch.dto';

@ApiTags('Admin Payments')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@ApiBadRequestResponse({ description: 'Bad request' })
@Controller({
  path: 'payments',
  version: '1',
})
@Auth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiCreatedResponse({ description: 'Payment created successfully' })
  @ApiOperation({ summary: 'Create a new payment' })
  @Post()
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<PaymentData>> {
    return this.paymentsService.create(createPaymentDto, user);
  }

  @ApiCreatedResponse({ description: 'Payment detail created successfully' })
  @ApiOperation({ summary: 'Create a new payment detail' })
  @Post('detail')
  createPaymentDetail(
    @Body() createManyPaymentDetailDto: CreateManyPaymentDetailDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<PaymentDetailData[]>> {
    return this.paymentsService.createPaymentDetail(
      createManyPaymentDetailDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Get all payments' })
  @ApiOkResponse({ description: 'Payments retrieved successfully' })
  @Get()
  findAll(): Promise<SummaryPaymentData[]> {
    return this.paymentsService.findAll();
  }

  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiOkResponse({ description: 'Payment retrieved successfully' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<PaymentData> {
    return this.paymentsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update payment by ID' })
  @ApiOkResponse({ description: 'Payment updated successfully' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<SummaryPaymentData>> {
    return this.paymentsService.update(id, updatePaymentDto, user);
  }

  @ApiOperation({ summary: 'Update a single payment detail' })
  @ApiOkResponse({ description: 'Payment detail updated successfully' })
  @Patch('detail/:id')
  updatePaymentDetail(
    @Param('id') paymentDetailId: string,
    @Body() updatePaymentDetailDto: UpdatePaymentDetailDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<PaymentDetailData>> {
    return this.paymentsService.updatePaymentDetail(
      paymentDetailId,
      updatePaymentDetailDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Update multiple payment details with same values' })
  @ApiOkResponse({ description: 'Payment details batch updated successfully' })
  @Patch('details/batch')
  updatePaymentDetailsBatch(
    @Body() updateBatchDto: UpdatePaymentDetailsBatchDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<PaymentDetailData[]>> {
    return this.paymentsService.updatePaymentDetailsBatch(updateBatchDto, user);
  }

  @ApiOperation({ summary: 'Delete a payment detail by ID' })
  @ApiOkResponse({ description: 'Payment detail deleted successfully' })
  @Delete('detail/:id')
  removePaymentDetail(
    @Param('id') id: string,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<{ message: string }>> {
    return this.paymentsService.removePaymentDetail(id, user);
  }
}
