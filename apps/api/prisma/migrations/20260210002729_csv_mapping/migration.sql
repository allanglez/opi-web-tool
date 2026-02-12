/*
  Warnings:

  - You are about to drop the column `teacher` on the `classes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `programs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `year` to the `assessment_cycles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `programs` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
-- Add column with default value, then update, then remove default
ALTER TABLE [dbo].[assessment_cycles] ADD [year] INT NOT NULL DEFAULT 2026;

-- AlterTable
ALTER TABLE [dbo].[classes] DROP COLUMN [teacher];
ALTER TABLE [dbo].[classes] ADD [course_title] NVARCHAR(255),
[semester_term] NVARCHAR(10),
[teacher_id] INT;

-- AlterTable
-- Add code with default value from name (will use for new rows, existing rows get auto-filled)
ALTER TABLE [dbo].[programs] ADD [code] NVARCHAR(50) NOT NULL DEFAULT 'TEMP';
-- Add the optional column
ALTER TABLE [dbo].[programs] ADD [opi_type] NVARCHAR(100);

-- AlterTable
ALTER TABLE [dbo].[students] ADD [middle_name] NVARCHAR(100),
[pen] NVARCHAR(50);

-- CreateTable
CREATE TABLE [dbo].[teachers] (
    [id] INT NOT NULL IDENTITY(1,1),
    [teacher_id] NVARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    CONSTRAINT [teachers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [teachers_teacher_id_key] UNIQUE NONCLUSTERED ([teacher_id])
);

-- CreateIndex
ALTER TABLE [dbo].[programs] ADD CONSTRAINT [programs_code_key] UNIQUE NONCLUSTERED ([code]);

-- AddForeignKey
ALTER TABLE [dbo].[classes] ADD CONSTRAINT [classes_teacher_id_fkey] FOREIGN KEY ([teacher_id]) REFERENCES [dbo].[teachers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
