import {
  Controller,
  Post,
  Get,
  Param,
  BadRequestException,
  Res,
  Req,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AudioService } from './audio.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('assessments/:assessmentId/audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post()
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

    if (data.sizeBytes) {
      res.header('Content-Length', data.sizeBytes);
    }
    res.header('Content-Type', data.mimeType);
    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(data.fileName)}"`);

    return res.send(data.stream);
  }
}
