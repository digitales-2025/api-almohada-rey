import { Test, TestingModule } from '@nestjs/testing';
import { CreateReservationUseCase } from './createReservation.use-case';
import { ReservationRepository } from '../repository/reservation.repository';
import { AuditRepository } from 'src/modules/admin/audit/audit.repository';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UserData } from 'src/interfaces';
import { AuditActionType, ReservationStatus } from '@prisma/client';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { DocumentTypeValues } from '../entities/document-type.enum';
import { ReservationModule } from '../reservation.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RoomRepository } from 'src/modules/admin/room/repositories/room.repository';

const moduleMocker = new ModuleMocker(global);

describe('CreateReservationUseCase', () => {
  let useCase: CreateReservationUseCase;
  let reservationRepository: jest.Mocked<ReservationRepository>;
  let auditRepository: jest.Mocked<AuditRepository>;
  let roomsRepository: jest.Mocked<RoomRepository>;

  //   type UserData = {
  //     name: string;
  //     id: string;
  //     userRol: $Enums.UserRolType;
  //     email: string;
  //     phone: string | null;
  //     isSuperAdmin: boolean;
  // }
  // Datos de prueba
  const mockUserData: UserData = {
    name: 'John Doe',
    id: 'user-id-1',
    userRol: 'ADMIN',
    email: 'doe@example.com',
    phone: '123456789',
    isSuperAdmin: false,
  };

  const mockCreateReservationDto: CreateReservationDto = {
    userId: 'user-id-1',
    reservationDate: new Date('2023-11-01'),
    customerId: 'customer-id-1',
    roomId: 'room-id-1',
    checkInDate: new Date('2023-12-01'),
    checkOutDate: new Date('2023-12-05'),
    status: ReservationStatus.PENDING,
    guests: [
      {
        name: 'John Doe',
        age: 30,
        documentType: DocumentTypeValues.DNI,
        documentId: '12345678',
        phone: '123456789',
        email: 'john@example.com',
        birthDate: new Date('1993-01-01'),
        additionalInfo: `"{\"vip\":\"yes\"}"`,
      },
    ],
    observations: 'Test observation',
  };

  const mockReservation = {
    id: 'reservation-id-1',
    customerId: 'customer-id-1',
    roomId: 'room-id-1',
    userId: 'user-id-1',
    reservationDate: expect.any(Date),
    checkInDate: new Date('2023-12-01'),
    checkOutDate: new Date('2023-12-05'),
    status: 'CONFIRMED',
    guests: expect.any(String),
    observations: 'Test observation',
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ReservationModule, PrismaModule],
      providers: [CreateReservationUseCase],
    })
      .useMocker((token) => {
        if (token === ReservationRepository) {
          return {
            transaction: jest.fn().mockImplementation(async (callback) => {
              return callback({
                // Mock del objeto de transacción
                // Este objeto se pasa a los métodos "WithTx"
              });
            }),
            createWithTx: jest.fn().mockResolvedValue(mockReservation),
          };
        }
        if (token === AuditRepository) {
          return {
            createWithTx: jest.fn().mockResolvedValue({ id: 'audit-id-1' }),
          };
        }
        if (token === RoomRepository) {
          return {
            updateWithTx: jest
              .fn()
              .mockResolvedValue({ id: 'room-id-1', status: 'OCCUPIED' }),
          };
        }
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(
            token,
          ) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
        return jest.fn();
      })
      .compile();

    useCase = module.get<CreateReservationUseCase>(CreateReservationUseCase);
    reservationRepository = module.get(
      ReservationRepository,
    ) as jest.Mocked<ReservationRepository>;
    auditRepository = module.get(
      AuditRepository,
    ) as jest.Mocked<AuditRepository>;
    roomsRepository = module.get(RoomRepository) as jest.Mocked<RoomRepository>;
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  describe('execute', () => {
    it('should create a reservation successfully', async () => {
      // Act
      const result = await useCase.execute(
        mockCreateReservationDto,
        mockUserData,
      );

      // Assert
      expect(reservationRepository.transaction).toHaveBeenCalled();
      expect(roomsRepository.updateWithTx).toHaveBeenCalledWith(
        mockCreateReservationDto.roomId,
        { status: 'OCCUPIED' },
        expect.anything(),
      );
      expect(reservationRepository.createWithTx).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: mockCreateReservationDto.customerId,
          roomId: mockCreateReservationDto.roomId,
          userId: mockCreateReservationDto.userId,
          checkInDate: mockCreateReservationDto.checkInDate,
          checkOutDate: mockCreateReservationDto.checkOutDate,
          status: mockCreateReservationDto.status,
          guests: expect.any(String),
          observations: mockCreateReservationDto.observations,
        }),
        expect.anything(),
      );
      expect(auditRepository.createWithTx).toHaveBeenCalledWith(
        {
          entityId: mockReservation.id,
          entityType: 'reservation',
          action: AuditActionType.CREATE,
          performedById: mockUserData.id,
        },
        expect.anything(),
      );

      // Verificar respuesta
      expect(result).toEqual({
        success: true,
        message: 'Reservación creada exitosamente',
        data: mockReservation,
      });
    });

    it('should handle reservations without observations', async () => {
      // Arrange
      const dtoWithoutObservations = { ...mockCreateReservationDto };
      delete dtoWithoutObservations.observations;

      // Act
      await useCase.execute(dtoWithoutObservations, mockUserData);

      // Assert
      expect(reservationRepository.createWithTx).toHaveBeenCalledWith(
        expect.not.objectContaining({ observations: expect.anything() }),
        expect.anything(),
      );
    });

    it('should handle reservations without guests', async () => {
      // Arrange
      const dtoWithoutGuests = { ...mockCreateReservationDto };
      delete dtoWithoutGuests.guests;

      // Act
      await useCase.execute(dtoWithoutGuests, mockUserData);

      // Assert
      expect(reservationRepository.createWithTx).toHaveBeenCalledWith(
        expect.not.objectContaining({ guests: expect.anything() }),
        expect.anything(),
      );
    });

    it('Should not create reservation if room is not available', async () => {
      // Arrange
      roomsRepository.updateWithTx.mockResolvedValueOnce({
        id: 'room-id-1',
        status: 'OCCUPIED',
      });

      // Act
      const result = await useCase.execute(
        mockCreateReservationDto,
        mockUserData,
      );

      // Assert
      expect(result).toEqual({
        success: false,
        message: 'La habitación no está disponible',
      });
    });
  });
});
