import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceTokensService } from './device-tokens.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

@ApiTags('消息推送')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('push/devices')
export class DeviceTokensController {
  constructor(private readonly deviceTokens: DeviceTokensService) {}

  @Post()
  @ApiOperation({ summary: '上报当前设备的推送标识' })
  register(@CurrentUser('userId') userId: string, @Body() dto: RegisterDeviceTokenDto) {
    return this.deviceTokens.register(userId, dto);
  }

  @Delete(':registrationId')
  @ApiOperation({ summary: '注销当前设备的推送标识（退出登录时调用）' })
  unregister(
    @CurrentUser('userId') userId: string,
    @Param('registrationId') registrationId: string,
  ) {
    return this.deviceTokens.unregister(userId, registrationId);
  }
}