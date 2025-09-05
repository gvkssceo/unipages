-- Performance Optimization Phase 1: Database Indexes
-- This script adds performance indexes to improve query speed
-- SAFE: These indexes only improve performance, no data changes

-- 1. User Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_profile_id ON user_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_composite ON user_profiles(user_id, profile_id);

-- 2. User Roles table indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_composite ON user_roles(user_id, role_id);

-- 3. Profile Permission Sets table indexes
CREATE INDEX IF NOT EXISTS idx_profile_permission_sets_profile_id ON profile_permission_sets(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_permission_sets_permission_set_id ON profile_permission_sets(permission_set_id);

-- 4. User Permission Sets table indexes
CREATE INDEX IF NOT EXISTS idx_user_permission_sets_user_id ON user_permission_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_sets_permission_set_id ON user_permission_sets(permission_set_id);

-- 5. Update table statistics for optimal query planning
ANALYZE user_profiles;
ANALYZE user_roles;
ANALYZE profile_permission_sets;
ANALYZE user_permission_sets;
ANALYZE profiles;
ANALYZE permission_sets;
ANALYZE roles;
