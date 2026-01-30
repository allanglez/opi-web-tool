BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(50) NOT NULL,
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [roles_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] INT NOT NULL IDENTITY(1,1),
    [external_auth_id] NVARCHAR(255) NOT NULL,
    [first_name] NVARCHAR(100) NOT NULL,
    [last_name] NVARCHAR(100) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [users_is_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [last_login_at] DATETIME2,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_external_auth_id_key] UNIQUE NONCLUSTERED ([external_auth_id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[user_roles] (
    [user_id] INT NOT NULL,
    [role_id] INT NOT NULL,
    CONSTRAINT [user_roles_pkey] PRIMARY KEY CLUSTERED ([user_id],[role_id])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_cycles] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    [starts_on] DATE NOT NULL,
    [ends_on] DATE NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [assessment_cycles_is_active_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [assessment_cycles_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [data_approved_at] DATETIME2,
    [data_approved_by] INT,
    [retention_days] INT,
    CONSTRAINT [assessment_cycles_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_rounds] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cycle_id] INT NOT NULL,
    [round_number] TINYINT NOT NULL,
    [name] NVARCHAR(50) NOT NULL,
    [starts_on] DATE NOT NULL,
    [ends_on] DATE NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [assessment_rounds_is_active_df] DEFAULT 0,
    CONSTRAINT [assessment_rounds_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [assessment_rounds_cycle_id_round_number_key] UNIQUE NONCLUSTERED ([cycle_id],[round_number])
);

-- CreateTable
CREATE TABLE [dbo].[programs] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(100) NOT NULL,
    CONSTRAINT [programs_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [programs_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[schools] (
    [id] INT NOT NULL IDENTITY(1,1),
    [school_code] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [district] NVARCHAR(100),
    [school_type] NVARCHAR(50),
    [contact_name] NVARCHAR(255),
    [contact_email] NVARCHAR(255),
    [contact_phone] NVARCHAR(50),
    CONSTRAINT [schools_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [schools_school_code_key] UNIQUE NONCLUSTERED ([school_code])
);

-- CreateTable
CREATE TABLE [dbo].[classes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cycle_id] INT NOT NULL,
    [school_id] INT NOT NULL,
    [program_id] INT,
    [class_code] NVARCHAR(50) NOT NULL,
    [grade] INT,
    [teacher] NVARCHAR(255),
    [is_active] BIT NOT NULL CONSTRAINT [classes_is_active_df] DEFAULT 1,
    [is_included] BIT NOT NULL CONSTRAINT [classes_is_included_df] DEFAULT 1,
    [room_number] NVARCHAR(50),
    CONSTRAINT [classes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[students] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cycle_id] INT NOT NULL,
    [school_id] INT NOT NULL,
    [student_number] NVARCHAR(50) NOT NULL,
    [aspen_student_id] NVARCHAR(50),
    [first_name] NVARCHAR(100) NOT NULL,
    [last_name] NVARCHAR(100) NOT NULL,
    [grade] INT,
    [is_active] BIT NOT NULL CONSTRAINT [students_is_active_df] DEFAULT 1,
    [last_modified_by] INT,
    [last_modified_at] DATETIME2,
    CONSTRAINT [students_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [students_cycle_id_student_number_key] UNIQUE NONCLUSTERED ([cycle_id],[student_number])
);

-- CreateTable
CREATE TABLE [dbo].[class_students] (
    [class_id] INT NOT NULL,
    [student_id] INT NOT NULL,
    CONSTRAINT [class_students_pkey] PRIMARY KEY CLUSTERED ([class_id],[student_id])
);

-- CreateTable
CREATE TABLE [dbo].[evaluator_assignments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cycle_id] INT NOT NULL,
    [class_id] INT NOT NULL,
    [evaluator_id] INT NOT NULL,
    [assigned_by] INT NOT NULL,
    [assigned_at] DATETIME2 NOT NULL CONSTRAINT [evaluator_assignments_assigned_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [evaluator_assignments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [evaluator_assignments_cycle_id_class_id_evaluator_id_key] UNIQUE NONCLUSTERED ([cycle_id],[class_id],[evaluator_id])
);

-- CreateTable
CREATE TABLE [dbo].[school_assessment_dates] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cycle_id] INT NOT NULL,
    [round_id] INT,
    [school_id] INT NOT NULL,
    [assessment_date] DATE NOT NULL,
    [created_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [school_assessment_dates_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [school_assessment_dates_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [school_assessment_dates_cycle_id_round_id_school_id_assessment_date_key] UNIQUE NONCLUSTERED ([cycle_id],[round_id],[school_id],[assessment_date])
);

-- CreateTable
CREATE TABLE [dbo].[assessments] (
    [id] INT NOT NULL IDENTITY(1,1),
    [cycle_id] INT NOT NULL,
    [round_id] INT,
    [student_id] INT NOT NULL,
    [evaluator_id] INT,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [assessments_status_df] DEFAULT 'NOT_STARTED',
    [needs_review] BIT NOT NULL CONSTRAINT [assessments_needs_review_df] DEFAULT 0,
    [started_at] DATETIME2,
    [completed_at] DATETIME2,
    [last_modified_at] DATETIME2 NOT NULL CONSTRAINT [assessments_last_modified_at_df] DEFAULT CURRENT_TIMESTAMP,
    [submitted_at] DATETIME2,
    CONSTRAINT [assessments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [assessments_cycle_id_student_id_key] UNIQUE NONCLUSTERED ([cycle_id],[student_id])
);

-- CreateTable
CREATE TABLE [dbo].[opi_levels] (
    [level] INT NOT NULL,
    [description] NVARCHAR(255) NOT NULL,
    CONSTRAINT [opi_levels_pkey] PRIMARY KEY CLUSTERED ([level])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_scores] (
    [assessment_id] INT NOT NULL,
    [opi_level_id] INT NOT NULL,
    [notes] NVARCHAR(max),
    [updated_by] INT NOT NULL,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [assessment_scores_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [assessment_scores_pkey] PRIMARY KEY CLUSTERED ([assessment_id])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_criteria] (
    [id] INT NOT NULL IDENTITY(1,1),
    [opi_level_id] INT NOT NULL,
    [description] NVARCHAR(255) NOT NULL,
    [is_active] BIT NOT NULL CONSTRAINT [assessment_criteria_is_active_df] DEFAULT 1,
    CONSTRAINT [assessment_criteria_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_criteria_results] (
    [assessment_id] INT NOT NULL,
    [criteria_id] INT NOT NULL,
    [met] BIT NOT NULL,
    CONSTRAINT [assessment_criteria_results_pkey] PRIMARY KEY CLUSTERED ([assessment_id],[criteria_id])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_notes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [assessment_id] INT NOT NULL,
    [note] NVARCHAR(max) NOT NULL,
    [created_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [assessment_notes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [assessment_notes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[class_notes] (
    [id] INT NOT NULL IDENTITY(1,1),
    [class_id] INT NOT NULL,
    [note] NVARCHAR(max) NOT NULL,
    [updated_by] INT NOT NULL,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [class_notes_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [class_notes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [class_notes_class_id_updated_by_key] UNIQUE NONCLUSTERED ([class_id],[updated_by])
);

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
    [uploaded_at] DATETIME2 NOT NULL CONSTRAINT [audio_recordings_uploaded_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audio_recordings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[assessment_audit_log] (
    [id] INT NOT NULL IDENTITY(1,1),
    [assessment_id] INT NOT NULL,
    [action] NVARCHAR(50) NOT NULL,
    [field_name] NVARCHAR(100),
    [old_value] NVARCHAR(255),
    [new_value] NVARCHAR(255),
    [changed_by] INT NOT NULL,
    [changed_at] DATETIME2 NOT NULL CONSTRAINT [assessment_audit_log_changed_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [assessment_audit_log_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ingestion_logs] (
    [id] INT NOT NULL IDENTITY(1,1),
    [entity_type] NVARCHAR(50) NOT NULL,
    [records_total] INT NOT NULL,
    [records_upserted] INT NOT NULL,
    [records_failed] INT NOT NULL,
    [errors] NVARCHAR(max),
    [idempotency_key] NVARCHAR(100),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ingestion_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ingestion_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_is_active_idx] ON [dbo].[users]([is_active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [assessment_cycles_is_active_idx] ON [dbo].[assessment_cycles]([is_active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [classes_cycle_id_school_id_idx] ON [dbo].[classes]([cycle_id], [school_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [classes_cycle_id_is_included_idx] ON [dbo].[classes]([cycle_id], [is_included]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [assessments_cycle_id_status_idx] ON [dbo].[assessments]([cycle_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [assessments_evaluator_id_status_idx] ON [dbo].[assessments]([evaluator_id], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [assessments_needs_review_idx] ON [dbo].[assessments]([needs_review]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audio_recordings_assessment_id_uploaded_at_idx] ON [dbo].[audio_recordings]([assessment_id], [uploaded_at]);

-- AddForeignKey
ALTER TABLE [dbo].[user_roles] ADD CONSTRAINT [user_roles_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[user_roles] ADD CONSTRAINT [user_roles_role_id_fkey] FOREIGN KEY ([role_id]) REFERENCES [dbo].[roles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_cycles] ADD CONSTRAINT [assessment_cycles_data_approved_by_fkey] FOREIGN KEY ([data_approved_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_rounds] ADD CONSTRAINT [assessment_rounds_cycle_id_fkey] FOREIGN KEY ([cycle_id]) REFERENCES [dbo].[assessment_cycles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[classes] ADD CONSTRAINT [classes_cycle_id_fkey] FOREIGN KEY ([cycle_id]) REFERENCES [dbo].[assessment_cycles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[classes] ADD CONSTRAINT [classes_school_id_fkey] FOREIGN KEY ([school_id]) REFERENCES [dbo].[schools]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[classes] ADD CONSTRAINT [classes_program_id_fkey] FOREIGN KEY ([program_id]) REFERENCES [dbo].[programs]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[students] ADD CONSTRAINT [students_cycle_id_fkey] FOREIGN KEY ([cycle_id]) REFERENCES [dbo].[assessment_cycles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[students] ADD CONSTRAINT [students_school_id_fkey] FOREIGN KEY ([school_id]) REFERENCES [dbo].[schools]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[students] ADD CONSTRAINT [students_last_modified_by_fkey] FOREIGN KEY ([last_modified_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[class_students] ADD CONSTRAINT [class_students_class_id_fkey] FOREIGN KEY ([class_id]) REFERENCES [dbo].[classes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[class_students] ADD CONSTRAINT [class_students_student_id_fkey] FOREIGN KEY ([student_id]) REFERENCES [dbo].[students]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[evaluator_assignments] ADD CONSTRAINT [evaluator_assignments_cycle_id_fkey] FOREIGN KEY ([cycle_id]) REFERENCES [dbo].[assessment_cycles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[evaluator_assignments] ADD CONSTRAINT [evaluator_assignments_class_id_fkey] FOREIGN KEY ([class_id]) REFERENCES [dbo].[classes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[evaluator_assignments] ADD CONSTRAINT [evaluator_assignments_evaluator_id_fkey] FOREIGN KEY ([evaluator_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[evaluator_assignments] ADD CONSTRAINT [evaluator_assignments_assigned_by_fkey] FOREIGN KEY ([assigned_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[school_assessment_dates] ADD CONSTRAINT [school_assessment_dates_cycle_id_fkey] FOREIGN KEY ([cycle_id]) REFERENCES [dbo].[assessment_cycles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[school_assessment_dates] ADD CONSTRAINT [school_assessment_dates_round_id_fkey] FOREIGN KEY ([round_id]) REFERENCES [dbo].[assessment_rounds]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[school_assessment_dates] ADD CONSTRAINT [school_assessment_dates_school_id_fkey] FOREIGN KEY ([school_id]) REFERENCES [dbo].[schools]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[school_assessment_dates] ADD CONSTRAINT [school_assessment_dates_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessments] ADD CONSTRAINT [assessments_cycle_id_fkey] FOREIGN KEY ([cycle_id]) REFERENCES [dbo].[assessment_cycles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[assessments] ADD CONSTRAINT [assessments_round_id_fkey] FOREIGN KEY ([round_id]) REFERENCES [dbo].[assessment_rounds]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessments] ADD CONSTRAINT [assessments_student_id_fkey] FOREIGN KEY ([student_id]) REFERENCES [dbo].[students]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessments] ADD CONSTRAINT [assessments_evaluator_id_fkey] FOREIGN KEY ([evaluator_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_scores] ADD CONSTRAINT [assessment_scores_assessment_id_fkey] FOREIGN KEY ([assessment_id]) REFERENCES [dbo].[assessments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_scores] ADD CONSTRAINT [assessment_scores_opi_level_id_fkey] FOREIGN KEY ([opi_level_id]) REFERENCES [dbo].[opi_levels]([level]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_scores] ADD CONSTRAINT [assessment_scores_updated_by_fkey] FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_criteria] ADD CONSTRAINT [assessment_criteria_opi_level_id_fkey] FOREIGN KEY ([opi_level_id]) REFERENCES [dbo].[opi_levels]([level]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_criteria_results] ADD CONSTRAINT [assessment_criteria_results_assessment_id_fkey] FOREIGN KEY ([assessment_id]) REFERENCES [dbo].[assessments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_criteria_results] ADD CONSTRAINT [assessment_criteria_results_criteria_id_fkey] FOREIGN KEY ([criteria_id]) REFERENCES [dbo].[assessment_criteria]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_notes] ADD CONSTRAINT [assessment_notes_assessment_id_fkey] FOREIGN KEY ([assessment_id]) REFERENCES [dbo].[assessments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_notes] ADD CONSTRAINT [assessment_notes_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[class_notes] ADD CONSTRAINT [class_notes_class_id_fkey] FOREIGN KEY ([class_id]) REFERENCES [dbo].[classes]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[class_notes] ADD CONSTRAINT [class_notes_updated_by_fkey] FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audio_recordings] ADD CONSTRAINT [audio_recordings_assessment_id_fkey] FOREIGN KEY ([assessment_id]) REFERENCES [dbo].[assessments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[audio_recordings] ADD CONSTRAINT [audio_recordings_uploaded_by_fkey] FOREIGN KEY ([uploaded_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_audit_log] ADD CONSTRAINT [assessment_audit_log_assessment_id_fkey] FOREIGN KEY ([assessment_id]) REFERENCES [dbo].[assessments]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[assessment_audit_log] ADD CONSTRAINT [assessment_audit_log_changed_by_fkey] FOREIGN KEY ([changed_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
