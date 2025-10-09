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
  private readonly password: string;

  constructor(private configService: ConfigService) {
    const username = this.configService.get<string>('IZIPAY_PAYMENT_USERNAME');
    this.password = this.configService.get<string>('IZIPAY_PAYMENT_PASSWORD');
    this.hmacSecretKey = this.configService
      .get<string>('IZIPAY_HMAC_KEY')
      .trim(); // .trim() por si acaso
    this.endpoint = this.configService.get<string>('IZIPAY_PAYMENT_ENDPOINT');

    if (!username || !this.password || !this.hmacSecretKey || !this.endpoint) {
      throw new Error('Faltan variables de entorno necesarias para Izipay');
    }

    this.authHeader =
      'Basic ' + Buffer.from(`${username}:${this.password}`).toString('base64');
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

  validatePayment(validatePaymentDto): boolean {
    // Verificar si los datos vienen anidados
    let hashKey, hash, rawClientAnswer;

    if (
      validatePaymentDto.rawClientAnswer &&
      typeof validatePaymentDto.rawClientAnswer === 'object' &&
      validatePaymentDto.rawClientAnswer.hashKey
    ) {
      // Si los datos vienen anidados en rawClientAnswer y rawClientAnswer es un objeto
      hashKey = validatePaymentDto.rawClientAnswer.hashKey;
      hash = validatePaymentDto.rawClientAnswer.hash;
      rawClientAnswer = validatePaymentDto.rawClientAnswer.rawClientAnswer;
    } else {
      // Extracción directa del objeto principal
      ({ hashKey, hash, rawClientAnswer } = validatePaymentDto);
    }

    let generatedHash = '';

    if (!hashKey) {
      // Intenta buscar hashKey en otras posibles ubicaciones
      if (
        validatePaymentDto.rawClientAnswer &&
        validatePaymentDto.rawClientAnswer.hashAlgorithm
      ) {
        hashKey = validatePaymentDto.rawClientAnswer.hashAlgorithm;
      }

      if (!hashKey) {
        throw new BadRequestException('Payment hash is required');
      }
    }

    if (hashKey === 'sha256_hmac') {
      // Para sha256_hmac, verificamos si rawClientAnswer es string para procesarlo correctamente
      if (typeof rawClientAnswer === 'string') {
        generatedHash = this.generateHmacSha256(
          rawClientAnswer,
          this.hmacSecretKey,
        );
      } else {
        generatedHash = this.generateHmacSha256(
          rawClientAnswer,
          this.hmacSecretKey,
        );
      }
    } else if (hashKey === 'password') {
      // Para password, usamos el string JSON del objeto rawClientAnswer
      const rawClientAnswerStr =
        typeof rawClientAnswer === 'string'
          ? rawClientAnswer
          : JSON.stringify(rawClientAnswer);

      generatedHash = this.generateHmacSha256(
        rawClientAnswerStr,
        this.password,
      );
    } else {
      this.logger.warn(`Tipo de hash no soportado: ${hashKey}`);
      return false;
    }
    const isValid = hash === generatedHash;

    if (isValid) {
      return true;
    } else {
      throw new BadRequestException('Payment hash mismatch');
    }
  }

  /**
   * Genera un hash HMAC-SHA256
   * @param message Mensaje a hashear (string u objeto)
   * @param secretKey Llave secreta
   * @returns Hash en formato hexadecimal
   */
  generateHmacSha256(
    message: string | Record<string, any>,
    secretKey: string,
  ): string {
    try {
      const messageStr =
        typeof message === 'string' ? message : JSON.stringify(message);

      return crypto
        .createHmac('sha256', secretKey)
        .update(messageStr)
        .digest('hex');
    } catch (error) {
      this.logger.error('Error generando HMAC-SHA256:', error);
      throw new InternalServerErrorException('Error al generar hash');
    }
  }
}
