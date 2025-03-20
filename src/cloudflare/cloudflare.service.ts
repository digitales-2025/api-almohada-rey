import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

@Injectable()
export class CloudflareService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    // Inicializamos el cliente S3 para interactuar con Cloudflare R2
    this.s3Client = new S3Client({
      region: 'auto', // La región se establece en 'auto' para Cloudflare R2
      endpoint: this.configService.get('API_S3'), // El endpoint viene de .env
      credentials: {
        accessKeyId: this.configService.get('ACCESS_KEY_ID'), // Access Key ID de .env
        secretAccessKey: this.configService.get('SECRET_ACCESS_KEY'), // Secret Access Key de .env
      },
    });

    // Definimos el bucket y la URL pública del bucket desde las variables de entorno
    this.bucketName = this.configService.get('CLOUDFLARE_BUCKET_NAME');
    this.publicUrl = `${this.configService.get('PUBLIC_URL_IMAGE')}`;
  }

  /**
   * Subir una imagen a Cloudflare R2
   * @param file Archivo a subir
   * @returns URL pública del archivo subido
   */
  async uploadImage(file: Express.Multer.File): Promise<string> {
    const fileExtension = extname(file.originalname); // Obtiene la extensión del archivo
    const fileName = `${randomUUID()}${fileExtension}`; // Genera un nombre único para el archivo

    // Parámetros para la subida del archivo
    const params = {
      Bucket: this.bucketName, // Nombre del bucket
      Key: fileName, // Nombre del archivo en el bucket
      Body: file.buffer, // Contenido del archivo
      ContentType: file.mimetype, // Tipo de contenido (ej. image/jpeg)
    };

    // Ejecuta el comando para subir el archivo
    const command = new PutObjectCommand(params);
    await this.s3Client.send(command);
    // Devuelve la URL pública del archivo subido
    return `${this.publicUrl}/${fileName}`;
  }

  /**
   * Actualizar una imagen en Cloudflare R2
   * @param file Archivo a actualizar
   * @param existingFileName Nombre del archivo existente
   * @returns URL pública del archivo actualizado
   */
  async updateImage(
    file: Express.Multer.File,
    existingFileName: string,
  ): Promise<string> {
    // Extraer la extensión del nuevo archivo
    const newExtension = file.originalname.split('.').pop();

    // Generar un nuevo nombre de archivo único con la nueva extensión
    const fileName = `${randomUUID()}.${newExtension}`;

    // Eliminar el archivo existente
    const deleteParams = {
      Bucket: this.bucketName,
      Key: existingFileName,
    };
    const deleteCommand = new DeleteObjectCommand(deleteParams);
    await this.s3Client.send(deleteCommand);

    // Parámetros para actualizar el archivo
    const params = {
      Bucket: this.bucketName, // Nombre del bucket
      Key: fileName, // Nombre del archivo en el bucket
      Body: file.buffer, // Contenido del archivo
      ContentType: file.mimetype, // Tipo de contenido
    };

    // Ejecuta el comando para actualizar el archivo
    const command = new PutObjectCommand(params);
    await this.s3Client.send(command);

    // Retorna la URL pública del archivo actualizado
    return `${this.publicUrl}/${fileName}`;
  }
}
