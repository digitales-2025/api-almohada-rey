# 🔍 Guía de Implementación de Búsqueda Avanzada

Esta guía te ayudará a implementar la **búsqueda avanzada y robusta** en cualquier endpoint de tu proyecto, ya sea usando `BaseRepository` o `PaginationService`.

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura de la Solución](#arquitectura-de-la-solución)
3. [Implementación con BaseRepository](#implementación-con-baserepository)
4. [Implementación con PaginationService](#implementación-con-paginationservice)
5. [Ejemplos Prácticos](#ejemplos-prácticos)
6. [Parámetros de Búsqueda](#parámetros-de-búsqueda)
7. [Casos de Uso Comunes](#casos-de-uso-comunes)

## 🎯 Introducción

La búsqueda avanzada permite:
- **Búsqueda inteligente** en múltiples campos
- **Filtros por arrays** (booleanos, enums)
- **Búsqueda relacional** (en tablas relacionadas)
- **Ordenamiento dinámico**
- **Búsqueda case-insensitive** y flexible

## 🏗️ Arquitectura de la Solución

### Componentes Principales

1. **`FilterOptions<T>`** - Interfaz para filtros avanzados
2. **`SortOptions<T>`** - Interfaz para ordenamiento
3. **`BaseRepository`** - Para proyectos que usan repositorios
4. **`PaginationService`** - Para proyectos que usan servicios de paginación

### Flujo de Datos

```
Controller → Service → Repository/PaginationService → Prisma → Database
     ↓           ↓              ↓                    ↓
  Query Params → FilterOptions → WHERE Clause → SQL Query
```

## 🔧 Implementación con BaseRepository

### 1. Actualizar el Service

```typescript
// reservation.service.ts
import { FilterOptions, SortOptions } from 'src/prisma/src/interfaces/base.repository.interfaces';

async findManyPaginated(
  user: UserPayload,
  pagination?: PaginationParams,
  additionalParams?: FilterQueryParamsByField<Reservation>,
  filterOptions?: FilterOptions<Reservation>,
  sortOptions?: SortOptions<Reservation>,
): Promise<PaginatedResponse<DetailedReservation>> {
  try {
    // Definir campos que son enums y fechas
    const enumFields = ['status'];
    const dateFields = ['checkInDate', 'checkOutDate', 'createdAt', 'updatedAt'];

    // Filtros base para usuarios no super admin
    const baseFilters: FilterOptions<Reservation> = {};
    if (!user.isSuperAdmin) {
      baseFilters.searchByField = { isActive: true };
    }

    // Combinar filtros base con los proporcionados
    const combinedFilterOptions: FilterOptions<Reservation> = {
      ...baseFilters,
      ...filterOptions,
    };

    // Usar el método avanzado del repository
    const result = await this.reservationRepository.findManyPaginated<DetailedReservation>(
      pagination,
      {
        filterOptions: combinedFilterOptions,
        sortOptions,
        enumFields,
        dateFields,
        include: {
          room: { include: { RoomTypes: true } },
          user: true,
          customer: true,
        },
      },
    );

    return result;
  } catch (error) {
    this.errorHandler.handleError(error, 'getting');
  }
}
```

### 2. Actualizar el Controller

```typescript
// reservation.controller.ts
@Get('paginated')
@ApiQuery({ name: 'search', description: 'Search term...', required: false })
@ApiQuery({ name: 'isActive', description: 'Filter by active status...', required: false })
@ApiQuery({ name: 'status', description: 'Filter by status...', required: false })
@ApiQuery({ name: 'sortBy', description: 'Field to sort by...', required: false })
@ApiQuery({ name: 'sortOrder', description: 'Sort order (asc/desc)...', required: false })
async findAllPaginated(
  @GetUser() user: UserPayload,
  @Query('page') page: string = '1',
  @Query('pageSize') pageSize: string = '10',
  @Query('search') search?: string,
  @Query('isActive') isActive?: string,
  @Query('status') status?: string,
  @Query('sortBy') sortBy?: string,
  @Query('sortOrder') sortOrder?: string,
): Promise<PaginatedResponse<DetailedReservation>> {
  const pageNumber = parseInt(page, 10) || 1;
  const pageSizeNumber = parseInt(pageSize, 10) || 10;

  // Parse array parameters
  const parseArrayParam = (param?: string) => {
    if (!param) return undefined;
    return param.split(',').map((item) => {
      const trimmed = item.trim();
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      return trimmed;
    });
  };

  // Build filter options
  const filterOptions: any = {};

  // Search functionality - ROBUST AND COMPLETE
  if (search) {
    // 1. Campos directos de la reserva
    filterOptions.searchByField = {
      origin: search,
      reason: search,
    };

    // 2. Campos relacionales - Customer, Room, RoomTypes, User (Receptionist)
    filterOptions.searchByFieldsRelational = [
      {
        customer: {
          name: search,
          department: search,
          province: search,
          country: search,
          email: search,
          phone: search,
          documentNumber: search,
          companyName: search,
          address: search,
          birthPlace: search,
          occupation: search,
          companyAddress: search,
          ruc: search,
          blacklistReason: search,
        },
      },
      {
        room: {
          ...(isNaN(Number(search)) ? {} : { number: Number(search) }),
          RoomTypes: { name: search },
        },
      },
      {
        user: {
          name: search,
          email: search,
        },
      },
    ];
  }

  // Boolean array filters
  if (isActive) {
    const isActiveArray = parseArrayParam(isActive);
    if (isActiveArray && isActiveArray.length === 1) {
      filterOptions.searchByField = {
        ...filterOptions.searchByField,
        isActive: isActiveArray[0],
      };
    } else if (isActiveArray && isActiveArray.length > 1) {
      filterOptions.arrayByField = {
        ...filterOptions.arrayByField,
        isActive: isActiveArray,
      };
    }
  }

  // Enum array filters
  if (status) {
    filterOptions.arrayByField = {
      ...filterOptions.arrayByField,
      status: parseArrayParam(status),
    };
  }

  // Sort options
  const sortOptions = sortBy
    ? {
        field: sortBy as keyof Reservation,
        order: (sortOrder as 'asc' | 'desc') || 'desc',
      }
    : undefined;

  return this.reservationService.findManyPaginated(
    user,
    { page: pageNumber, pageSize: pageSizeNumber },
    {},
    filterOptions,
    sortOptions,
  );
}
```

## 🔧 Implementación con PaginationService

### 1. Actualizar el Service

```typescript
// customers.service.ts
import { FilterOptions, SortOptions } from 'src/prisma/src/interfaces/base.repository.interfaces';

async findAllPaginated(
  user: UserPayload,
  options: { page: number; pageSize: number },
  filterOptions?: FilterOptions<any>,
  sortOptions?: SortOptions<any>,
): Promise<PaginatedResponse<CustomerData>> {
  try {
    const { page, pageSize } = options;

    // Definir campos que son enums y fechas
    const enumFields = ['documentType', 'maritalStatus'];
    const dateFields = ['birthDate', 'createdAt', 'updatedAt'];

    // Filtros base para usuarios no super admin
    const baseFilters: any = {};
    if (!user.isSuperAdmin) {
      baseFilters.searchByField = { isActive: true };
    }

    // Combinar filtros base con los proporcionados
    const combinedFilterOptions = {
      ...baseFilters,
      ...filterOptions,
    };

    return await this.paginationService.paginateAdvanced<any, CustomerData>({
      model: 'customer',
      page,
      pageSize,
      where: {},
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        birthPlace: true,
        country: true,
        documentNumber: true,
        documentType: true,
        email: true,
        birthDate: true,
        maritalStatus: true,
        occupation: true,
        phone: true,
        ruc: true,
        companyAddress: true,
        companyName: true,
        department: true,
        province: true,
        isActive: true,
      },
      transformer: (customer) => ({
        id: customer.id,
        name: customer.name,
        address: customer.address,
        birthPlace: customer.birthPlace,
        country: customer.country,
        ...(customer.ruc && {
          ruc: customer.ruc,
          companyAddress: customer.companyAddress,
          companyName: customer.companyName,
        }),
        documentNumber: customer.documentNumber,
        documentType: customer.documentType,
        ...(customer.email && { email: customer.email }),
        ...(customer.birthDate && { birthDate: customer.birthDate }),
        maritalStatus: customer.maritalStatus,
        occupation: customer.occupation,
        phone: customer.phone,
        ...(customer.department && { department: customer.department }),
        ...(customer.province && { province: customer.province }),
        isActive: customer.isActive,
      }),
      filterOptions: combinedFilterOptions,
      sortOptions,
      enumFields,
      dateFields,
    });
  } catch (error) {
    this.logger.error('Error getting paginated customers', error.stack);
    handleException(error, 'Error getting paginated customers');
  }
}
```

### 2. Actualizar el Controller

```typescript
// customers.controller.ts
@Get('paginated')
@ApiOperation({ summary: 'Get paginated customers with advanced search' })
@ApiQuery({ name: 'search', description: 'Search term...', required: false })
@ApiQuery({ name: 'isActive', description: 'Filter by active status...', required: false })
@ApiQuery({ name: 'documentType', description: 'Filter by document type...', required: false })
@ApiQuery({ name: 'maritalStatus', description: 'Filter by marital status...', required: false })
@ApiQuery({ name: 'sortBy', description: 'Field to sort by...', required: false })
@ApiQuery({ name: 'sortOrder', description: 'Sort order (asc/desc)...', required: false })
async findAllPaginated(
  @GetUser() user: UserPayload,
  @Query('page') page: string = '1',
  @Query('pageSize') pageSize: string = '10',
  @Query('search') search?: string,
  @Query('isActive') isActive?: string,
  @Query('documentType') documentType?: string,
  @Query('maritalStatus') maritalStatus?: string,
  @Query('sortBy') sortBy?: string,
  @Query('sortOrder') sortOrder?: string,
): Promise<PaginatedResponse<CustomerData>> {
  const pageNumber = parseInt(page, 10) || 1;
  const pageSizeNumber = parseInt(pageSize, 10) || 10;

  // Parse array parameters
  const parseArrayParam = (param?: string) => {
    if (!param) return undefined;
    return param.split(',').map((item) => {
      const trimmed = item.trim();
      if (trimmed === 'true') return true;
      if (trimmed === 'false') return false;
      return trimmed;
    });
  };

  // Build filter options
  const filterOptions: any = {};

  // Search functionality - ROBUST AND COMPLETE
  if (search) {
    filterOptions.searchByField = {
      name: search,
      email: search,
      phone: search,
      address: search,
      birthPlace: search,
      country: search,
      department: search,
      province: search,
      occupation: search,
      documentNumber: search,
      companyName: search,
      ruc: search,
      companyAddress: search,
    };
  }

  // Boolean array filters
  if (isActive) {
    const isActiveArray = parseArrayParam(isActive);
    if (isActiveArray && isActiveArray.length === 1) {
      filterOptions.searchByField = {
        ...filterOptions.searchByField,
        isActive: isActiveArray[0],
      };
    } else if (isActiveArray && isActiveArray.length > 1) {
      filterOptions.arrayByField = {
        ...filterOptions.arrayByField,
        isActive: isActiveArray,
      };
    }
  }

  // Enum array filters
  if (documentType) {
    filterOptions.arrayByField = {
      ...filterOptions.arrayByField,
      documentType: parseArrayParam(documentType),
    };
  }

  if (maritalStatus) {
    filterOptions.arrayByField = {
      ...filterOptions.arrayByField,
      maritalStatus: parseArrayParam(maritalStatus),
    };
  }

  // Sort options
  const sortOptions = sortBy
    ? {
        field: sortBy as keyof any,
        order: (sortOrder as 'asc' | 'desc') || 'asc',
      }
    : undefined;

  return this.customersService.findAllPaginated(
    user,
    { page: pageNumber, pageSize: pageSizeNumber },
    filterOptions,
    sortOptions,
  );
}
```

## 📊 Parámetros de Búsqueda

### Parámetros Básicos

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `page` | number | Número de página | `1` |
| `pageSize` | number | Elementos por página | `10` |
| `search` | string | Término de búsqueda | `"juan perez"` |
| `sortBy` | string | Campo para ordenar | `"name"` |
| `sortOrder` | string | Orden (asc/desc) | `"asc"` |

### Parámetros de Filtro

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `isActive` | string | Estado activo (true/false) | `"true"` o `"true,false"` |
| `status` | string | Estado (enum) | `"active"` o `"active,inactive"` |
| `documentType` | string | Tipo de documento | `"DNI"` o `"DNI,PASSPORT"` |
| `maritalStatus` | string | Estado civil | `"SINGLE"` o `"SINGLE,MARRIED"` |

## 🎯 Casos de Uso Comunes

### 1. Búsqueda Simple

```bash
GET /api/v1/customers/paginated?search=juan&page=1&pageSize=10
```

### 2. Filtro por Estado Activo

```bash
GET /api/v1/customers/paginated?isActive=true&page=1&pageSize=10
```

### 3. Filtro por Múltiples Estados

```bash
GET /api/v1/customers/paginated?isActive=true,false&page=1&pageSize=10
```

### 4. Filtro por Tipo de Documento

```bash
GET /api/v1/customers/paginated?documentType=DNI,PASSPORT&page=1&pageSize=10
```

### 5. Búsqueda con Ordenamiento

```bash
GET /api/v1/customers/paginated?search=perez&sortBy=name&sortOrder=asc&page=1&pageSize=10
```

### 6. Búsqueda Compleja

```bash
GET /api/v1/customers/paginated?search=juan&isActive=true&documentType=DNI&maritalStatus=SINGLE,MARRIED&sortBy=createdAt&sortOrder=desc&page=1&pageSize=20
```

## 🔍 Lógica de Búsqueda Inteligente

### Búsqueda Flexible

La búsqueda es **case-insensitive** y **flexible**:

- **1 palabra**: Búsqueda parcial (`"juan"` encuentra "Juan", "Juan Carlos", "Juanito")
- **2 palabras**: Búsqueda de frase completa (`"juan perez"` encuentra "Juan Pérez García")
- **3+ palabras**: Búsqueda estricta de frase completa

### Campos de Búsqueda

#### Para Reservas:
- **Directos**: `origin`, `reason`
- **Cliente**: `name`, `department`, `province`, `country`, `email`, `phone`, `documentNumber`, `companyName`, `address`, `birthPlace`, `occupation`, `companyAddress`, `ruc`, `blacklistReason`
- **Habitación**: `room.number`, `room.RoomTypes.name`
- **Usuario**: `user.name`, `user.email`

#### Para Clientes:
- **Directos**: `name`, `email`, `phone`, `address`, `birthPlace`, `country`, `department`, `province`, `occupation`, `documentNumber`, `companyName`, `ruc`, `companyAddress`

## 🚀 Ventajas de la Implementación

1. **Reutilizable**: Funciona con cualquier modelo
2. **Flexible**: Soporta múltiples tipos de filtros
3. **Optimizada**: Consultas SQL eficientes
4. **Escalable**: Fácil de extender
5. **Mantenible**: Código limpio y documentado

## 📝 Notas Importantes

1. **Siempre definir** `enumFields` y `dateFields` en el service
2. **Usar** `parseArrayParam` para parámetros de array
3. **Combinar** filtros base con filtros proporcionados
4. **Validar** tipos de datos en el controller
5. **Documentar** todos los parámetros con `@ApiQuery`

## 🔧 Troubleshooting

### Error: "Unknown argument 'filterOptions'"
- **Solución**: Asegúrate de que el `BaseRepository` esté actualizado con la versión más reciente

### Error: "Unknown argument 'in'"
- **Solución**: Verifica que los campos boolean se manejen correctamente (un valor vs array)

### Búsqueda no encuentra resultados
- **Solución**: Verifica que los campos estén incluidos en `searchByField` o `searchByFieldsRelational`

---

¡Con esta guía puedes implementar búsqueda avanzada en cualquier endpoint de tu proyecto! 🎉
