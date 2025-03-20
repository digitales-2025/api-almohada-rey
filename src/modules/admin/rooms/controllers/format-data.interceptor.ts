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

    // Formatear los campos booleanos
    if (request.body.prescription) {
      request.body.prescription = request.body.prescription === 'true';
    }
    if (request.body.medicalLeave) {
      request.body.medicalLeave = request.body.medicalLeave === 'true';
    }

    // Formatear el campo updateHistory
    if (request.body.updateHistory) {
      try {
        request.body.updateHistory = JSON.parse(request.body.updateHistory);
      } catch {
        throw new BadRequestException(
          'updateHistory must be a valid JSON object',
        );
      }
    }

    // Formatear el campo medicalLeaveDays
    if (request.body.medicalLeaveDays) {
      request.body.medicalLeaveDays = Number(request.body.medicalLeaveDays);
      if (isNaN(request.body.medicalLeaveDays)) {
        throw new BadRequestException(
          'medicalLeaveDays must be a valid number',
        );
      }
    }

    // Eliminar la propiedad imageUpdates si no se proporciona ningún dato
    if (!request.body.imageUpdates) {
      delete request.body.imageUpdates;
    }

    return next.handle();
  }
}
