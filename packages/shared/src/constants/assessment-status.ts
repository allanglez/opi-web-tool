export const ASSESSMENT_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABSENT: 'ABSENT',
} as const;

export type AssessmentStatus = (typeof ASSESSMENT_STATUS)[keyof typeof ASSESSMENT_STATUS];
