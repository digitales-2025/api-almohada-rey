import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { HttpResponse, ProductData, UserData } from 'src/interfaces';
import { handleException } from 'src/utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '@prisma/client';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Crear un nuevo producto
   * @param createProductDto Datos del producto a crear
   * @param user Usuario que realiza la petición
   * @returns Producto creado con éxito
   */
  async create(
    createProductDto: CreateProductDto,
    user: UserData,
  ): Promise<HttpResponse<ProductData>> {
    const { name, type, unitCost } = createProductDto;
    let newProduct;

    try {
      // Crear el producto y registrar la auditoría
      await this.findByName(name);

      newProduct = await this.prisma.$transaction(async () => {
        // Crear el nuevo producto
        const customer = await this.prisma.product.create({
          data: {
            name,
            type,
            unitCost,
          },
          select: {
            id: true,
            name: true,
            type: true,
            unitCost: true,
            isActive: true,
          },
        });

        // Registrar la auditoría de la creación del cliente
        await this.audit.create({
          entityId: customer.id,
          entityType: 'product',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return customer;
      });

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Product created successfully',
        data: {
          id: newProduct.id,
          name: newProduct.name,
          type: newProduct.type,
          unitCost: newProduct.unitCost,
          isActive: newProduct.isActive,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error creating product: ${error.message}`,
        error.stack,
      );

      if (newProduct) {
        await this.prisma.product.delete({ where: { id: newProduct.id } });
        this.logger.error(`Product has been deleted due to error in creation.`);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error creating a product');
    }
  }

  findAll() {
    return `This action returns all product`;
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  /**
   * Buscar un producto por su nombre
   * @param name Nombre del producto
   * @param id Id del producto, si se está actualizando
   */
  async findByName(name: string, id?: string) {
    const productDB = await this.prisma.product.findUnique({
      where: { name },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
    if (!!productDB && productDB.id !== id) {
      if (!!productDB && !productDB.isActive) {
        throw new BadRequestException(
          'This name is already in use but the product is inactive',
        );
      }
      if (productDB) {
        throw new BadRequestException('This name is already in use');
      }
    }
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} ${updateProductDto}  product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
