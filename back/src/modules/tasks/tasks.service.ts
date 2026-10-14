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

  async verifyCommittee(userId: string, classId: string) {
    const member = await this.verifyClassAccess(userId, classId);
    if (!member.is_committee) {
      throw new ForbiddenException('当前身份无权执行该操作');
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
      deadline: task.deadline,
      progress: task.progress,
      status: task.status,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };
  }

  async create(classId: string, dto: CreateTaskDto, userId: string) {
    await this.verifyCommittee(userId, classId);

    const ownerId = dto.ownerId || userId;
    await this.verifyClassMember(ownerId, classId);

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
          deadline: dto.deadline ? new Date(dto.deadline) : null,
          progress,
          status,
        },
        include: { users: { select: { name: true } } },
      });

      return this.toTaskDto(task);
    } catch (error) {
      this.logger.error(`创建任务失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '创建任务失败');
    }
  }

  async findAll(classId: string, userId: string, query: QueryTasksDto) {
    await this.verifyClassAccess(userId, classId);

    const { status, page = 1, pageSize = 10 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { class_id: classId };
    if (status) {
      where.status = status;
    }

    const [tasks, total, stats] = await Promise.all([
      this.prisma.tasks.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
        include: { users: { select: { name: true } } },
      }),
      this.prisma.tasks.count({ where: { class_id: classId } }),
      this.prisma.tasks.groupBy({
        by: ['status'],
        where: { class_id: classId },
        _count: { status: true },
      }),
    ]);

    const statMap = new Map(
      stats.map((s) => [s.status, s._count.status]),
    );

    return {
      list: tasks.map((t) => this.toTaskDto(t)),
      total,
      page,
      pageSize,
      stats: {
        todo: statMap.get(TaskStatus.TODO) || 0,
        inProgress: statMap.get(TaskStatus.IN_PROGRESS) || 0,
        done: statMap.get(TaskStatus.DONE) || 0,
      },
    };
  }

  async findOne(classId: string, taskId: string, userId: string) {
    await this.verifyClassAccess(userId, classId);

    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, class_id: classId },
      include: { users: { select: { name: true } } },
    });

    if (!task) {
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
    await this.verifyClassAccess(userId, classId);

    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, class_id: classId },
    });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const member = await this.prisma.class_members.findFirst({
      where: { user_id: userId, class_id: classId },
    });
    const isCommittee = member?.is_committee ?? false;
    const isOwner = task.owner_id === userId;

    if (!isCommittee && !isOwner) {
      throw new ForbiddenException('当前身份无权修改该任务');
    }

    // 非班委负责人只能更新进度和状态
    if (!isCommittee) {
      const allowedKeys = ['progress', 'status'];
      const providedKeys = Object.keys(dto).filter(
        (k) => dto[k as keyof UpdateTaskDto] !== undefined,
      );
      if (providedKeys.some((k) => !allowedKeys.includes(k))) {
        throw new ForbiddenException('负责人仅可更新任务进度和状态');
      }
    }

    if (dto.ownerId && dto.ownerId !== task.owner_id) {
      await this.verifyClassMember(dto.ownerId, classId);
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
          owner_id: dto.ownerId,
          deadline: dto.deadline !== undefined ? new Date(dto.deadline) : undefined,
          status,
          progress,
        },
        include: { users: { select: { name: true } } },
      });

      return this.toTaskDto(updated);
    } catch (error) {
      this.logger.error(`更新任务失败: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || '更新任务失败');
    }
  }

  async delete(classId: string, taskId: string, userId: string) {
    await this.verifyCommittee(userId, classId);

    const task = await this.prisma.tasks.findFirst({
      where: { id: taskId, class_id: classId },
    });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    await this.prisma.tasks.delete({ where: { id: taskId } });
    return { deletedId: taskId };
  }
}
