-- CreateTable: class_submissions
-- Tracks when classes are submitted by evaluators
CREATE TABLE [dbo].[class_submissions] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [class_id] INT NOT NULL,
    [submitted_by] INT NOT NULL,
    [submitted_at] DATETIME2 NOT NULL,
    [status] NVARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    [notes] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_class_submissions] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_class_submissions_class_id] FOREIGN KEY ([class_id]) REFERENCES [dbo].[classes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK_class_submissions_submitted_by] FOREIGN KEY ([submitted_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateIndex
CREATE INDEX [IX_class_submissions_class_id] ON [dbo].[class_submissions]([class_id]);
CREATE INDEX [IX_class_submissions_submitted_by] ON [dbo].[class_submissions]([submitted_by]);
CREATE INDEX [IX_class_submissions_status] ON [dbo].[class_submissions]([status]);

-- CreateTable: assessment_review_flags
-- Tracks assessments flagged for coordinator review
CREATE TABLE [dbo].[assessment_review_flags] (
    [id] INT IDENTITY(1,1) NOT NULL,
    [assessment_id] INT NOT NULL,
    [flagged_by] INT NOT NULL,
    [reason] NVARCHAR(MAX) NULL,
    [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
    [resolved_at] DATETIME2 NULL,
    [resolved_by] INT NULL,
    [resolution_notes] NVARCHAR(MAX) NULL,
    CONSTRAINT [PK_assessment_review_flags] PRIMARY KEY CLUSTERED ([id] ASC),
    CONSTRAINT [FK_assessment_review_flags_assessment_id] FOREIGN KEY ([assessment_id]) REFERENCES [dbo].[assessments]([id]) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT [FK_assessment_review_flags_flagged_by] FOREIGN KEY ([flagged_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK_assessment_review_flags_resolved_by] FOREIGN KEY ([resolved_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateIndex
CREATE INDEX [IX_assessment_review_flags_assessment_id] ON [dbo].[assessment_review_flags]([assessment_id]);
CREATE INDEX [IX_assessment_review_flags_flagged_by] ON [dbo].[assessment_review_flags]([flagged_by]);
CREATE INDEX [IX_assessment_review_flags_resolved_at] ON [dbo].[assessment_review_flags]([resolved_at]);

-- Add class_submission_id to assessments table
ALTER TABLE [dbo].[assessments]
ADD [class_submission_id] INT NULL;

-- Add foreign key constraint
ALTER TABLE [dbo].[assessments]
ADD CONSTRAINT [FK_assessments_class_submission_id] 
FOREIGN KEY ([class_submission_id]) REFERENCES [dbo].[class_submissions]([id]) 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Create index
CREATE INDEX [IX_assessments_class_submission_id] ON [dbo].[assessments]([class_submission_id]);
