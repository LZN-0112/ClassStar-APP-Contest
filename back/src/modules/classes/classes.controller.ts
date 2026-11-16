import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminOrOwner, OwnerOnly } from '@/common/decorators/role-level.decorator';
import { CanCreateClassGuard } from '@/common/guards/can-create-class.guard';
import {
  CreateClassDto,
  JoinClassDto,
  ImportMembersDto,
  GetMembersQueryDto,
  UpdateMemberRoleLevelDto,
  UpdateMemberDisplayRoleDto,
  UpdateMemberProfileDto,
  VerifyMemberDto,
  TransferOwnerDto,
  UpdateClassDto,
} from './dto/classes.dto';

@ApiTags('班级成员')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @UseGuards(CanCreateClassGuard)
  @ApiOperation({ summary: '创建班级' })
  createClass(@Body() dto: CreateClassDto, @CurrentUser('userId') userId: string) {
    return this.classesService.createClass(dto, userId);
  }

  @Post('join')
  @ApiOperation({ summary: '加入班级' })
  joinClass(@Body() dto: JoinClassDto, @CurrentUser('userId') userId: string) {
    return this.classesService.joinClass(dto, userId);
  }

  @Get('my')
  @ApiOperation({ summary: '获取当前用户加入的班级列表' })
  getMyClasses(@CurrentUser('userId') userId: string) {
    return this.classesService.getMyClasses(userId);
  }

  @Get('orgs/todos')
  @ApiOperation({ summary: '跨组织待办聚合' })
  getOrgTodos(@CurrentUser('userId') userId: string) {
    return this.classesService.getOrgTodos(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取班级信息' })
  getClass(@Param('id') id: string) {
    return this.classesService.getClass(id);
  }

  @Patch(':id')
  @AdminOrOwner()
  @ApiOperation({ summary: '更新班级信息（名称、公告、简介、年级、专业）' })
  updateClass(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.classesService.updateClass(id, dto, userId);
  }

  @Post(':id/logo')
  @AdminOrOwner()
  @ApiOperation({ summary: '上传/更换班级头像（仅群主或管理员）' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadClassLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    return this.classesService.uploadClassLogo(id, file, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '获取成员列表' })
  getMembers(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Query() query: GetMembersQueryDto,
  ) {
    return this.classesService.getMembers(id, userId, query);
  }

  @Get(':id/members/:memberId')
  @ApiOperation({ summary: '获取成员详情' })
  getMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.classesService.getMember(id, memberId, userId);
  }

  @Post(':id/qrcode')
  @ApiOperation({ summary: '生成/获取班级二维码' })
  ensureQrCode(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.classesService.ensureQrCode(id, userId);
  }

  @Post(':id/members/import')
  @AdminOrOwner()
  @ApiOperation({ summary: '导入学生名单' })
  importMembers(
    @Param('id') id: string,
    @Body() dto: ImportMembersDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.classesService.importMembers(id, dto, userId);
  }

  @Post(':id/members/:userId/role-level')
  @OwnerOnly()
  @ApiOperation({ summary: '设置成员权限等级（管理员/普通成员）' })
  updateMemberRoleLevel(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleLevelDto,
    @CurrentUser('userId') operatorUserId: string,
  ) {
    return this.classesService.updateMemberRoleLevel(id, userId, dto, operatorUserId);
  }

  @Post(':id/members/:userId/display-role')
  @AdminOrOwner()
  @ApiOperation({ summary: '修改成员显示身份（如团支书、学习委员，不含权限）' })
  updateMemberDisplayRole(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberDisplayRoleDto,
    @CurrentUser('userId') operatorUserId: string,
  ) {
    return this.classesService.updateMemberDisplayRole(id, userId, dto, operatorUserId);
  }

  @Post(':id/members/:userId/reset-password')
  @AdminOrOwner()
  @ApiOperation({ summary: '重置成员密码（返回一次性临时密码）' })
  resetMemberPassword(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser('userId') operatorUserId: string,
  ) {
    return this.classesService.resetMemberPassword(id, userId, operatorUserId);
  }

  @Post(':id/members/:userId/verify')
  @AdminOrOwner()
  @ApiOperation({ summary: '确认成员身份状态' })
  verifyMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: VerifyMemberDto,
    @CurrentUser('userId') operatorUserId: string,
  ) {
    return this.classesService.verifyMember(id, userId, dto, operatorUserId);
  }

  @Post(':id/members/:userId/profile')
  @AdminOrOwner()
  @ApiOperation({ summary: '修正成员真实姓名与学号' })
  updateMemberProfile(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberProfileDto,
    @CurrentUser('userId') operatorUserId: string,
  ) {
    return this.classesService.updateMemberProfile(id, userId, dto, operatorUserId);
  }

  @Post(':id/transfer-owner')
  @OwnerOnly()
  @ApiOperation({ summary: '转让群主' })
  transferOwner(
    @Param('id') id: string,
    @Body() dto: TransferOwnerDto,
    @CurrentUser('userId') operatorUserId: string,
  ) {
    return this.classesService.transferOwner(id, dto, operatorUserId);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: '退出组织' })
  leaveClass(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.classesService.leaveClass(id, userId);
  }

  @Delete(':id/members/:memberId')
  @AdminOrOwner()
  @ApiOperation({ summary: '移除班级成员' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('userId') operatorUserId: string,
  ) {
    return this.classesService.removeMember(id, memberId, operatorUserId);
  }

  @Delete(':id')
  @OwnerOnly()
  @ApiOperation({ summary: '解散班级（软删除，清理全部成员关系）' })
  dissolveClass(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.classesService.dissolveClass(id, userId);
  }
}
