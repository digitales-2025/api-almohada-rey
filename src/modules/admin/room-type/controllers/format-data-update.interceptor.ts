import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class FormatDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Para actualizaciones, solo procesar campos que realmente existen y no están vacíos
    Object.keys(body).forEach((key) => {
      if (body[key] === '' || body[key] === null || body[key] === undefined) {
        delete body[key]; // Eliminar campos vacíos completamente
      }
    });

    // Formatear campos numéricos solo si están presentes
    if (body.number !== undefined) {
      body.number = Number(body.number);
      if (isNaN(body.number)) {
        throw new BadRequestException('number must be a valid integer');
      }
    }

    if (body.guests !== undefined) {
      body.guests = Number(body.guests);
      if (isNaN(body.guests)) {
        throw new BadRequestException('guests must be a valid integer');
      }
    }

    if (body.price !== undefined) {
      body.price = Number(body.price);
      if (isNaN(body.price)) {
        throw new BadRequestException('price must be a valid number');
      }
    }

    if (body.area !== undefined) {
      body.area = Number(body.area);
      if (isNaN(body.area)) {
        throw new BadRequestException('area must be a valid number');
      }
    }

    // Formatear campos booleanos
    if (body.isMain !== undefined) {
      if (body.isMain === 'true') body.isMain = true;
      if (body.isMain === 'false') body.isMain = false;
    }

    // Si hay imageUpdate como string, intentar parsearlo como JSON para validación temprana
    if (body.imageUpdate && typeof body.imageUpdate === 'string') {
      try {
        body.imageUpdate = JSON.parse(body.imageUpdate);
      } catch (e) {
        console.log('🚀 ~ FormatDataInterceptor ~ intercept ~ e:', e);
        throw new BadRequestException('imageUpdate must be a valid JSON');
      }
    }

    return next.handle();
  }
}
