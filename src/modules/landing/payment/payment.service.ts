import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentDto } from './dto/create-payment.dto';
import * as https from 'https';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  private readonly authHeader: string;
  private readonly hmacSecretKey: string;
  private readonly endpoint: string;

  constructor(private configService: ConfigService) {
    const username = this.configService.get<string>('IZIPAY_PAYMENT_USERNAME');
    const password = this.configService.get<string>('IZIPAY_PAYMENT_PASSWORD');
    this.hmacSecretKey = this.configService.get<string>('IZIPAY_HMAC_KEY');
    this.endpoint = this.configService.get<string>('IZIPAY_PAYMENT_ENDPOINT');

    if (!username || !password || !this.hmacSecretKey || !this.endpoint) {
      throw new Error('Faltan variables de entorno necesarias para Izipay');
    }

    this.authHeader =
      'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  /**
   * Crea un pago y devuelve el formToken para renderizar en el frontend
   * @param createPaymentDto DTO para crear un pago
   * @returns formToken para redirigir al usuario al formulario de pago
   */
  async createPayment(createPaymentDto: CreatePaymentDto): Promise<string> {
    return new Promise((resolve, reject) => {
      const url = new URL(
        `${this.endpoint}/api-payment/V4/Charge/CreatePayment`,
      );
      const postData = JSON.stringify(
        Object.keys(createPaymentDto).length > 0
          ? createPaymentDto
          : {
              amount: 200,
              currency: 'PEN',
              orderId: 'order-test-001',
              customer: {
                email: 'test@example.com',
              },
            },
      );

      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.status === 'SUCCESS' && response.answer?.formToken) {
              resolve(response.answer.formToken);
            } else {
              this.logger.error('Respuesta fallida de Izipay:', response);
              reject(
                new InternalServerErrorException(
                  'No se pudo generar el formToken de pago.',
                ),
              );
            }
          } catch (err) {
            this.logger.error('Error al parsear respuesta de Izipay:', err);
            reject(
              new InternalServerErrorException(
                'Respuesta inválida del servidor de pagos.',
              ),
            );
          }
        });
      });

      req.on('error', (err) => {
        this.logger.error('Error en solicitud HTTPS a Izipay:', err);
        reject(
          new InternalServerErrorException(
            'Error al conectarse con el servidor de pagos.',
          ),
        );
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Valida la respuesta del pago usando HMAC-SHA256
   * @param param0 Parametros para validar el pago
   * @returns boolean
   */
  validatePayment({
    hashKey,
    hash,
    rawClientAnswer,
  }: {
    hashKey: 'sha256_hmac' | 'password';
    hash: string;
    rawClientAnswer: object;
  }): boolean {
    if (!hashKey || !hash || !rawClientAnswer) {
      throw new BadRequestException('Datos incompletos para validar el pago');
    }

    const message = JSON.stringify(rawClientAnswer);
    const secret =
      hashKey === 'sha256_hmac' ? this.hmacSecretKey : this.authHeader;

    const generatedHash = this.generateHmacSha256(message, secret);

    if (generatedHash === hash) {
      return true;
    } else {
      throw new BadRequestException('Hash de verificación inválido');
    }
  }

  /**
   * Genera un hash HMAC-SHA256 para validar la respuesta del pago
   * @param message Mensaje a firmar
   * @param secretKey Clave secreta para generar el HMAC
   * @returns HMAC SHA256 del mensaje
   */
  private generateHmacSha256(message: string, secretKey: string): string {
    return crypto.createHmac('sha256', secretKey).update(message).digest('hex');
  }
}
