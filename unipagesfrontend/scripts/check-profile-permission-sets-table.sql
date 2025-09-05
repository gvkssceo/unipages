-- Check Profile Permission Sets Table Structure
-- This script verifies the profile_permission_sets table exists and has the correct structure

-- Check if the table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'profile_permission_sets' 
AND table_schema = 'public';

-- If table exists, show its structure
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'profile_permission_sets' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Table profile_permission_sets exists. Showing structure:';
        
        -- This will be executed in the next query
    ELSE
        RAISE NOTICE 'Table profile_permission_sets does not exist!';
    END IF;
END $$;

-- Show table structure if it exists
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'profile_permission_sets' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data
SELECT * FROM public.profile_permission_sets LIMIT 5;

-- Check foreign key constraints
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='profile_permission_sets';
