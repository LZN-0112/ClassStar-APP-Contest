import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';

const SEMESTER_TYPES = ['semester'];

@Injectable()
export class ArchiveService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 按学期档案列表（仅 semester 类型），按学年聚合返回
   */
  async listArchives(classId: string) {
    const archives = await this.prisma.archives.findMany({
      where: {
        class_id: classId,
        status: 'active',
        archive_type: { in: SEMESTER_TYPES },
      },
      include: {
        users: { select: { name: true } },
        _count: { select: { archive_files: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return archives.map((a) => ({
      id: a.id,
      title: a.title,
      archiveYear: a.archive_year,
      archiveType: a.archive_type,
      status: a.status,
      createdAt: a.created_at,
      creatorName: a.users?.name ?? null,
      fileCount: a._count.archive_files,
    }));
  }

  /**
   * 档案详情（含附件列表）
   */
  async getArchiveDetail(archiveId: string) {
    const archive = await this.prisma.archives.findUnique({
      where: { id: archiveId },
      include: {
        users: { select: { name: true } },
        archive_files: { orderBy: { created_at: 'asc' } },
      },
    });

    if (!archive) {
      throw new NotFoundException('档案不存在');
    }

    return {
      id: archive.id,
      title: archive.title,
      archiveYear: archive.archive_year,
      archiveType: archive.archive_type,
      status: archive.status,
      createdAt: archive.created_at,
      updatedAt: archive.updated_at,
      creatorName: archive.users?.name ?? null,
      files: archive.archive_files.map((f) => ({
        id: f.id,
        fileName: f.file_name,
        fileSize: f.file_size,
        folderName: f.folder_name,
        downloadCount: f.download_count,
        downloadable: !!f.file_url,
        createdAt: f.created_at,
      })),
    };
  }

  /**
   * 档案附件详情
   */
  async getArchiveFile(archiveId: string, fileId: string) {
    const file = await this.prisma.archive_files.findFirst({
      where: { id: fileId, archive_id: archiveId },
    });

    if (!file) {
      throw new NotFoundException('附件不存在');
    }

    return {
      id: file.id,
      fileName: file.file_name,
      fileSize: file.file_size,
      folderName: file.folder_name,
      downloadCount: file.download_count,
      createdAt: file.created_at,
      downloadable: !!file.file_url,
    };
  }

  /**
   * 档案附件下载（演示数据 file_url 为空时给出友好提示）
   */
  async downloadArchiveFile(archiveId: string, fileId: string) {
    const file = await this.prisma.archive_files.findFirst({
      where: { id: fileId, archive_id: archiveId },
    });

    if (!file) {
      throw new NotFoundException('附件不存在');
    }

    if (!file.file_url) {
      throw new BadRequestException('附件暂无下载地址');
    }

    return {
      fileName: file.file_name,
      fileUrl: file.file_url,
    };
  }

  /**
   * 导出档案为 XLSX / PDF
   */
  async exportArchive(archiveId: string, format: string) {
    const archive = await this.prisma.archives.findUnique({
      where: { id: archiveId },
      include: {
        users: { select: { name: true } },
        archive_files: { orderBy: { created_at: 'asc' } },
      },
    });

    if (!archive) {
      throw new NotFoundException('档案不存在');
    }

    const meta: Array<[string, string]> = [
      ['档案标题', archive.title],
      ['学年', archive.archive_year],
      ['档案类型', archive.archive_type],
      ['生成人', archive.users?.name ?? '-'],
      ['生成时间', archive.created_at.toISOString()],
      ['附件数量', String(archive.archive_files.length)],
    ];

    const fileRows = archive.archive_files.map((f, i) => [
      i + 1,
      f.file_name,
      f.file_size ? String(f.file_size) : '-',
      f.folder_name ?? '-',
      String(f.download_count),
      f.created_at.toISOString(),
    ]);

    const baseName = archive.title.replace(/[\\/:*?"<>|]/g, '_') || '班级档案';

    if (format === 'pdf') {
      const PDFDocument = require('pdfkit');
      return {
        buffer: await this.buildPdfBuffer(PDFDocument, archive.title, meta, fileRows),
        mimeType: 'application/pdf',
        fileName: `${baseName}.pdf`,
      };
    }

    return {
      buffer: await this.buildXlsxBuffer(archive.title, meta, fileRows),
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: `${baseName}.xlsx`,
    };
  }

  private async buildXlsxBuffer(
    title: string,
    meta: Array<[string, string]>,
    fileRows: unknown[][],
  ): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('档案信息');

    sheet.columns = [
      { header: '#', key: 'no', width: 6 },
      { header: '文件名', key: 'fileName', width: 28 },
      { header: '大小(B)', key: 'size', width: 12 },
      { header: '分类', key: 'folder', width: 14 },
      { header: '下载次数', key: 'downloads', width: 12 },
      { header: '上传时间', key: 'createdAt', width: 24 },
    ];

    meta.forEach(([k, v]) => sheet.addRow([k, v]));
    sheet.addRow([]);
    sheet.addRow(['附件清单']);
    fileRows.forEach((row) => sheet.addRow(row));

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  }

  private buildPdfBuffer(
    PDFDocument: any,
    title: string,
    meta: Array<[string, string]>,
    fileRows: unknown[][],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(title, { align: 'center' });
      doc.moveDown();

      doc.fontSize(11).text('档案信息', { underline: true });
      doc.moveDown(0.5);
      meta.forEach(([k, v]) => doc.text(`${k}：${v}`));
      doc.moveDown();

      doc.fontSize(11).text('附件清单', { underline: true });
      doc.moveDown(0.5);
      fileRows.forEach((row) => {
        const line = row.map((c, idx) => (idx === 0 ? `#${c}` : String(c))).join('  |  ');
        doc.text(line);
      });

      doc.end();
    });
  }
}