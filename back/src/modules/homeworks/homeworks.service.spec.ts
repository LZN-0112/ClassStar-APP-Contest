import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HomeworksService } from './homeworks.service';
import { OcrService } from './ocr.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateHomeworkDto, DelayApplicationDto, OfflineCheckDto, SubmitHomeworkDto } from './dto/homeworks.dto';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('uuid-mock'),
}));

describe('HomeworksService', () => {
  let service: HomeworksService;
  let prisma: any;
  let ocrService: any;

  const mockPrisma = {
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    homeworks: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    homework_submissions: { upsert: jest.fn() },
    homework_delay_applications: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    class_members: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    homework_offline_checks: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    homework_offline_check_details: { create: jest.fn() },
  };

  const mockOcrService = {
    recognizeStudentIds: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeworksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OcrService, useValue: mockOcrService },
      ],
    }).compile();

    service = module.get<HomeworksService>(HomeworksService);
    prisma = module.get<PrismaService>(PrismaService as any);
    ocrService = module.get<OcrService>(OcrService as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create homework with published status', async () => {
      prisma.homeworks.create.mockResolvedValue({});
      const dto: CreateHomeworkDto = {
        subject: '数学',
        title: '第一章习题',
        content: '完成 1-10 题',
        deadline: '2026-11-01T22:00:00+08:00',
      };

      const res = await service.create('class-1', dto, 'p1');

      expect(res.id).toBe('uuid-mock');
      expect(prisma.homeworks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            class_id: 'class-1',
            publisher_id: 'p1',
            subject: '数学',
            status: 'published',
            deadline: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should map submitted flag and submission count', async () => {
      const now = new Date();
      prisma.homeworks.findMany.mockResolvedValue([
        {
          id: 'h1',
          subject: '数学',
          title: 't',
          content: 'c',
          deadline: now,
          status: 'published',
          created_at: now,
          users: { id: 'p1', name: '老师' },
          homework_submissions: [{ id: 'sub1' }],
          _count: { homework_submissions: 10 },
        },
      ]);
      prisma.homeworks.count.mockResolvedValue(1);

      const res = await service.findAll('class-1', 'u1', { page: 1, pageSize: 20 });

      expect(res.list[0].submitted).toBe(true);
      expect(res.list[0].submissionCount).toBe(10);
      expect(res.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
    });

    it('should set submitted false when no submission', async () => {
      const now = new Date();
      prisma.homeworks.findMany.mockResolvedValue([
        {
          id: 'h1',
          subject: '数学',
          title: 't',
          content: 'c',
          deadline: now,
          status: 'published',
          created_at: now,
          users: { id: 'p1', name: '老师' },
          homework_submissions: [],
          _count: { homework_submissions: 2 },
        },
      ]);
      prisma.homeworks.count.mockResolvedValue(1);

      const res = await service.findAll('class-1', 'u1', {});
      expect(res.list[0].submitted).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should throw NotFound when homework missing', async () => {
      prisma.homeworks.findFirst.mockResolvedValue(null);
      await expect(service.findOne('class-1', 'h1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should return detail with mySubmission and myDelayApplication', async () => {
      prisma.homeworks.findFirst.mockResolvedValue({
        id: 'h1',
        subject: '数学',
        title: 't',
        content: 'c',
        deadline: new Date(),
        created_at: new Date(),
        users: { id: 'p1', name: '老师' },
        homework_submissions: [{ id: 'sub1', status: 'submitted' }],
        homework_delay_applications: [{ id: 'app1', status: 'pending' }],
      });

      const res = await service.findOne('class-1', 'h1', 'u1');

      expect(res.mySubmission).toEqual({ id: 'sub1', status: 'submitted' });
      expect(res.myDelayApplication).toEqual({ id: 'app1', status: 'pending' });
    });
  });

  describe('submit', () => {
    it('should throw NotFound when homework missing', async () => {
      prisma.homeworks.findFirst.mockResolvedValue(null);
      await expect(service.submit('class-1', 'h1', { content: '答案' }, 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upsert submission with stringified attachments', async () => {
      prisma.homeworks.findFirst.mockResolvedValue({ id: 'h1' });
      prisma.homework_submissions.upsert.mockResolvedValue({});
      const dto: SubmitHomeworkDto = { content: '答案', fileUrls: ['http://x/1.jpg', 'http://x/2.jpg'] };

      await service.submit('class-1', 'h1', dto, 'u1');

      expect(prisma.homework_submissions.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { homework_id_student_id: { homework_id: 'h1', student_id: 'u1' } },
          create: expect.objectContaining({
            status: 'submitted',
            attachments: JSON.stringify(['http://x/1.jpg', 'http://x/2.jpg']),
          }),
          update: expect.objectContaining({ status: 'submitted', submitted_at: expect.any(Date) }),
        }),
      );
    });
  });

  describe('applyDelay', () => {
    it('should throw NotFound when homework missing', async () => {
      prisma.homeworks.findFirst.mockResolvedValue(null);
      await expect(
        service.applyDelay(
          'class-1',
          'h1',
          { reason: '生病', requestedDeadline: '2026-11-05T22:00:00+08:00' } as DelayApplicationDto,
          'u1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create pending delay application', async () => {
      prisma.homeworks.findFirst.mockResolvedValue({ id: 'h1' });
      prisma.homework_delay_applications.create.mockResolvedValue({});

      await service.applyDelay(
        'class-1',
        'h1',
        { reason: '生病', requestedDeadline: '2026-11-05T22:00:00+08:00' },
        'u1',
      );

      expect(prisma.homework_delay_applications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            homework_id: 'h1',
            student_id: 'u1',
            reason: '生病',
            expected_deadline: expect.any(Date),
            status: 'pending',
          }),
        }),
      );
    });
  });

  describe('reviewDelay', () => {
    it('should reject invalid status', async () => {
      await expect(service.reviewDelay('class-1', 'h1', 'app1', 'pending', 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFound when application missing', async () => {
      prisma.homework_delay_applications.findFirst.mockResolvedValue(null);
      await expect(service.reviewDelay('class-1', 'h1', 'app1', 'approved', 'p1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update application status with reviewer info', async () => {
      prisma.homework_delay_applications.findFirst.mockResolvedValue({ id: 'app1' });
      prisma.homework_delay_applications.update.mockResolvedValue({});

      await service.reviewDelay('class-1', 'h1', 'app1', 'approved', 'p1');

      expect(prisma.homework_delay_applications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app1' },
          data: expect.objectContaining({
            status: 'approved',
            reviewed_by: 'p1',
            reviewed_at: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('recognizeScreenshot', () => {
    const file = { buffer: Buffer.from('img') } as Express.Multer.File;

    it('should reject non-member', async () => {
      prisma.class_members.findFirst.mockResolvedValue(null);
      await expect(service.recognizeScreenshot('class-1', file, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should split matched and unmatched student ids', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ id: 'cm1' });
      ocrService.recognizeStudentIds.mockResolvedValue({
        rawText: 'raw-text',
        studentIds: ['S1', 'S2', 'X9'],
      });
      prisma.class_members.findMany.mockResolvedValue([
        { users: { student_id: 'S1' } },
        { users: { student_id: 'S2' } },
        { users: { student_id: null } },
      ]);

      const res = await service.recognizeScreenshot('class-1', file, 'u1');

      expect(res.studentIds).toEqual(['S1', 'S2']);
      expect(res.unmatched).toEqual(['X9']);
      expect(res.rawText).toBe('raw-text');
    });
  });

  describe('offlineCheck', () => {
    it('should match students, report unmatched and unsubmitted', async () => {
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u1', users: { id: 'u1', student_id: 'S1', name: 'A' } },
        { user_id: 'u2', users: { id: 'u2', student_id: 'S2', name: 'B' } },
      ]);
      prisma.homework_offline_checks.create.mockResolvedValue({});
      prisma.homework_offline_check_details.create.mockResolvedValue({});
      prisma.homework_offline_checks.update.mockResolvedValue({});
      const dto: OfflineCheckDto = {
        homeworkId: 'h1',
        checkType: 'screenshot',
        studentIds: ['S1', 'X9'],
      };

      const res = await service.offlineCheck('class-1', dto, 'p1');

      expect(res.totalCount).toBe(2);
      expect(res.submittedCount).toBe(1);
      expect(res.unmatchedCount).toBe(1);
      expect(res.submittedList).toEqual([{ userId: 'u1', studentId: 'S1', name: 'A' }]);
      expect(res.unsubmittedList).toEqual([{ userId: 'u2', studentId: 'S2', name: 'B' }]);
      expect(res.unmatchedList).toEqual(['X9']);
      expect(prisma.homework_offline_check_details.create).toHaveBeenCalledTimes(2);
      expect(prisma.homework_offline_checks.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { submitted_count: 1 } }),
      );
    });
  });

  describe('getOfflineCheck', () => {
    it('should reject non-member', async () => {
      prisma.class_members.findFirst.mockResolvedValue(null);
      await expect(service.getOfflineCheck('class-1', 'check-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFound when check missing', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ id: 'cm1' });
      prisma.homeworks.findMany.mockResolvedValue([{ id: 'h1' }]);
      prisma.homework_offline_checks.findFirst.mockResolvedValue(null);
      await expect(service.getOfflineCheck('class-1', 'check-1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should rebuild submitted/unmatched/unsubmitted lists', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ id: 'cm1' });
      prisma.homeworks.findMany.mockResolvedValue([{ id: 'h1' }]);
      prisma.homework_offline_checks.findFirst.mockResolvedValue({
        id: 'check-1',
        homework_offline_check_details: [
          {
            status: 'submitted',
            student_id: 'S1',
            users_homework_offline_check_details_user_idTousers: { id: 'u1', student_id: 'S1', name: 'A' },
          },
          {
            status: 'unmatched',
            student_id: 'X9',
            users_homework_offline_check_details_user_idTousers: null,
          },
        ],
      });
      prisma.class_members.findMany.mockResolvedValue([
        { users: { id: 'u1', student_id: 'S1', name: 'A' } },
        { users: { id: 'u2', student_id: 'S2', name: 'B' } },
      ]);

      const res = await service.getOfflineCheck('class-1', 'check-1', 'u1');

      expect(res.totalCount).toBe(2);
      expect(res.submittedCount).toBe(1);
      expect(res.unmatchedCount).toBe(1);
      expect(res.submittedList).toEqual([{ userId: 'u1', studentId: 'S1', name: 'A' }]);
      expect(res.unsubmittedList).toEqual([{ userId: 'u2', studentId: 'S2', name: 'B' }]);
      expect(res.unmatchedList).toEqual(['X9']);
    });
  });
});