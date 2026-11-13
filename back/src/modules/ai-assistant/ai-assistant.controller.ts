import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AskAssistantDto, CreateAssistantRecordDto, ParseAssistantDto, RecognizeSpeechDto, UrgeHomeworkDto } from './dto/ai-assistant.dto';
import { AiAssistantService } from './ai-assistant.service';

@ApiTags('AI 助手')
@ApiBearerAuth()
@Controller('ai/assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Get('status')
  @ApiOperation({ summary: 'AI 服务实时可用性（检查密钥与模型连通性）' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  status() {
    return this.aiAssistantService.getStatus();
  }

  @Post('parse')
  @ApiOperation({ summary: '解析一句话，生成作业/活动草稿（只读，不写库；含重复作业检测）' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  parse(@CurrentUser('userId') userId: string, @Body() dto: ParseAssistantDto) {
    return this.aiAssistantService.parse(userId, dto);
  }

  @Post('ask')
  @ApiOperation({ summary: '班级数据问答（只读，白名单查询，按班级与角色隔离）' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  ask(@CurrentUser('userId') userId: string, @Body() dto: AskAssistantDto) {
    return this.aiAssistantService.ask(userId, dto);
  }

  @Post('urge')
  @ApiOperation({ summary: '发送作业催交提醒（仅班委，给未交学生发站内消息）' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  urge(@CurrentUser('userId') userId: string, @Body() dto: UrgeHomeworkDto) {
    return this.aiAssistantService.urgeHomework(userId, dto);
  }

  @Post('asr')
  @ApiOperation({ summary: '语音转文字（上传录音 base64，返回识别文本）' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  recognize(@Body() dto: RecognizeSpeechDto) {
    return this.aiAssistantService.recognizeSpeech(dto);
  }

  @Get('records')
  @ApiOperation({ summary: '我的 AI 发布历史（仅本人可见）' })
  listRecords(@CurrentUser('userId') userId: string, @Query('limit') limit?: string) {
    return this.aiAssistantService.listRecords(userId, limit ? Number(limit) : 20);
  }

  @Post('records')
  @ApiOperation({ summary: '保存一条 AI 发布记录（发布成功后调用）' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  createRecord(@CurrentUser('userId') userId: string, @Body() dto: CreateAssistantRecordDto) {
    return this.aiAssistantService.saveRecord(userId, dto);
  }
}