# Módulo de Importación de Excel

Este módulo permite importar datos históricos desde archivos Excel al sistema de Almohada del Rey.

## Endpoint

```
POST /api/import/excel-data
```

## Autenticación

Requiere autenticación JWT. Incluir el token en el header:
```
Authorization: Bearer <token>
```

## Límites

- **Máximo 1000 registros por request**
- Para 9000 registros, enviar 9 requests de 1000 registros cada uno

## Estructura del Request

```json
{
  "data": [
    {
      "ITEM": "1",
      "HABITACION": "101",
      "FECHA": "01/05/2022",
      "HORA": "9:04:38",
      "APELLIDOS Y NOMBRES": "Juan Pérez",
      "TIPO DOCUMENTO": "DNI",
      "Nº DOCUMENTO": "12345678",
      "DOMICILIO": "Av. Principal 123",
      "TELEFONO": "987654321",
      "OCUPACIÓN": "Ingeniero",
      "EMAIL": "juan@email.com",
      "ESTADO CIVIL": "Soltero",
      "EMPRESA": "Empresa ABC",
      "RUC": "20123456789",
      "DIRECCION": "Av. Empresa 456",
      "LISTA NEGRA": "No",
      "PERSONAS": "2",
      "PROCEDENCIA": "Lima",
      "ACOMPAÑANTE": "María García",
      "DOCUMENTO ACOMPAÑANTE": "87654321",
      "MOTIVO DE VIAJE": "Turismo",
      "COMPROBANTE": "BOL-001",
      "Nº": "001",
      "TIPO DE CLIENTE": "Regular",
      "TIPO HABITACION": "Simple",
      "DIAS DE ALOJAMIENTO": "2",
      "PRECIO": "150.00",
      "FORMA DE PAGO": "Efectivo",
      "PAGO": "Pagado",
      "¿CÓMO LLEGO EL CLIENTE?": "Taxi",
      "RECEPCIONISTA CHECK IN": "Ana López",
      "FECHA DE SALIDA": "03/05/2022",
      "HORA DE SALIDA": "12:00:00",
      "RECEPCIONISTA CHECK OUT": "Ana López",
      "OBSERVACIONES": "Cliente satisfecho"
    }
  ],
  "batchNumber": 1,
  "totalBatches": 9
}
```

## Lógica de Procesamiento

### 1. Cliente (Customer)
- **Búsqueda**: Por número de documento
- **Creación**: Si no existe, se crea con datos mínimos
- **Normalización**: 
  - DNI: Completa con ceros adelante si es necesario
  - Teléfono: Agrega +51 si tiene 9 dígitos
  - Estado civil: Convierte a enum
  - Lista negra: "Si" → true, otros → false

### 2. Habitación (Room)
- **Prioridad 1**: Buscar por número exacto
- **Prioridad 2**: Buscar por tipo y precio más cercano
- **Fallback**: Asignar habitación del tipo con precio más similar

### 3. Usuario (Receptionist)
- **Búsqueda**: Por nombre en usuarios con rol RECEPCIONIST
- **Fallback**: Asignar aleatoriamente de recepcionistas disponibles

### 4. Reserva (Reservation)
- **Fechas**: Combina FECHA + HORA para check-in
- **Check-out**: Si no hay fecha de salida, usa DIAS DE ALOJAMIENTO
- **Acompañantes**: Guarda en campo JSON si existe

### 5. Pago (Payment)
- **Código**: Generado automáticamente (PAG-2024-001)
- **Monto**: 100% pagado (amount = amountPaid)
- **Distribución inteligente**:
  - Detalle de habitación (precio base)
  - Si hay sobrante: Desayunos + productos
  - Documento: Si no es "SIN REGISTRO"

## Respuesta

```json
{
  "success": true,
  "processed": 1000,
  "successful": 950,
  "failed": 50,
  "batchNumber": 1,
  "totalBatches": 9,
  "errors": [
    {
      "recordIndex": 5,
      "error": "Habitación no encontrada",
      "data": { /* registro problemático */ }
    }
  ]
}
```

## Manejo de Errores

- **Transacciones individuales**: Si falla 1 registro, los otros continúan
- **Rollback automático**: Cada registro se procesa en su propia transacción
- **Logging detallado**: Errores se registran para debugging

## Campos Opcionales

- Campos con "-" o "0" se tratan como null
- Campos vacíos se tratan como null
- Solo campos críticos generan errores

## Validaciones Críticas

- Número de documento requerido
- Fecha de entrada requerida
- Precio válido
- Habitación debe existir o ser mapeable
