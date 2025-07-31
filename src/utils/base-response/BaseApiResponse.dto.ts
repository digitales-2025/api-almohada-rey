import { ApiProperty, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';
import { Type } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';

export class BaseApiResponse<T> {
  @ApiProperty({
    description: 'Estado de la operación',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo',
    example: 'Operación realizada con éxito',
    type: String,
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Datos de la respuesta',
    type: Object,
    nullable: true,
  })
  data: T | null;
}

// Decorador para usar en los controladores
export const ApiBaseResponse = <TModel extends Type<any>>(model: TModel) => {
  return applyDecorators(
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(BaseApiResponse) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(model),
              },
            },
          },
        ],
      },
    }),
  );
};
