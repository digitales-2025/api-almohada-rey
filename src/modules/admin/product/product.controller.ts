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
  @ApiOperation({ summary: 'Get paginated products' })
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
    name: 'type',
    description: 'Product type filter',
    enum: ProductType,
    required: false,
  })
  @ApiOperation({ summary: 'Get all paginated products' })
  findAllPaginated(
    @GetUser() user: UserPayload,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
    @Query('type') type?: ProductType,
  ): Promise<PaginatedResponse<ProductData>> {
    const pageNumber = parseInt(page, 10) || 1;
    const pageSizeNumber = parseInt(pageSize, 10) || 10;

    return this.productService.findAllPaginated(user, {
      page: pageNumber,
      pageSize: pageSizeNumber,
      type,
    });
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
