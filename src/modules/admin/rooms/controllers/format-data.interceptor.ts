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

    // Eliminar propiedades extra que no están en el DTO
    if (request.route.path.includes('update-with-images')) {
      // Para actualizaciones, solo procesar campos que realmente existen
      Object.keys(body).forEach((key) => {
        if (body[key] === '' || body[key] === null) {
          delete body[key]; // Eliminar campos vacíos
        }
      });
    }

    // Formatear campos numéricos solo si están presentes
    if (body.number !== undefined && body.number !== '') {
      body.number = Number(body.number);
      if (isNaN(body.number)) {
        throw new BadRequestException('number must be a valid integer');
      }
    }

    if (body.guests !== undefined && body.guests !== '') {
      body.guests = Number(body.guests);
      if (isNaN(body.guests)) {
        throw new BadRequestException('guests must be a valid integer');
      }
    }

    if (body.price !== undefined && body.price !== '') {
      body.price = Number(body.price);
      if (isNaN(body.price)) {
        throw new BadRequestException('price must be a valid number');
      }
    }

    if (body.area !== undefined && body.area !== '') {
      body.area = Number(body.area);
      if (isNaN(body.area)) {
        throw new BadRequestException('area must be a valid number');
      }
    }

    // Formatear el campo isActive si existe
    if (body.isActive !== undefined) {
      body.isActive = body.isActive === 'true';
    }

    return next.handle();
  }
}
