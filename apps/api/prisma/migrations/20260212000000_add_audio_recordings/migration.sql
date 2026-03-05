/*
  Add AudioRecording table for storing audio file metadata
*/

BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'[dbo].[audio_recordings]', N'U') IS NULL
BEGIN
    -- CreateTable
    CREATE TABLE [dbo].[audio_recordings] (
        [id] INT NOT NULL IDENTITY(1,1),
        [assessment_id] INT NOT NULL,
        [storage_provider] NVARCHAR(50) NOT NULL,
        [storage_key] NVARCHAR(512) NOT NULL,
        [file_name] NVARCHAR(255) NOT NULL,
        [mime_type] NVARCHAR(100) NOT NULL,
        [file_size_bytes] BIGINT NOT NULL,
        [duration_seconds] INT,
        [uploaded_by] INT NOT NULL,
        [uploaded_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [audio_recordings_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [audio_recordings_assessment_id_fkey] FOREIGN KEY ([assessment_id]) REFERENCES [dbo].[assessments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [audio_recordings_uploaded_by_fkey] FOREIGN KEY ([uploaded_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
    );
END;

IF OBJECT_ID(N'[dbo].[audio_recordings]', N'U') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM sys.indexes
       WHERE [name] = N'audio_recordings_assessment_id_uploaded_at_idx'
         AND [object_id] = OBJECT_ID(N'[dbo].[audio_recordings]')
   )
BEGIN
    -- CreateIndex
    CREATE INDEX [audio_recordings_assessment_id_uploaded_at_idx] ON [dbo].[audio_recordings]([assessment_id], [uploaded_at]);
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
