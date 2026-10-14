import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

export interface ExcelStudentRow {
  studentNo: string;
  name: string;
  phone: string;
  rowNumber: number;
}

export interface ParsedExcelResult {
  rows: ExcelStudentRow[];
  headerRow: string[];
}

@Injectable()
export class ExcelParserService {
  // 表头关键词映射（模糊匹配）
  private readonly headerAliases: Record<string, string[]> = {
    studentNo: ['学号', '编号', 'id', 'student id', 'student_no', 'studentid', '序号', '学生编号', '学 号'],
    name: ['姓名', '名字', 'name', '学生姓名', '学生名字', '姓 名', '名 字'],
    phone: ['手机', '电话', 'phone', '手机号', '联系电话', '联系方式', '手机号码', '手 机', '电 话', 'mobile'],
  };

  private readonly phoneRegex = /^1[3-9]\d{9}$/;
  private readonly studentNoRegex = /^[A-Za-z0-9]{6,20}$/;
  private readonly nameRegex = /^[\u4e00-\u9fa5]{2,4}$/;

  async parseStudentExcel(filePath: string): Promise<ParsedExcelResult> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(filePath);
    } catch {
      throw new BadRequestException('Excel 文件损坏或格式不正确，请检查后重新上传');
    }

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new BadRequestException('Excel 文件为空或无法读取第一个工作表');
    }

    // 1. 找到表头行（可能在第1行或后面某行）
    let headerRowIndex = this.findHeaderRow(worksheet);
    let headerRow: string[];

    if (headerRowIndex === -1) {
      // 无表头：把第1行当数据，纯靠内容推断列类型
      headerRowIndex = 0;
      headerRow = [];
    } else {
      headerRow = this.extractHeaderRow(worksheet, headerRowIndex);
    }

    // 2. 智能识别列索引（表头匹配 + 内容推断 + 位置兜底）
    const columnMap = this.identifyColumns(headerRow, worksheet, headerRowIndex);

    // 3. 解析数据行
    const rows: ExcelStudentRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return;

      const values = row.values as any[];
      const studentNo = columnMap.studentNo !== -1
        ? this.normalizeCellValue(values[columnMap.studentNo + 1])
        : '';
      const name = columnMap.name !== -1
        ? this.normalizeCellValue(values[columnMap.name + 1])
        : '';
      const phone = columnMap.phone !== -1
        ? this.normalizeCellValue(values[columnMap.phone + 1])
        : '';

      // 至少要有姓名或学号
      if (!name && !studentNo) return;

      rows.push({ studentNo, name, phone, rowNumber });
    });

    if (!rows.length) {
      throw new BadRequestException('Excel 文件中没有有效数据');
    }

    return { rows, headerRow };
  }

  /** 查找表头行：扫描前 10 行，找包含姓名/学号关键词的行 */
  private findHeaderRow(worksheet: ExcelJS.Worksheet): number {
    const maxScan = Math.min(worksheet.rowCount, 10);
    for (let i = 1; i <= maxScan; i++) {
      const row = worksheet.getRow(i);
      let hasHeader = false;
      row.eachCell({ includeEmpty: true }, (cell) => {
        const val = this.normalizeCellValue(cell.value).toLowerCase();
        const allKeywords = Object.values(this.headerAliases).flat();
        if (allKeywords.some((kw) => val.includes(kw.toLowerCase()))) {
          hasHeader = true;
        }
      });
      if (hasHeader) return i;
    }
    return -1;
  }

  private extractHeaderRow(worksheet: ExcelJS.Worksheet, rowIndex: number): string[] {
    const row = worksheet.getRow(rowIndex);
    const headers: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = this.normalizeCellValue(cell.value);
    });
    return headers;
  }

  /** 智能识别列：先表头匹配，再内容推断，最后位置兜底 */
  private identifyColumns(
    headerRow: string[],
    worksheet: ExcelJS.Worksheet,
    headerRowIndex: number,
  ): { studentNo: number; name: number; phone: number } {
    const result = { studentNo: -1, name: -1, phone: -1 };

    // 第一层：表头关键词匹配
    for (let i = 0; i < headerRow.length; i++) {
      const val = headerRow[i].toLowerCase();
      for (const [field, aliases] of Object.entries(this.headerAliases)) {
        if (aliases.some((kw) => val === kw || val.includes(kw))) {
          if (result[field as keyof typeof result] === -1) {
            (result as any)[field] = i;
          }
        }
      }
    }

    // 第二层：内容自动推断（只对未识别的列）
    if (result.studentNo === -1 || result.name === -1 || result.phone === -1) {
      const sampleRows = this.getSampleRows(worksheet, headerRowIndex, 10);
      const colCount = Math.max(headerRow.length, sampleRows[0]?.length || 0);
      const colScores = this.scoreColumns(sampleRows, colCount);

      if (result.name === -1 && colScores.nameCol !== -1) {
        result.name = colScores.nameCol;
      }
      if (result.studentNo === -1 && colScores.studentNoCol !== -1) {
        result.studentNo = colScores.studentNoCol;
      }
      if (result.phone === -1 && colScores.phoneCol !== -1) {
        result.phone = colScores.phoneCol;
      }
    }

    // 第三层：位置兜底（常见排列：学号-姓名-手机号）
    const usedCols = new Set([result.studentNo, result.name, result.phone].filter((v) => v !== -1));
    if (result.name === -1) {
      // 找第一个未被占用的列，优先选含中文的
      for (let i = 0; i < headerRow.length; i++) {
        if (!usedCols.has(i)) {
          result.name = i;
          usedCols.add(i);
          break;
        }
      }
    }
    if (result.studentNo === -1) {
      for (let i = 0; i < headerRow.length; i++) {
        if (!usedCols.has(i)) {
          result.studentNo = i;
          usedCols.add(i);
          break;
        }
      }
    }

    return result;
  }

  /** 获取样本行数据用于内容推断 */
  private getSampleRows(worksheet: ExcelJS.Worksheet, headerRowIndex: number, count: number): any[][] {
    const samples: any[][] = [];
    let collected = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return;
      if (collected >= count) return;
      const values = row.values as any[];
      samples.push(values.slice(1)); // 去掉 values[0]（ExcelJS 的 rowNumber 占位）
      collected++;
    });
    return samples;
  }

  /** 对每列打分，判断最可能是哪种类型 */
  private scoreColumns(
    samples: any[][],
    colCount: number,
  ): { nameCol: number; studentNoCol: number; phoneCol: number } {
    const result = { nameCol: -1, studentNoCol: -1, phoneCol: -1 };
    if (!samples.length) return result;

    const colStats: { nameScore: number; studentNoScore: number; phoneScore: number }[] = [];

    for (let c = 0; c < colCount; c++) {
      let nameHits = 0;
      let studentNoHits = 0;
      let phoneHits = 0;
      let total = 0;

      for (const row of samples) {
        const val = this.normalizeCellValue(row[c]);
        if (!val) continue;
        total++;

        if (this.nameRegex.test(val)) nameHits++;
        if (this.studentNoRegex.test(val)) studentNoHits++;
        if (this.phoneRegex.test(val)) phoneHits++;
      }

      if (total === 0) {
        colStats.push({ nameScore: 0, studentNoScore: 0, phoneScore: 0 });
      } else {
        colStats.push({
          nameScore: nameHits / total,
          studentNoScore: studentNoHits / total,
          phoneScore: phoneHits / total,
        });
      }
    }

    // 选得分最高的列
    const threshold = 0.5;

    // 手机号：匹配率最高且 > 阈值
    let bestPhone = -1;
    let bestPhoneScore = 0;
    for (let c = 0; c < colCount; c++) {
      if (colStats[c].phoneScore > bestPhoneScore && colStats[c].phoneScore >= threshold) {
        bestPhoneScore = colStats[c].phoneScore;
        bestPhone = c;
      }
    }
    result.phoneCol = bestPhone;

    // 姓名：中文姓名匹配率最高
    let bestName = -1;
    let bestNameScore = 0;
    for (let c = 0; c < colCount; c++) {
      if (c === bestPhone) continue;
      if (colStats[c].nameScore > bestNameScore && colStats[c].nameScore >= threshold) {
        bestNameScore = colStats[c].nameScore;
        bestName = c;
      }
    }
    result.nameCol = bestName;

    // 学号：学号格式匹配率最高
    let bestStudentNo = -1;
    let bestStudentNoScore = 0;
    for (let c = 0; c < colCount; c++) {
      if (c === bestPhone || c === bestName) continue;
      if (colStats[c].studentNoScore > bestStudentNoScore && colStats[c].studentNoScore >= threshold) {
        bestStudentNoScore = colStats[c].studentNoScore;
        bestStudentNo = c;
      }
    }
    result.studentNoCol = bestStudentNo;

    return result;
  }

  private normalizeCellValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object' && value.text) return String(value.text).trim();
    return String(value).trim();
  }
}
