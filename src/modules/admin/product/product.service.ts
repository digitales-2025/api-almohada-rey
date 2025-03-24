import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  HttpResponse,
  ProductData,
  UserData,
  UserPayload,
} from 'src/interfaces';
import { handleException } from 'src/utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '@prisma/client';
import {
  createDynamicUpdateObject,
  hasNoChanges,
} from 'src/utils/update-validations.util';

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
        const product = await this.prisma.product.create({
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

        // Registrar la auditoría de la creación del producto
        await this.audit.create({
          entityId: product.id,
          entityType: 'product',
          action: AuditActionType.CREATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return product;
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

  /**
   * Obtener todos los productos
   * @param user Usuario que realiza la petición
   * @returns Lista de productos
   */
  async findAll(user: UserPayload): Promise<ProductData[]> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          ...(user.isSuperAdmin ? {} : { isActive: true }), // Filtrar por isActive solo si no es super admin
        },
        select: {
          id: true,
          name: true,
          type: true,
          unitCost: true,
          isActive: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // Mapea los resultados al tipo ProductData
      return products.map((product) => ({
        id: product.id,
        name: product.name,
        type: product.type,
        unitCost: product.unitCost,
        isActive: product.isActive,
      })) as ProductData[];
    } catch (error) {
      this.logger.error('Error getting all products');
      handleException(error, 'Error getting all products');
    }
  }

  /**
   * Buscar un producto por su id
   * @param id Id del producto
   * @returns Producto encontrado
   */
  async findOne(id: string): Promise<ProductData> {
    try {
      return await this.findById(id);
    } catch (error) {
      this.logger.error('Error get product');
      if (error instanceof BadRequestException) {
        throw error;
      }
      handleException(error, 'Error get product');
    }
  }

  /**
   * Buscar un producto por su id con validaciones
   * @param id Id del producto
   * @returns Producto encontrado
   */
  async findById(id: string): Promise<ProductData> {
    const productDb = await this.prisma.product.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        unitCost: true,
        isActive: true,
      },
    });
    if (!productDb) {
      throw new BadRequestException('This product doesnt exist');
    }

    if (!!productDb && !productDb.isActive) {
      throw new BadRequestException('This product exist, but is inactive');
    }

    return productDb;
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

  /**
   * Actualizar un producto
   * @param id Id del producto
   * @param updateProductDto Datos a actualizar del producto
   * @param user Usuario que realiza la petición
   * @returns Producto actualizado
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    user: UserData,
  ): Promise<HttpResponse<ProductData>> {
    const { name } = updateProductDto;

    try {
      const productDB = await this.findById(id);

      if (name) await this.findByName(name, id);

      // Validar si hay cambios
      if (hasNoChanges(updateProductDto, productDB)) {
        return {
          statusCode: HttpStatus.OK,
          message: 'Product updated successfully',
          data: {
            ...productDB,
          },
        };
      }

      // Construir el objeto de actualización dinámicamente solo con los campos presentes
      const updateData = createDynamicUpdateObject(updateProductDto, productDB);

      // Transacción para realizar la actualización
      const updatedProduct = await this.prisma.$transaction(async (prisma) => {
        const product = await prisma.product.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            name: true,
            type: true,
            unitCost: true,
            isActive: true,
          },
        });
        // Crear un registro de auditoría
        await this.audit.create({
          entityId: product.id,
          entityType: 'product',
          action: AuditActionType.UPDATE,
          performedById: user.id,
          createdAt: new Date(),
        });

        return product;
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Product updated successfully',
        data: {
          ...updatedProduct,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error updating product: ${error.message}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      handleException(error, 'Error updating a product');
    }
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
