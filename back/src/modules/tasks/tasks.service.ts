import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateTaskDto,
  UpdateTaskDto,
  QueryTasksDto,
  TaskAssignType,
  TaskStatus,
} from './dto/tasks.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async verifyClassAccess(userId: string, classId: string) {
    if (!classId) {
      throw new BadRequestException('班级ID不能为空');
    }
    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
    });
    if (!member) {
      throw new ForbiddenException('无权访问该班级数据');
    }
    return member;
  }

  private async verifyClassMember(userId: string, classId: string) {
    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
    });
    if (!member) {
      throw new BadRequestException('指定的负责人不是本班成员');
    }
    return member;
  }

  private isCommittee(role?: string | null) {
    return role === 'owner' || role === 'admin';
  }

  /** 任务可见性：个人任务仅发布者；全班任务所有人；指定人任务仅负责人/发布者/班委 */
  private canViewTask(task: any, userId: string, committee: boolean) {
    const assignType = (task.assign_type ||
      TaskAssignType.ALL) as TaskAssignType;
    if (assignType === TaskAssignType.SELF) {
      return task.created_by === userId;
    }
    if (assignType === TaskAssignType.ALL) {
      return true;
    }
    return (
      committee || task.owner_id === userId || task.created_by === userId
    );
  }

  /** 列表与统计使用同一套可见范围 */
  private buildVisibilityWhere(userId: string, committee: boolean) {
    if (committee) {
      return {
        OR: [
          { assign_type: TaskAssignType.ALL },
          { assign_type: TaskAssignType.MEMBER },
          { assign_type: TaskAssignType.SELF, created_by: userId },
        ],
      };
    }
    return {
      OR: [
        { assign_type: TaskAssignType.ALL },
        {
          assign_type: TaskAssignType.MEMBER,
          OR: [{ owner_id: userId }, { created_by: userId }],
        },
        { assign_type: TaskAssignType.SELF, created_by: userId },
      ],
    };
  }

  private escapeHtml(input?: string): string | undefined {
    if (!input) return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private normalizeStatusAndProgress(
    status?: TaskStatus,
    progress?: number,
  ): { status: TaskStatus; progress: number } {
    let s = status;
    let p = progress;
    if (p === 100) {
      s = TaskStatus.DONE;
    }
    if (s === TaskStatus.DONE) {
      p = 100;
    }
    if (s === TaskStatus.TODO) {
      p = p ?? 0;
    }
    return { status: s ?? TaskStatus.TODO, progress: p ?? 0 };
  }

  private toTaskDto(task: any) {
    return {
      id: task.id,
      classId: task.class_id,
      title: task.title,
      ownerId: task.owner_id,
      ownerName: task.users?.name || null,
      creatorId: task.created_by,
      creatorName: task.creator?.name || null,
      assignType: task.assign_type || TaskAssignType.MEMBER,
      deadline: task.deadline,
      location: task.location,
      content: task.content,
      progress: task.progress,
      priority: task.priority,
      status: task.status,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };
  }

  private readonly taskInclude = {
    users: { select: { name: true } },
    creator: { select: { name: true } },
  };

  async create(classId: string, dto: CreateTaskDto, userId: string) {
    const member = await this.verifyClassAccess(userId, classId);
    const committee = this.isCommittee(member.role_level);

    const assignType = dto.assignType ?? TaskAssignType.SELF;
    if (assignType !== TaskAssignType.SELF && !committee) {
      throw new ForbiddenException('仅班委可向全班或指定成员布置任务');
    }

    // 个人任务与全班任务都不存在第二负责人，统一落在发布者名下
    let ownerId = userId;
    if (assignType === TaskAssignType.MEMBER) {
      if (!dto.ownerId) {
        throw new BadRequestException('请选择任务负责人');
      }
      ownerId = dto.ownerId;
      await this.verifyClassMember(ownerId, classId);
    }

    const { status, progress } = this.normalizeStatusAndProgress(
      dto.status,
      dto.progress,
    );

    try {
      const task = await this.prisma.tasks.create({
        data: {
          id: uuidv4(),
          class_id: classId,
          title: this.escapeHtml(dto.title),
          owner_id: ownerId,
          created_by: userId,
          assign_type: assignType,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          location: dto.location || null,
          content: dto.content || null,
          progress,
          priority: dto.priority ?? 0,
          status,
        },
        include: this.taskInclude,
      });

      return this.toTaskDto(task);
    } catch (error) {
      this.logger.error(`创建任务失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '创建任务失败');
    }
  }

  async findAll(classId: string, userId: string, query: QueryTasksDto) {
    const member = await this.verifyClassAccess(userId, classId);
    const committee = this.isCommittee(member.role_level);
    const visibility = this.buildVisibilityWhere(userId, committee);

    const { status, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { class_id: classId, ...visibility };
    if (status && status.length > 0) {
      where.status = status.length === 1 ? status[0] : { in: status };
    }
    const visibleWhere: any = { class_id: classId, ...visibility };

    const [tasks, total, stats, progressAgg] = await Promise.all([
      this.prisma.tasks.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
        include: this.taskInclude,
      }),
      this.prisma.tasks.count({ where: visibleWhere }),
      this.prisma.tasks.groupBy({
        by: ['status'],
        where: visibleWhere,
        _count: { status: true },
      }),
      this.prisma.tasks.aggregate({
        where: visibleWhere,
        _avg: { progress: true },
      }),
    ]);

    const statMap = new Map(stats.map((s) => [s.status, s._count.status]));
    const todo = statMap.get(TaskStatus.TODO) || 0;
    const inProgress = statMap.get(TaskStatus.IN_PROGRESS) || 0;
    const done = statMap.get(TaskStatus.DONE) || 0;

    // 完成度 = 可见任务的平均进度，未开始的任务按 0% 计入
    const completionRate =
      total > 0
        ? Math.min(Math.max(Math.round(progressAgg._avg.progress ?? 0), 0), 100)
        : 0;

    return {
      list: tasks.map((t) => this.toTaskDto(t)),
      total,
      page,
      pageSize,
      stats: {
        todo,
        inProgress,
        done,
        completionRate,
      },
    };
  }

  async findOne(classId: string, taskId: string, userId: string) {
    const member = await this.verifyClassAccess(userId, classId);
    const committee = this.isCommittee(member.role_level);

    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, class_id: classId },
      include: this.taskInclude,
    });

    if (!task || !this.canViewTask(task, userId, committee)) {
      throw new NotFoundException('任务不存在');
    }

    return this.toTaskDto(task);
  }

  async update(
    classId: string,
    taskId: string,
    dto: UpdateTaskDto,
    userId: string,
  ) {
    const member = await this.verifyClassAccess(userId, classId);
    const committee = this.isCommittee(member.role_level);

    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, class_id: classId },
    });
    if (!task || !this.canViewTask(task, userId, committee)) {
      throw new NotFoundException('任务不存在');
    }

    const isCreator = task.created_by === userId;
    const isOwner = task.owner_id === userId;
    const assignType = (task.assign_type ||
      TaskAssignType.ALL) as TaskAssignType;
    // 班委和发布者可改全部字段；负责人和全班任务的其他成员只能改进度/状态
    const canEditAll = committee || isCreator;
    const canUpdateProgress =
      canEditAll || isOwner || assignType === TaskAssignType.ALL;

    if (!canUpdateProgress) {
      throw new ForbiddenException('当前身份无权修改该任务');
    }

    if (!canEditAll) {
      const allowedKeys = ['progress', 'status'];
      const providedKeys = Object.keys(dto).filter(
        (k) => dto[k as keyof UpdateTaskDto] !== undefined,
      );
      if (providedKeys.some((k) => !allowedKeys.includes(k))) {
        throw new ForbiddenException('负责人仅可更新任务进度和状态');
      }
    }

    // 只有班委可以调整任务对象和负责人
    if (!committee) {
      if (dto.assignType !== undefined && dto.assignType !== assignType) {
        throw new ForbiddenException('仅班委可调整任务对象');
      }
      if (dto.ownerId !== undefined && dto.ownerId !== task.owner_id) {
        throw new ForbiddenException('仅班委可调整任务负责人');
      }
    }

    const nextAssignType = dto.assignType ?? assignType;
    let nextOwnerId = task.owner_id;
    if (committee) {
      if (nextAssignType === TaskAssignType.SELF) {
        nextOwnerId = task.created_by;
      } else if (nextAssignType === TaskAssignType.ALL) {
        if (nextAssignType !== assignType) {
          nextOwnerId = task.created_by;
        }
      } else if (dto.ownerId !== undefined) {
        await this.verifyClassMember(dto.ownerId, classId);
        nextOwnerId = dto.ownerId;
      } else if (nextAssignType !== assignType) {
        throw new BadRequestException('请选择任务负责人');
      }
    }

    const { status, progress } = this.normalizeStatusAndProgress(
      dto.status ?? (task.status as TaskStatus),
      dto.progress ?? task.progress,
    );

    try {
      const updated = await this.prisma.tasks.update({
        where: { id: taskId },
        data: {
          title: dto.title !== undefined ? this.escapeHtml(dto.title) : undefined,
          owner_id: nextOwnerId,
          assign_type: nextAssignType,
          deadline:
            dto.deadline !== undefined
              ? dto.deadline
                ? new Date(dto.deadline)
                : null
              : undefined,
          location: dto.location !== undefined ? dto.location || null : undefined,
          content: dto.content !== undefined ? dto.content || null : undefined,
          status,
          priority: dto.priority !== undefined ? dto.priority : undefined,
          progress,
        },
        include: this.taskInclude,
      });

      return this.toTaskDto(updated);
    } catch (error) {
      this.logger.error(`更新任务失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '更新任务失败');
    }
  }

  async delete(classId: string, taskId: string, userId: string) {
    const member = await this.verifyClassAccess(userId, classId);
    const committee = this.isCommittee(member.role_level);

    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, class_id: classId },
    });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }
    // 班委或任务发布者才能删除
    if (!committee && task.created_by !== userId) {
      throw new ForbiddenException('当前身份无权删除该任务');
    }

    await this.prisma.tasks.delete({ where: { id: taskId } });
    return { deletedId: taskId };
  }
}