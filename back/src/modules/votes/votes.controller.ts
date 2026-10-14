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
import { VotesService } from './votes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  CreateVoteDto,
  QueryVotesDto,
  SubmitVoteDto,
} from './dto/votes.dto';

@ApiTags('班级投票')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('classes/:classId/votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post()
  @ApiOperation({ summary: '发布投票' })
  create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body() dto: CreateVoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.votesService.create(classId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '投票列表' })
  findAll(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryVotesDto,
  ) {
    return this.votesService.findAll(classId, userId, query);
  }

  @Get('my-votes')
  @ApiOperation({ summary: '我参与的投票' })
  findMyVotes(
    @Param('classId', ParseUUIDPipe) classId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryVotesDto,
  ) {
    return this.votesService.findMyVotes(classId, userId, query);
  }

  @Get(':voteId')
  @ApiOperation({ summary: '投票详情' })
  findOne(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('voteId', ParseUUIDPipe) voteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.votesService.findOne(classId, voteId, userId);
  }

  @Post(':voteId/submit')
  @ApiOperation({ summary: '提交投票' })
  submitVote(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('voteId', ParseUUIDPipe) voteId: string,
    @Body() dto: SubmitVoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.votesService.submitVote(classId, voteId, dto, userId);
  }

  @Get(':voteId/results')
  @ApiOperation({ summary: '投票结果统计' })
  getResults(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('voteId', ParseUUIDPipe) voteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.votesService.getResults(classId, voteId, userId);
  }
}
