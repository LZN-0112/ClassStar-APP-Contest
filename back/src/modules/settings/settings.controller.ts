import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UpdateSettingsDto, UpdateProfileDto } from './dto/settings.dto';

@ApiTags('设置与个人中心')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户设置' })
  getSettings(@CurrentUser('userId') userId: string) {
    return this.settingsService.getSettings(userId);
  }

  @Put()
  @ApiOperation({ summary: '更新当前用户设置' })
  updateSettings(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(userId, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户资料' })
  getProfile(@CurrentUser('userId') userId: string) {
    return this.settingsService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新当前用户资料' })
  updateProfile(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.settingsService.updateProfile(userId, dto);
  }

  @Get('recent-activities')
  @ApiOperation({ summary: '获取当前用户最近动态' })
  getRecentActivities(@CurrentUser('userId') userId: string) {
    return this.settingsService.getRecentActivities(userId);
  }
}
