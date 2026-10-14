import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { MinioService } from '@/common/storage/minio.service';
import { CreateMaterialDto, QueryMaterialDto, BatchUploadMaterialDto, RepostMaterialDto } from './dto/material.dto';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MaterialService {
  private readonly logger = new Logger(MaterialService.name);
  private readonly maxFileSize = 200 * 1024 * 1024; // 200MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
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

    const archive = await this.getOrCreateArchive(dto.classId, userId);

    const ext = path.extname(file.originalname);
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
        file_name: dto.fileName || file.originalname,
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

    const archive = await this.getOrCreateArchive(dto.classId, userId);

    // 先上传所有文件到 MinIO，收集 URL
    const uploadedMinioFiles: { fileUrl: string; fileName: string; fileSize: number }[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = path.extname(file.originalname);
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
            : file.originalname;

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
    const member = await this.prisma.class_members.findFirst({
      where: {
        class_id: dto.classId,
        user_id: userId,
        is_committee: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('只有班委才能执行转载操作');
    }

    // 获取或创建归档
    const archive = await this.getOrCreateArchive(dto.classId, userId);

    // 上传文件到 MinIO
    const uploadedMinioFiles: { fileUrl: string; fileName: string; fileSize: number }[] = [];
    const materialIds: string[] = [];

    try {
      // 1. 上传所有文件到 MinIO
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = path.extname(file.originalname);
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
            : file.originalname;

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

  async getFileList(dto: QueryMaterialDto) {
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

  async getFileDetail(fileId: string) {
    const file = await this.prisma.archive_files.findUnique({
      where: { id: fileId },
      include: {
        uploader: {
          select: { id: true, name: true },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

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
    });

    if (!file) {
      throw new NotFoundException('文件不存在');
    }

    // 增加下载次数
    await this.prisma.archive_files.update({
      where: { id: fileId },
      data: { download_count: { increment: 1 } },
    });

    // 下载文件到临时目录
    const localPath = await this.minioService.downloadFile(file.file_url);
    const buffer = fs.readFileSync(localPath);
    const mimeType = this.getMimeType(file.file_name);

    // 清理临时文件
    try {
      fs.unlinkSync(localPath);
      const tempDir = path.dirname(localPath);
      if (tempDir.startsWith(path.join(require('os').tmpdir(), 'class-assistant-'))) {
        fs.rmdirSync(tempDir);
      }
    } catch (e) {
      this.logger.warn('清理临时文件失败', e);
    }

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
    });

    if (!file) {
      throw new BadRequestException('文件不存在');
    }

    await this.minioService.deleteFile(file.file_url);

    await this.prisma.archive_files.delete({
      where: { id: fileId },
    });

    this.logger.log(`文件删除成功: ${file.file_name}`);

    return { message: '删除成功' };
  }
}
