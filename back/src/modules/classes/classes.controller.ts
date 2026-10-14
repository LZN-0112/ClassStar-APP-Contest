import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminOrOwner, OwnerOnly } from '@/common/decorators/role-level.decorator';
import { CanCreateClassGuard } from '@/common/guards/can-create-class.guard';
import {
  CreateClassDto,
  JoinClassDto,
  ImportMembersDto,
  UpdateMemberRoleLevelDto,
  TransferOwnerDto,
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

  @Get(':id/members')
  @ApiOperation({ summary: '获取成员列表' })
  getMembers(
    @Param('id') id: string,
    @Query('keyword') keyword?: string,
    @Query('role') role?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.classesService.getMembers(id, { keyword, role, page, pageSize });
  }

  @Get(':id/members/:memberId')
  @ApiOperation({ summary: '获取成员详情' })
  getMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.classesService.getMember(id, memberId);
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
}
