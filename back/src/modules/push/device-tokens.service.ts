import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/database/prisma.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

/**
 * 设备推送标识（极光 Registration ID）存取。
 * 一个设备只保留一条记录：同一 RID 被其他账号登录时直接改绑到新账号。
 */
@Injectable()
export class DeviceTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterDeviceTokenDto) {
    const data = {
      user_id: userId,
      platform: dto.platform ?? 'android',
      app_version: dto.appVersion ?? null,
      device_model: dto.deviceModel ?? null,
      enabled: true,
    };

    await this.prisma.device_tokens.upsert({
      where: { registration_id: dto.registrationId },
      create: {
        id: uuidv4(),
        registration_id: dto.registrationId,
        ...data,
      },
      update: data,
    });

    return { registered: true };
  }

  async unregister(userId: string, registrationId: string) {
    await this.prisma.device_tokens.deleteMany({
      where: { registration_id: registrationId, user_id: userId },
    });
    return { unregistered: true };
  }

  /** 查询一组用户可用的推送标识（只取启用状态的设备） */
  async findEnabledRegistrationIds(userIds: string[]): Promise<string[]> {
    if (!userIds.length) return [];
    const rows = await this.prisma.device_tokens.findMany({
      where: { user_id: { in: userIds }, enabled: true },
      select: { registration_id: true },
    });
    return rows.map((row) => row.registration_id);
  }
}