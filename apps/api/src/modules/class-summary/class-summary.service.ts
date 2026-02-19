import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClassSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate score distribution for a class
   */
  async calculateScoreDistribution(classId: number): Promise<{
    total: number;
    completed: number;
    levels: Record<string, number>;
    averageScore: number;
  }> {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        student: {
          classStudents: {
            some: {
              classId,
              class: {
                isActive: true,
              },
            },
          },
        },
        status: 'COMPLETED',
      },
      include: {
        score: {
          include: {
            opiLevel: true,
          },
        },
      },
    });

    const total = assessments.length;
    const completed = assessments.filter(a => a.status === 'COMPLETED').length;

    // Calculate OPI level distribution
    const levels: Record<string, number> = {};
    let totalScore = 0;

    assessments.forEach(assessment => {
      if (assessment.score?.opiLevel) {
        const level = assessment.score.opiLevel.description;
        levels[level] = (levels[level] || 0) + 1;
        totalScore += assessment.score.opiLevel.id || 0;
      }
    });

    const averageScore = total > 0 ? totalScore / total : 0;

    return {
      total,
      completed,
      levels,
      averageScore,
    };
  }

  /**
   * Generate comprehensive class summary
   */
  async generateClassSummary(classId: number): Promise<{
    class: any;
    scoreDistribution: any;
    completionStats: any;
  }> {
    const [classInfo, scoreDistribution] = await Promise.all([
      this.prisma.class.findUnique({
        where: { id: classId },
        include: {
          school: true,
          cycle: true,
          classStudents: {
            include: {
              student: {
                include: {
                  assessments: {
                    where: { status: 'COMPLETED' },
                    include: {
                      score: {
                        include: {
                          opiLevel: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.calculateScoreDistribution(classId),
    ]);

    const completionStats = {
      totalStudents: classInfo?.classStudents?.length || 0,
      totalAssessments: classInfo?.classStudents?.reduce((sum: number, classStudent: any) => 
        sum + (classStudent.student?.assessments?.length || 0), 0),
      completedAssessments: classInfo?.classStudents?.reduce((sum: number, classStudent: any) => 
        sum + (classStudent.student?.assessments?.filter((a: any) => a.status === 'COMPLETED').length || 0), 0),
      averageScore: scoreDistribution.averageScore,
    };

    return {
      class: classInfo!,
      scoreDistribution,
      completionStats,
    };
  }

  /**
   * Check if a class is ready for submission
   */
  async getSubmissionStatus(classId: number): Promise<{
    canSubmit: boolean;
    blockedAssessments: any[];
    requirements: string[];
  }> {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        student: {
          classStudents: {
            some: { classId },
          },
        },
        status: { in: ['IN_PROGRESS', 'NOT_STARTED'] },
      },
      include: {
        audioRecordings: true,
      },
    });

    const blockedAssessments = assessments.filter(assessment => {
      // Check if assessment has required audio
      const hasAudio = assessment.audioRecordings && assessment.audioRecordings.length > 0;
      
      if (!hasAudio && assessment.status !== 'ABSENT') {
        return true; // Blocked - missing required audio
      }

      return false; // Not blocked
    });

    const requirements: string[] = [];
    
    if (blockedAssessments.length > 0) {
      requirements.push('All assessments must be completed before submission');
    }

    const canSubmit = blockedAssessments.length === 0;

    return {
      canSubmit,
      blockedAssessments,
      requirements,
    };
  }

  /**
   * Get all classes that need review in a cycle
   */
  async getNeedsReviewAssessments(cycleId: number): Promise<any[]> {
    const needsReviewAssessments = await this.prisma.assessment.findMany({
      where: {
        cycleId,
        needsReview: true,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentNumber: true,
          },
        },
        evaluator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return needsReviewAssessments;
  }
}
