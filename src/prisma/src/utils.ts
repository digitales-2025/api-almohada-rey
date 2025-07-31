import { BadRequestException } from '@nestjs/common';

/**
 * Valida si hay cambios significativos en un DTO comparado con los datos actuales.
 * @param dto - DTO con los datos a actualizar.
 * @param currentData - Datos actuales.
 * @returns true si hay cambios significativos, false en caso contrario.
 */
export function validateChanges<T extends object>(
  dto: Partial<T>,
  currentData: T,
): boolean {
  // Verifica si todos los campos son undefined o null
  const hasValidValues = Object.values(dto).some(
    (value) => value !== undefined && value !== null,
  );

  if (!hasValidValues) {
    return false;
  }

  // Verifica si hay cambios reales comparando con los datos actuales
  let hasChanges = false;
  for (const [key, newValue] of Object.entries(dto)) {
    // Solo compara si el campo está presente en el DTO y no es undefined
    if (newValue !== undefined && key in currentData) {
      const currentValue = currentData[key];

      // Compara los valores y marca si hay algún cambio
      if (newValue !== currentValue) {
        hasChanges = true;
        break;
      }
    }
  }

  return hasChanges;
}

/**
 * Valida si un array tiene elementos y no contiene valores nulos o indefinidos
 * @param array Array a validar
 * @param fieldName Nombre del campo para el mensaje de error
 * @returns true si el array es válido
 * @throws BadRequestException si el array es inválido
 */
export function validateArray<T>(
  array: T[] | undefined | null,
  fieldName: string = 'Array',
): boolean {
  if (!array || !Array.isArray(array)) {
    throw new BadRequestException(`${fieldName} must be an array`);
  }

  if (array.length === 0) {
    throw new BadRequestException(`${fieldName} cannot be empty`);
  }

  if (array.some((item) => item === null || item === undefined)) {
    throw new BadRequestException(`${fieldName} contains invalid values`);
  }

  return true;
}
