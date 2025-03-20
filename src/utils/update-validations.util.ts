/**
 * Crea un objeto de actualización dinámico basado en las diferencias entre un DTO de actualización y el objeto original
 *
 * @param updateDto Objeto con los campos a actualizar
 * @param originalEntity Objeto original que contiene los valores actuales
 * @returns Objeto con solo los campos que han cambiado
 */
export function createDynamicUpdateObject<T extends object, K extends keyof T>(
  updateDto: Partial<T>,
  originalEntity: T,
): Partial<T> {
  const updateData: Partial<T> = {};

  // Itera sobre las propiedades del DTO de actualización
  (Object.keys(updateDto) as K[]).forEach((key) => {
    // Solo incluye la propiedad si está definida y es diferente al valor original
    if (
      updateDto[key] !== undefined &&
      updateDto[key] !== originalEntity[key]
    ) {
      updateData[key] = updateDto[key];
    }
  });

  return updateData;
}

/**
 * Verifica si el objeto de actualización contiene cambios
 *
 * @param updateDto Objeto con los campos a actualizar
 * @param originalEntity Objeto original que contiene los valores actuales
 * @returns true si no hay cambios, false si hay al menos un cambio
 */
export function hasNoChanges<T extends object, K extends keyof T>(
  updateDto: Partial<T>,
  originalEntity: T,
): boolean {
  // Verifica si alguna propiedad del DTO es diferente al valor original
  return !(Object.keys(updateDto) as K[]).some(
    (key) =>
      updateDto[key] !== undefined && updateDto[key] !== originalEntity[key],
  );
}
