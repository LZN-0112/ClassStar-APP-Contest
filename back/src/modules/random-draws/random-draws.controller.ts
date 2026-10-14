import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RandomDrawsService } from './random-draws.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreateRandomDrawDto,
  QueryRandomDrawsDto,
} from './dto/random-draws.dto';

@ApiTags('随机抽签')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('classes/:classId/random-draws')
export class RandomDrawsController {
  constructor(private readonly randomDrawsService: RandomDrawsService) {}

  @Post()
  @ApiOperation({ summary: '创建并执行抽签' })
  create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateRandomDrawDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.randomDrawsService.create(classId, dto, userId);
  }

  @Post('preview')
  @ApiOperation({ summary: '预览抽签结果（不入库）' })
  preview(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateRandomDrawDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.randomDrawsService.preview(classId, dto, userId);
  }

  @Post(':drawId/cancel')
  @ApiOperation({ summary: '作废抽签记录' })
  cancel(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('drawId', ParseUUIDPipe) drawId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.randomDrawsService.cancel(classId, drawId, userId);
  }

  @Get()
  @ApiOperation({ summary: '抽签记录列表' })
  findAll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryRandomDrawsDto,
  ) {
    return this.randomDrawsService.findAll(classId, userId, query);
  }

  @Get(':drawId')
  @ApiOperation({ summary: '抽签详情' })
  findOne(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('drawId', ParseUUIDPipe) drawId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.randomDrawsService.findOne(classId, drawId, userId);
  }
}
