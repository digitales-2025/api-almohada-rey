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

    // Formatear campos numéricos
    if (request.body.number) {
      request.body.number = Number(request.body.number);
      if (isNaN(request.body.number)) {
        throw new BadRequestException('number must be a valid integer');
      }
    }
    
    if (request.body.guests) {
      request.body.guests = Number(request.body.guests);
      if (isNaN(request.body.guests)) {
        throw new BadRequestException('guests must be a valid integer');
      }
    }
    
    if (request.body.price) {
      request.body.price = Number(request.body.price);
      if (isNaN(request.body.price)) {
        throw new BadRequestException('price must be a valid number');
      }
    }
    
    if (request.body.area) {
      request.body.area = Number(request.body.area);
      if (isNaN(request.body.area)) {
        throw new BadRequestException('area must be a valid number');
      }
    }

    // Formatear el campo isActive si existe
    if (request.body.isActive !== undefined) {
      request.body.isActive = request.body.isActive === 'true';
    }

    // Eliminar la propiedad imageUpdates si no se proporciona ningún dato
    if (!request.body.imageUpdates) {
      delete request.body.imageUpdates;
    }

    return next.handle();
  }
}