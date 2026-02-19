import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LocalStorageAdapter } from './storage/local.storage';
import { StorageAdapter } from './storage/storage.interface';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AudioService {
  private readonly storageAdapter: StorageAdapter;
  private readonly allowedMimeTypes = [
    'audio/webm',
    'audio/ogg', 
    'audio/mpeg',
    'audio/wav',
    'audio/mp4'
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    const uploadDir = process.env.LOCAL_UPLOAD_DIR || './uploads';
    this.storageAdapter = new LocalStorageAdapter(uploadDir);
  }

  async uploadAudio(
    assessmentId: number,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    userId: number,
  ) {
    // Validate assessment exists and user has permission
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Get student and class info to check assignment
    const student = await this.prisma.student.findUnique({
      where: { id: assessment.studentId },
      include: {
        classStudents: {
          include: {
            class: {
              include: {
                evaluatorAssignments: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const classStudent = student.classStudents[0];
    if (!classStudent) {
      throw new BadRequestException('Student is not enrolled in any class');
    }

    // Check if user is assigned evaluator or admin/coordinator
    const isAssignedEvaluator = classStudent.class.evaluatorAssignments.some(
      (assignment: any) => assignment.evaluatorId === userId,
    );

    if (!isAssignedEvaluator) {
      throw new ForbiddenException('You are not assigned to this assessment');
    }

    // Validate file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }

    // Validate file size
    const maxSizeMB = parseInt(process.env.MAX_AUDIO_MB || '25', 10);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`File size exceeds ${maxSizeMB}MB limit`);
    }

    // Generate storage key and store file
    const storageKey = LocalStorageAdapter.generateStorageKey(file.originalname);
    await this.storageAdapter.putObject(storageKey, file.buffer, file.mimetype);

    // Create database record
    const audioRecording = await this.prisma.audioRecording.create({
      data: {
        assessmentId,
        storageProvider: 'local',
        storageKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: BigInt(file.size),
        uploadedBy: userId,
      },
    });

    // Log audit action
    await this.auditService.logAssessmentAction(
      assessmentId,
      'ASSESSMENT_AUDIO_UPLOADED',
      userId,
    );

    return audioRecording;
  }

  async getAudioRecordings(assessmentId: number, userId: number) {
    // Verify user has access to this assessment
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Get student and class info to check assignment
    const student = await this.prisma.student.findUnique({
      where: { id: assessment.studentId },
      include: {
        classStudents: {
          include: {
            class: {
              include: {
                evaluatorAssignments: true,
              },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const classStudent = student.classStudents[0];
    if (!classStudent) {
      throw new BadRequestException('Student is not enrolled in any class');
    }

    const isAssignedEvaluator = classStudent.class.evaluatorAssignments.some(
      (assignment: any) => assignment.evaluatorId === userId,
    );

    if (!isAssignedEvaluator) {
      throw new ForbiddenException('You are not assigned to this assessment');
    }

    const recordings = await this.prisma.audioRecording.findMany({
      where: { assessmentId },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Add download URLs
    return Promise.all(
      recordings.map(async (recording: any) => ({
        ...recording,
        downloadUrl: await this.storageAdapter.getObjectUrl(recording.storageKey),
        fileSizeBytes: Number(recording.fileSizeBytes),
      })),
    );
  }

  async getDownloadUrl(storageKey: string): Promise<string> {
    return this.storageAdapter.getObjectUrl(storageKey);
  }

  async hasAudioRecording(assessmentId: number): Promise<boolean> {
    const count = await this.prisma.audioRecording.count({
      where: { assessmentId },
    });
    return count > 0;
  }
}
