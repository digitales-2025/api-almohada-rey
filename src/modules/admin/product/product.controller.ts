import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  HttpResponse,
  ProductData,
  UserData,
  UserPayload,
} from 'src/interfaces';

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

  @ApiOkResponse({ description: 'Product found successfully' })
  @ApiOperation({ summary: 'Get a product by ID' })
  @Get(':id')
  findOne(@Param('id') id: string): Promise<ProductData> {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
