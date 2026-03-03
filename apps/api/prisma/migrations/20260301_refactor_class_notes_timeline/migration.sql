-- Drop the unique constraint on class_notes
DECLARE @ConstraintName nvarchar(200)
SELECT @ConstraintName = name
FROM sys.key_constraints
WHERE parent_object_id = OBJECT_ID('class_notes') 
  AND type = 'UQ'

IF @ConstraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE class_notes DROP CONSTRAINT [' + @ConstraintName + ']')
END

-- Rename column updated_by to created_by
EXEC sp_rename 'class_notes.updated_by', 'created_by', 'COLUMN';

-- Rename column updated_at to created_at
EXEC sp_rename 'class_notes.updated_at', 'created_at', 'COLUMN';

-- Create index on class_id for better query performance
CREATE INDEX IX_class_notes_class_id ON class_notes(class_id);
