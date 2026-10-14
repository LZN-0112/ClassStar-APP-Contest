import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { PrismaService } from '../../common/database/prisma.service';
import { MinioService } from '@/common/storage/minio.service';
import { ExcelParserService } from '@/common/utils/excel-parser.service';
import { CreateClassDto, JoinClassDto } from './dto/classes.dto';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('uuid-mock'),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,qrdata'),
}));

describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: any;

  const mockPrisma = {
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    classes: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    class_members: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    users: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockMinioService = {
    downloadFile: jest.fn(),
  };

  const mockExcelParserService = {
    parseStudentExcel: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinioService },
        { provide: ExcelParserService, useValue: mockExcelParserService },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
    prisma = module.get<PrismaService>(PrismaService as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createClass', () => {
    const dto: CreateClassDto = { name: '计算机一班', grade: '2021', major: '计算机' };

    it('should create class and make creator monitor', async () => {
      prisma.classes.findUnique.mockResolvedValue(null);
      prisma.classes.create.mockResolvedValue({ id: 'uuid-mock' });
      prisma.class_members.create.mockResolvedValue({});

      const res = await service.createClass(dto, 'user-1');
      expect(res.id).toBe('uuid-mock');
      expect(res.name).toBe('计算机一班');
      expect(res.qrCodeUrl).toBe('data:image/png;base64,qrdata');
      expect(prisma.classes.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ qr_code_url: 'data:image/png;base64,qrdata' }),
        }),
      );
      expect(prisma.class_members.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: '班长', is_committee: true }),
        }),
      );
    });
  });

  describe('joinClass', () => {
    const dto: JoinClassDto = { code: '123456' };

    it('should reject when class not found', async () => {
      prisma.classes.findUnique.mockResolvedValue(null);
      await expect(service.joinClass(dto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject when already a member', async () => {
      prisma.classes.findUnique.mockResolvedValue({ id: 'class-1', name: '一班' });
      prisma.class_members.findFirst.mockResolvedValue({ id: 'cm1' });
      await expect(service.joinClass(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should join class as student', async () => {
      prisma.classes.findUnique.mockResolvedValue({
        id: 'class-1',
        name: '一班',
        code: '123456',
        qr_code_url: 'http://localhost/qr.png',
      });
      prisma.class_members.findFirst.mockResolvedValue(null);
      prisma.class_members.count.mockResolvedValue(0);
      prisma.class_members.create.mockResolvedValue({});
      const res = await service.joinClass(dto, 'user-1');
      expect(res.id).toBe('class-1');
      expect(res.name).toBe('一班');
      expect(res.code).toBe('123456');
      expect(res.qrCodeUrl).toBe('http://localhost/qr.png');
      expect(prisma.class_members.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: '学生', is_committee: false }),
        }),
      );
    });
  });
});
