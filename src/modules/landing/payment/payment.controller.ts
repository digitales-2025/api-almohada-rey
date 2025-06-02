import {
  Controller,
  Post,
  Body,
  HttpStatus,
  Res,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';

import { CreatePaymentDto } from './dto/create-payment.dto';

import { ApiTags } from '@nestjs/swagger';
import { PaymentService } from './payment.service';

@ApiTags('Landing Payment')
@Controller({
  path: 'landing-payment',
  version: '1',
})
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Crear un pago y obtener el formToken para renderizar en frontend
   */
  @Post()
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Res() res: Response,
  ) {
    try {
      const formToken =
        await this.paymentService.createPayment(createPaymentDto);
      res.status(HttpStatus.OK).send({ token: formToken });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        res.status(error.getStatus()).send({ message: error.message });
      } else {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .send({ message: 'Internal server error' });
      }
    }
  }

  /**
   * Validar un pago recibido (usado en IPN o callbacks)
   */
  @Post('validate')
  async validatePayment(@Body() body, @Res() res: Response) {
    try {
      const isValid = this.paymentService.validatePayment(body);
      res.status(HttpStatus.OK).send({ isValid });
    } catch (error) {
      console.error('[❌ Error en validación]:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        return res.status(error.getStatus()).send({ error: error.message });
      }

      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send({ error: 'Internal server error' });
    }
  }
}
