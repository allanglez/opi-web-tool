import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { join } from 'path';
import { tmpdir } from 'os';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageAdapter } from './storage/storage.interface';
import { AuditService } from '../audit/audit.service';
import { createStorageAdapter } from './storage/storage.factory';

@Injectable()
export class AudioService {
  private readonly storageAdapter: StorageAdapter;
  private readonly storageProvider: string;
  private readonly allowedMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    this.storageProvider = (process.env.AUDIO_STORAGE_PROVIDER || 'local').toLowerCase();
    this.storageAdapter = createStorageAdapter();
    const configuredFfmpegPath = process.env.FFMPEG_BIN || process.env.FFMPEG_PATH;
    if (configuredFfmpegPath) {
      ffmpeg.setFfmpegPath(configuredFfmpegPath);
    } else if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    } else {
      ffmpeg.setFfmpegPath('ffmpeg');
    }
  }

  private static readonly mimeExtensions: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'audio/mp4': '.mp4',
    'audio/x-m4a': '.m4a',
    'audio/aac': '.aac',
  };

  private async assertAssessmentAccess(assessmentId: number, userId: number, userRoles: string[] = []) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, studentId: true, evaluatorId: true },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    const hasPrivilegedRole = userRoles.some((role) => role === 'ADMIN' || role === 'COORDINATOR');
    if (hasPrivilegedRole) {
      return assessment;
    }

    if (assessment.evaluatorId === userId) {
      return assessment;
    }

    const student = await this.prisma.student.findUnique({
      where: { id: assessment.studentId },
      include: {
        classStudents: {
          include: {
            class: {
              include: {
                evaluatorAssignments: {
                  select: {
                    evaluatorId: true,
                  },
                },
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
      (assignment) => assignment.evaluatorId === userId,
    );

    if (!isAssignedEvaluator) {
      throw new ForbiddenException('You are not assigned to this assessment');
    }

    return assessment;
  }

  private generateStorageKey(assessmentId: number): string {
    return `assessment_${assessmentId}_${Date.now()}_${randomUUID()}.mp3`;
  }

  private getDownloadUrl(assessmentId: number, storageKey: string): string {
    return `/api/v1/assessments/${assessmentId}/audio/${encodeURIComponent(storageKey)}/download`;
  }

  private normalizeToMp3FileName(originalName: string): string {
    const dot = originalName.lastIndexOf('.');
    if (dot === -1) {
      return `${originalName}.mp3`;
    }
    return `${originalName.slice(0, dot)}.mp3`;
  }

  private async transcodeBufferToMp3(fileBuffer: Buffer, mimeType: string): Promise<Buffer> {
    const inputExt = AudioService.mimeExtensions[mimeType] || '.audio';
    const tempBase = `${Date.now()}-${randomUUID()}`;
    const inputPath = join(tmpdir(), `${tempBase}${inputExt}`);
    const outputPath = join(tmpdir(), `${tempBase}.mp3`);

    try {
      await fs.writeFile(inputPath, fileBuffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .format('mp3')
          .on('end', () => resolve())
          .on('error', reject)
          .save(outputPath);
      });

      return await fs.readFile(outputPath);
    } catch (error) {
      const details = error instanceof Error ? error.message : undefined;
      throw new BadRequestException(
        details
          ? `Failed to convert uploaded audio to MP3: ${details}`
          : 'Failed to convert uploaded audio to MP3',
      );
    } finally {
      await Promise.all([
        fs.unlink(inputPath).catch(() => undefined),
        fs.unlink(outputPath).catch(() => undefined),
      ]);
    }
  }

  async uploadAudio(
    assessmentId: number,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    userId: number,
    userRoles: string[] = [],
  ) {
    await this.assertAssessmentAccess(assessmentId, userId, userRoles);

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { status: true },
    });

    if (assessment?.status === 'COMPLETED') {
      throw new ForbiddenException('Cannot upload audio to a completed assessment');
    }

    // Validate file type - accepted formats are transcoded to MP3 when needed
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Supported formats: MP3, WebM, OGG, WAV, MP4/M4A, AAC.');
    }

    // Validate file size
    const maxSizeMB = parseInt(process.env.MAX_AUDIO_MB || '25', 10);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(`File size exceeds ${maxSizeMB}MB limit`);
    }

    const shouldTranscode = !['audio/mpeg', 'audio/mp3'].includes(file.mimetype);
    const mp3Buffer = shouldTranscode
      ? await this.transcodeBufferToMp3(file.buffer, file.mimetype)
      : file.buffer;
    const storedFileName = this.normalizeToMp3FileName(file.originalname);

    // Generate storage key and store file
    const storageKey = this.generateStorageKey(assessmentId);
    await this.storageAdapter.putObject(storageKey, mp3Buffer, 'audio/mpeg');

    // Create database record
    const audioRecording = await this.prisma.audioRecording.create({
      data: {
        assessmentId,
        storageProvider: this.storageProvider,
        storageKey,
        fileName: storedFileName,
        mimeType: 'audio/mpeg',
        fileSizeBytes: BigInt(mp3Buffer.length),
        uploadedBy: userId,
      },
    });

    // Log audit action
    await this.auditService.logAssessmentAction(
      assessmentId,
      'ASSESSMENT_AUDIO_UPLOADED',
      userId,
    );

    return {
      ...audioRecording,
      fileSizeBytes: Number(audioRecording.fileSizeBytes),
    };
  }

  async getAudioRecordings(assessmentId: number, userId: number, userRoles: string[] = []) {
    await this.assertAssessmentAccess(assessmentId, userId, userRoles);

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
      recordings.map(async (recording) => ({
        ...recording,
        downloadUrl: this.getDownloadUrl(assessmentId, recording.storageKey),
        fileSizeBytes: Number(recording.fileSizeBytes),
      })),
    );
  }

  async getAudioDownloadData(
    assessmentId: number,
    storageKey: string,
    userId: number,
    userRoles: string[] = [],
  ) {
    await this.assertAssessmentAccess(assessmentId, userId, userRoles);

    const recording = await this.prisma.audioRecording.findFirst({
      where: { assessmentId, storageKey },
      select: { fileName: true, mimeType: true },
    });

    if (!recording) {
      throw new NotFoundException('Audio recording not found for this assessment');
    }

    const objectStream = await this.storageAdapter.getObjectStream(storageKey);
    if (!objectStream) {
      throw new NotFoundException('Audio file not found in storage');
    }

    return {
      stream: objectStream.stream,
      sizeBytes: objectStream.sizeBytes,
      mimeType: objectStream.mimeType || recording.mimeType,
      fileName: recording.fileName,
    };
  }

  async deleteAudioRecording(
    assessmentId: number,
    recordingId: number,
    userId: number,
    userRoles: string[] = [],
  ) {
    await this.assertAssessmentAccess(assessmentId, userId, userRoles);

    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { status: true },
    });

    if (assessment?.status === 'COMPLETED') {
      throw new ForbiddenException('Cannot delete audio from a completed assessment');
    }

    const recording = await this.prisma.audioRecording.findFirst({
      where: { id: recordingId, assessmentId },
    });

    if (!recording) {
      throw new NotFoundException('Audio recording not found');
    }

    // Delete from storage
    await this.storageAdapter.deleteObject(recording.storageKey);

    // Delete database record
    await this.prisma.audioRecording.delete({
      where: { id: recordingId },
    });

    return { success: true, deletedId: recordingId };
  }

  async hasAudioRecording(assessmentId: number): Promise<boolean> {
    const count = await this.prisma.audioRecording.count({
      where: { assessmentId },
    });
    return count > 0;
  }
}
