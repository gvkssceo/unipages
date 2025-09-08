'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import HeadingCard from '@/components/ui/HeadingCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { SalesforceTableContainer } from '@/components/ui/SalesforceContainer';
import { ChevronLeftIcon } from '@/components/ui/icons';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  ArrowLeft,
  ArrowRight,
  Search,
  Filter,
  Settings
} from 'lucide-react';

import PasswordResetModal from "../../../components/PasswordResetModal";
import RoleUsersModal from "../../../components/RoleUsersModal";
import UserModal from "../../../components/UserModal";
import { AlphabetFilter } from "@/components/ui/AlphabetFilter";
import { Pagination } from "@/components/ui/Pagination";
import { SortableTableHeader } from "@/components/ui/SortableTableHeader";
import { showToast } from '@/utils/toast';


function UsersContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [permissionSets, setPermissionSets] = useState<any[]>([]);

  // Request management
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  // Search and filter states
  const [usersSearch, setUsersSearch] = useState('');
  const [usersFilter, setUsersFilter] = useState('All');
  const [usersViewMode, setUsersViewMode] = useState('table');
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Sorting states
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [roleUsersLoading, setRoleUsersLoading] = useState(false);
  const [userRolePermissions, setUserRolePermissions] = useState<any[]>([]);
  const [userRolePermissionsLoading, setUserRolePermissionsLoading] = useState(false);
  const [profilePermissionsLoading, setProfilePermissionsLoading] = useState(false);

  // Detail view states
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUserData, setEditingUserData] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    role: '',
    profile: '',
    password: '',
    confirmPassword: '',
    status: 'active',
    countryCode: '+91',
    permissionSets: []
  });
  const [creatingUserData, setCreatingUserData] = useState<any>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    role: '',
    profile: '',
    password: '',
    confirmPassword: '',
    status: 'active',
    countryCode: '+91'
  });
  const [activeTab, setActiveTab] = useState<'userInfo' | 'roleProfile'>('userInfo');

  // Modal states
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showRoleUsersModal, setShowRoleUsersModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);


  // Password validation states
  const [usernameAvailability, setUsernameAvailability] = useState<'checking' | 'available' | 'unavailable' | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [emailAvailability, setEmailAvailability] = useState<'checking' | 'available' | 'unavailable' | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    hasMinLength: false,
    hasMaxLength: false
  });
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Check if we should open create modal
    const action = searchParams.get('action');
    if (action === 'create') {
      setIsCreating(true);
    }

    fetchData();

    // Cleanup function to cancel any pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [status, router, searchParams]);

  // Reset sorting when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSortField('name');
    setSortDirection('asc');
  }, [usersSearch, usersFilter]);

  const fetchData = async (isRefresh = false) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Generate unique request ID
    const currentRequestId = ++requestIdRef.current;

    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      // Add timeout to prevent hanging requests
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 15000); // 15 second timeout

      const [usersResponse, rolesResponse, profilesResponse, permissionSetsResponse] = await Promise.allSettled([
        fetch('/api/admin/users', { 
          signal: abortController.signal,
          cache: isRefresh ? 'no-store' : 'default',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch('/api/admin/roles', { 
          signal: abortController.signal,
          cache: isRefresh ? 'no-store' : 'default',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch('/api/admin/profiles', { 
          signal: abortController.signal,
          cache: isRefresh ? 'no-store' : 'default',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch('/api/admin/permission-sets', { 
          signal: abortController.signal,
          cache: isRefresh ? 'no-store' : 'default',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
      ]);

      clearTimeout(timeoutId);

      // Check if this request is still the latest one
      if (currentRequestId !== requestIdRef.current) {
        return; // Ignore stale request
      }

      // Process users response
      if (usersResponse.status === 'fulfilled' && usersResponse.value.ok) {
        try {
          const usersData = await usersResponse.value.json();
          setUsers(usersData);
        } catch (error) {
          if ((error as any)?.name !== 'AbortError') {
            console.error('Error parsing users data:', error);
          }
        }
      } else if (usersResponse.status === 'rejected') {
        if ((usersResponse as PromiseRejectedResult).reason?.name !== 'AbortError') {
          console.error('Users request failed:', usersResponse.reason);
        }
      }

      // Process roles response
      if (rolesResponse.status === 'fulfilled' && rolesResponse.value.ok) {
        try {
          const rolesData = await rolesResponse.value.json();
          setRoles(rolesData);
        } catch (error) {
          if ((error as any)?.name !== 'AbortError') {
            console.error('Error parsing roles data:', error);
          }
        }
      } else if (rolesResponse.status === 'rejected') {
        if ((rolesResponse as PromiseRejectedResult).reason?.name !== 'AbortError') {
          console.error('Roles request failed:', rolesResponse.reason);
        }
      }

      // Process profiles response
      if (profilesResponse.status === 'fulfilled' && profilesResponse.value.ok) {
        try {
          const profilesData = await profilesResponse.value.json();
          setProfiles(profilesData);
        } catch (error) {
          if ((error as any)?.name !== 'AbortError') {
            console.error('Error parsing profiles data:', error);
          }
        }
      } else if (profilesResponse.status === 'rejected') {
        if ((profilesResponse as PromiseRejectedResult).reason?.name !== 'AbortError') {
          console.error('Profiles request failed:', profilesResponse.reason);
        }
      }

      // Process permission sets response
      if (permissionSetsResponse.status === 'fulfilled' && permissionSetsResponse.value.ok) {
        try {
          const permissionSetsData = await permissionSetsResponse.value.json();
          setPermissionSets(permissionSetsData);
        } catch (error) {
          if ((error as any)?.name !== 'AbortError') {
            console.error('Error parsing permission sets data:', error);
          }
        }
      } else if (permissionSetsResponse.status === 'rejected') {
        if ((permissionSetsResponse as PromiseRejectedResult).reason?.name !== 'AbortError') {
          console.error('Permission sets request failed:', permissionSetsResponse.reason);
        }
      }

      setLastUpdated(new Date());
      
      // Reset retry count on successful request
      retryCountRef.current = 0;
    } catch (error) {
      // Don't show error if request was aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      // Only show error if this is the latest request
      if (currentRequestId === requestIdRef.current) {
        console.error('Fetch data error:', error);
        // Don't show toast error for aborted requests
        if (!(error instanceof Error && error.name === 'AbortError')) {
          // Retry logic for failed requests
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            console.log(`Retrying request (${retryCountRef.current}/${maxRetries})...`);
            setTimeout(() => {
              if (currentRequestId === requestIdRef.current) {
                fetchData(isRefresh);
              }
            }, 1000 * retryCountRef.current); // Exponential backoff
          } else {
            retryCountRef.current = 0;
            showToast.error('Failed to fetch data after multiple attempts. Please refresh the page.');
          }
        }
      }
    } finally {
      // Only update loading state if this is the latest request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleRefresh = async () => {
    const loadingToast = showToast.loading('Refreshing data...');
    
    try {
      // Force refresh by clearing all states and refetching
      setSelectedUser(null);
      setSelectedUserDetail(null);
      setIsEditing(false);
      setIsCreating(false);
      
      // Force Next.js router refresh to clear any cached page data
      router.refresh();
      
      // Clear any cached data and force fresh fetch
      await fetchData(true);
      
      showToast.dismiss(loadingToast);
      showToast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Refresh error:', error);
      showToast.dismiss(loadingToast);
      showToast.error('Failed to refresh data. Please try again.');
    }
  };

  const handleBackToList = () => {
    setSelectedUserDetail(null);
    setSelectedUser(null);
    setIsEditing(false);
    setIsCreating(false);
    setActiveTab('userInfo');
    setEditingUserData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      username: '',
      role: '',
      profile: '',
      password: '',
      confirmPassword: '',
      status: 'active',
      countryCode: '+91',
      permissionSets: []
    });
    setCreatingUserData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      username: '',
      role: '',
      profile: '',
      password: '',
      confirmPassword: '',
      status: 'active',
      countryCode: '+91'
    });
    setShowPasswordResetModal(false);
  };

  const handleRecordClick = async (record: any) => {
    setSelectedUserDetail(record);
    setSelectedUser(record);
    
    // Fetch fresh user data from API to ensure we have the latest information
    try {
      const response = await fetch(`/api/admin/users/${record.id}`);
      if (response.ok) {
        const freshUserData = await response.json();
        
        // Map the API response to match frontend expected format
        const mappedUserData = {
          ...freshUserData,
          // Convert roles array to role object
          role: freshUserData.roles && freshUserData.roles.length > 0 ? {
            id: roles.find(r => r.name === freshUserData.roles[0])?.id || '',
            name: freshUserData.roles[0]
          } : null,
          // Convert profile string to profile object
          profile: freshUserData.profile ? {
            id: profiles.find(p => p.name === freshUserData.profile)?.id || '',
            name: freshUserData.profile
          } : null,
          // Preserve the extraPermissions field from the API response
          extraPermissions: freshUserData.extraPermissions || []
        };
        
        // Data mapping completed
        
        // Only set the mapped data once
        setSelectedUser(mappedUserData);
        setSelectedUserDetail(mappedUserData);
        
        // State updated successfully
        
        // Fetch permission sets for the assigned role
        if (mappedUserData.role?.id) {
          fetchUserRolePermissions(mappedUserData.role.id);
        } else {
          setUserRolePermissions([]);
        }
      } else {
        // Fallback to using the record data
        if (record.role?.id) {
          fetchUserRolePermissions(record.role.id);
        } else {
          setUserRolePermissions([]);
        }
      }
    } catch (error) {
      // Fallback to using the record data
      if (record.role?.id) {
        fetchUserRolePermissions(record.role.id);
      } else {
        setUserRolePermissions([]);
      }
    }
  };

  const handleCreateUser = () => {
    setIsCreating(true);
  };

  const handleEditUser = () => {
    setIsEditing(true);
    
    // Convert extra permission names to IDs for editing
    const extraPermissionSetIds: string[] = [];
    if (selectedUser.extraPermissions && selectedUser.extraPermissions.length > 0) {
      selectedUser.extraPermissions.forEach((permissionName: string) => {
        const permissionSet = permissionSets.find(ps => ps.name === permissionName);
        if (permissionSet) {
          extraPermissionSetIds.push(permissionSet.id);
        }
      });
    }
    
    
    
    const editingData = {
      firstName: selectedUser.firstName || selectedUser.name?.split(' ')[0] || '',
      lastName: selectedUser.lastName || selectedUser.name?.split(' ').slice(1).join(' ') || '',
      email: selectedUser.email || '',
      phone: selectedUser.phone || '',
      username: selectedUser.username || '',
      countryCode: selectedUser.countryCode || '+91',
      enabled: selectedUser.enabled !== undefined ? selectedUser.enabled : true,
      // Ensure role is set as ID for dropdown selection
      role: selectedUser.role?.id || (typeof selectedUser.role === 'string' ? selectedUser.role : ''),
      // Ensure profile is set as ID for dropdown selection
      profile: selectedUser.profile?.id || (typeof selectedUser.profile === 'string' ? selectedUser.profile : ''),
      status: selectedUser.status || 'active',
      permissionSets: selectedUser.permissionSets || [],
      extraPermissionSets: extraPermissionSetIds // Initialize with actual extra permission set IDs
    };
    
    console.log('🔍 Setting editing data:', editingData);
    console.log('🔍 Selected user role:', selectedUser.role);
    console.log('🔍 Selected user profile:', selectedUser.profile);
    
    setEditingUserData(editingData);
    

  };

  // Edit user form submission function for inline editing
  const handleEditUserSubmit = async () => {
    if (!selectedUser) {
      showToast.error('No user selected for editing');
      return;
    }

    // Validate required fields including role and profile
    if (!editingUserData.role || !editingUserData.profile) {
      showToast.error('Role and Profile are required fields');
      return;
    }

    // Validate phone number
    if (!editingUserData.phone || !isPhoneValid(editingUserData.phone, editingUserData.countryCode)) {
      showToast.error('Please enter a valid phone number');
      return;
    }

    try {
      // Prepare user data for update
      const userData = {
        firstName: editingUserData.firstName,
        lastName: editingUserData.lastName,
        email: editingUserData.email,
        phone: editingUserData.phone,
        username: editingUserData.username,
        countryCode: editingUserData.countryCode,
        roles: editingUserData.role ? [editingUserData.role] : [], // Send role ID as array
        profile: editingUserData.profile || null, // Send profile ID
        enabled: editingUserData.status === 'active',
        status: editingUserData.status,
        permissionSets: editingUserData.permissionSets,
        extraPermissionSets: editingUserData.extraPermissionSets || [] // Include extra permission sets
      };



      // Get profile name from ID for API compatibility
      if (editingUserData.profile) {
        const selectedProfile = profiles.find(p => p.id === editingUserData.profile);
        if (selectedProfile) {
          userData.profile = selectedProfile.name;
        } else {
          // If profile ID not found, use the ID directly (fallback)
          userData.profile = editingUserData.profile;
        }
      }

      // Get role name from ID for API compatibility
      if (editingUserData.role) {
        const selectedRole = roles.find(r => r.id === editingUserData.role);
        if (selectedRole) {
          userData.roles = [selectedRole.name];
        } else {
          // If role ID not found, use the ID directly (fallback)
          userData.roles = [editingUserData.role];
        }
      }



      // Update user
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      

      if (response.ok) {
        const responseData = await response.json();

        
                // Update the selectedUser state with the new data
        setSelectedUser((prev: any) => {
          const updatedUser = {
            ...prev,
            ...responseData,
            // Map the response data to match our expected structure
            profile: responseData.profile ? { name: responseData.profile } : null,
            role: responseData.roles && responseData.roles.length > 0 ? { name: responseData.roles[0] } : null,
            phone: responseData.phone || prev.phone, // Preserve phone number if not in response
            // Preserve the extra permissions from the response
            extraPermissions: responseData.extraPermissions || []
          };
          

          return updatedUser;
        });
        
        // Also update the selectedUserDetail state to keep it in sync
        setSelectedUserDetail((prev: any) => {
          const updatedUserDetail = {
            ...prev,
            ...responseData,
            profile: responseData.profile ? { name: responseData.profile } : null,
            role: responseData.roles && responseData.roles.length > 0 ? { name: responseData.roles[0] } : null,
            phone: responseData.phone || prev.phone,
            extraPermissions: responseData.extraPermissions || []
          };
          

          return updatedUserDetail;
        });
        
        // Fetch permission sets for the new role if it changed
        if (responseData.roles && responseData.roles.length > 0) {
          // Find the role ID from the roles array
          const newRole = roles.find(r => r.name === responseData.roles[0]);
          if (newRole) {
            fetchUserRolePermissions(newRole.id);
          }
        } else {
          setUserRolePermissions([]);
        }
        
        showToast.success('User updated successfully');
        setIsEditing(false); // Return to display mode
        // Don't call fetchData() here as it will overwrite our updated user data
        // fetchData(); // REMOVED - This was causing extra permissions to disappear
      } else {
        const error = await response.json();

        showToast.error(`Failed to update user: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      showToast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    console.log('🔍 Delete button clicked!');
    console.log('🔍 selectedUser:', selectedUser);
    console.log('🔍 selectedUserDetail:', selectedUserDetail);
    
    if (!selectedUser) {
      console.error('❌ No user selected! Cannot delete.');
      showToast.error('Please select a user first');
      return;
    }
    
    // Direct delete - no confirmation needed
    await confirmDeleteUser();
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) {
      console.error('❌ No user selected! Cannot delete.');
      return;
    }
    
    // Show loading toast
    const loadingToast = showToast.loading('Deleting user...');
    
    try {
      console.log('🗑️ Starting deletion for user:', selectedUser.username || selectedUser.email);
      
      // Try to remove assignments first, but continue if endpoints don't exist
      let assignmentsRemoved = 0;
      
      try {
        // Step 1: Try to remove all role assignments for this user
        console.log('🔧 Step 1: Attempting to remove role assignments...');
        const removeRoleAssignmentsResponse = await fetch(`/api/admin/users/${selectedUser.id}/roles`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (removeRoleAssignmentsResponse.ok) {
          const result = await removeRoleAssignmentsResponse.json();
          console.log('✅ Role assignments removed successfully');
          if (result.removedRoles) {
            assignmentsRemoved += result.removedRoles;
          }
        } else if (removeRoleAssignmentsResponse.status === 404) {
          console.log('ℹ️ Role assignment removal endpoint not available, skipping...');
        } else {
          console.warn('⚠️ Warning: Failed to remove role assignments');
        }
      } catch (error) {
        console.log('ℹ️ Role assignment removal failed, continuing with deletion...');
      }

      try {
        // Step 2: Try to remove all profile assignments for this user
        console.log('🔧 Step 2: Attempting to remove profile assignments...');
        const removeProfileAssignmentsResponse = await fetch(`/api/admin/users/${selectedUser.id}/profiles`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (removeProfileAssignmentsResponse.ok) {
          const result = await removeProfileAssignmentsResponse.json();
          console.log('✅ Profile assignments removed successfully');
          if (result.removedProfiles) {
            assignmentsRemoved += result.removedProfiles;
          }
        } else if (removeProfileAssignmentsResponse.status === 404) {
          console.log('ℹ️ Profile assignment removal endpoint not available, skipping...');
        } else {
          console.warn('⚠️ Warning: Failed to remove profile assignments');
        }
      } catch (error) {
        console.log('ℹ️ Profile assignment removal failed, continuing with deletion...');
      }

      try {
        // Step 3: Try to remove all permission set assignments for this user
        console.log('🔧 Step 3: Attempting to remove permission set assignments...');
        const removePermissionSetAssignmentsResponse = await fetch(`/api/admin/users/${selectedUser.id}/permission-sets`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (removePermissionSetAssignmentsResponse.ok) {
          const result = await removePermissionSetAssignmentsResponse.json();
          console.log('✅ Permission set assignments removed successfully');
          if (result.removedPermissionSets) {
            assignmentsRemoved += result.removedPermissionSets;
          }
        } else if (removePermissionSetAssignmentsResponse.status === 404) {
          console.log('ℹ️ Permission set assignment removal endpoint not available, skipping...');
        } else {
          console.warn('⚠️ Warning: Failed to remove permission set assignments');
        }
      } catch (error) {
        console.log('ℹ️ Permission set assignment removal failed, continuing with deletion...');
      }

      // Step 4: Delete the user itself
      console.log('🗑️ Step 4: Deleting user...');
      const deleteResponse = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (deleteResponse.ok) {
        console.log('🗑️ User deleted successfully, showing toast...');
        
        // Show success message
        let successMessage = 'User deleted successfully';
        if (assignmentsRemoved > 0) {
          successMessage += `. Removed ${assignmentsRemoved} assignment(s)`;
        }
        
        showToast.success(successMessage);
        
        console.log('🗑️ Clearing states and refreshing data...');
        // Clear selected user states
        setSelectedUser(null);
        setSelectedUserDetail(null);
        
        // Refresh the users list
        fetchData();
        
        console.log('🗑️ Delete operation completed successfully');
      } else {
        const errorText = await deleteResponse.text();
        console.error('❌ Failed to delete user. Response:', errorText);
        
        let errorMessage = 'Failed to delete user';
        
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
          if (errorText.includes('Cannot delete user')) {
            errorMessage = errorText;
          }
        }
        
        showToast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      showToast.error('Failed to delete user');
    } finally {
      // Dismiss loading toast
      showToast.dismiss(loadingToast);
    }
  };

  const handlePasswordReset = () => {
    setShowPasswordResetModal(true);
  };

  const handleViewRoles = async () => {
    if (!selectedUser) return;
    
    setRoleUsersLoading(true);
    try {
      // Fetch users for this role - you'll need to implement this API endpoint
      const response = await fetch(`/api/admin/roles/${selectedUser.id}/users`);
      if (response.ok) {
        const data = await response.json();
        setRoleUsers(data);
      } else {
        setRoleUsers([]);
        showToast.error('Failed to fetch role users');
      }
    } catch (error) {
      setRoleUsers([]);
      showToast.error('Failed to fetch role users');
    } finally {
      setRoleUsersLoading(false);
      setShowRoleUsersModal(true);
    }
  };

  const handleViewProfile = () => {
    setShowUserModal(true);
  };

  // Fetch permission sets for the assigned role
  const fetchUserRolePermissions = async (roleId: string) => {
    if (!roleId) {
      setUserRolePermissions([]);
      return;
    }

    setUserRolePermissionsLoading(true);
    try {
      // Since roles don't directly have permission sets in this schema,
      // we need to get permission sets from the user's profile
      // The permission sets are already being fetched in the main user data
      setUserRolePermissions([]);
    } catch (error) {
      setUserRolePermissions([]);
    } finally {
      setUserRolePermissionsLoading(false);
    }
  };

  // Username validation function
  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const username = e.target.value;
    setCreatingUserData((prev: any) => ({ ...prev, username }));
    
    if (username.length < 3) {
      setUsernameAvailability(null);
      return;
    }

    setUsernameAvailability('checking');
    setIsCheckingUsername(true);

    try {
      const response = await fetch(`/api/admin/users/check-username?username=${encodeURIComponent(username)}`);
      if (response.ok) {
        const data = await response.json();
        setUsernameAvailability(data.available ? 'available' : 'unavailable');
      } else {
        setUsernameAvailability('unavailable');
      }
    } catch (error) {
      setUsernameAvailability('unavailable');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Email validation function
  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setCreatingUserData((prev: any) => ({ ...prev, email }));
    
    if (email.length < 5) {
      setEmailAvailability(null);
      return;
    }

    setEmailAvailability('checking');
    setIsCheckingEmail(true);

    try {
      const response = await fetch(`/api/admin/users/check-email?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setEmailAvailability(data.available ? 'available' : 'unavailable');
      } else {
        setEmailAvailability('unavailable');
      }
    } catch (error) {
      setEmailAvailability('unavailable');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Password validation function
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
            setCreatingUserData((prev: any) => ({ ...prev, password }));

    // Update password validation state
    setPasswordValidation({
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d.*\d/.test(password), // At least two numbers
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasMinLength: password.length >= 8,
      hasMaxLength: password.length <= 10
    });

    // Check if passwords match
    if (creatingUserData.confirmPassword) {
      setPasswordsMatch(password === creatingUserData.confirmPassword);
    }
  };

  // Confirm password validation function
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const confirmPassword = e.target.value;
            setCreatingUserData((prev: any) => ({ ...prev, confirmPassword }));
    setPasswordsMatch(creatingUserData.password === confirmPassword);
  };

  // Phone number validation function
  const isPhoneValid = (phone: string, countryCode: string) => {
    const digits = phone.replace(/\D/g, '');
    
    switch (countryCode) {
      case '+91': // India: 10 digits
        return digits.length === 10;
      case '+1': // USA/Canada: 10 digits
        return digits.length === 10;
      case '+44': // UK: 10-11 digits
        return digits.length >= 10 && digits.length <= 11;
      case '+61': // Australia: 9 digits
        return digits.length === 9;
      case '+86': // China: 11 digits
        return digits.length === 11;
      default:
        return digits.length >= 8;
    }
  };

  // Form submission function
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!creatingUserData.firstName || !creatingUserData.lastName || !creatingUserData.email || 
        !creatingUserData.phone || !creatingUserData.username || !creatingUserData.role || 
        !creatingUserData.profile || !creatingUserData.password || !creatingUserData.confirmPassword || 
        !creatingUserData.status || !isPhoneValid(creatingUserData.phone, creatingUserData.countryCode)) {
      showToast.error('Please fill all required fields');
      return;
    }

    // Check if username and email are available
    if (usernameAvailability === 'unavailable') {
      showToast.error('Username is not available');
      return;
    }

    if (emailAvailability === 'unavailable') {
      showToast.error('Email is already in use');
      return;
    }

    // Check if username and email are still being checked
    if (usernameAvailability === 'checking' || emailAvailability === 'checking') {
      showToast.error('Please wait for username and email availability check to complete');
      return;
    }

    try {
      // Prepare user data
      const userData = {
        firstName: creatingUserData.firstName,
        lastName: creatingUserData.lastName,
        email: creatingUserData.email,
        phone: creatingUserData.phone,
        username: creatingUserData.username,
        role: creatingUserData.role || null,
        profile: creatingUserData.profile || null,
        password: creatingUserData.password,
        enabled: creatingUserData.status === 'active',
        status: creatingUserData.status
      };

      console.log('🔍 Frontend - User data being sent:', userData);
      console.log('🔍 Frontend - Role field type:', typeof creatingUserData.role);
      console.log('🔍 Frontend - Role field value:', creatingUserData.role);

      // Create user
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        showToast.success('User created successfully');
        router.refresh();
        fetchData(true); // Force refresh the user list
        handleBackToList();
      } else {
        const error = await response.json();
        showToast.error(`Failed to create user: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      showToast.error('Failed to create user');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
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

  // Phone number formatting function
  const formatPhoneNumber = (phone: string, countryCode: string) => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    switch (countryCode) {
      case '+91': // India
        if (digits.length <= 5) return digits;
        if (digits.length <= 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
        return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
      
      case '+1': // USA/Canada
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
      
      case '+44': // UK
        if (digits.length <= 4) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
      
      case '+61': // Australia
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
        return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6, 10)}`;
      
      case '+86': // China
        if (digits.length <= 3) return digits;
        if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
        return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)}`;
      
      default:
        return digits;
    }
  };

  // Phone number change handler
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawPhone = e.target.value;
    const formattedPhone = formatPhoneNumber(rawPhone, creatingUserData.countryCode);
    setCreatingUserData((prev: any) => ({ ...prev, phone: formattedPhone }));
  };

  // Country code change handler
  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryCode = e.target.value;
    setCreatingUserData((prev: any) => ({ 
      ...prev, 
      countryCode: newCountryCode,
      phone: formatPhoneNumber(prev.phone, newCountryCode)
    }));
  };

  // Function to fetch permission sets for a specific profile
  const fetchProfilePermissionSets = async (profileId: string) => {
    try {
      const response = await fetch(`/api/admin/profiles/${profileId}/permission-sets`);
      if (response.ok) {
        const data = await response.json();
        return data.permissionSets || [];
      }
    } catch (error) {
      // Error fetching profile permission sets
    }
    return [];
  };

  // Function to update profile-based permissions when profile changes
  const updateProfilePermissions = async (newProfileId: string) => {
    if (!newProfileId) {
      // If no profile selected, clear profile permissions
      setSelectedUser((prev: any) => ({
        ...prev,
        permissions: []
      }));
      return;
    }

    setProfilePermissionsLoading(true);
    try {
      const profilePermissions = await fetchProfilePermissionSets(newProfileId);
      setSelectedUser((prev: any) => ({
        ...prev,
        permissions: profilePermissions.map((ps: any) => ps.name)
      }));
      // Profile permissions updated
    } catch (error) {
      // Error updating profile permissions
    } finally {
      setProfilePermissionsLoading(false);
    }
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

  const filteredUsers = filterByAlphabet(users, usersFilter, 'name');
  const searchedUsers = filteredUsers.filter(user =>
    user.name?.toLowerCase().includes(usersSearch.toLowerCase()) ||
    user.email?.toLowerCase().includes(usersSearch.toLowerCase()) ||
    user.username?.toLowerCase().includes(usersSearch.toLowerCase())
  );
  const sortedUsers = sortData(searchedUsers, sortField, sortDirection);
  const paginatedUsers = getPaginatedData(sortedUsers, currentPage, itemsPerPage);
  const totalPages = getTotalPages(sortedUsers, itemsPerPage);

  const banner = (
    <HeadingCard
      title="User Management"
      subtitle="Manage user accounts and permissions"
      Icon={Users}
      rightSlot={
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}</span>
          <RefreshButton
            endpoint="/api/admin/users"
            onData={(data) => { setUsers(data); setLastUpdated(new Date()); }}
            className="h-9 px-3"
            disabled={refreshing}
          />
        </div>
      }
    />
  );

  // Show create user form when isCreating is true
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
              Back to Users
            </Button>
          </div>

          {/* Create User Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create New User</h2>
                <p className="text-gray-600">Add a new user to the system</p>
              </div>
            </div>

            {/* Custom Create User Form */}
            <form onSubmit={handleCreateUserSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={creatingUserData.firstName || ''}
                    onChange={(e) => setCreatingUserData((prev: any) => ({ ...prev, firstName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter first name"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={creatingUserData.lastName || ''}
                    onChange={(e) => setCreatingUserData((prev: any) => ({ ...prev, lastName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter last name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      value={creatingUserData.email || ''}
                      onChange={handleEmailChange}
                      required
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        emailAvailability === 'available' ? 'border-green-500' : 
                        emailAvailability === 'unavailable' ? 'border-red-500' : 
                        'border-gray-300'
                      }`}
                      placeholder="Enter email address"
                    />
                    {emailAvailability === 'checking' && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {emailAvailability === 'available' && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                        ✓
                      </div>
                    )}
                    {emailAvailability === 'unavailable' && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                        ✗
                      </div>
                    )}
                  </div>
                  {emailAvailability === 'unavailable' && (
                    <p className="mt-1 text-sm text-red-600">Email is already in use</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <select
                      value={creatingUserData.countryCode || '+91'}
                      onChange={handleCountryCodeChange}
                      className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                    >
                      <option value="+91">IN +91 (India)</option>
                      <option value="+1">US +1 (USA)</option>
                      <option value="+44">GB +44 (UK)</option>
                      <option value="+61">AU +61 (Australia)</option>
                      <option value="+86">CN +86 (China)</option>
                    </select>
                    <input
                      type="tel"
                      id="phone"
                      value={creatingUserData.phone || ''}
                      onChange={handlePhoneChange}
                      required
                      className={`flex-1 px-3 py-2 border rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        creatingUserData.phone && isPhoneValid(creatingUserData.phone, creatingUserData.countryCode) ? 'border-green-500' :
                        creatingUserData.phone && !isPhoneValid(creatingUserData.phone, creatingUserData.countryCode) ? 'border-red-500' :
                        'border-gray-300'
                      }`}
                      placeholder={
                        creatingUserData.countryCode === '+91' ? '98765 43210' :
                        creatingUserData.countryCode === '+1' ? '(555) 123-4567' :
                        creatingUserData.countryCode === '+44' ? '20 7946 0958' :
                        creatingUserData.countryCode === '+61' ? '2 9876 5432' :
                        creatingUserData.countryCode === '+86' ? '138 1234 5678' :
                        'Enter phone number'
                      }
                    />
                  </div>
                  {/* Phone format helper text */}
                  <p className="mt-1 text-xs text-gray-500">
                    Format: {
                      creatingUserData.countryCode === '+91' ? '98765 43210 (India)' :
                      creatingUserData.countryCode === '+1' ? '(555) 123-4567 (USA/Canada)' :
                      creatingUserData.countryCode === '+44' ? '20 7946 0958 (UK)' :
                      creatingUserData.countryCode === '+61' ? '2 9876 5432 (Australia)' :
                      creatingUserData.countryCode === '+86' ? '138 1234 5678 (China)' :
                      'Enter phone number'
                    }
                  </p>
                  {/* Phone validation message */}
                  {creatingUserData.phone && !isPhoneValid(creatingUserData.phone, creatingUserData.countryCode) && (
                    <p className="mt-1 text-sm text-red-600">
                      Invalid phone number for {creatingUserData.countryCode === '+91' ? 'India' :
                        creatingUserData.countryCode === '+1' ? 'USA/Canada' :
                        creatingUserData.countryCode === '+44' ? 'UK' :
                        creatingUserData.countryCode === '+61' ? 'Australia' :
                        creatingUserData.countryCode === '+86' ? 'China' : 'selected country'}
                    </p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="username"
                      value={creatingUserData.username || ''}
                      onChange={handleUsernameChange}
                      required
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        usernameAvailability === 'available' ? 'border-green-500' : 
                        usernameAvailability === 'unavailable' ? 'border-red-500' : 
                        'border-gray-300'
                      }`}
                      placeholder="Enter username"
                    />
                    {usernameAvailability === 'checking' && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {usernameAvailability === 'available' && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                        ✓
                      </div>
                    )}
                    {usernameAvailability === 'unavailable' && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                        ✗
                      </div>
                    )}
                  </div>
                  {usernameAvailability === 'unavailable' && (
                    <p className="mt-1 text-sm text-red-600">Username is not available</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="role"
                    value={creatingUserData.role || ''}
                    onChange={(e) => setCreatingUserData((prev: any) => ({ ...prev, role: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Profile */}
                <div>
                  <label htmlFor="profile" className="block text-sm font-medium text-gray-700 mb-2">
                    Profile <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="profile"
                    value={creatingUserData.profile || ''}
                    onChange={(e) => setCreatingUserData((prev: any) => ({ ...prev, profile: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a profile</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={creatingUserData.password || ''}
                    onChange={handlePasswordChange}
                    required
                    minLength={8}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter password"
                  />
                  {/* Password Requirements */}
                  <div className="mt-2 space-y-1">
                    <div className={`text-xs ${passwordValidation.hasMinLength ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.hasMinLength ? '✓' : '✗'} Minimum 8 characters
                    </div>
                    <div className={`text-xs ${passwordValidation.hasMaxLength ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.hasMaxLength ? '✓' : '✗'} Maximum 10 characters
                    </div>
                    <div className={`text-xs ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.hasUpperCase ? '✓' : '✗'} One uppercase letter
                    </div>
                    <div className={`text-xs ${passwordValidation.hasLowerCase ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.hasLowerCase ? '✓' : '✗'} One lowercase letter
                    </div>
                    <div className={`text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.hasNumber ? '✓' : '✗'} Two numbers
                    </div>
                    <div className={`text-xs ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordValidation.hasSpecialChar ? '✓' : '✗'} One special character
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={creatingUserData.confirmPassword || ''}
                    onChange={handleConfirmPasswordChange}
                    required
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      creatingUserData.confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm password"
                  />
                  {creatingUserData.confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>

                {/* User Status */}
                <div>
                  <label htmlFor="userStatus" className="block text-sm font-medium text-gray-700 mb-2">
                    User Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="userStatus"
                    value={creatingUserData.status || 'active'}
                    onChange={(e) => setCreatingUserData((prev: any) => ({ ...prev, status: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
                  disabled={!creatingUserData.firstName || !creatingUserData.lastName || !creatingUserData.email || 
                           !creatingUserData.phone || !creatingUserData.username || !creatingUserData.role || 
                           !creatingUserData.profile || !creatingUserData.password || !creatingUserData.confirmPassword || 
                           !creatingUserData.status || !isPhoneValid(creatingUserData.phone, creatingUserData.countryCode)}
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

  if (selectedUserDetail) {
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
              Back to Users
            </Button>
          </div>

          {/* User Detail View */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedUser.firstName || selectedUser.name?.split(' ')[0] || 'User'} {selectedUser.lastName || selectedUser.name?.split(' ').slice(1).join(' ') || ''}
                </h2>
                <p className="text-gray-600">{selectedUser.email || 'No email provided'}</p>
              </div>
              <div className="flex gap-2">

                
                <Button onClick={handleEditUser} disabled={isEditing}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={handlePasswordReset}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset Password
                </Button>
                <Button variant="destructive" onClick={handleDeleteUser}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>



            {/* Tab Content */}
            {activeTab === 'userInfo' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                  <div className="space-y-4">
                    {/* First Name */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        First Name {isEditing && <span className="text-red-600">*</span>}
                      </label>
                      {!isEditing ? (
                        <p className="text-gray-900 font-medium">{selectedUser.firstName || selectedUser.name?.split(' ')[0] || 'Not provided'}</p>
                      ) : (
                        <input
                          type="text"
                          value={editingUserData.firstName || ''}
                          onChange={(e) => setEditingUserData((prev: any) => ({ ...prev, firstName: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter first name"
                        />
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Last Name {isEditing && <span className="text-red-600">*</span>}
                      </label>
                      {!isEditing ? (
                        <p className="text-gray-900 font-medium">{selectedUser.lastName || selectedUser.name?.split(' ').slice(1).join(' ') || 'Not provided'}</p>
                      ) : (
                        <input
                          type="text"
                          value={editingUserData.lastName || ''}
                          onChange={(e) => setEditingUserData((prev: any) => ({ ...prev, lastName: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter last name"
                        />
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Email {isEditing && <span className="text-red-600">*</span>}
                      </label>
                      {!isEditing ? (
                        <p className="text-gray-900">{selectedUser.email || 'Not provided'}</p>
                      ) : (
                        <input
                          type="email"
                          value={editingUserData.email || ''}
                          onChange={(e) => setEditingUserData((prev: any) => ({ ...prev, email: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter email address"
                        />
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Phone Number <span className="text-red-600">*</span>
                      </label>
                      {!isEditing ? (
                        <p className="text-gray-900">{selectedUser.phone || 'Not provided'}</p>
                      ) : (
                        <div className="flex">
                          <select
                            value={editingUserData.countryCode || '+91'}
                            onChange={(e) => setEditingUserData((prev: any) => ({ ...prev, countryCode: e.target.value }))}
                            className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="+91">IN +91 (India)</option>
                            <option value="+1">US +1 (USA)</option>
                            <option value="+44">GB +44 (UK)</option>
                            <option value="+61">AU +61 (Australia)</option>
                            <option value="+86">CN +86 (China)</option>
                          </select>
                          <input
                            type="tel"
                            value={editingUserData.phone || ''}
                            onChange={(e) => setEditingUserData((prev: any) => ({ ...prev, phone: formatPhoneNumber(e.target.value, editingUserData.countryCode) }))}
                            required
                            className={`flex-1 px-3 py-2 border rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              editingUserData.phone && isPhoneValid(editingUserData.phone, editingUserData.countryCode) ? 'border-green-500' :
                              editingUserData.phone && !isPhoneValid(editingUserData.phone, editingUserData.countryCode) ? 'border-red-500' :
                              'border-gray-300'
                            }`}
                            placeholder={editingUserData.countryCode === '+91' ? '98765 43210' :
                                       editingUserData.countryCode === '+1' ? '(555) 123-4567' :
                                       editingUserData.countryCode === '+44' ? '20 7946 0958' :
                                       editingUserData.countryCode === '+61' ? '2 9374 4000' :
                                       editingUserData.countryCode === '+86' ? '138 0013 8000' : 'Enter phone number'}
                          />
                        </div>
                      )}
                      {isEditing && (
                        <p className="mt-1 text-sm text-gray-500">
                          Format: {editingUserData.countryCode === '+91' ? '98765 43210 (India)' :
                                   editingUserData.countryCode === '+1' ? '(555) 123-4567 (USA)' :
                                   editingUserData.countryCode === '+44' ? '20 7946 0958 (UK)' :
                                   editingUserData.countryCode === '+61' ? '2 9374 4000 (Australia)' :
                                   editingUserData.countryCode === '+86' ? '138 0013 8000 (China)' : 'Enter phone number'}
                        </p>
                      )}
                      {editingUserData.phone && !isPhoneValid(editingUserData.phone, editingUserData.countryCode) && (
                        <p className="mt-1 text-sm text-red-600">Invalid phone number for {editingUserData.countryCode === '+91' ? 'India' :
                          editingUserData.countryCode === '+1' ? 'United States' :
                          editingUserData.countryCode === '+44' ? 'United Kingdom' :
                          editingUserData.countryCode === '+61' ? 'Australia' :
                          editingUserData.countryCode === '+86' ? 'China' : 'selected country'}</p>
                      )}
                    </div>

                    {/* Username */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Username </label>
                      {!isEditing ? (
                        <p className="text-gray-900">{selectedUser.username || 'Not provided'}</p>
                      ) : (
                        <input
                          type="text"
                          value={editingUserData.username || ''}
                          onChange={(e) => setEditingUserData((prev: any) => ({ ...prev, username: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter username"
                        />
                      )}
                    </div>

                    {/* User Status */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">User Status</label>
                      {!isEditing ? (
                        <Badge variant={selectedUser.status === 'active' ? 'default' : 'secondary'}>
                          {selectedUser.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      ) : (
                        <select
                          value={editingUserData.status || 'active'}
                          onChange={(e) => setEditingUserData((prev: any) => ({ ...prev, status: e.target.value }))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      )}
                    </div>

                    {/* Current Role - Show when not editing */}
                    {!isEditing && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Current Role</label>
                        <p className="text-gray-900 font-medium">
                          {selectedUser.role?.name || 'Not assigned'}
                        </p>
                      </div>
                    )}

                    {/* Current Profile - Show when not editing */}
                    {!isEditing && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Current Profile</label>
                        <p className="text-gray-900 font-medium">
                          {selectedUser.profile?.name || 'Not assigned'}
                        </p>
                      </div>
                    )}

                    {/* Role Selection - Show in main user info when editing */}
                    {isEditing && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">
                          Role <span className="text-red-600">*</span>
                        </label>
                        <select
                          value={editingUserData.role || ''}
                          onChange={(e) => {
                            console.log('🔍 Role selected:', e.target.value);
                            setEditingUserData((prev: any) => ({ ...prev, role: e.target.value }));
                          }}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a role</option>
                          {roles.map((role: any) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Profile Selection - Show in main user info when editing */}
                    {isEditing && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">
                          Profile <span className="text-red-600">*</span>
                        </label>
                        <select
                          value={editingUserData.profile || ''}
                          onChange={(e) => {
                            const newProfileId = e.target.value;
                            console.log('🔍 Profile selected:', newProfileId);
                            setEditingUserData((prev: any) => ({ ...prev, profile: newProfileId }));
                          }}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a profile</option>
                          {profiles.map((profile: any) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                  <div className="space-y-4">
                    {/* User ID */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">User ID</label>
                      <p className="text-gray-900 font-mono text-sm">{selectedUser.id || 'Not available'}</p>
                    </div>

                    {/* Created Date */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Created Date</label>
                      <p className="text-gray-900">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'Not available'}</p>
                    </div>

                    {/* Last Login */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Last Login</label>
                      <p className="text-gray-900">{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString() : 'Never logged in'}</p>
                    </div>

                    {/* Edit Form Actions - Only show when editing */}
                    {isEditing && (
                      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-2"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleEditUserSubmit}
                          disabled={!editingUserData.phone || !isPhoneValid(editingUserData.phone, editingUserData.countryCode)}
                          className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Update User
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'roleProfile' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Information</h3>
                  <div className="space-y-4">
                    {/* Current Role */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Current Role</label>
                      {!isEditing ? (
                        <p className="text-gray-900 font-medium">{selectedUser.role?.name || 'Not assigned'}</p>
                      ) : (
                        <select
                          value={editingUserData.role || ''}
                          onChange={(e) => {
                            console.log('🔍 Role selected:', e.target.value);
                            setEditingUserData((prev: any) => ({ ...prev, role: e.target.value }));
                            // Clear profile permissions when role changes (roles and profiles are separate)
                            setSelectedUser((prev: any) => ({
                              ...prev,
                              permissions: []
                            }));
                          }}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a role</option>
                          {roles.map((role: any) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Role Description */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Role Description</label>
                      <p className="text-gray-900">{selectedUser.role?.description || 'No description available'}</p>
                    </div>

                    {/* Role Permissions */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Role Permissions</label>
                      <p className="text-gray-900">{selectedUser.role?.permissions?.length > 0 ? `${selectedUser.role.permissions.length} permissions assigned` : 'No permissions assigned'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    {/* Profile Name */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Profile Name</label>
                      {!isEditing ? (
                        <p className="text-gray-900 font-medium">{selectedUser.profile?.name || 'Not assigned'}</p>
                      ) : (
                        <select
                          value={editingUserData.profile || ''}
                          onChange={(e) => {
                            const newProfileId = e.target.value;
                            console.log('🔍 Profile selected:', newProfileId);
                            setEditingUserData((prev: any) => ({ ...prev, profile: newProfileId }));
                            // Update profile-based permissions when profile changes
                            updateProfilePermissions(newProfileId);
                          }}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a profile</option>
                          {profiles.map((profile: any) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Profile Type */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Profile Type</label>
                      <p className="text-gray-900 font-medium">{selectedUser.profile?.type || 'Standard'}</p>
                    </div>

                    {/* Profile Settings */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Profile Settings</label>
                      <p className="text-gray-900">{selectedUser.profile?.settings?.length > 0 ? `${selectedUser.profile.settings.length} custom settings` : 'No custom settings'}</p>
                    </div>

                    {/* Last Profile Update */}
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Last Profile Update</label>
                      <p className="text-gray-900 font-medium">{selectedUser.profile?.updatedAt ? new Date(selectedUser.profile.updatedAt).toLocaleDateString() : 'Not available'}</p>
                    </div>
                  </div>
                </div>

                {/* Assigned Permission Sets */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Permission Sets</h3>
                  
                  {/* Debug Info for Permission Sets */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug: Permission Sets Data</h4>
                    <div className="text-xs text-yellow-700 space-y-1">
                      <p>selectedUser.permissions: {JSON.stringify(selectedUser.permissions)}</p>
                      <p>selectedUser.permissionSets: {JSON.stringify(selectedUser.permissionSets)}</p>
                      <p>selectedUser.extraPermissions: {JSON.stringify(selectedUser.extraPermissions)}</p>
                      <p>userRolePermissions: {JSON.stringify(userRolePermissions)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    {!isEditing ? (
                      // Display mode
                      <>
                        {/* Direct Permission Sets */}
                        {selectedUser.permissionSets && selectedUser.permissionSets.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Directly Assigned</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {selectedUser.permissionSets.map((permissionSet: any) => (
                                <div key={permissionSet.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                      <Settings className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900">{permissionSet.name}</h4>
                                      <p className="text-xs text-gray-500">{permissionSet.description || 'No description'}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Role-based Permission Sets */}
                        {userRolePermissions && userRolePermissions.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Inherited from Role: {selectedUser.role?.name || 'Unknown Role'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {userRolePermissions.map((permissionSet: any) => (
                                <div key={permissionSet.id} className="bg-white border border-blue-200 rounded-lg p-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Settings className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900">{permissionSet.name}</h4>
                                      <p className="text-xs text-gray-500">{permissionSet.description || 'No description'}</p>
                                      <p className="text-xs text-blue-600">From Role</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Profile-based Permission Sets */}
                        {selectedUser.permissions && selectedUser.permissions.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Inherited from Profile: {selectedUser.profile?.name || 'Unknown Profile'}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {selectedUser.permissions.map((permissionSet: any) => (
                                <div key={permissionSet} className="bg-white border border-green-200 rounded-lg p-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                      <Settings className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900">{permissionSet}</h4>
                                      <p className="text-xs text-gray-500">Permission Set</p>
                                      <p className="text-xs text-green-600">From Profile</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Extra Permission Sets (Directly Assigned) */}
                        {selectedUser.extraPermissions && selectedUser.extraPermissions.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Extra Permission Sets (Directly Assigned)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {selectedUser.extraPermissions.map((permissionSet: any) => (
                                <div key={permissionSet} className="bg-white border border-orange-200 rounded-lg p-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                                      <Settings className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900">{permissionSet}</h4>
                                      <p className="text-xs text-gray-500">Permission Set</p>
                                      <p className="text-xs text-orange-600">Directly Assigned</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Debug Information */}
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug Info</h4>
                          <div className="text-xs text-yellow-700 space-y-1">
                            <p>selectedUser.permissions: {JSON.stringify(selectedUser.permissions)}</p>
                            <p>selectedUser.permissionSets: {JSON.stringify(selectedUser.permissionSets)}</p>
                            <p>userRolePermissions: {JSON.stringify(userRolePermissions)}</p>
                            <p>selectedUser object keys: {Object.keys(selectedUser).join(', ')}</p>
                          </div>
                        </div>

                        {/* No Permission Sets */}
                        {(!selectedUser.permissionSets || selectedUser.permissionSets.length === 0) && 
                         (!userRolePermissions || userRolePermissions.length === 0) && 
                         (!selectedUser.permissions || selectedUser.permissions.length === 0) &&
                         (!selectedUser.extraPermissions || selectedUser.extraPermissions.length === 0) && (
                          <p className="text-gray-500 text-center py-4">No permission sets assigned to this user</p>
                        )}

                        {/* Loading State */}
                        {userRolePermissionsLoading && (
                          <div className="text-center py-4">
                            <p className="text-gray-500">Loading role permissions...</p>
                          </div>
                        )}
                      </>
                    ) : (
                      // Edit mode - Two-panel permission sets interface
                      <div className="space-y-6">
                        {/* Profile Information (Read-only) */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">Profile Permission Sets (Read-only)</h4>
                          <p className="text-xs text-blue-600 mb-3">
                            These permission sets are inherited from the selected profile and cannot be modified directly.
                          </p>
                          
                          {/* Loading State */}
                          {profilePermissionsLoading && (
                            <div className="text-center py-4">
                              <div className="inline-flex items-center space-x-2 text-blue-600">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm">Updating profile permissions...</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Profile Permission Sets Display */}
                          {!profilePermissionsLoading && selectedUser.permissions && selectedUser.permissions.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {selectedUser.permissions.map((permissionSet: any) => (
                                <div key={permissionSet} className="bg-white border border-blue-200 rounded-lg p-3 opacity-75">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Settings className="h-3 w-3 text-blue-600" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900">{permissionSet}</h4>
                                      <p className="text-xs text-blue-600">From Profile</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* No Permission Sets */}
                          {!profilePermissionsLoading && (!selectedUser.permissions || selectedUser.permissions.length === 0) && (
                            <p className="text-blue-600 text-sm">No permission sets from profile</p>
                          )}
                        </div>

                        {/* Extra Permission Sets Selection */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-4">Add Extra Permission Sets</h4>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Available Permission Sets */}
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <h5 className="text-sm font-medium text-gray-900 mb-3">Available Permission Sets</h5>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {permissionSets
                                  .filter((permissionSet: any) => 
                                    // Filter out permission sets that are already inherited from profile
                                    !selectedUser.permissions?.includes(permissionSet.name)
                                  )
                                  .map((permissionSet: any) => (
                                  <label key={permissionSet.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingUserData.extraPermissionSets?.includes(permissionSet.id) || false}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setEditingUserData((prev: any) => ({
                                            ...prev,
                                            extraPermissionSets: [...(prev.extraPermissionSets || []), permissionSet.id]
                                          }));
                                        } else {
                                          setEditingUserData((prev: any) => ({
                                            ...prev,
                                            extraPermissionSets: prev.extraPermissionSets?.filter((id: string) => id !== permissionSet.id) || []
                                          }));
                                        }
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{permissionSet.name}</p>
                                      <p className="text-xs text-gray-500 truncate">{permissionSet.description || 'No description'}</p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Selected Extra Permission Sets */}
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <h5 className="text-sm font-medium text-gray-900 mb-3">Selected Extra Permission Sets</h5>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {editingUserData.extraPermissionSets && editingUserData.extraPermissionSets.length > 0 ? (
                                  editingUserData.extraPermissionSets.map((permissionSetId: string) => {
                                    const permissionSet = permissionSets.find(ps => ps.id === permissionSetId);
                                    if (!permissionSet) return null;
                                    
                                    return (
                                      <div key={permissionSetId} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">{permissionSet.name}</p>
                                          <p className="text-xs text-gray-500 truncate">{permissionSet.description || 'No description'}</p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingUserData((prev: any) => ({
                                              ...prev,
                                              extraPermissionSets: prev.extraPermissionSets?.filter((id: string) => id !== permissionSetId) || []
                                            }));
                                          }}
                                          className="ml-2 text-red-600 hover:text-red-800"
                                        >
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-gray-500 text-sm">No extra permission sets selected</p>
                                )}
                              </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <h5 className="text-sm font-medium text-gray-900 mb-3">Summary</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Profile Permission Sets:</span>
                                  <span className="font-medium">{selectedUser.permissions?.length || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Extra Permission Sets:</span>
                                  <span className="font-medium">{editingUserData.extraPermissionSets?.length || 0}</span>
                                </div>
                                <div className="border-t pt-2">
                                  <div className="flex justify-between font-medium">
                                    <span>Total Permission Sets:</span>
                                    <span>{(selectedUser.permissions?.length || 0) + (editingUserData.extraPermissionSets?.length || 0)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Form Actions - Only show when editing */}
                {isEditing && (
                  <div className="md:col-span-2 flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleEditUserSubmit}
                      disabled={!editingUserData.phone || !isPhoneValid(editingUserData.phone, editingUserData.countryCode)}
                      className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update User
                    </Button>
                  </div>
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


        {/* Users Table/Grid */}
        <SalesforceTableContainer>
          {/* Search and Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={usersSearch}
                      onChange={(e) => setUsersSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* View Mode Selector */}
                <select
                  value={usersViewMode}
                  onChange={(e) => setUsersViewMode(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="table">Table View</option>
                  <option value="card">Card View</option>
                </select>
              </div>
              
              {/* Create User Button and Alphabet Filter */}
              <div className="flex items-center justify-between">
                <Button onClick={handleCreateUser}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </Button>
                
                <AlphabetFilter
                  selectedFilter={usersFilter}
                  onFilterChange={(filter) => setUsersFilter(filter)}
                />
              </div>
              

            </div>
          </div>
          {usersViewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableTableHeader
                      field="name"
                      label="User"
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
                      field="username"
                      label="Username"
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
                      field="phone"
                      label="Phone"
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
                      field="enabled"
                      label="Status"
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
                  {paginatedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50"
                    >

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div 
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/admin/users/${user.id}`;
                              }}
                            >
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.phone || 'Not provided'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={user.enabled ? 'default' : 'secondary'}>
                          {user.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {paginatedUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/admin/users/${user.id}`;
                        }}
                      >
                        {user.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Username:</span>
                      <span className="text-gray-900 font-medium">{user.username}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Phone:</span>
                      <span className="text-gray-900 font-medium">{user.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Status:</span>
                      <Badge variant={user.enabled ? 'default' : 'secondary'} className="text-xs">
                        {user.enabled ? 'Active' : 'Inactive'}
                      </Badge>
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
            totalItems={searchedUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </SalesforceTableContainer>
      </div>

      {/* Delete modal removed - now deleting automatically */}

      <PasswordResetModal
        isOpen={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        userId={selectedUser?.id || ''}
        username={selectedUser?.username || ''}
        onSuccess={() => {
          setShowPasswordResetModal(false);
          showToast.success(`Password reset email sent successfully to ${selectedUser?.email || 'user email'}`);
        }}
      />

      <RoleUsersModal
        isOpen={showRoleUsersModal}
        onClose={() => setShowRoleUsersModal(false)}
        roleName={selectedUser?.name || 'Unknown Role'}
        users={roleUsers}
        loading={roleUsersLoading}
      />

      <UserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        onSave={async (userData) => {
          try {
            if (isCreating) {
              // Create new user
              const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: userData.name,
                  email: userData.email,
                  phone: userData.phoneNumber,
                  username: userData.username,
                  roles: userData.roles || [],
                  profile: (userData as any).profileId || null,
                  password: (userData as any).password,
                  enabled: userData.enabled,
                  status: userData.status || 'active'
                }),
              });

              if (response.ok) {
                showToast.success('User created successfully');
                setShowUserModal(false);
                setIsCreating(false);
                fetchData();
              } else {
                const error = await response.json();
                showToast.error(`Failed to create user: ${error.message || 'Unknown error'}`);
              }
            } else {
              // Update existing user
              const response = await fetch(`/api/admin/users/${userData.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  id: userData.id,
                  username: userData.username,
                  email: userData.email,
                  name: userData.name,
                  phone: userData.phoneNumber,
                  status: userData.status || 'active',
                  enabled: userData.enabled,
                  roles: userData.roles || [],
                  profile: (userData as any).profileId || null
                }),
              });

              if (response.ok) {
                showToast.success('User updated successfully');
                setShowUserModal(false);
                setIsEditing(false);
                fetchData();
              } else {
                const error = await response.json();
                showToast.error(`Failed to update user: ${error.message || 'Unknown error'}`);
              }
            }
          } catch (error) {
            showToast.error('Failed to save user');
          }
        }}
        user={selectedUser}
        mode={isCreating ? 'add' : 'edit'}
        loading={false}
        availableProfiles={profiles}
        availableRoles={roles}
      />



    </DashboardLayout>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UsersContent />
    </Suspense>
  );
}

