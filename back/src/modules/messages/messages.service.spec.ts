import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { PrismaService } from '../../common/database/prisma.service';
import { CreateMessageDto, CreateReminderDto } from './dto/messages.dto';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('uuid-mock'),
}));

describe('MessagesService', () => {
  let service: MessagesService;
  let prisma: any;

  const mockPrisma = {
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    messages: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    message_attachments: { createMany: jest.fn() },
    message_reads: {
      createMany: jest.fn(),
      groupBy: jest.fn(),
      upsert: jest.fn(),
    },
    message_acks: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    message_reminders: { create: jest.fn() },
    class_members: { findMany: jest.fn(), count: jest.fn() },
  };

  const mockScheduler = {
    processReminderById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationSchedulerService, useValue: mockScheduler },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    prisma = module.get<PrismaService>(PrismaService as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateMessageDto = {
      type: 'notice',
      title: '班会通知',
      content: '周五下午开班会',
      attachments: [{ fileName: 'a.pdf', fileUrl: 'http://x/a.pdf', fileSize: 100 }],
    };

    it('should create message, save attachments and init read records for all members', async () => {
      prisma.class_members.findMany.mockResolvedValue([{ user_id: 'u1' }, { user_id: 'u2' }]);

      const res = await service.create('class-1', dto, 'publisher-1');

      expect(res.id).toBe('uuid-mock');
      expect(prisma.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            class_id: 'class-1',
            publisher_id: 'publisher-1',
            type: 'notice',
            require_ack: false,
            status: 'published',
          }),
        }),
      );
      expect(prisma.message_attachments.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ message_id: 'uuid-mock', file_name: 'a.pdf' })],
        }),
      );
      const readCall = prisma.message_reads.createMany.mock.calls[0][0];
      expect(readCall.data).toHaveLength(2);
      expect(readCall.data[0]).toEqual(expect.objectContaining({ message_id: 'uuid-mock', user_id: 'u1' }));
      // 预建记录不带 read_at：未标记已读前保持未读状态
      expect(readCall.data[0].read_at).toBeUndefined();
    });

    it('should skip attachments creation when none provided', async () => {
      prisma.class_members.findMany.mockResolvedValue([]);
      await service.create('class-1', { type: 'notice', title: 't', content: 'c' }, 'p1');
      expect(prisma.message_attachments.createMany).not.toHaveBeenCalled();
    });

    it('should parse eventTime and ackDeadline into Date', async () => {
      prisma.class_members.findMany.mockResolvedValue([]);
      await service.create(
        'class-1',
        {
          type: 'activity',
          title: 't',
          content: 'c',
          eventTime: '2026-11-01T10:00:00+08:00',
          ackDeadline: '2026-11-02T10:00:00+08:00',
        },
        'p1',
      );
      const call = prisma.messages.create.mock.calls[0][0];
      expect(call.data.event_time).toBeInstanceOf(Date);
      expect(call.data.ack_deadline).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('should return mapped list with isRead and readCount', async () => {
      const now = new Date();
      prisma.messages.findMany.mockResolvedValue([
        {
          id: 'm1',
          type: 'notice',
          title: 't1',
          content: 'c1',
          location: null,
          event_time: null,
          require_ack: true,
          status: 'published',
          created_at: now,
          users: { id: 'p1', name: '老师', avatar: null },
          message_reads: [{ read_at: now }],
        },
        {
          id: 'm2',
          type: 'homework',
          title: 't2',
          content: 'c2',
          location: '教室',
          event_time: null,
          require_ack: false,
          status: 'published',
          created_at: now,
          users: { id: 'p1', name: '老师', avatar: null },
          message_reads: [],
        },
      ]);
      prisma.messages.count.mockResolvedValue(2);
      prisma.message_reads.groupBy.mockResolvedValue([
        { message_id: 'm1', _count: { message_id: 5 } },
        { message_id: 'm2', _count: { message_id: 3 } },
      ]);

      const res = await service.findAll('class-1', 'u1', { page: 2, pageSize: 10 });

      expect(res.list[0].isRead).toBe(true);
      expect(res.list[0].readCount).toBe(5);
      expect(res.list[1].isRead).toBe(false);
      expect(res.list[1].readCount).toBe(3);
      expect(res.pagination).toEqual({ page: 2, pageSize: 10, total: 2, totalPages: 1 });
      // 已读数仅统计 read_at 非空的记录
      expect(prisma.message_reads.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { read_at: { not: null } } }),
      );
      expect(prisma.messages.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    });

    it('should clamp pageSize to max 100 and omit skip on first page', async () => {
      prisma.messages.findMany.mockResolvedValue([]);
      prisma.messages.count.mockResolvedValue(0);
      prisma.message_reads.groupBy.mockResolvedValue([]);

      const res = await service.findAll('class-1', 'u1', { pageSize: 500 });

      expect(res.pagination.pageSize).toBe(100);
      const call = prisma.messages.findMany.mock.calls[0][0];
      expect(call.skip).toBeUndefined();
      expect(call.take).toBe(100);
    });

    it('should filter by type when provided', async () => {
      prisma.messages.findMany.mockResolvedValue([]);
      prisma.messages.count.mockResolvedValue(0);
      prisma.message_reads.groupBy.mockResolvedValue([]);

      await service.findAll('class-1', 'u1', { type: 'notice' });

      expect(prisma.messages.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { class_id: 'class-1', type: 'notice' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFound when message missing', async () => {
      prisma.messages.findFirst.mockResolvedValue(null);
      await expect(service.findOne('class-1', 'm1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should return detail with isAcked and attachments', async () => {
      prisma.messages.findFirst.mockResolvedValue({
        id: 'm1',
        type: 'notice',
        title: 't',
        content: 'c',
        location: null,
        event_time: null,
        require_ack: true,
        ack_deadline: null,
        status: 'published',
        created_at: new Date(),
        users: { id: 'p1', name: '老师', avatar: null },
        message_attachments: [{ id: 'att1', file_name: 'a.pdf' }],
      });
      prisma.message_acks.findUnique.mockResolvedValue({ id: 'ack1' });

      const res = await service.findOne('class-1', 'm1', 'u1');

      expect(res.isAcked).toBe(true);
      expect(res.attachments).toEqual([{ id: 'att1', file_name: 'a.pdf' }]);
    });

    it('should return isAcked false when not acked', async () => {
      prisma.messages.findFirst.mockResolvedValue({
        id: 'm1',
        type: 'notice',
        title: 't',
        content: 'c',
        location: null,
        event_time: null,
        require_ack: true,
        ack_deadline: null,
        status: 'published',
        created_at: new Date(),
        users: { id: 'p1', name: '老师', avatar: null },
        message_attachments: [],
      });
      prisma.message_acks.findUnique.mockResolvedValue(null);

      const res = await service.findOne('class-1', 'm1', 'u1');
      expect(res.isAcked).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should throw NotFound when message missing', async () => {
      prisma.messages.findFirst.mockResolvedValue(null);
      await expect(service.markAsRead('class-1', 'm1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should upsert read record with read_at', async () => {
      prisma.messages.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.message_reads.upsert.mockResolvedValue({});

      await service.markAsRead('class-1', 'm1', 'u1');

      expect(prisma.message_reads.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { message_id_user_id: { message_id: 'm1', user_id: 'u1' } },
          update: expect.objectContaining({ read_at: expect.any(Date) }),
        }),
      );
    });
  });

  describe('ack', () => {
    it('should throw NotFound when message missing', async () => {
      prisma.messages.findFirst.mockResolvedValue(null);
      await expect(service.ack('class-1', 'm1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate ack', async () => {
      prisma.messages.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.message_acks.findUnique.mockResolvedValue({ id: 'ack1' });
      await expect(service.ack('class-1', 'm1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should create ack record', async () => {
      prisma.messages.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.message_acks.findUnique.mockResolvedValue(null);
      prisma.message_acks.create.mockResolvedValue({});

      await service.ack('class-1', 'm1', 'u1');

      expect(prisma.message_acks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            message_id: 'm1',
            user_id: 'u1',
            acked_at: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('getAcks', () => {
    it('should throw NotFound when message missing', async () => {
      prisma.messages.findFirst.mockResolvedValue(null);
      await expect(service.getAcks('class-1', 'm1')).rejects.toThrow(NotFoundException);
    });

    it('should split acked/unacked and mark overdue when deadline passed', async () => {
      const past = new Date(Date.now() - 3600_000);
      prisma.messages.findFirst.mockResolvedValue({ id: 'm1', ack_deadline: past });
      prisma.message_acks.findMany.mockResolvedValue([
        { user_id: 'u1', acked_at: past, users: { id: 'u1', name: 'A', avatar: null, student_id: 'S1' } },
      ]);
      prisma.class_members.count.mockResolvedValue(3);
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u2', users: { id: 'u2', name: 'B', avatar: null, student_id: 'S2' } },
        { user_id: 'u3', users: { id: 'u3', name: 'C', avatar: null, student_id: 'S3' } },
      ]);

      const res = await service.getAcks('class-1', 'm1');

      expect(res.ackedCount).toBe(1);
      expect(res.unackedCount).toBe(2);
      expect(res.total).toBe(3);
      expect(res.ackedList[0]).toEqual(expect.objectContaining({ userId: 'u1', overdue: false }));
      expect(res.unackedList.every((m: any) => m.overdue === true)).toBe(true);
    });

    it('should not mark overdue when no deadline set', async () => {
      prisma.messages.findFirst.mockResolvedValue({ id: 'm1', ack_deadline: null });
      prisma.message_acks.findMany.mockResolvedValue([]);
      prisma.class_members.count.mockResolvedValue(1);
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u2', users: { id: 'u2', name: 'B', avatar: null, student_id: 'S2' } },
      ]);

      const res = await service.getAcks('class-1', 'm1');
      expect(res.ackedCount).toBe(0);
      expect(res.unackedList[0].overdue).toBe(false);
    });
  });

  describe('remind', () => {
    it('should throw NotFound when message missing', async () => {
      prisma.messages.findFirst.mockResolvedValue(null);
      await expect(service.remind('class-1', 'm1', { remindAfterMinutes: 30 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create reminder and dispatch immediately', async () => {
      prisma.messages.findFirst.mockResolvedValue({ id: 'm1' });
      prisma.message_reminders.create.mockResolvedValue({});
      const before = Date.now();

      await service.remind('class-1', 'm1', {} as CreateReminderDto);

      const call = prisma.message_reminders.create.mock.calls[0][0];
      expect(call.data.status).toBe('pending');
      const remindAt = call.data.remind_at as Date;
      expect(remindAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(remindAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
      expect(mockScheduler.processReminderById).toHaveBeenCalledWith('uuid-mock');
    });
  });

  describe('exportAcks', () => {
    it('should return unacked list excluding already acked users', async () => {
      prisma.messages.findFirst.mockResolvedValue({ id: 'm1', title: '班会通知' });
      prisma.message_acks.findMany.mockResolvedValue([
        { user_id: 'u1', users: { id: 'u1', name: 'A', student_id: 'S1', phone: '111' } },
      ]);
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u1', users: { id: 'u1', name: 'A', student_id: 'S1', phone: '111' } },
        { user_id: 'u2', users: { id: 'u2', name: 'B', student_id: 'S2', phone: '222' } },
      ]);

      const res = await service.exportAcks('class-1', 'm1');

      expect(res.title).toBe('班会通知');
      expect(res.total).toBe(2);
      expect(res.ackedCount).toBe(1);
      expect(res.unackedCount).toBe(1);
      expect(res.unackedList[0]).toEqual(
        expect.objectContaining({ userId: 'u2', name: 'B', studentId: 'S2', phone: '222' }),
      );
    });
  });
});