import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AudioService } from './audio.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/v1/assessments/:assessmentId/audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(
    @Param('assessmentId') assessmentId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @CurrentUser() user: { id: number },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.audioService.uploadAudio(
      parseInt(assessmentId, 10),
      file,
      user.id,
    );
  }

  @Get()
  async getAudioRecordings(
    @Param('assessmentId') assessmentId: string,
    @CurrentUser() user: { id: number },
  ) {
    return this.audioService.getAudioRecordings(
      parseInt(assessmentId, 10),
      user.id,
    );
  }

  @Get(':storageKey/download')
  async downloadAudio(
    @Param('storageKey') storageKey: string,
    @Res() res: any,
  ) {
    try {
      // For local storage, we need to serve the file
      const fs = require('fs');
      const path = require('path');
      const uploadDir = process.env.LOCAL_UPLOAD_DIR || './uploads';
      const filePath = path.join(uploadDir, storageKey);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundException('Audio file not found');
      }

      const stat = fs.statSync(filePath);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Type', 'audio/webm');
      res.setHeader('Content-Disposition', `attachment; filename="${storageKey}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      throw new NotFoundException('Audio file not found');
    }
  }
}
