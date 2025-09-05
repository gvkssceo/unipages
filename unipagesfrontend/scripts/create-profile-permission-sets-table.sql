-- Create Profile Permission Sets Table
-- This script creates the profile_permission_sets table if it doesn't exist

-- Check if the table exists and create it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'profile_permission_sets' 
        AND table_schema = 'public'
    ) THEN
        -- Create the table
        CREATE TABLE public.profile_permission_sets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_id UUID NOT NULL,
            permission_set_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            -- Add foreign key constraints
            CONSTRAINT fk_profile_permission_sets_profile 
                FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
            CONSTRAINT fk_profile_permission_sets_permission_set 
                FOREIGN KEY (permission_set_id) REFERENCES public.permission_sets(id) ON DELETE CASCADE,
            
            -- Ensure unique combinations
            CONSTRAINT unique_profile_permission_set 
                UNIQUE (profile_id, permission_set_id)
        );
        
        -- Create indexes for better performance
        CREATE INDEX idx_profile_permission_sets_profile_id ON public.profile_permission_sets(profile_id);
        CREATE INDEX idx_profile_permission_sets_permission_set_id ON public.profile_permission_sets(permission_set_id);
        
        RAISE NOTICE 'Table profile_permission_sets created successfully with indexes and constraints';
    ELSE
        RAISE NOTICE 'Table profile_permission_sets already exists';
    END IF;
END $$;

-- Verify the table was created
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'profile_permission_sets' 
AND table_schema = 'public';

-- Show the table structure
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
