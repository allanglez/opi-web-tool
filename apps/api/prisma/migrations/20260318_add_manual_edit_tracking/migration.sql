/*
  Add manual edit tracking:
  - is_manually_edited flag on students and classes tables
  - manual_edit_audit_log table for tracking all manual corrections
*/

-- Add is_manually_edited to students
ALTER TABLE [dbo].[students] ADD [is_manually_edited] BIT NOT NULL CONSTRAINT [DF_students_is_manually_edited] DEFAULT 0;

-- Add is_manually_edited to classes
ALTER TABLE [dbo].[classes] ADD [is_manually_edited] BIT NOT NULL CONSTRAINT [DF_classes_is_manually_edited] DEFAULT 0;

-- Create manual_edit_audit_log table
CREATE TABLE [dbo].[manual_edit_audit_log] (
    [id] INT NOT NULL IDENTITY(1,1),
    [entity_type] NVARCHAR(50) NOT NULL,
    [entity_id] INT NOT NULL,
    [action] NVARCHAR(50) NOT NULL,
    [field_name] NVARCHAR(100),
    [old_value] NVARCHAR(500),
    [new_value] NVARCHAR(500),
    [changed_by] INT NOT NULL,
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [DF_manual_edit_audit_log_changed_at] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_manual_edit_audit_log] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [FK_manual_edit_audit_log_users] FOREIGN KEY ([changed_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Create indexes
CREATE NONCLUSTERED INDEX [IX_manual_edit_audit_log_entity] ON [dbo].[manual_edit_audit_log]([entity_type], [entity_id]);
CREATE NONCLUSTERED INDEX [IX_manual_edit_audit_log_changed_by] ON [dbo].[manual_edit_audit_log]([changed_by]);
CREATE NONCLUSTERED INDEX [IX_manual_edit_audit_log_changed_at] ON [dbo].[manual_edit_audit_log]([changed_at]);
