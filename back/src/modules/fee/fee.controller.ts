import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { FeeService } from './fee.service';
import {
  AddFeeRecordDto,
  UpdateFeeRecordDto,
  QueryFeeListDto,
  MonthStatDto,
  ExportFeeDto,
  FeeCategory,
  CreateFeeBudgetDto,
  QueryFeeBudgetDto,
  BatchPaymentDto,
  CreateFeeBillDto,
  QueryFeeBillsDto,
  QueryFeeBillMembersDto,
  RegisterFeeBillPaymentsDto,
} from './dto/fee.dto';

@ApiTags('班费/团费账本')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('fee')
export class FeeController {
  constructor(private readonly feeService: FeeService) {}

  @Post('upload-bill')
  @ApiOperation({ summary: '上传票据图片' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBill(
    @UploadedFile() file: Express.Multer.File,
    @Query('classId') classId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!classId) {
      throw new BadRequestException('班级ID不能为空');
    }
    return this.feeService.uploadBill(file, classId, userId);
  }

  @Post('add')
  @ApiOperation({ summary: '新增收支记录' })
  async add(
    @Body() dto: AddFeeRecordDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.addRecord(dto, userId);
  }

  @Post('batch-add')
  @ApiOperation({ summary: '批量登记缴费（班委权限）' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async batchAdd(
    @Body() dto: BatchPaymentDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.batchRegisterPayment(dto, userId);
  }

  @Get('list')
  @ApiOperation({ summary: '分页查询收支列表' })
  async list(
    @Query() dto: QueryFeeListDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.listRecords(dto, userId);
  }

  @Post('bills')
  @ApiOperation({ summary: '创建缴费账单（班委权限，按期生成应缴名单）' })
  async createBill(
    @Body() dto: CreateFeeBillDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.createBill(dto, userId);
  }

  @Get('bills')
  @ApiOperation({ summary: '查询缴费账单列表' })
  async listBills(
    @Query() dto: QueryFeeBillsDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.listBills(dto, userId);
  }

  @Get('bills/:billId/members')
  @ApiOperation({ summary: '查询账单成员缴费明细' })
  async listBillMembers(
    @Param('billId') billId: string,
    @Query() dto: QueryFeeBillMembersDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.listBillMembers(billId, dto, userId);
  }

  @Post('bills/:billId/register')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: '登记账单缴费（支持逾期补缴，班委权限）' })
  async registerBillPayments(
    @Param('billId') billId: string,
    @Body() dto: RegisterFeeBillPaymentsDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.registerBillPayments(billId, dto, userId);
  }

  @Delete('bills/:billId')
  @ApiOperation({ summary: '删除缴费账单（无缴费记录时才可删除）' })
  async deleteBill(
    @Param('billId') billId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.deleteBill(billId, userId);
  }

  @Put('update/:recordId')
  @ApiOperation({ summary: '修改收支记录' })
  async update(
    @Param('recordId') recordId: string,
    @Query('feeType') feeType: FeeCategory,
    @Body() dto: UpdateFeeRecordDto,
    @CurrentUser('userId') userId: string,
  ) {
    if (!feeType || !Object.values(FeeCategory).includes(feeType)) {
      throw new BadRequestException('feeType参数必须是class或group');
    }
    return this.feeService.updateRecord(recordId, dto, userId, feeType);
  }

  @Delete('delete/:recordId')
  @ApiOperation({ summary: '删除收支记录' })
  async delete(
    @Param('recordId') recordId: string,
    @Query('feeType') feeType: FeeCategory,
    @CurrentUser('userId') userId: string,
  ) {
    if (!feeType || !Object.values(FeeCategory).includes(feeType)) {
      throw new BadRequestException('feeType参数必须是class或group');
    }
    return this.feeService.deleteRecord(recordId, userId, feeType);
  }

  @Get('month-stat')
  @ApiOperation({ summary: '月度收支统计' })
  async monthStat(
    @Query() dto: MonthStatDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.monthStat(dto, userId);
  }

  @Get('export')
  @ApiOperation({ summary: '导出Excel收支报表' })
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async export(
    @Query() dto: ExportFeeDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.exportRecords(dto, userId);
  }

  @Post('budget/set')
  @ApiOperation({ summary: '设置学期预算（班委权限）' })
  async setBudget(
    @Body() dto: CreateFeeBudgetDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.setBudget(dto, userId);
  }

  @Get('budget')
  @ApiOperation({ summary: '查询学期预算' })
  async getBudget(
    @Query() dto: QueryFeeBudgetDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.getBudget(dto, userId);
  }

  @Delete('budget/:budgetId')
  @ApiOperation({ summary: '删除学期预算（班委权限）' })
  async deleteBudget(
    @Param('budgetId') budgetId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.feeService.deleteBudget(budgetId, userId);
  }
}
