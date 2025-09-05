'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import HeadingCard from '@/components/ui/HeadingCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SalesforceTableContainer } from '@/components/ui/SalesforceContainer';
import { ChevronLeftIcon } from '@/components/ui/icons';
import {
  UserCheck,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Users,
  ArrowLeft,
  ArrowRight,
  Search,
  Building,
  Save,
  X
} from 'lucide-react';

import { AlphabetFilter } from "@/components/ui/AlphabetFilter";
import { Pagination } from "@/components/ui/Pagination";
import { SortableTableHeader } from "@/components/ui/SortableTableHeader";
import { showToast } from '@/utils/toast';

function ProfilesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasInitializedRef = useRef(false);

  // Search and filter states
  const [profilesSearch, setProfilesSearch] = useState('');
  const [profilesFilter, setProfilesFilter] = useState('All');
  const [profilesViewMode, setProfilesViewMode] = useState('table');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sorting states
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);

  // Detail view states
  const [selectedProfileDetail, setSelectedProfileDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'permissionSets'>('info');
  const [editingProfileData, setEditingProfileData] = useState<any>({
    name: '',
    description: ''
  });
  const [creatingProfileData, setCreatingProfileData] = useState<any>({
    name: '',
    description: ''
  });

  // Permission sets states
  const [profilePermissionSets, setProfilePermissionSets] = useState<any[]>([]);
  const [loadingPermissionSets, setLoadingPermissionSets] = useState(false);

  // Permission sets editing states
  const [isEditingPermissionSets, setIsEditingPermissionSets] = useState(false);
  const [availablePermissionSets, setAvailablePermissionSets] = useState<any[]>([]);
  const [selectedPermissionSets, setSelectedPermissionSets] = useState<any[]>([]);
  const [loadingAvailablePermissionSets, setLoadingAvailablePermissionSets] = useState(false);

  // Modal states (removed - using navigation instead)
  const [refreshKey, setRefreshKey] = useState(0);

  // Debug: Track state changes
  useEffect(() => {
    console.log('🔄 [STATE] profiles state changed:', profiles.length, 'items');
    console.log('🔄 [STATE] profiles items:', profiles.map(p => ({ id: p.id, name: p.name })));
  }, [profiles]);

  useEffect(() => {
    console.log('🔄 [STATE] loading state changed:', loading);
  }, [loading]);

  useEffect(() => {
    console.log('🔄 [STATE] refreshing state changed:', refreshing);
  }, [refreshing]);

  useEffect(() => {
    console.log('🔄 [STATE] selectedProfile state changed:', selectedProfile);
  }, [selectedProfile]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Check if we should open create form
    const action = searchParams.get('action');
    if (action === 'create') {
      setIsCreating(true);
    }

    // Check if we're returning from a delete operation
    const deleted = searchParams.get('deleted');
    if (deleted === 'true') {
      console.log('🔄 [NAVIGATION] Returning from delete operation, forcing refresh');
      fetchData(true); // Force refresh with cache busting
      hasInitializedRef.current = true;
      // Clean up the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('deleted');
      window.history.replaceState({}, '', newUrl.toString());
    } else {
      // Check if we need to refresh due to profile not found
      const refresh = searchParams.get('refresh');
      if (refresh === 'true') {
        console.log('🔄 [NAVIGATION] Profile not found, forcing refresh');
        fetchData(true); // Force refresh with cache busting
        hasInitializedRef.current = true;
        // Clean up the URL parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('refresh');
        window.history.replaceState({}, '', newUrl.toString());
      } else if (!hasInitializedRef.current) {
        // Only fetch data on initial load if not already initialized
        console.log('🔄 [NAVIGATION] Initial load, fetching data');
        fetchData();
        hasInitializedRef.current = true;
      }
    }
  }, [status, router, searchParams]);

  // Reset sorting when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSortField('name');
    setSortDirection('asc');
  }, [profilesSearch, profilesFilter]);

  const fetchData = async (isRefresh = false) => {
    console.log('🔄 [FETCH_DATA] Starting fetchData with isRefresh:', isRefresh);
    console.log('🔄 [FETCH_DATA] Current profiles state before fetch:', profiles.length, 'items');
    
    if (isRefresh) {
      setRefreshing(true);
      console.log('🔄 [FETCH_DATA] Set refreshing to true');
    }

    try {
      // Add cache busting parameter for refresh requests
      const url = isRefresh 
        ? `/api/admin/profiles?t=${Date.now()}&_cb=${Math.random()}` 
        : '/api/admin/profiles';
        
      console.log('🔄 [FETCH_DATA] Fetching from URL:', url);
      console.log('🔄 [FETCH_DATA] Cache strategy:', isRefresh ? 'no-store' : 'default');
        
      const profilesResponse = await fetch(url, {
        cache: isRefresh ? 'no-store' : 'default',
        headers: isRefresh ? {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        } : {}
      });
      
      console.log('🔄 [FETCH_DATA] Response status:', profilesResponse.status);
      console.log('🔄 [FETCH_DATA] Response ok:', profilesResponse.ok);

      if (profilesResponse.ok) {
        const profilesData = await profilesResponse.json();
        console.log('🔄 [FETCH_DATA] Received data:', profilesData);
        console.log('🔄 [FETCH_DATA] Data length:', profilesData.length);
        console.log('🔄 [FETCH_DATA] Data items:', profilesData.map((p: any) => ({ id: p.id, name: p.name })));
        
        setProfiles(profilesData);
        console.log('✅ [FETCH_DATA] Profiles state updated with', profilesData.length, 'items');
        console.log('✅ [FETCH_DATA] New profiles data:', profilesData);
        console.log('✅ [FETCH_DATA] Previous profiles count:', profiles.length);
      } else {
        console.error('❌ [FETCH_DATA] Failed to fetch profiles:', profilesResponse.status);
        console.error('❌ [FETCH_DATA] Response status text:', profilesResponse.statusText);
        showToast.error('Failed to fetch profiles data');
      }

      setLastUpdated(new Date());
      console.log('🔄 [FETCH_DATA] Last updated timestamp set');
    } catch (error) {
      console.error('❌ [FETCH_DATA] Error fetching profiles:', error);
      console.error('❌ [FETCH_DATA] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      showToast.error('Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('🔄 [FETCH_DATA] Set loading and refreshing to false');
    }
  };

  const handleRefresh = () => {
    const loadingToast = showToast.loading('Refreshing data...');
    
    // Force refresh by clearing all states and refetching
    setSelectedProfile(null);
    setSelectedProfileDetail(null);
    setIsEditing(false);
    setIsCreating(false);
    
    // Force Next.js router refresh to clear any cached page data
    router.refresh();
    
    // Clear any cached data and force fresh fetch
    fetchData(true).finally(() => {
      showToast.dismiss(loadingToast);
      showToast.success('Data refreshed successfully');
    });
  };

  const handleBackToList = () => {
    setSelectedProfileDetail(null);
    setSelectedProfile(null);
    setIsEditing(false);
    setIsCreating(false);
    setActiveTab('info');
    setProfilePermissionSets([]);
    setIsEditingPermissionSets(false);
    setAvailablePermissionSets([]);
    setSelectedPermissionSets([]);
    setEditingProfileData({
      name: '',
      description: ''
    });
    setCreatingProfileData({
      name: '',
      description: ''
    });
  };

  const handleRecordClick = (record: any) => {
    setSelectedProfileDetail(record);
    setSelectedProfile(record);
    setActiveTab('info'); // Reset to Info tab
    setIsEditingPermissionSets(false); // Reset permission sets editing state
    setAvailablePermissionSets([]); // Clear available permission sets
    setSelectedPermissionSets([]); // Clear selected permission sets
    fetchProfilePermissionSets(record.id); // Fetch permission sets for the profile
  };

  const fetchProfilePermissionSets = async (profileId: string) => {
    if (!profileId) return;
    
    setLoadingPermissionSets(true);
    try {
      const response = await fetch(`/api/admin/profiles/${profileId}/permission-sets`);
      if (response.ok) {
        const data = await response.json();
        setProfilePermissionSets(data.permissionSets || []);
      } else {
        setProfilePermissionSets([]);
      }
    } catch (error) {
      setProfilePermissionSets([]);
    } finally {
      setLoadingPermissionSets(false);
    }
  };

  const fetchAvailablePermissionSets = async () => {
    setLoadingAvailablePermissionSets(true);
    try {
      const response = await fetch('/api/admin/permission-sets');
      if (response.ok) {
        const data = await response.json();
        setAvailablePermissionSets(data || []);
      } else {
        setAvailablePermissionSets([]);
      }
    } catch (error) {
      setAvailablePermissionSets([]);
    } finally {
      setLoadingAvailablePermissionSets(false);
    }
  };

  const moveToSelected = (permissionSet: any) => {
    setSelectedPermissionSets(prev => [...prev, permissionSet]);
    setAvailablePermissionSets(prev => prev.filter(ps => ps.id !== permissionSet.id));
  };

  const moveToAvailable = (permissionSet: any) => {
    setAvailablePermissionSets(prev => [...prev, permissionSet]);
    setSelectedPermissionSets(prev => prev.filter(ps => ps.id !== permissionSet.id));
  };

  const moveAllToSelected = () => {
    setSelectedPermissionSets(prev => [...prev, ...availablePermissionSets]);
    setAvailablePermissionSets([]);
  };

  const moveAllToAvailable = () => {
    setAvailablePermissionSets(prev => [...prev, ...selectedPermissionSets]);
    setSelectedPermissionSets([]);
  };

  const startEditingPermissionSets = async () => {
    setIsEditingPermissionSets(true);
    // Initialize selected permission sets with current profile permission sets
    setSelectedPermissionSets([...profilePermissionSets]);
    // Fetch all available permission sets
    await fetchAvailablePermissionSets();
    // Remove already selected ones from available
    setAvailablePermissionSets(prev => prev.filter(ps => 
      !profilePermissionSets.some(pps => pps.id === ps.id)
    ));
  };

  const savePermissionSets = async () => {
    if (!selectedProfile) return;

    try {
      // Get permission sets to add (new ones)
      const currentIds = profilePermissionSets.map(ps => ps.id);
      const newIds = selectedPermissionSets.map(ps => ps.id);
      const toAdd = newIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !newIds.includes(id));

      // Prepare permission set changes

      // Add new permission sets
      for (const permissionSetId of toAdd) {

        const response = await fetch(`/api/admin/profiles/${selectedProfile.id}/assign-permission-set`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permission_set_id: permissionSetId })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to add permission set: ${errorData.error}`);
        }
        
        const result = await response.json();

      }

      // Remove permission sets
      for (const permissionSetId of toRemove) {

        const response = await fetch(`/api/admin/profiles/${selectedProfile.id}/assign-permission-set?permission_set_id=${permissionSetId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
                  throw new Error(`Failed to remove permission set: ${errorData.error}`);
      }
      
      const result = await response.json();
      }

      // Refresh the profile permission sets
      await fetchProfilePermissionSets(selectedProfile.id);
      setIsEditingPermissionSets(false);
      showToast.success('Permission sets updated successfully');
    } catch (error) {
      showToast.error(`Failed to update permission sets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const cancelEditingPermissionSets = () => {
    setIsEditingPermissionSets(false);
    setSelectedPermissionSets([]);
    setAvailablePermissionSets([]);
  };

  const handlePermissionSetsTabClick = () => {
    if (selectedProfile && !isEditing && !isEditingPermissionSets) {
      fetchProfilePermissionSets(selectedProfile.id);
    }
  };

  const handleCreateProfile = () => {
    router.push('/admin/profiles?action=create');
  };

  // Create profile form submission function
  const handleCreateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('➕ [CREATE] handleCreateProfileSubmit called');
    console.log('➕ [CREATE] creatingProfileData:', creatingProfileData);
    
    if (!creatingProfileData.name || !creatingProfileData.description) {
      console.error('❌ [CREATE] Missing required fields');
      showToast.error('Please fill all required fields');
      return;
    }

    try {
      // Prepare profile data
      const profileData = {
        name: creatingProfileData.name,
        description: creatingProfileData.description
      };
      console.log('➕ [CREATE] Profile data to create:', profileData);

      // Create profile
      const response = await fetch('/api/admin/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      console.log('➕ [CREATE] Create response status:', response.status);
      console.log('➕ [CREATE] Create response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [CREATE] Profile created successfully, result:', result);
        showToast.success('Profile created successfully');
        
        console.log('✅ [CREATE] Calling router.refresh()');
        router.refresh();
        
        console.log('✅ [CREATE] Force refreshing data...');
        fetchData(true); // Force refresh the profile list
        console.log('✅ [CREATE] Data refresh initiated');
        
        console.log('✅ [CREATE] Calling handleBackToList()');
        handleBackToList();
      } else {
        const error = await response.json();
        console.error('❌ [CREATE] Failed to create profile:', error);
        showToast.error(`Failed to create profile: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [CREATE] Error creating profile:', error);
      console.error('❌ [CREATE] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      showToast.error('Failed to create profile');
    }
  };

  // Updated Edit button handler
  const handleEdit = () => {
    if (activeTab === 'info') {
      setIsEditing(true);
      setEditingProfileData({
        name: selectedProfile.name || '',
        description: selectedProfile.description || ''
      });
    } else if (activeTab === 'permissionSets') {
      startEditingPermissionSets();
    }
  };

  // Edit profile form submission function for inline editing
  const handleEditProfileSubmit = async () => {
    console.log('✏️ [EDIT] handleEditProfileSubmit called');
    console.log('✏️ [EDIT] selectedProfile:', selectedProfile);
    console.log('✏️ [EDIT] editingProfileData:', editingProfileData);
    
    if (!selectedProfile) {
      console.error('❌ [EDIT] No profile selected for editing');
      showToast.error('No profile selected for editing');
      return;
    }

    try {
      // Prepare profile data for update
      const profileData = {
        name: editingProfileData.name,
        description: editingProfileData.description
      };
      console.log('✏️ [EDIT] Profile data to update:', profileData);

      const updateUrl = `/api/admin/profiles/${selectedProfile.id}`;
      console.log('✏️ [EDIT] Update URL:', updateUrl);

      // Update profile
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      console.log('✏️ [EDIT] Update response status:', response.status);
      console.log('✏️ [EDIT] Update response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [EDIT] Profile updated successfully, result:', result);
        showToast.success('Profile updated successfully');
        setIsEditing(false); // Return to display mode
        console.log('✅ [EDIT] Set isEditing to false');
        
        console.log('✅ [EDIT] Calling router.refresh()');
        router.refresh();
        
        console.log('✅ [EDIT] Force refreshing data...');
        fetchData(true); // Force refresh the profile list
        console.log('✅ [EDIT] Data refresh initiated');
      } else {
        const error = await response.json();
        console.error('❌ [EDIT] Failed to update profile:', error);
        showToast.error(`Failed to update profile: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [EDIT] Error updating profile:', error);
      console.error('❌ [EDIT] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      showToast.error('Failed to update profile');
    }
  };

  const handleDeleteProfile = async () => {
    console.log('🗑️ [DELETE] handleDeleteProfile called');
    console.log('🗑️ [DELETE] selectedProfile:', selectedProfile);
    console.log('🗑️ [DELETE] selectedProfileDetail:', selectedProfileDetail);
    console.log('🗑️ [DELETE] Current profiles state before deletion:', profiles.length, 'items');
    console.log('🗑️ [DELETE] Current profiles items:', profiles.map(p => ({ id: p.id, name: p.name })));
    
    if (!selectedProfile) {
      console.error('❌ [DELETE] No profile selected! Cannot delete.');
      showToast.error('Please select a profile first');
      return;
    }
    
    // Show loading toast
    const loadingToast = showToast.loading('Deleting profile...');
    console.log('🗑️ [DELETE] Loading toast shown');
    
    // Store the profile to delete for optimistic UI update
    const profileToDelete = selectedProfile;
    console.log('🗑️ [DELETE] Stored profile to delete:', profileToDelete);
    
    try {
      console.log('🗑️ [DELETE] Starting deletion process for profile:', profileToDelete.name);
      console.log('🗑️ [DELETE] Profile ID to delete:', profileToDelete.id);
      
      // Optimistically update the UI immediately
      console.log('🗑️ [DELETE] Applying optimistic UI update...');
      const beforeOptimisticUpdate = profiles.length;
      setProfiles(prev => {
        const filtered = prev.filter(p => p.id !== profileToDelete.id);
        console.log('🗑️ [DELETE] Optimistic update - before:', prev.length, 'after:', filtered.length);
        console.log('🗑️ [DELETE] Optimistic update - filtered items:', filtered.map(p => ({ id: p.id, name: p.name })));
        return filtered;
      });
      setSelectedProfile(null);
      setSelectedProfileDetail(null);
      console.log('🗑️ [DELETE] Optimistic UI update completed');
      
      // Try to remove assignments first, but continue if endpoints don't exist
      let assignmentsRemoved = 0;
      
      try {
        // Step 1: Try to remove all user assignments for this profile
        console.log('🔧 [DELETE] Step 1: Attempting to remove user assignments...');
        const removeUserAssignmentsUrl = `/api/admin/profiles/${profileToDelete.id}/users`;
        console.log('🔧 [DELETE] Remove user assignments URL:', removeUserAssignmentsUrl);
        
        const removeUserAssignmentsResponse = await fetch(removeUserAssignmentsUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('🔧 [DELETE] Remove user assignments response status:', removeUserAssignmentsResponse.status);
        console.log('🔧 [DELETE] Remove user assignments response ok:', removeUserAssignmentsResponse.ok);

        if (removeUserAssignmentsResponse.ok) {
          const result = await removeUserAssignmentsResponse.json();
          console.log('✅ [DELETE] User assignments removed successfully, result:', result);
          if (result.removedUsers) {
            assignmentsRemoved += result.removedUsers;
            console.log('✅ [DELETE] Removed users count:', result.removedUsers);
          }
        } else if (removeUserAssignmentsResponse.status === 404) {
          console.log('ℹ️ [DELETE] User assignment removal endpoint not available, skipping...');
          console.log('ℹ️ [DELETE] Note: Backend cascade deletion not implemented yet');
        } else {
          console.warn('⚠️ [DELETE] Warning: Failed to remove user assignments');
        }
      } catch (error) {
        console.log('ℹ️ User assignment removal failed, continuing with deletion...');
      }

      try {
        // Step 2: Try to remove all permission set assignments for this profile
        console.log('🔧 [DELETE] Step 2: Attempting to remove permission set assignments...');
        const removePermissionSetAssignmentsUrl = `/api/admin/profiles/${profileToDelete.id}/permission-sets`;
        console.log('🔧 [DELETE] Remove permission set assignments URL:', removePermissionSetAssignmentsUrl);
        
        const removePermissionSetAssignmentsResponse = await fetch(removePermissionSetAssignmentsUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('🔧 [DELETE] Remove permission set assignments response status:', removePermissionSetAssignmentsResponse.status);
        console.log('🔧 [DELETE] Remove permission set assignments response ok:', removePermissionSetAssignmentsResponse.ok);

        if (removePermissionSetAssignmentsResponse.ok) {
          const result = await removePermissionSetAssignmentsResponse.json();
          console.log('✅ [DELETE] Permission set assignments removed successfully, result:', result);
          if (result.removedPermissionSets) {
            assignmentsRemoved += result.removedPermissionSets;
            console.log('✅ [DELETE] Removed permission sets count:', result.removedPermissionSets);
          }
        } else if (removePermissionSetAssignmentsResponse.status === 404) {
          console.log('ℹ️ [DELETE] Permission set assignment removal endpoint not available, skipping...');
        } else {
          console.warn('⚠️ [DELETE] Warning: Failed to remove permission set assignments');
        }
      } catch (error) {
        console.log('ℹ️ Permission set assignment removal failed, continuing with deletion...');
      }

      // Step 3: Delete the profile itself
      console.log('🗑️ [DELETE] Step 3: Deleting profile...');
      const deleteUrl = `/api/admin/profiles/${profileToDelete.id}`;
      console.log('🗑️ [DELETE] Delete URL:', deleteUrl);
      
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🗑️ [DELETE] Delete response status:', deleteResponse.status);
      console.log('🗑️ [DELETE] Delete response ok:', deleteResponse.ok);

      if (deleteResponse.ok) {
        const result = await deleteResponse.json();
        console.log('✅ [DELETE] Profile deleted successfully, result:', result);
        console.log('✅ [DELETE] Showing success toast...');
        
        // Show success message with details about removed assignments
        let successMessage = 'Profile deleted successfully';
        if (assignmentsRemoved > 0) {
          successMessage += `. Removed ${assignmentsRemoved} assignment(s)`;
        }
        
        showToast.success(successMessage);
        console.log('✅ [DELETE] Success toast shown with message:', successMessage);
        
        console.log('✅ [DELETE] Clearing all related states...');
        
        // Clear all related states
        setProfilePermissionSets([]);
        setAvailablePermissionSets([]);
        setSelectedPermissionSets([]);
        setIsEditing(false);
        setIsCreating(false);
        setIsEditingPermissionSets(false);
        console.log('✅ [DELETE] All related states cleared');
        
        // Force refresh the data with cache busting
        console.log('✅ [DELETE] Force refreshing data with cache busting...');
        await fetchData(true);
        console.log('✅ [DELETE] Data refresh completed');
        
        // Also clear server cache to ensure fresh data
        console.log('✅ [DELETE] Clearing server cache...');
        try {
          const cacheClearResponse = await fetch('/api/admin/clear-cache', { method: 'POST' });
          console.log('✅ [DELETE] Cache clear response status:', cacheClearResponse.status);
          if (cacheClearResponse.ok) {
            const cacheClearResult = await cacheClearResponse.json();
            console.log('✅ [DELETE] Cache clear result:', cacheClearResult);
          }
        } catch (error) {
          console.log('⚠️ [DELETE] Cache clear failed, but continuing...', error);
        }
        
        console.log('✅ [DELETE] Delete operation completed successfully');
      } else {
        const errorText = await deleteResponse.text();
        console.error('❌ [DELETE] Failed to delete profile:', errorText);
        console.error('❌ [DELETE] Error response status:', deleteResponse.status);
        
        // Revert the optimistic update by refetching data
        console.log('❌ [DELETE] Reverting optimistic update by refetching data...');
        await fetchData(true);
        console.log('❌ [DELETE] Data refetch completed for error recovery');
        
        let errorMessage = 'Failed to delete profile';
        
        // Try to parse as JSON if possible
        try {
          const error = JSON.parse(errorText);
          if (error.error) {
            errorMessage = error.error;
            if (error.details) {
              errorMessage += `: ${error.details}`;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
        } catch (parseError) {
          // If it's not JSON, use the raw text
          if (errorText.includes('Cannot delete profile')) {
            errorMessage = errorText;
          }
        }
        
        console.log('❌ [DELETE] Showing error toast with message:', errorMessage);
        
        // Special handling for the constraint error
        if (errorMessage.includes('Cannot delete profile') && errorMessage.includes('user(s) are assigned')) {
          showToast.error(
            'Cannot delete profile: Users are still assigned. Please remove user assignments first or contact an administrator.'
          );
        } else {
          showToast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('❌ [DELETE] Error deleting profile:', error);
      console.error('❌ [DELETE] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Revert the optimistic update by refetching data
      console.log('❌ [DELETE] Reverting optimistic update due to error...');
      await fetchData(true);
      console.log('❌ [DELETE] Data refetch completed for error recovery');
      
      showToast.error('Failed to delete profile');
    } finally {
      // Dismiss loading toast
      console.log('🗑️ [DELETE] Dismissing loading toast');
      showToast.dismiss(loadingToast);
      console.log('🗑️ [DELETE] Delete operation finished');
    }
  };

  const handleViewUsers = () => {
    // Navigate to users page with profile filter
    router.push('/admin/users?profile=' + encodeURIComponent(selectedProfile.name));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSelectAllProfiles = () => {
    if (selectedProfiles.length === paginatedProfiles.length) {
      setSelectedProfiles([]);
    } else {
      setSelectedProfiles(paginatedProfiles.map(profile => profile.id));
    }
  };

  const handleProfileSelection = (profileId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedProfiles(prev => [...prev, profileId]);
    } else {
      setSelectedProfiles(prev => prev.filter(id => id !== profileId));
    }
  };

  const filterByAlphabet = (data: any[], filter: string, nameField: string) => {
    if (filter === 'All') return data;
    return data.filter(item => {
      const name = item[nameField] || '';
      return name.toLowerCase().startsWith(filter.toLowerCase());
    });
  };

  const sortData = (data: any[], field: string, direction: 'asc' | 'desc') => {
    return [...data].sort((a, b) => {
      const aValue = a[field] || '';
      const bValue = b[field] || '';
      
      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return direction === 'asc' ? comparison : -comparison;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return direction === 'asc' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
      }
      
      // Fallback to string comparison
      const comparison = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
      return direction === 'asc' ? comparison : -comparison;
    });
  };

  const getPaginatedData = (data: any[], currentPage: number, perPage: number) => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: any[], perPage: number) => {
    return Math.ceil(data.length / perPage);
  };

  // Helper function to determine if we're in any editing mode
  const isInEditingMode = () => {
    return isEditing || isEditingPermissionSets;
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const filteredProfiles = filterByAlphabet(profiles, profilesFilter, 'name');
  const searchedProfiles = filteredProfiles.filter(profile =>
    profile.name?.toLowerCase().includes(profilesSearch.toLowerCase()) ||
    profile.description?.toLowerCase().includes(profilesSearch.toLowerCase())
  );
  const sortedProfiles = sortData(searchedProfiles, sortField, sortDirection);
  const paginatedProfiles = getPaginatedData(sortedProfiles, currentPage, itemsPerPage);
  const totalPages = getTotalPages(sortedProfiles, itemsPerPage);

  // Debug: Log render data
  console.log('🎨 [RENDER] Render data:');
  console.log('🎨 [RENDER] - profiles:', profiles.length, 'items');
  console.log('🎨 [RENDER] - filteredProfiles:', filteredProfiles.length, 'items');
  console.log('🎨 [RENDER] - searchedProfiles:', searchedProfiles.length, 'items');
  console.log('🎨 [RENDER] - paginatedProfiles:', paginatedProfiles.length, 'items');
  console.log('🎨 [RENDER] - totalPages:', totalPages);
  console.log('🎨 [RENDER] - currentPage:', currentPage);
  console.log('🎨 [RENDER] - itemsPerPage:', itemsPerPage);
  console.log('🎨 [RENDER] - paginatedProfiles items:', paginatedProfiles.map(p => ({ id: p.id, name: p.name })));

  const banner = (
    <HeadingCard
      title="Profile Management"
      subtitle="Manage user profiles and access levels"
      Icon={UserCheck}
      rightSlot={
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}</span>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 px-3"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      }
    />
  );

  // Show create profile form when isCreating is true
  if (isCreating) {
    return (
      <DashboardLayout banner={banner}>
        <div className="space-y-4 sm:space-y-6 pb-24">
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="flex items-center gap-2"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back to Profiles
            </Button>
          </div>

          {/* Create Profile Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create New Profile</h2>
                <p className="text-gray-600">Add a new profile to the system</p>
              </div>
            </div>

            {/* Custom Create Profile Form */}
            <form onSubmit={handleCreateProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Name */}
                <div>
                  <label htmlFor="profileName" className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="profileName"
                    value={creatingProfileData.name || ''}
                    onChange={(e) => setCreatingProfileData((prev: any) => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter profile name"
                  />
                </div>

                {/* Profile Description */}
                <div>
                  <label htmlFor="profileDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="profileDescription"
                    value={creatingProfileData.description || ''}
                    onChange={(e) => setCreatingProfileData((prev: any) => ({ ...prev, description: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter profile description"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToList}
                  className="px-6 py-2"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!creatingProfileData.name || !creatingProfileData.description}
                  className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (selectedProfileDetail) {
    return (
      <DashboardLayout banner={banner}>
        <div className="space-y-4 sm:space-y-6 pb-24">
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="flex items-center gap-2"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back to Profiles
            </Button>
          </div>

          {/* Profile Detail View */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedProfile.name}</h2>
                <p className="text-gray-600">{selectedProfile.description}</p>
              </div>
              <div className="flex gap-2">

                
                {/* Single Edit Button with conditional behavior */}
                {!isInEditingMode() ? (
                  <Button 
                    onClick={handleEdit}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    {/* Save Button */}
                    <Button
                      onClick={async () => {
                        if (isEditing) {
                          await handleEditProfileSubmit();
                        } else if (isEditingPermissionSets) {
                          await savePermissionSets();
                        }
                      }}
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    {/* Cancel Button */}
                    <Button
                      onClick={() => {
                        if (isEditing) {
                          setIsEditing(false);
                        } else if (isEditingPermissionSets) {
                          cancelEditingPermissionSets();
                        }
                      }}
                      variant="outline"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
                
                {!isInEditingMode() && (
                  <Button variant="destructive" onClick={handleDeleteProfile}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>



            {/* Tab Content */}
            {activeTab === 'info' && (
              <>
                {/* Profile Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                    <div className="space-y-4">
                      {/* Profile Name */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">
                          Profile Name {isEditing && <span className="text-red-600">*</span>}
                        </label>
                        {!isEditing ? (
                          <p className="text-gray-900 font-medium">{selectedProfile.name || 'Not provided'}</p>
                        ) : (
                          <input
                            type="text"
                            value={editingProfileData.name || ''}
                            onChange={(e) => setEditingProfileData((prev: any) => ({ ...prev, name: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter profile name"
                          />
                        )}
                      </div>

                      {/* Profile Description */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">
                          Description {isEditing && <span className="text-red-600">*</span>}
                        </label>
                        {!isEditing ? (
                          <p className="text-gray-900">{selectedProfile.description || 'No description provided'}</p>
                        ) : (
                          <textarea
                            value={editingProfileData.description || ''}
                            onChange={(e) => setEditingProfileData((prev: any) => ({ ...prev, description: e.target.value }))}
                            required
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter profile description"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                    <div className="space-y-4">
                      {/* Profile ID */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Profile ID</label>
                        <p className="text-gray-900 font-mono text-sm">{selectedProfile.id || 'Not available'}</p>
                      </div>

                      {/* User Count */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Users Assigned</label>
                        <p className="text-gray-900">{selectedProfile.userCount || 0} users</p>
                      </div>

                      {/* Permission Sets Count */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Permission Sets Assigned</label>
                        <p className="text-gray-900">{profilePermissionSets.length} permission sets</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'permissionSets' && (
              <div>
                

                {isEditingPermissionSets ? (
                  <>
                    {/* Two-panel editing interface */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Available Permission Sets Panel */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Permission Sets</h4>
                        {loadingAvailablePermissionSets ? (
                          <div className="flex justify-center py-8">
                            <LoadingSpinner />
                          </div>
                        ) : availablePermissionSets.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {availablePermissionSets.map((permissionSet) => (
                              <div
                                key={permissionSet.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer"
                                onClick={() => moveToSelected(permissionSet)}
                              >
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{permissionSet.name}</h5>
                                  <p className="text-sm text-gray-600">{permissionSet.description}</p>
                                </div>
                                <div className="text-blue-600">
                                  <ArrowRight className="h-4 w-4" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            No available permission sets
                          </div>
                        )}
                        {availablePermissionSets.length > 0 && (
                          <Button
                            onClick={moveAllToSelected}
                            variant="outline"
                            className="w-full mt-3"
                            size="sm"
                          >
                            Move All →
                          </Button>
                        )}
                      </div>

                      {/* Center Controls */}
                      <div className="flex flex-col justify-center items-center gap-4">
                        <Button
                          onClick={moveAllToSelected}
                          variant="outline"
                          size="sm"
                          disabled={availablePermissionSets.length === 0}
                          className="px-3"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={moveAllToAvailable}
                          variant="outline"
                          size="sm"
                          disabled={selectedPermissionSets.length === 0}
                          className="px-3"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Selected Permission Sets Panel */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Selected Permission Sets</h4>
                        {selectedPermissionSets.length > 0 ? (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {selectedPermissionSets.map((permissionSet) => (
                              <div
                                key={permissionSet.id}
                                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 cursor-pointer"
                                onClick={() => moveToAvailable(permissionSet)}
                              >
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900">{permissionSet.name}</h5>
                                  <p className="text-sm text-gray-600">{permissionSet.description}</p>
                                </div>
                                <div className="text-blue-600">
                                  <ArrowLeft className="h-4 w-4" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            No permission sets selected
                          </div>
                        )}
                        {selectedPermissionSets.length > 0 && (
                          <Button
                            onClick={moveAllToAvailable}
                            variant="outline"
                            className="w-full mt-3"
                            size="sm"
                          >
                            ← Move All
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Normal view mode */}
                    {loadingPermissionSets ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : profilePermissionSets.length > 0 ? (
                      <div className="space-y-3">
                        {profilePermissionSets.map((permissionSet) => (
                          <div
                            key={permissionSet.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div>
                              <h4 className="font-medium text-gray-900">{permissionSet.name}</h4>
                              <p className="text-sm text-gray-600">{permissionSet.description}</p>
                            </div>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Assigned
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <Building className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Permission Sets Assigned</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          This profile doesn't have any permission sets assigned yet.
                        </p>
                        <div className="mt-4">
                          <p className="text-sm text-gray-400">
                            Use the Edit button above to assign permission sets
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout banner={banner}>
      <div className="space-y-4 sm:space-y-6 pb-24">


        {/* Profiles Table/Grid */}
        <SalesforceTableContainer key={refreshKey}>
          {/* Search and Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search profiles..."
                      value={profilesSearch}
                      onChange={(e) => setProfilesSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* View Mode Selector */}
                <select
                  value={profilesViewMode}
                  onChange={(e) => setProfilesViewMode(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="table">Table View</option>
                  <option value="card">Card View</option>
                </select>
              </div>
              
              {/* Create Profile Button and Alphabet Filter */}
              <div className="flex items-center justify-between">
                <Button onClick={handleCreateProfile}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </Button>
                
                <AlphabetFilter
                  selectedFilter={profilesFilter}
                  onFilterChange={(filter) => setProfilesFilter(filter)}
                />
              </div>
            </div>
          </div>
          {profilesViewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableTableHeader
                      field="name"
                      label="Profile"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={(field) => {
                        if (sortField === field) {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField(field);
                          setSortDirection('asc');
                        }
                      }}
                    />
                    <SortableTableHeader
                      field="description"
                      label="Description"
                      currentSortField={sortField}
                      currentSortDirection={sortDirection}
                      onSort={(field) => {
                        if (sortField === field) {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField(field);
                          setSortDirection('asc');
                        }
                      }}
                    />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProfiles.map((profile) => (
                    <tr
                      key={profile.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <UserCheck className="h-5 w-5 text-purple-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div 
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/admin/profiles/${profile.id}`;
                              }}
                            >
                              {profile.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {profile.description || 'No description'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {paginatedProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <UserCheck className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/admin/profiles/${profile.id}`;
                        }}
                      >
                        {profile.name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-2">
                      {profile.description || 'No description provided'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={searchedProfiles.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </SalesforceTableContainer>
      </div>

      {/* Modal removed - using navigation-based approach */}

    </DashboardLayout>
  );
}

export default function ProfilesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfilesContent />
    </Suspense>
  );
}