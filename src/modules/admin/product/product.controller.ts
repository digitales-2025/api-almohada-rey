import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Auth, GetUser } from '../auth/decorators';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  HttpResponse,
  ProductData,
  UserData,
  UserPayload,
} from 'src/interfaces';
import { DeleteProductDto } from './dto/delete-product.dto';
import { ProductType } from '@prisma/client';
import { PaginatedResponse } from 'src/utils/paginated-response/PaginatedResponse.dto';

@ApiTags('Admin Products')
@ApiUnauthorizedResponse({ description: 'Unauthorized' })
@ApiInternalServerErrorResponse({ description: 'Internal server error' })
@ApiBadRequestResponse({ description: 'Bad request' })
@Controller({
  path: 'product',
  version: '1',
})
@Auth()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiCreatedResponse({ description: 'Product created successfully' })
  @ApiOperation({ summary: 'Create a new product' })
  @Post()
  create(
    @Body() createProductDto: CreateProductDto,
    @GetUser() user: UserData,
  ): Promise<HttpResponse<ProductData>> {
    return this.productService.create(createProductDto, user);
  }

  @ApiOkResponse({ description: 'Products found successfully' })
  @ApiOperation({ summary: 'Get all products' })
  @Get()
  findAll(@GetUser() user: UserPayload): Promise<ProductData[]> {
    return this.productService.findAll(user);
  }

  @Get('paginated')
  @ApiOperation({
    summary: 'Get paginated products with advanced filters',
    description:
      'Get products with advanced filtering by type, isActive status, and search in product fields (name, code, unit cost)',
  })
  @ApiQuery({
    name: 'page',
    description: 'Page number',
    type: Number,
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'Number of items per page',
    type: Number,
    example: 10,
    required: false,
  })
  @ApiQuery({
    name: 'search',
    description: 'Search term for product name, code, or unit cost (price)',
    type: String,
    required: false,
  })
  @ApiQuery({
    name: 'type',
    description: 'Filter by product type (array)',
    type: String,
    example: 'COMMERCIAL,INTERNAL_USE',
    required: false,
  })
  @ApiQuery({
    name: 'isActive',
    description: 'Filter by active status (array)',
    type: String,
    example: 'true,false',
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    description: 'Field to sort by',
    type: String,
    example: 'name',
    required: false,
  })
  @ApiQuery({
    name: 'sortOrder',
    description: 'Sort order',
    type: String,
    enum: ['asc', 'desc'],
    example: 'asc',
    required: false,
  })
  @ApiOkResponse({ description: 'Products paginated retrieved successfully' })
  findAllPaginated(
    @GetUser() user: UserPayload,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<PaginatedResponse<ProductData>> {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    // Construir filtros
    const filterOptions: any = {};

    // Filtro por tipo (array)
    if (type) {
      const typeArray = type.split(',').map((t) => t.trim());
      filterOptions.arrayByField = {
        ...filterOptions.arrayByField,
        type: typeArray,
      };
    }

    // Filtro por isActive (array booleano)
    if (isActive) {
      const isActiveArray = isActive.split(',').map((a) => a.trim() === 'true');
      filterOptions.arrayByField = {
        ...filterOptions.arrayByField,
        isActive: isActiveArray,
      };
    }

    // Búsqueda simple en campos del producto
    if (search) {
      filterOptions.searchByField = {
        ...filterOptions.searchByField,
        name: search,
        code: search,
      };

      // Búsqueda por precio (unitCost) - convertir string a número si es posible
      const numericSearch = parseFloat(search);
      if (!isNaN(numericSearch)) {
        filterOptions.searchByField = {
          ...filterOptions.searchByField,
          unitCost: numericSearch,
        };
      }
    }

    // Construir opciones de ordenamiento
    const sortOptions: any = {};
    if (sortBy) {
      sortOptions.field = sortBy;
      sortOptions.order = sortOrder || 'asc';
    }

    return this.productService.findAllPaginated(
      user,
      { page: pageNumber, pageSize: pageSizeNumber },
      filterOptions,
      sortOptions,
    );
  }

  @ApiOkResponse({ description: 'Products found successfully' })
  @ApiOperation({ summary: 'Get all products by type' })
  @ApiParam({
    name: 'type',
    enum: ProductType,
    enumName: 'ProductType',
    description: 'Tipo de producto (COMMERCIAL o INTERNAL_USE)',
  })
  @Get('all/type/:type')
  findAllByType(@Param('type') type: ProductType): Promise<ProductData[]> {
    return this.productService.findAllByType(type);
  }

  @ApiOkResponse({ description: 'Product found successfully' })
  @ApiOperation({ summary: 'Get a product by ID' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<ProductData> {
    return this.productService.findOne(id);
  }

  @ApiOkResponse({ description: 'Product updated successfully' })
  @ApiOperation({ summary: 'Update a product by ID' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @GetUser() user: UserData,
  ) {
    return this.productService.update(id, updateProductDto, user);
  }

  @ApiOkResponse({ description: 'Products deactivated successfully' })
  @ApiOperation({ summary: 'Deactivate a product by id' })
  @Delete('remove/all')
  deactivate(
    @Body() products: DeleteProductDto,
    @GetUser() user: UserData,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.productService.removeAll(products, user);
  }

  @ApiOkResponse({ description: 'Products reactivated successfully' })
  @ApiOperation({ summary: 'Reactivate a product by id' })
  @Patch('reactivate/all')
  reactivateAll(
    @GetUser() user: UserData,
    @Body() products: DeleteProductDto,
  ): Promise<Omit<HttpResponse, 'data'>> {
    return this.productService.reactivateAll(user, products);
  }
}
