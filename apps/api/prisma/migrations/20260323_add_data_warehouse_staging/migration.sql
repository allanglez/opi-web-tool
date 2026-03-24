-- CreateTable
CREATE TABLE [dbo].[data_warehouse_batches] (
    [id] INT NOT NULL IDENTITY(1,1),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [data_warehouse_batches_status_df] DEFAULT 'PENDING',
    [record_count] INT NOT NULL,
    [target_year] INT NOT NULL,
    [received_at] DATETIME2 NOT NULL CONSTRAINT [data_warehouse_batches_received_at_df] DEFAULT CURRENT_TIMESTAMP,
    [seeded_at] DATETIME2,
    [error_message] NVARCHAR(max),
    CONSTRAINT [data_warehouse_batches_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[data_warehouse_staging_records] (
    [id] INT NOT NULL IDENTITY(1,1),
    [batch_id] INT NOT NULL,
    [opi_type] NVARCHAR(100) NOT NULL,
    [school_number] NVARCHAR(50) NOT NULL,
    [school_name] NVARCHAR(255) NOT NULL,
    [school_type] NVARCHAR(50),
    [school_year] INT NOT NULL,
    [student_number] NVARCHAR(50) NOT NULL,
    [pen] NVARCHAR(50),
    [student_last_name] NVARCHAR(100) NOT NULL,
    [student_first_name] NVARCHAR(100) NOT NULL,
    [student_middle_name] NVARCHAR(100),
    [grade] INT NOT NULL,
    [course] NVARCHAR(50) NOT NULL,
    [course_title] NVARCHAR(255) NOT NULL,
    [teacher_id] NVARCHAR(50) NOT NULL,
    [teacher_name] NVARCHAR(255) NOT NULL,
    [semester_term] NVARCHAR(10) NOT NULL,
    [program_code] NVARCHAR(50) NOT NULL,
    [program_description] NVARCHAR(255) NOT NULL,
    CONSTRAINT [data_warehouse_staging_records_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [data_warehouse_batches_status_idx] ON [dbo].[data_warehouse_batches]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [data_warehouse_staging_records_batch_id_idx] ON [dbo].[data_warehouse_staging_records]([batch_id]);

-- AddForeignKey
ALTER TABLE [dbo].[data_warehouse_staging_records] ADD CONSTRAINT [data_warehouse_staging_records_batch_id_fkey] FOREIGN KEY ([batch_id]) REFERENCES [dbo].[data_warehouse_batches]([id]) ON DELETE CASCADE ON UPDATE CASCADE;
