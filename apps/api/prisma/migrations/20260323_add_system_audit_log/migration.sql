-- CreateTable
CREATE TABLE [dbo].[system_audit_log] (
    [id] INT NOT NULL IDENTITY(1,1),
    [action] NVARCHAR(50) NOT NULL,
    [cycle_id] INT,
    [cycle_name] NVARCHAR(100),
    [cycle_year] INT,
    [performed_by] INT NOT NULL,
    [purged_assessments] INT,
    [purged_students] INT,
    [purged_audio_files] INT,
    [details] NVARCHAR(max),
    [performed_at] DATETIME2 NOT NULL CONSTRAINT [system_audit_log_performed_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [system_audit_log_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [system_audit_log_action_idx] ON [dbo].[system_audit_log]([action]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [system_audit_log_performed_at_idx] ON [dbo].[system_audit_log]([performed_at]);

-- AddForeignKey
ALTER TABLE [dbo].[system_audit_log] ADD CONSTRAINT [system_audit_log_performed_by_fkey] FOREIGN KEY ([performed_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
