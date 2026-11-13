import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { ClassPermissionService } from '@/common/permissions/class-permission.service';
import { MinioService } from '@/common/storage/minio.service';
import { CreateMaterialDto, QueryMaterialDto, BatchUploadMaterialDto, RepostMaterialDto } from './dto/material.dto';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { normalizeUploadFileName } from '@/common/utils/upload-name.util';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);
  private readonly maxFileSize = 200 * 1024 * 1024; // 200MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly classPermission: ClassPermissionService,
  ) {}

  private async getOrCreateArchive(classId: string, userId: string) {
    let archive = await this.prisma.archives.findFirst({
      where: { class_id: classId, archive_type: 'material' },
    });
    if (!archive) {
      archive = await this.prisma.archives.create({
        data: {
          id: uuidv4(),
          class_id: classId,
          title: '班级资料库',
          archive_year: String(new Date().getFullYear()),
          archive_type: 'material',
          created_by: userId,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    return archive;
  }

  /** 同一文件夹下同名同大小的文件视为重复上传，阻止产生重复记录与虚高存储统计 */
  private async assertNoDuplicate(
    archiveId: string,
    folderName: string | null | undefined,
    fileName: string,
    fileSize: number,
  ) {
    const existed = await this.prisma.archive_files.findFirst({
      where: {
        archive_id: archiveId,
        folder_name: folderName || null,
        file_name: fileName,
        file_size: fileSize,
      },
      select: { id: true },
    });
    if (existed) {
      throw new BadRequestException(`「${fileName}」已在资料库中，请勿重复上传`);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    dto: CreateMaterialDto,
    userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException('文件大小不能超过200MB');
    }

    // 只有班级成员才能向该班级资料库上传文件
    await this.classPermission.assertMember(userId, dto.classId);

    const archive = await this.getOrCreateArchive(dto.classId, userId);

    const originalName = normalizeUploadFileName(file.originalname);
    const fileName = dto.fileName || originalName;

    // 上传前先去重，避免同一文件被重复记录导致存储占用翻倍
    await this.assertNoDuplicate(archive.id, dto.folderName, fileName, file.size);

    const ext = path.extname(originalName);
    const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;
    const objectName = `materials/${dto.classId}/${uniqueName}`;

    const fileUrl = await this.minioService.uploadBuffer(
      objectName,
      file.buffer,
      { 'Content-Type': file.mimetype },
    );

    const material = await this.prisma.archive_files.create({
      data: {
        id: uuidv4(),
        archive_id: archive.id,
        file_name: fileName,
        file_url: fileUrl,
        file_size: file.size,
        folder_name: dto.folderName || null,
        uploader_id: userId,
        download_count: 0,
        created_at: new Date(),
      },
    });

    this.logger.log(`文件上传成功: ${material.file_name}, URL: ${fileUrl}`);

    return {
      id: material.id,
      fileName: material.file_name,
      fileUrl: material.file_url,
      fileSize: material.file_size,
      folderName: material.folder_name,
    };
  }

  async batchUploadFile(
    files: Express.Multer.File[],
    dto: BatchUploadMaterialDto,
    userId: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的文件');
    }

    if (files.length > 20) {
      throw new BadRequestException('单次最多上传 20 个文件');
    }

    for (const file of files) {
      if (file.size > this.maxFileSize) {
        throw new BadRequestException('文件大小不能超过200MB');
      }
    }

    // 只有班级成员才能向该班级资料库上传文件
    await this.classPermission.assertMember(userId, dto.classId);

    const archive = await this.getOrCreateArchive(dto.classId, userId);

    // 上传前统一去重：既检查资料库已有文件，也检查本次批量里的重复项
    const batchKeys = new Set<string>();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = normalizeUploadFileName(file.originalname);
      const fileName =
        dto.fileNameList && dto.fileNameList[i] ? dto.fileNameList[i] : originalName;
      const batchKey = `${dto.folderName || ''}|${fileName}|${file.size}`;
      if (batchKeys.has(batchKey)) {
        throw new BadRequestException(`「${fileName}」在本次上传中重复，请勿重复上传`);
      }
      batchKeys.add(batchKey);
      await this.assertNoDuplicate(archive.id, dto.folderName, fileName, file.size);
    }

    // 先上传所有文件到 MinIO，收集 URL
    const uploadedMinioFiles: { fileUrl: string; fileName: string; fileSize: number }[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const originalName = normalizeUploadFileName(file.originalname);
        const ext = path.extname(originalName);
        const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;
        const objectName = `materials/${dto.classId}/${uniqueName}`;

        const fileUrl = await this.minioService.uploadBuffer(
          objectName,
          file.buffer,
          { 'Content-Type': file.mimetype },
        );

        const fileName =
          dto.fileNameList && dto.fileNameList[i]
            ? dto.fileNameList[i]
            : originalName;

        uploadedMinioFiles.push({
          fileUrl,
          fileName,
          fileSize: file.size,
        });
      }

      // 在事务中创建数据库记录
      const uploadedFiles = await this.prisma.$transaction(async (tx) => {
        const results = [];
        for (const minioFile of uploadedMinioFiles) {
          const material = await tx.archive_files.create({
            data: {
              id: uuidv4(),
              archive_id: archive.id,
              file_name: minioFile.fileName,
              file_url: minioFile.fileUrl,
              file_size: minioFile.fileSize,
              folder_name: dto.folderName || null,
              uploader_id: userId,
              download_count: 0,
              created_at: new Date(),
            },
          });

          results.push({
            id: material.id,
            fileName: material.file_name,
            fileSize: material.file_size,
            folderName: material.folder_name,
          });
        }
        return results;
      });

      this.logger.log(`批量上传成功，共 ${uploadedFiles.length} 个文件`);

      return {
        uploadedCount: uploadedFiles.length,
        files: uploadedFiles,
      };
    } catch (error) {
      // 如果失败，清理已上传的 MinIO 文件
      for (const minioFile of uploadedMinioFiles) {
        try {
          await this.minioService.deleteFile(minioFile.fileUrl);
        } catch (deleteError) {
          this.logger.error(`清理 MinIO 文件失败: ${minioFile.fileUrl}`, deleteError);
        }
      }
      throw new BadRequestException(error.message || '批量上传失败');
    }
  }

  async repost(
    files: Express.Multer.File[],
    dto: RepostMaterialDto,
    userId: string,
  ) {
    // 校验文件
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的文件');
    }

    if (files.length > 20) {
      throw new BadRequestException('单次最多上传 20 个文件');
    }

    // 校验文件大小
    for (const file of files) {
      if (file.size > this.maxFileSize) {
        throw new BadRequestException('文件大小不能超过200MB');
      }
    }

    // 校验用户是否为班委
    await this.classPermission.assertCommittee(userId, dto.classId);

    // 获取或创建归档
    const archive = await this.getOrCreateArchive(dto.classId, userId);

    // 上传文件到 MinIO
    const uploadedMinioFiles: { fileUrl: string; fileName: string; fileSize: number }[] = [];
    const materialIds: string[] = [];

    try {
      // 1. 上传所有文件到 MinIO
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const originalName = normalizeUploadFileName(file.originalname);
        const ext = path.extname(originalName);
        const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;
        const objectName = `materials/${dto.classId}/${uniqueName}`;

        const fileUrl = await this.minioService.uploadBuffer(
          objectName,
          file.buffer,
          { 'Content-Type': file.mimetype },
        );

        const fileName =
          dto.fileNameList && dto.fileNameList[i]
            ? dto.fileNameList[i]
            : originalName;

        uploadedMinioFiles.push({
          fileUrl,
          fileName,
          fileSize: file.size,
        });
      }

      // 2. 在事务中创建所有记录
      await this.prisma.$transaction(async (tx) => {
        // 2.1 创建 archive_files 记录
        for (const minioFile of uploadedMinioFiles) {
          const materialId = uuidv4();
          materialIds.push(materialId);

          await tx.archive_files.create({
            data: {
              id: materialId,
              archive_id: archive.id,
              file_name: minioFile.fileName,
              file_url: minioFile.fileUrl,
              file_size: minioFile.fileSize,
              folder_name: dto.folderName || null,
              uploader_id: userId,
              download_count: 0,
              created_at: new Date(),
            },
          });
        }

        // 2.2 创建 messages 记录
        const messageId = uuidv4();
        const textExcerpt = dto.text.length > 50 ? dto.text.substring(0, 50) + '...' : dto.text;

        await tx.messages.create({
          data: {
            id: messageId,
            class_id: dto.classId,
            publisher_id: userId,
            type: 'notice',
            title: textExcerpt,
            content: dto.text,
            require_ack: dto.requireAck ?? true,
            status: 'published',
            created_at: new Date(),
            updated_at: new Date(),
          },
        });

        // 2.3 创建 message_attachments 记录
        if (uploadedMinioFiles.length > 0) {
          await tx.message_attachments.createMany({
            data: uploadedMinioFiles.map((minioFile) => ({
              id: uuidv4(),
              message_id: messageId,
              file_name: minioFile.fileName,
              file_url: minioFile.fileUrl,
              file_size: minioFile.fileSize,
            })),
          });
        }

        // 2.4 创建 message_reads 记录（为班级所有成员）
        const members = await tx.class_members.findMany({
          where: { class_id: dto.classId },
          select: { user_id: true },
        });

        if (members.length > 0) {
          await tx.message_reads.createMany({
            data: members.map((m) => ({
              id: uuidv4(),
              message_id: messageId,
              user_id: m.user_id,
            })),
          });
        }
      });

      this.logger.log(`一键转载成功，共 ${materialIds.length} 个文件`);

      const textExcerpt = dto.text.length > 50 ? dto.text.substring(0, 50) + '...' : dto.text;

      return {
        materialIds,
        materialCount: materialIds.length,
        textExcerpt,
      };
    } catch (error) {
      // 失败时清理已上传的 MinIO 文件
      for (const minioFile of uploadedMinioFiles) {
        try {
          await this.minioService.deleteFile(minioFile.fileUrl);
        } catch (deleteError) {
          this.logger.error(`清理 MinIO 文件失败: ${minioFile.fileUrl}`, deleteError);
        }
      }
      throw new BadRequestException(error.message || '转载失败');
    }
  }

  private toFileItem(file: {
    id: string;
    file_name: string;
    file_url: string;
    file_size: number | null;
    folder_name: string | null;
    uploader_id: string | null;
    download_count: number;
    created_at: Date;
    uploader?: { id: string; name: string } | null;
  }) {
    return {
      id: file.id,
      fileName: file.file_name,
      fileUrl: file.file_url,
      fileSize: file.file_size,
      folderName: file.folder_name,
      uploaderId: file.uploader_id,
      uploaderName: file.uploader?.name || null,
      downloadCount: file.download_count,
      createdAt: file.created_at,
    };
  }

  /** 资料库首页概览：只读汇总，不改变任何现有接口返回结构 */
  async getSummary(classId: string, userId: string) {
    // 只有班级成员才能查看资料库概览
    await this.classPermission.assertMember(userId, classId);

    const archive = await this.prisma.archives.findFirst({
      where: { class_id: classId, archive_type: 'material' },
    });

    if (!archive) {
      return {
        totalCount: 0,
        totalSize: 0,
        newIn7Days: 0,
        myUploadCount: 0,
        folders: [],
        recentFiles: [],
        hotFiles: [],
      };
    }

    const files = await this.prisma.archive_files.findMany({
      where: { archive_id: archive.id },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const folderStats = new Map<string, { count: number; latestAt: Date }>();

    let totalSize = 0;
    let newIn7Days = 0;
    let myUploadCount = 0;

    for (const file of files) {
      totalSize += file.file_size || 0;
      if (now - file.created_at.getTime() <= sevenDays) {
        newIn7Days += 1;
      }
      if (file.uploader_id === userId) {
        myUploadCount += 1;
      }

      const folderKey = file.folder_name || '未分类';
      const prev = folderStats.get(folderKey);
      if (prev) {
        prev.count += 1;
        if (file.created_at > prev.latestAt) prev.latestAt = file.created_at;
      } else {
        folderStats.set(folderKey, { count: 1, latestAt: file.created_at });
      }
    }

    const hotFiles = [...files]
      .sort((a, b) => b.download_count - a.download_count)
      .slice(0, 5)
      .map((file) => this.toFileItem(file));

    return {
      totalCount: files.length,
      totalSize,
      newIn7Days,
      myUploadCount,
      folders: Array.from(folderStats.entries()).map(([name, stat]) => ({
        name,
        count: stat.count,
        latestAt: stat.latestAt,
      })),
      recentFiles: files.slice(0, 5).map((file) => this.toFileItem(file)),
      hotFiles,
    };
  }

  async getFileList(dto: QueryMaterialDto, userId: string) {
    // 只有班级成员才能查看资料列表
    await this.classPermission.assertMember(userId, dto.classId);

    const archive = await this.prisma.archives.findFirst({
      where: { class_id: dto.classId, archive_type: 'material' },
    });

    if (!archive) {
      return [];
    }

    const where: any = {
      archive_id: archive.id,
    };

    if (dto.folderName) {
      where.folder_name = dto.folderName;
    }

    if (dto.keyword) {
      where.file_name = {
        contains: dto.keyword,
      };
    }

    const files = await this.prisma.archive_files.findMany({
      where,
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return files.map((file) => ({
      id: file.id,
      fileName: file.file_name,
      fileUrl: file.file_url,
      fileSize: file.file_size,
      folderName: file.folder_name,
      uploaderId: file.uploader_id,
      uploaderName: file.uploader?.name || null,
      downloadCount: file.download_count,
      createdAt: file.created_at,
    }));
  }

  async getFileDetail(fileId: string, userId: string) {
    const file = await this.prisma.archive_files.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
        archives: { select: { class_id: true } },
      },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    // 只有文件所属班级的成员才能查看详情
    await this.classPermission.assertMember(userId, file.archives.class_id);

    const ext = file.file_name.split('.').pop()?.toUpperCase() || '未知';

    return {
      id: file.id,
      fileName: file.file_name,
      fileUrl: file.file_url,
      fileSize: file.file_size,
      folderName: file.folder_name,
      uploaderId: file.uploader_id,
      uploaderName: file.uploader?.name || null,
      downloadCount: file.download_count,
      fileType: ext,
      createdAt: file.created_at,
    };
  }

  async downloadFile(fileId: string, userId: string) {
    const file = await this.prisma.archive_files.findUnique({
      where: { id: fileId },
      include: {
        archives: { select: { class_id: true } },
      },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    // 只有文件所属班级的成员才能下载
    await this.classPermission.assertMember(userId, file.archives.class_id);

    // 下载文件到临时目录
    const localPath = await this.minioService.downloadFile(file.file_url);
    const buffer = fs.readFileSync(localPath);
    const mimeType = this.getMimeType(file.file_name);

    // 仅在读取的是 MinIO 临时副本时清理，避免本地回退模式误删源文件
    const tempRoot = path.join(require('os').tmpdir(), 'class-assistant-');
    if (localPath.startsWith(tempRoot)) {
      try {
        fs.unlinkSync(localPath);
        fs.rmdirSync(path.dirname(localPath));
      } catch (e) {
        this.logger.warn('清理临时文件失败', e);
      }
    }

    // 读取成功后再累加下载次数，避免失败记录虚增
    await this.prisma.archive_files.update({
      where: { id: fileId },
      data: { download_count: { increment: 1 } },
    });

    return {
      buffer,
      fileName: file.file_name,
      mimeType,
    };
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await this.prisma.archive_files.findUnique({
      where: { id: fileId },
      include: {
        archives: { select: { class_id: true } },
      },
    });

    if (!file) {
      throw new BadRequestException('文件不存在');
    }

    // 仅上传者本人、班委或班级创建者可以删除，避免任意成员误删全班资料
    if (file.uploader_id !== userId) {
      const classId = file.archives.class_id;
      const [member, owner] = await Promise.all([
        this.prisma.class_members.findFirst({
          where: {
            class_id: classId,
            user_id: userId,
            OR: [{ role_level: { in: ['owner', 'admin'] } }],
          },
        }),
        this.prisma.classes.findFirst({
          where: { id: classId, creator_id: userId },
        }),
      ]);
      if (!member && !owner) {
        throw new ForbiddenException('只有上传者本人或班委可以删除该文件');
      }
    }

    await this.minioService.deleteFile(file.file_url);

    await this.prisma.archive_files.delete({
      where: { id: fileId },
    });

    this.logger.log(`文件删除成功: ${file.file_name}`);

    return { message: '删除成功' };
  }
}
