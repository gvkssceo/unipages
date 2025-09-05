-- Fix Profiles Table Schema
-- This script checks and fixes common schema issues with the profiles table

-- Check if the 'type' column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN type VARCHAR(50) DEFAULT 'user';
        RAISE NOTICE 'Added missing "type" column to profiles table';
    ELSE
        RAISE NOTICE 'Column "type" already exists in profiles table';
    END IF;
END $$;

-- Check if the 'updated_at' column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added missing "updated_at" column to profiles table';
    ELSE
        RAISE NOTICE 'Column "updated_at" already exists in profiles table';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show sample data to verify structure
SELECT * FROM public.profiles LIMIT 5;
