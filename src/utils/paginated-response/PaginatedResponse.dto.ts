import { PaginatedResult } from './pagination.types';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetadata {
  @ApiProperty({ description: 'Total number of items', type: Number })
  total: number;

  @ApiProperty({ description: 'Current page number', type: Number })
  page: number;

  @ApiProperty({ description: 'Number of items per page', type: Number })
  pageSize: number;

  @ApiProperty({ description: 'Total number of pages', type: Number })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page', type: Boolean })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    type: Boolean,
  })
  hasPrevious: boolean;
}

export class PaginatedResponse<T> implements PaginatedResult<T> {
  @ApiProperty({ description: 'The paginated data', isArray: true })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetadata })
  meta: PaginationMetadata;
}
