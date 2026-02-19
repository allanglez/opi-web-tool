import {
  Controller,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ClassSummaryService } from './class-summary.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('classes')
export class ClassSummaryController {
  constructor(private readonly classSummaryService: ClassSummaryService) {}

  @Get(':id/summary')
  async getClassSummary(
    @Param('id') classId: string,
    @CurrentUser() _user: any,
  ) {
    try {
      const classIdNum = parseInt(classId, 10);
      const summary = await this.classSummaryService.generateClassSummary(classIdNum);
      
      if (!summary.class) {
        throw new NotFoundException('Class not found');
      }

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      throw new NotFoundException('Failed to generate class summary');
    }
  }

  @Get(':id/submission-status')
  async getSubmissionStatus(
    @Param('id') classId: string,
    @CurrentUser() _user: any,
  ) {
    try {
      const classIdNum = parseInt(classId, 10);
      const status = await this.classSummaryService.getSubmissionStatus(classIdNum);
      
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw new NotFoundException('Failed to check submission status');
    }
  }

  @Get(':id/needs-review')
  @Roles('COORDINATOR', 'ADMIN')
  async getNeedsReviewAssessments(
    @Param('id') cycleId: string,
    @CurrentUser() _user: any,
  ) {
    try {
      const cycleIdNum = parseInt(cycleId, 10);
      const needsReview = await this.classSummaryService.getNeedsReviewAssessments(cycleIdNum);
      
      return {
        success: true,
        data: needsReview,
      };
    } catch (error) {
      throw new NotFoundException('Failed to get needs review assessments');
    }
  }
}
