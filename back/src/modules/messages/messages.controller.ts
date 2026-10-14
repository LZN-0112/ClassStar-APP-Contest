import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreateMessageDto,
  CreateReminderDto,
} from './dto/messages.dto';

@ApiTags('通知消息')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('classes/:classId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: '发布通知' })
  create(
    @Param('classId') classId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.messagesService.create(classId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '通知列表' })
  findAll(
    @Param('classId') classId: string,
    @CurrentUser('userId') userId: string,
    @Query('type') type?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ) {
    return this.messagesService.findAll(classId, userId, { type, page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: '通知详情' })
  findOne(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.messagesService.findOne(classId, id, userId);
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记通知已读' })
  markAsRead(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.messagesService.markAsRead(classId, id, userId);
  }

  @Post(':id/ack')
  @ApiOperation({ summary: '签收通知' })
  ack(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.messagesService.ack(classId, id, userId);
  }

  @Get(':id/acks')
  @ApiOperation({ summary: '签收统计与未签收名单' })
  getAcks(@Param('classId') classId: string, @Param('id') id: string) {
    return this.messagesService.getAcks(classId, id);
  }

  @Post(':id/remind')
  @ApiOperation({ summary: '再次提醒未签收成员' })
  remind(
    @Param('classId') classId: string,
    @Param('id') id: string,
    @Body() dto: CreateReminderDto,
  ) {
    return this.messagesService.remind(classId, id, dto);
  }

  @Get(':id/export-acks')
  @ApiOperation({ summary: '导出未签收名单' })
  exportAcks(@Param('classId') classId: string, @Param('id') id: string) {
    return this.messagesService.exportAcks(classId, id);
  }
}
