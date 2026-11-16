import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@/common/database/prisma.service';
import { MinioService } from '@/common/storage/minio.service';

const SEMESTER_TYPES = ['semester'];

@Injectable()
export class ArchiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

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
   * 生成本学期档案：把当前成员名单快照成 Excel 附件归档
   */
  async createSemesterArchive(classId: string, operatorUserId: string) {
    const [classEntity, operator] = await Promise.all([
      this.prisma.classes.findUnique({
        where: { id: classId },
        select: { id: true, name: true, status: true },
      }),
      this.prisma.class_members.findFirst({
        where: { class_id: classId, user_id: operatorUserId },
        select: { role_level: true },
      }),
    ]);
    if (!classEntity || !classEntity.status) {
      throw new NotFoundException('班级不存在或已解散');
    }
    if (!operator || operator.role_level === 'member') {
      throw new ForbiddenException('只有群主或管理员可以生成班级档案');
    }

    const { year, title } = this.getCurrentSemester();
    const existing = await this.prisma.archives.findFirst({
      where: {
        class_id: classId,
        status: 'active',
        archive_type: 'semester',
        archive_year: year,
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('本学期档案已生成，可直接查看');
    }

    const [members, operatorUser] = await Promise.all([
      this.prisma.class_members.findMany({
        where: { class_id: classId },
        include: { users: { select: { name: true, student_id: true } } },
        orderBy: [{ role_level: 'asc' }, { joined_at: 'asc' }],
      }),
      this.prisma.users.findUnique({
        where: { id: operatorUserId },
        select: { name: true },
      }),
    ]);

    const committeeCount = members.filter((m) => m.role_level !== 'member').length;

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const overview = workbook.addWorksheet('班级概况');
    overview.columns = [
      { key: 'label', width: 18 },
      { key: 'value', width: 40 },
    ];
    const overviewRows: Array<[string, string]> = [
      ['班级名称', classEntity.name],
      ['归档学期', title],
      ['成员总数', String(members.length)],
      ['班委人数', String(committeeCount)],
      ['生成人', operatorUser?.name || '-'],
      ['生成时间', new Date().toISOString().slice(0, 10)],
    ];
    overviewRows.forEach(([label, value]) => {
      const row = overview.addRow([label, value]);
      row.getCell(1).font = { bold: true };
    });

    const roster = workbook.addWorksheet('成员名单');
    roster.columns = [
      { header: '序号', key: 'no', width: 8 },
      { header: '姓名', key: 'name', width: 16 },
      { header: '学号', key: 'studentId', width: 20 },
      { header: '班级身份', key: 'role', width: 16 },
      { header: '角色级别', key: 'roleLevel', width: 12 },
      { header: '入班时间', key: 'joinedAt', width: 16 },
    ];
    roster.getRow(1).font = { bold: true };
    members.forEach((member, index) => {
      roster.addRow([
        index + 1,
        member.users?.name || '-',
        member.users?.student_id || '-',
        member.role,
        this.getRoleLevelLabel(member.role_level),
        member.joined_at.toISOString().slice(0, 10),
      ]);
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const objectName = `class-archives/${classId}/${uuidv4()}.xlsx`;
    const fileUrl = await this.minioService.uploadBuffer(objectName, buffer, {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const archiveId = uuidv4();
    const createdAt = new Date();
    await this.prisma.$transaction([
      this.prisma.archives.create({
        data: {
          id: archiveId,
          class_id: classId,
          title,
          archive_year: year,
          archive_type: 'semester',
          status: 'active',
          created_by: operatorUserId,
        },
      }),
      this.prisma.archive_files.create({
        data: {
          id: uuidv4(),
          archive_id: archiveId,
          file_name: `${title}-成员名单.xlsx`,
          file_url: fileUrl,
          file_size: buffer.length,
          folder_name: '成员名单',
          uploader_id: operatorUserId,
        },
      }),
    ]);

    return {
      id: archiveId,
      title,
      archiveYear: year,
      archiveType: 'semester',
      status: 'active',
      createdAt,
      creatorName: operatorUser?.name ?? null,
      fileCount: 1,
    };
  }

  /** 当前学年学期：9 月开启新学年，2-8 月为第二学期 */
  private getCurrentSemester(now = new Date()) {
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 9) {
      const range = `${year}-${year + 1}`;
      return { year: range, title: `${range}学年第一学期档案` };
    }
    const range = `${year - 1}-${year}`;
    return {
      year: range,
      title: month === 1 ? `${range}学年第一学期档案` : `${range}学年第二学期档案`,
    };
  }

  private getRoleLevelLabel(level: string) {
    if (level === 'owner') return '群主';
    if (level === 'admin') return '管理员';
    return '成员';
  }

  /**
   * 档案详情（含附件列表）
   */
  async getArchiveDetail(classId: string, archiveId: string) {
    const archive = await this.prisma.archives.findUnique({
      where: { id: archiveId },
      include: {
        users: { select: { name: true } },
        archive_files: { orderBy: { created_at: 'asc' } },
      },
    });

    if (!archive || archive.class_id !== classId) {
      throw new NotFoundException('档案不存在或不属于该班级');
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
  async getArchiveFile(classId: string, archiveId: string, fileId: string) {
    const archive = await this.prisma.archives.findUnique({
      where: { id: archiveId },
      select: { class_id: true },
    });
    if (!archive || archive.class_id !== classId) {
      throw new NotFoundException('档案不存在或不属于该班级');
    }

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
  async downloadArchiveFile(classId: string, archiveId: string, fileId: string) {
    const archive = await this.prisma.archives.findUnique({
      where: { id: archiveId },
      select: { class_id: true },
    });
    if (!archive || archive.class_id !== classId) {
      throw new NotFoundException('档案不存在或不属于该班级');
    }

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
  async exportArchive(classId: string, archiveId: string, format: string) {
    const archive = await this.prisma.archives.findUnique({
      where: { id: archiveId },
      include: {
        users: { select: { name: true } },
        archive_files: { orderBy: { created_at: 'asc' } },
      },
    });

    if (!archive || archive.class_id !== classId) {
      throw new NotFoundException('档案不存在或不属于该班级');
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