import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { PrismaService } from '../../common/database/prisma.service';
import { PrivacyService } from '../../common/privacy/privacy.service';
import { CreateAttendanceDto, LeaveApplicationDto, ReviewLeaveDto } from './dto/attendances.dto';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('uuid-mock'),
}));

describe('AttendancesService', () => {
  let service: AttendancesService;
  let prisma: any;

  const mockPrisma = {
    attendances: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    attendance_records: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    leave_applications: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    class_members: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user_settings: { findMany: jest.fn() },
    messages: { create: jest.fn() },
    message_reads: { createMany: jest.fn() },
  };

  /** 构造一个进行中的签到记录（默认 normal 方式、时间范围内） */
  const openAttendance = (over: Record<string, any> = {}) => ({
    id: 'att-1',
    class_id: 'class-1',
    publisher_id: 'p1',
    title: '签到',
    status: 'open',
    method: 'normal',
    start_time: new Date(Date.now() - 3600_000),
    end_time: new Date(Date.now() + 3600_000),
    latitude: null,
    longitude: null,
    check_radius: null,
    code: null,
    ...over,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.user_settings.findMany.mockResolvedValue([]);
    mockPrisma.class_members.findFirst.mockResolvedValue({
      role_level: 'owner',
      is_committee: true,
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendancesService,
        PrivacyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AttendancesService>(AttendancesService);
    prisma = module.get<PrismaService>(PrismaService as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const base: CreateAttendanceDto = {
      title: '签到',
      startTime: '2026-11-01T08:00:00+08:00',
      endTime: '2026-11-01T09:00:00+08:00',
      method: 'normal',
    };

    it('should reject code method without code', async () => {
      await expect(service.create('class-1', { ...base, method: 'code' }, 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject non-committee publisher', async () => {
      mockPrisma.class_members.findFirst.mockResolvedValue({
        role_level: 'member',
        is_committee: false,
      });
      await expect(service.create('class-1', base, 'u1')).rejects.toThrow('仅班委可发起签到');
    });

    it('should reject end time earlier than start time', async () => {
      await expect(
        service.create(
          'class-1',
          { ...base, startTime: '2026-11-01T09:00:00+08:00', endTime: '2026-11-01T08:00:00+08:00' },
          'p1',
        ),
      ).rejects.toThrow('结束时间必须晚于开始时间');
    });

    it('should reject invalid time format', async () => {
      await expect(
        service.create('class-1', { ...base, startTime: 'not-a-date' }, 'p1'),
      ).rejects.toThrow('签到时间格式不正确');
    });

    it('should reject gps method without coordinates', async () => {
      await expect(service.create('class-1', { ...base, method: 'gps' }, 'p1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create attendance with open status', async () => {
      prisma.attendances.create.mockResolvedValue({});

      const res = await service.create('class-1', base, 'p1');

      expect(res.id).toBe('uuid-mock');
      expect(prisma.attendances.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            class_id: 'class-1',
            publisher_id: 'p1',
            status: 'open',
            title: '签到',
          }),
        }),
      );
    });
  });

  describe('checkIn', () => {
    beforeEach(() => {
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      prisma.leave_applications.findFirst.mockResolvedValue(null);
    });

    it('should throw NotFound when attendance missing', async () => {
      prisma.attendances.findFirst.mockResolvedValue(null);
      await expect(service.checkIn('class-1', 'att-1', { method: 'normal' }, 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject when attendance closed', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance({ status: 'closed' }));
      await expect(service.checkIn('class-1', 'att-1', { method: 'normal' }, 'u1')).rejects.toThrow(
        '签到已结束',
      );
    });

    it('should reject outside time range', async () => {
      prisma.attendances.findFirst.mockResolvedValue(
        openAttendance({
          start_time: new Date(Date.now() - 7200_000),
          end_time: new Date(Date.now() - 3600_000),
        }),
      );
      await expect(service.checkIn('class-1', 'att-1', { method: 'normal' }, 'u1')).rejects.toThrow(
        '不在签到时间范围内',
      );
    });

    it('should reject duplicate check-in', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.attendance_records.findFirst.mockResolvedValue({ id: 'r1' });
      await expect(service.checkIn('class-1', 'att-1', { method: 'normal' }, 'u1')).rejects.toThrow(
        '您已完成签到，无需重复操作',
      );
    });

    it('should reject check-in when leave is approved', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      prisma.leave_applications.findFirst.mockResolvedValue({ id: 'la1', status: 'approved' });
      await expect(service.checkIn('class-1', 'att-1', { method: 'normal' }, 'u1')).rejects.toThrow(
        '您已请假，无需签到',
      );
    });

    it('should reject check-in method not matching attendance', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      await expect(
        service.checkIn('class-1', 'att-1', { method: 'gps', latitude: 30, longitude: 120 }, 'u1'),
      ).rejects.toThrow('签到方式与签到要求不一致');
    });

    it('should reject gps check-in outside radius', async () => {
      prisma.attendances.findFirst.mockResolvedValue(
        openAttendance({ method: 'gps', latitude: 30.0, longitude: 120.0, check_radius: 500 }),
      );
      prisma.attendance_records.findFirst.mockResolvedValue(null);

      await expect(
        service.checkIn('class-1', 'att-1', { method: 'gps', latitude: 30.01, longitude: 120.0 }, 'u1'),
      ).rejects.toThrow(/超出 500 米范围/);
    });

    it('should allow gps check-in within radius and create record', async () => {
      prisma.attendances.findFirst.mockResolvedValue(
        openAttendance({ method: 'gps', latitude: 30.0, longitude: 120.0, check_radius: 500 }),
      );
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      prisma.attendance_records.create.mockResolvedValue({
        id: 'uuid-mock',
        status: 'present',
        check_in_at: new Date(),
      });

      const res = await service.checkIn(
        'class-1',
        'att-1',
        { method: 'gps', latitude: 30.001, longitude: 120.0 },
        'u1',
      );

      expect(res.status).toBe('present');
      expect(prisma.attendance_records.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ attendance_id: 'att-1', student_id: 'u1', status: 'present' }),
        }),
      );
    });

    it('should reject gps check-in when attendance has no center point', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance({ method: 'gps' }));
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      await expect(
        service.checkIn('class-1', 'att-1', { method: 'gps', latitude: 30.0, longitude: 120.0 }, 'u1'),
      ).rejects.toThrow('签到未设置定位中心');
    });

    it('should reject wrong code', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance({ method: 'code', code: '8888' }));
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      await expect(
        service.checkIn('class-1', 'att-1', { method: 'code', code: '0000' }, 'u1'),
      ).rejects.toThrow('签到口令错误');
    });

    it('should allow correct code', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance({ method: 'code', code: '8888' }));
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      prisma.attendance_records.create.mockResolvedValue({
        id: 'uuid-mock',
        status: 'present',
        check_in_at: new Date(),
      });

      const res = await service.checkIn('class-1', 'att-1', { method: 'code', code: '8888' }, 'u1');
      expect(res.status).toBe('present');
    });

    it('should reject face method without selfie', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance({ method: 'face' }));
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      await expect(service.checkIn('class-1', 'att-1', { method: 'face' }, 'u1')).rejects.toThrow(
        '请上传水印拍照照片',
      );
    });
  });

  describe('close', () => {
    it('should throw NotFound when attendance missing', async () => {
      prisma.attendances.findFirst.mockResolvedValue(null);
      await expect(service.close('class-1', 'att-1', 'p1')).rejects.toThrow(NotFoundException);
    });

    it('should reject when not publisher and not committee', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.class_members.findFirst.mockResolvedValue({ is_committee: false });
      await expect(service.close('class-1', 'att-1', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('should allow committee member to close attendance', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.attendances.update.mockResolvedValue({});

      await service.close('class-1', 'att-1', 'committee-user');

      expect(prisma.attendances.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'att-1' },
          data: expect.objectContaining({ status: 'closed' }),
        }),
      );
    });

    it('should close attendance by publisher', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.attendances.update.mockResolvedValue({});

      await service.close('class-1', 'att-1', 'p1');

      expect(prisma.attendances.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'att-1' },
          data: expect.objectContaining({ status: 'closed' }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return mapped list with myRecord and counts', async () => {
      const now = new Date();
      prisma.attendances.findMany.mockResolvedValue([
        {
          id: 'att-1',
          title: '签到',
          type: 'normal',
          start_time: now,
          end_time: now,
          method: 'normal',
          location: null,
          status: 'open',
          created_at: now,
          users: { id: 'p1', name: '老师' },
          _count: { attendance_records: 12 },
          attendance_records: [{ status: 'present', check_in_at: now }],
        },
      ]);
      prisma.attendances.count.mockResolvedValue(1);

      const res = await service.findAll('class-1', 'u1', {});

      expect(res.list[0].checkInCount).toBe(12);
      expect(res.list[0].myRecord).toEqual({ status: 'present', checkInAt: now });
      expect(res.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
    });

    it('should return myRecord null when not checked in', async () => {
      prisma.attendances.findMany.mockResolvedValue([
        {
          id: 'att-1',
          title: '签到',
          type: null,
          start_time: new Date(),
          end_time: new Date(),
          method: 'normal',
          location: null,
          status: 'open',
          created_at: new Date(),
          users: { id: 'p1', name: '老师' },
          _count: { attendance_records: 0 },
          attendance_records: [],
        },
      ]);
      prisma.attendances.count.mockResolvedValue(1);

      const res = await service.findAll('class-1', 'u1', { status: 'open' });
      expect(res.list[0].myRecord).toBeNull();
      expect(prisma.attendances.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { class_id: 'class-1', status: 'open' } }),
      );
    });
  });

  describe('getStatistics', () => {
    it('should throw NotFound when attendance missing', async () => {
      prisma.attendances.findFirst.mockResolvedValue(null);
      await expect(service.getStatistics('class-1', 'att-1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should compute present/absent/leave counts, excluding leave users from absent', async () => {
      prisma.attendances.findFirst.mockResolvedValue({ id: 'att-1' });
      prisma.attendance_records.findMany.mockResolvedValue([
        {
          student_id: 'u1',
          check_in_at: new Date(),
          check_in_method: 'normal',
          users: { id: 'u1', name: 'A', student_id: 'S1', avatar: null },
        },
      ]);
      prisma.class_members.count.mockResolvedValue(3);
      prisma.leave_applications.findMany.mockResolvedValue([
        {
          student_id: 'u3',
          users_leave_applications_student_idTousers: { id: 'u3', name: 'C', student_id: 'S3', avatar: null },
        },
      ]);
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u2', users: { id: 'u2', name: 'B', student_id: 'S2', avatar: null } },
        { user_id: 'u3', users: { id: 'u3', name: 'C', student_id: 'S3', avatar: null } },
      ]);

      const res = await service.getStatistics('class-1', 'att-1', 'u1');

      expect(res.total).toBe(3);
      expect(res.presentCount).toBe(1);
      expect(res.absentCount).toBe(1);
      expect(res.leaveCount).toBe(1);
      expect(res.absentList[0]).toEqual(expect.objectContaining({ userId: 'u2', name: 'B' }));
      expect(res.leaveList[0]).toEqual(expect.objectContaining({ userId: 'u3', name: 'C' }));
    });
  });

  describe('applyLeave', () => {
    it('should throw NotFound when attendance missing', async () => {
      prisma.attendances.findFirst.mockResolvedValue(null);
      await expect(
        service.applyLeave('class-1', 'att-1', { reason: '病假' } as LeaveApplicationDto, 'u1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject duplicate application', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.leave_applications.findFirst.mockResolvedValue({ id: 'la1' });
      await expect(
        service.applyLeave('class-1', 'att-1', { reason: '病假' }, 'u1'),
      ).rejects.toThrow('您已提交过请假申请');
    });

    it('should create pending leave application', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.leave_applications.findFirst.mockResolvedValue(null);
      prisma.leave_applications.create.mockResolvedValue({});

      await service.applyLeave('class-1', 'att-1', { reason: '病假' }, 'u1');

      expect(prisma.leave_applications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attendance_id: 'att-1',
            student_id: 'u1',
            reason: '病假',
            status: 'pending',
          }),
        }),
      );
    });

    it('should reject application after attendance ended', async () => {
      prisma.attendances.findFirst.mockResolvedValue(
        openAttendance({
          start_time: new Date(Date.now() - 7200_000),
          end_time: new Date(Date.now() - 3600_000),
        }),
      );
      await expect(
        service.applyLeave('class-1', 'att-1', { reason: '病假' }, 'u1'),
      ).rejects.toThrow('签到已结束，无法申请请假');
    });

    it('should reject application when already checked in', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.attendance_records.findFirst.mockResolvedValue({ id: 'r1' });
      await expect(
        service.applyLeave('class-1', 'att-1', { reason: '病假' }, 'u1'),
      ).rejects.toThrow('您已完成签到，无需请假');
    });
  });

  describe('reviewLeave', () => {
    it('should throw NotFound when attendance missing', async () => {
      prisma.attendances.findFirst.mockResolvedValue(null);
      await expect(
        service.reviewLeave('class-1', 'att-1', 'la1', { status: 'approved' }, 'reviewer-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound when application missing', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.leave_applications.findFirst.mockResolvedValue(null);
      await expect(
        service.reviewLeave('class-1', 'att-1', 'la1', { status: 'approved' } as ReviewLeaveDto, 'reviewer-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update application status with reviewer info', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.leave_applications.findFirst.mockResolvedValue({
        id: 'la1',
        status: 'pending',
        student_id: 'u1',
      });
      prisma.attendance_records.findFirst.mockResolvedValue(null);
      prisma.leave_applications.update.mockResolvedValue({});

      await service.reviewLeave('class-1', 'att-1', 'la1', { status: 'approved' }, 'reviewer-1');

      expect(prisma.leave_applications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'la1' },
          data: expect.objectContaining({
            status: 'approved',
            reviewed_by: 'reviewer-1',
            reviewed_at: expect.any(Date),
          }),
        }),
      );
    });

    it('should reject reviewer who is neither committee nor publisher', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.class_members.findFirst.mockResolvedValue({ is_committee: false });
      await expect(
        service.reviewLeave('class-1', 'att-1', 'la1', { status: 'approved' }, 'other-user'),
      ).rejects.toThrow('仅班委可审批请假');
    });

    it('should reject application already processed', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.leave_applications.findFirst.mockResolvedValue({
        id: 'la1',
        status: 'approved',
        student_id: 'u1',
      });
      await expect(
        service.reviewLeave('class-1', 'att-1', 'la1', { status: 'approved' }, 'reviewer-1'),
      ).rejects.toThrow('该请假申请已处理');
    });

    it('should reject approving leave when student already checked in', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.leave_applications.findFirst.mockResolvedValue({
        id: 'la1',
        status: 'pending',
        student_id: 'u1',
      });
      prisma.attendance_records.findFirst.mockResolvedValue({ id: 'r1' });
      await expect(
        service.reviewLeave('class-1', 'att-1', 'la1', { status: 'approved' }, 'reviewer-1'),
      ).rejects.toThrow('该成员已完成签到，无法批准请假');
    });
  });

  describe('remindAbsent', () => {
    it('should throw NotFound when attendance missing', async () => {
      prisma.attendances.findFirst.mockResolvedValue(null);
      await expect(service.remindAbsent('class-1', 'att-1', 'p1')).rejects.toThrow(NotFoundException);
    });

    it('should reject when not publisher and not committee', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.class_members.findFirst.mockResolvedValue({ is_committee: false });
      await expect(service.remindAbsent('class-1', 'att-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return 0 and skip message when nobody absent', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.attendance_records.findMany.mockResolvedValue([
        {
          student_id: 'u1',
          check_in_at: new Date(),
          check_in_method: 'normal',
          users: { id: 'u1', name: 'A', student_id: 'S1', avatar: null },
        },
      ]);
      prisma.class_members.count.mockResolvedValue(1);
      prisma.leave_applications.findMany.mockResolvedValue([]);
      prisma.class_members.findMany.mockResolvedValue([]);

      const res = await service.remindAbsent('class-1', 'att-1', 'p1');

      expect(res).toEqual({ reminded: 0 });
      expect(prisma.messages.create).not.toHaveBeenCalled();
    });

    it('should create remind message and read records for absent members', async () => {
      prisma.attendances.findFirst.mockResolvedValue(openAttendance());
      prisma.attendance_records.findMany.mockResolvedValue([]);
      prisma.class_members.count.mockResolvedValue(1);
      prisma.leave_applications.findMany.mockResolvedValue([]);
      prisma.class_members.findMany.mockResolvedValue([
        { user_id: 'u2', users: { id: 'u2', name: 'B', student_id: 'S2', avatar: null } },
      ]);
      prisma.messages.create.mockResolvedValue({});
      prisma.message_reads.createMany.mockResolvedValue({});

      const res = await service.remindAbsent('class-1', 'att-1', 'p1');

      expect(res).toEqual({ reminded: 1 });
      expect(prisma.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            class_id: 'class-1',
            type: 'notice',
            title: expect.stringContaining('【催签】'),
          }),
        }),
      );
      expect(prisma.message_reads.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: [expect.objectContaining({ user_id: 'u2' })] }),
      );
    });
  });

  describe('leave lists', () => {
    it('listLeaveApplications should throw NotFound when attendance missing', async () => {
      prisma.attendances.findFirst.mockResolvedValue(null);
      await expect(service.listLeaveApplications('class-1', 'att-1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('listLeaveApplications should reject non-committee member', async () => {
      prisma.attendances.findFirst.mockResolvedValue({ publisher_id: 'p1' });
      prisma.class_members.findFirst.mockResolvedValue({ is_committee: false });
      await expect(service.listLeaveApplications('class-1', 'att-1', 'u2')).rejects.toThrow(
        '仅班委可查看请假申请',
      );
    });

    it('listLeaveApplications should map students and reasons', async () => {
      prisma.attendances.findFirst.mockResolvedValue({ publisher_id: 'p1' });
      prisma.leave_applications.findMany.mockResolvedValue([
        {
          id: 'la1',
          users_leave_applications_student_idTousers: {
            id: 'u1',
            name: '张三',
            student_id: 'S1',
            avatar: null,
          },
          reason: '病假',
          status: 'pending',
          created_at: new Date('2026-11-01T00:00:00Z'),
          reviewed_at: null,
        },
      ]);

      const res = await service.listLeaveApplications('class-1', 'att-1', 'u1');

      expect(res[0]).toEqual(
        expect.objectContaining({
          id: 'la1',
          reason: '病假',
          student: expect.objectContaining({ name: '张三' }),
        }),
      );
    });

    it('listPendingLeaves should reject non-committee member', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ is_committee: false });
      await expect(service.listPendingLeaves('class-1', 'u1')).rejects.toThrow(
        '仅班委可查看请假审批',
      );
    });

    it('listPendingLeaves should map attendance and student', async () => {
      prisma.class_members.findFirst.mockResolvedValue({ is_committee: true });
      prisma.leave_applications.findMany.mockResolvedValue([
        {
          id: 'la1',
          attendances: {
            id: 'att-1',
            title: '晚点名',
            start_time: new Date('2026-11-01T11:00:00Z'),
            end_time: new Date('2026-11-01T12:00:00Z'),
          },
          users_leave_applications_student_idTousers: {
            id: 'u1',
            name: '张三',
            student_id: 'S1',
            avatar: null,
          },
          reason: '病假',
          created_at: new Date('2026-11-01T00:00:00Z'),
        },
      ]);

      const res = await service.listPendingLeaves('class-1', 'p1');

      expect(res[0]).toEqual(
        expect.objectContaining({
          id: 'la1',
          attendance: expect.objectContaining({ title: '晚点名' }),
          student: expect.objectContaining({ name: '张三' }),
        }),
      );
    });
  });

  describe('getReport', () => {
    it('should return zero stats when class has no attendance', async () => {
      prisma.attendances.findMany.mockResolvedValue([]);
      prisma.class_members.count.mockResolvedValue(30);

      const res = await service.getReport('class-1', 'u1');

      expect(res).toEqual({
        totalSessions: 0,
        memberCount: 30,
        myPresent: 0,
        myLeave: 0,
        myAbsent: 0,
        attendanceRate: 0,
        sessions: [],
      });
      expect(prisma.attendance_records.findMany).not.toHaveBeenCalled();
    });

    it('should compute personal attendance status for each session', async () => {
      const now = Date.now();
      prisma.attendances.findMany.mockResolvedValue([
        {
          id: 'a1',
          title: '已结束-迟到',
          start_time: new Date(now - 7200_000),
          end_time: new Date(now - 3600_000),
          status: 'open',
          method: 'normal',
        },
        {
          id: 'a2',
          title: '已结束-请假',
          start_time: new Date(now - 7200_000),
          end_time: new Date(now - 3600_000),
          status: 'closed',
          method: 'code',
        },
        {
          id: 'a3',
          title: '已结束-缺勤',
          start_time: new Date(now - 7200_000),
          end_time: new Date(now - 3600_000),
          status: 'open',
          method: 'gps',
        },
        {
          id: 'a4',
          title: '进行中',
          start_time: new Date(now - 600_000),
          end_time: new Date(now + 600_000),
          status: 'open',
          method: 'normal',
        },
        {
          id: 'a5',
          title: '未开始',
          start_time: new Date(now + 3600_000),
          end_time: new Date(now + 7200_000),
          status: 'open',
          method: 'normal',
        },
      ]);
      prisma.class_members.count.mockResolvedValue(10);
      prisma.attendance_records.findMany.mockResolvedValue([
        { attendance_id: 'a1', student_id: 'u1', status: 'late' },
        { attendance_id: 'a1', student_id: 'u2', status: 'present' },
      ]);
      prisma.leave_applications.findMany.mockResolvedValue([
        { attendance_id: 'a2', student_id: 'u1' },
      ]);

      const res = await service.getReport('class-1', 'u1');

      expect(res.totalSessions).toBe(3);
      expect(res.myPresent).toBe(1);
      expect(res.myLeave).toBe(1);
      expect(res.myAbsent).toBe(1);
      expect(res.attendanceRate).toBe(33);
      expect(res.sessions.map((s) => s.myStatus)).toEqual([
        'late',
        'leave',
        'absent',
        'pending',
        'upcoming',
      ]);
      expect(res.sessions[0]).toEqual(
        expect.objectContaining({ presentCount: 2, leaveCount: 0, absentCount: 8 }),
      );
    });
  });
});