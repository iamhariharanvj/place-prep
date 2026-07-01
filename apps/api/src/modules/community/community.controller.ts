import { Controller, Get, Post, Body, Param, Query, Delete, HttpCode } from '@nestjs/common';
import {
  createQuestionSchema,
  createAnswerSchema,
  createNoteSchema,
  createExperienceSchema,
  listExperiencesQuerySchema,
  voteSchema,
  createCommentSchema,
  paginationSchema,
} from '@placement/shared';
import { ZodBody } from '../../common/pipes/zod-validation.pipe';
import { Public, Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';
import { PublishService, VoteService, CommentService } from './community.service';
import { Role } from '@placement/shared';

@Controller()
export class CommunityController {
  constructor(
    private publish: PublishService,
    private votes: VoteService,
    private comments: CommentService,
  ) {}

  @Public()
  @Get('questions')
  listQuestions(@Query() query: ReturnType<typeof paginationSchema.parse>, @CurrentUser() user?: JwtUser | null) {
    const { cursor, limit } = paginationSchema.parse(query);
    return this.publish.listQuestions(cursor, limit, user?.id);
  }

  @Roles(Role.STUDENT)
  @Post('questions')
  createQuestion(@CurrentUser() user: JwtUser, @Body(ZodBody(createQuestionSchema)) dto: ReturnType<typeof createQuestionSchema.parse>) {
    return this.publish.createQuestion(user.id, dto);
  }

  @Public()
  @Get('questions/:id')
  getQuestion(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    return this.publish.getQuestion(id, user?.id);
  }

  @Post('questions/:id/answers')
  createAnswer(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body(ZodBody(createAnswerSchema)) dto: ReturnType<typeof createAnswerSchema.parse>,
  ) {
    return this.publish.createAnswer(user.id, id, dto);
  }

  @Post('answers/:id/accept')
  acceptAnswer(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.publish.acceptAnswer(user.id, id);
  }

  @Public()
  @Get('notes')
  listNotes(@Query() query: ReturnType<typeof paginationSchema.parse>, @CurrentUser() user?: JwtUser | null) {
    const { cursor, limit } = paginationSchema.parse(query);
    return this.publish.listNotes(cursor, limit, user?.id);
  }

  @Post('notes')
  createNote(@CurrentUser() user: JwtUser, @Body(ZodBody(createNoteSchema)) dto: ReturnType<typeof createNoteSchema.parse>) {
    return this.publish.createNote(user.id, dto);
  }

  @Public()
  @Get('experiences/filters')
  experienceFilters() {
    return this.publish.listExperienceFilters();
  }

  @Public()
  @Get('experiences')
  listExperiences(@Query() query: Record<string, string>, @CurrentUser() user?: JwtUser | null) {
    const { cursor, limit, company, role } = listExperiencesQuerySchema.parse(query);
    return this.publish.listExperiences(cursor, limit, user?.id, { company, role });
  }

  @Roles(Role.STUDENT, Role.MENTOR)
  @Post('experiences')
  createExperience(@CurrentUser() user: JwtUser, @Body(ZodBody(createExperienceSchema)) dto: ReturnType<typeof createExperienceSchema.parse>) {
    return this.publish.createExperience(user.id, dto);
  }

  @Post('messages/:id/vote')
  vote(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body(ZodBody(voteSchema)) dto: ReturnType<typeof voteSchema.parse>,
  ) {
    return this.votes.toggleVote(user.id, id, dto.value);
  }

  @Delete('messages/:id/vote')
  @HttpCode(200)
  removeVote(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.votes.toggleVote(user.id, id, 1).catch(() => this.votes.toggleVote(user.id, id, -1));
  }

  @Get('messages/:id/comments')
  listComments(@Param('id') id: string) {
    return this.comments.list(id);
  }

  @Post('messages/:id/comments')
  createComment(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body(ZodBody(createCommentSchema)) dto: ReturnType<typeof createCommentSchema.parse>,
  ) {
    return this.comments.create(user.id, id, dto.body, dto.visibility);
  }
}
