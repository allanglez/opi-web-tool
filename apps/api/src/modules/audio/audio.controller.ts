import {
  Controller,
  Post,
  Get,
  Param,
  BadRequestException,
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AudioService } from './audio.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Audio')
@ApiBearerAuth('access-token')
@Controller('assessments/:assessmentId/audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post()
  @ApiOperation({ summary: 'Upload an audio recording for an assessment' })
  async uploadAudio(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: { id: number; roles?: string[] },
    @Req() req: FastifyRequest,
  ) {
    const data = await req.file();
    
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    console.log(`[AudioUpload] Received file: ${data.filename}, mimetype: ${data.mimetype}, buffer size: ${buffer.length} bytes`);
    const file = {
      buffer,
      originalname: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    };

    return this.audioService.uploadAudio(
      parseInt(assessmentId, 10),
      file,
      user.id,
      user.roles,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all audio recordings attached to an assessment' })
  async getAudioRecordings(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: { id: number; roles?: string[] },
  ) {
    return this.audioService.getAudioRecordings(
      parseInt(assessmentId, 10),
      user.id,
      user.roles,
    );
  }

  @Get(':storageKey/download')
  @ApiOperation({ summary: 'Download a specific audio recording file' })
  async downloadAudio(
    @Param('assessmentId') assessmentId: string,
    @Param('storageKey') storageKey: string,
    @CurrentUser() user: { id: number; roles?: string[] },
    @Res({ passthrough: false }) res: FastifyReply,
  ) {
    const data = await this.audioService.getAudioDownloadData(
      parseInt(assessmentId, 10),
      storageKey,
      user.id,
      user.roles,
    );

    // Buffer the stream to avoid Fastify/S3 SDK stream compatibility issues
    const chunks: Buffer[] = [];
    for await (const chunk of data.stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    res.header('Content-Length', buffer.length);
    res.header('Content-Type', data.mimeType);
    res.header('Content-Disposition', `inline; filename="${encodeURIComponent(data.fileName)}"`);

    return res.send(buffer);
  }
}
