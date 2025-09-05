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
  Shield,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Users,
  ArrowLeft,
  ArrowRight,
  Search,
  Crown,
  Settings
} from 'lucide-react';

import RoleModal from "../../../components/RoleModal";
import { AlphabetFilter } from "@/components/ui/AlphabetFilter";
import { Pagination } from "@/components/ui/Pagination";
import { SortableTableHeader } from "@/components/ui/SortableTableHeader";
import { showToast } from '@/utils/toast';


function RolesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Search and filter states
  const [rolesSearch, setRolesSearch] = useState('');
  const [rolesFilter, setRolesFilter] = useState('All');
  const [rolesViewMode, setRolesViewMode] = useState('table');
  const [selectedRole, setSelectedRole] = useState<any>(null);
  
  // Sorting states
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  

  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [roleUsersLoading, setRoleUsersLoading] = useState(false);

  // Detail view states
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'roleInfo' | 'users'>('roleInfo');
  const [editingRoleData, setEditingRoleData] = useState<any>({
    name: '',
    description: '',
    phoneNumber: '',
    status: 'active',
    profileId: ''
  });
  const [creatingRoleData, setCreatingRoleData] = useState<any>({
    name: '',
    description: '',
    phoneNumber: '',
    status: 'active',
    profileId: ''
  });

  // Available profiles for assignment
  const [availableProfiles, setAvailableProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);









  // Keep ref in sync with state



  




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
    fetchAvailableProfiles(); // Call fetchAvailableProfiles on mount
  }, [status, router, searchParams]);

  // Reset sorting when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSortField('name');
    setSortDirection('asc');
  }, [rolesSearch, rolesFilter]);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      // Simple fetch without complex cache-busting - let the browser handle it
      const rolesResponse = await fetch('/api/admin/roles', {
        cache: isRefresh ? 'no-store' : 'default'
      });
      
      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json();
        // Roles API now includes user counts, so no need for additional API calls
        setRoles(rolesData);
        console.log('🔍 Roles data loaded with user counts included');
      }

      setLastUpdated(new Date());
    } catch (error) {
      showToast.error('Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAvailableProfiles = async () => {
    setProfilesLoading(true);
    try {
      const response = await fetch('/api/admin/profiles');
      if (response.ok) {
        const profilesData = await response.json();
        setAvailableProfiles(profilesData);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setProfilesLoading(false);
    }
  };

  const handleRefresh = () => {
    const loadingToast = showToast.loading('Refreshing data...');
    
    // Force refresh by clearing all states and refetching
    setSelectedRole(null);
    setSelectedRoleDetail(null);
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
    
    // Close modals
    setShowRoleModal(false);
    
    // Reset all states
    setSelectedRoleDetail(null);
    setSelectedRole(null);
    setIsEditing(false);
    setIsCreating(false);
    setActiveTab('roleInfo');
    setEditingRoleData({
      name: '',
      description: ''
    });
    setCreatingRoleData({
      name: '',
      description: ''
    });
  };

  // Fetch user count for a role without switching tabs
  const fetchUserCount = async (roleId: string) => {
    
    if (!roleId) return;
    
    try {
      // Check if user count is already available from the roles list
      const roleFromList = roles.find(r => r.id === roleId);
      if (roleFromList && roleFromList.userCount !== undefined) {
        console.log('🔍 User count already available from roles list:', roleFromList.userCount);
        // Update the selected role with the count from the list
        if (selectedRole && selectedRole.id === roleId) {
          const updatedRole = {
            ...selectedRole,
            userCount: roleFromList.userCount
          };
          setSelectedRole(updatedRole);
          setSelectedRoleDetail(updatedRole);
        }
        return;
      }
      
      // Only fetch if not already available
      const response = await fetch(`/api/admin/roles/${roleId}/users`);
      if (response.ok) {
        const data = await response.json();
        const users = data.users || data || [];
        
        // Only update if we have a valid selectedRole with full data
        if (selectedRole && selectedRole.id === roleId && selectedRole.name) {
          const updatedRole = {
            ...selectedRole,
            userCount: users.length
          };
          setSelectedRole(updatedRole);
          setSelectedRoleDetail(updatedRole);
          console.log('🔍 User count updated for role:', updatedRole.name, 'Users:', users.length);
        } else {
          console.log('🔍 Skipping user count update - selectedRole not properly set yet');
        }
      }
    } catch (error) {
      console.error('🔍 Error fetching user count:', error);
    }
  };

  // Note: fetchAllRoleUserCounts function removed - user counts are now included in the main roles API response

  const handleRecordClick = (record: any) => {
    
    console.log('🔍 Role clicked:', record);
    console.log('🔍 Setting selectedRole to:', record);
    
    // Set the role data first
    setSelectedRoleDetail(record);
    setSelectedRole(record);
    setActiveTab('roleInfo'); // Reset to Role Info tab
    
    console.log('🔍 After setting - selectedRole should be:', record);
    
    // Wait a bit for state to update, then fetch user count
    setTimeout(() => {
      fetchUserCount(record.id);
    }, 100);
  };

  const handleCreateRole = () => {
    setIsCreating(true);
  };

  // Create role form submission function
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!creatingRoleData.name || !creatingRoleData.description) {
      showToast.error('Please fill all required fields');
      return;
    }

    try {
      // Prepare role data
      const roleData = {
        name: creatingRoleData.name,
        description: creatingRoleData.description
      };

      // Create role
      const response = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleData),
      });

      if (response.ok) {
        showToast.success('Role created successfully');
        router.refresh();
        fetchData(true); // Force refresh the role list
        handleBackToList();
      } else {
        const error = await response.json();
        showToast.error(`Failed to create role: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      showToast.error('Failed to create role');
    }
  };

  const handleEditRole = () => {
    setIsEditing(true);
    setEditingRoleData({
      name: selectedRole.name || '',
      description: selectedRole.description || ''
    });
  };

  // Edit role form submission function for inline editing
  const handleEditRoleSubmit = async () => {
    if (!selectedRole) {
      showToast.error('No role selected for editing');
      return;
    }

    try {
      // Prepare role data for update
      const roleData = {
        name: editingRoleData.name,
        description: editingRoleData.description
      };

      // Update role
      const response = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleData),
      });

      if (response.ok) {
        showToast.success('Role updated successfully');
        setIsEditing(false); // Return to display mode
        router.refresh();
        fetchData(true); // Force refresh the role list
      } else {
        const error = await response.json();
        showToast.error(`Failed to update role: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      showToast.error('Failed to update role');
    }
  };

  const handleSaveRole = async (roleData: any) => {
    try {
      if (isEditing) {
        // Update existing role
        const response = await fetch(`/api/admin/roles/${editingRoleData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roleData),
        });

        if (response.ok) {
          showToast.success('Role updated successfully');
          setShowRoleModal(false);
          setIsEditing(false);
          router.refresh();
          fetchData(true);
        } else {
          const error = await response.json();
          showToast.error(`Failed to update role: ${error.message || 'Unknown error'}`);
        }
      } else {
        // Create new role
        const response = await fetch('/api/admin/roles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roleData),
        });

        if (response.ok) {
          showToast.success('Role created successfully');
          setShowRoleModal(false);
          setIsCreating(false);
          router.refresh();
          fetchData(true);
        } else {
          const error = await response.json();
          showToast.error(`Failed to create role: ${error.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      showToast.error('Failed to save role');
    }
  };



  const confirmDeleteRole = async (roleToDelete?: any) => {
    // Use passed role or fall back to selectedRole
    const role = roleToDelete || selectedRole;
    
    if (!role) {
      console.error('❌ No role provided! Cannot delete.');
      return;
    }
    
    // Show loading toast
    const loadingToast = showToast.loading('Deleting role...');
    
    try {
      console.log('🗑️ Starting deletion for role:', role.name);
      
      // Try to remove assignments first, but continue if endpoints don't exist
      let assignmentsRemoved = 0;
      
      try {
        // Step 1: Try to remove all user assignments for this role
        console.log('🔧 Step 1: Attempting to remove user assignments...');
        const removeUserAssignmentsResponse = await fetch(`/api/admin/roles/${role.id}/users`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (removeUserAssignmentsResponse.ok) {
          const result = await removeUserAssignmentsResponse.json();
          console.log('✅ User assignments removed successfully');
          if (result.removedUsers) {
            assignmentsRemoved += result.removedUsers;
          }
        } else if (removeUserAssignmentsResponse.status === 404) {
          console.log('ℹ️ User assignment removal endpoint not available, skipping...');
        } else {
          console.warn('⚠️ Warning: Failed to remove user assignments');
        }
      } catch (error) {
        console.log('ℹ️ User assignment removal failed, continuing with deletion...');
      }

      try {
        // Step 2: Try to remove all permission set assignments for this role
        console.log('🔧 Step 2: Attempting to remove permission set assignments...');
        const removePermissionSetAssignmentsResponse = await fetch(`/api/admin/roles/${role.id}/permission-sets`, {
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

      // Step 3: Delete the role itself
      console.log('🗑️ Step 3: Deleting role...');
      const deleteResponse = await fetch(`/api/admin/roles/${role.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (deleteResponse.ok) {
        console.log('🗑️ Role deleted successfully, showing toast...');
        
        // Show success message
        let successMessage = 'Role deleted successfully';
        if (assignmentsRemoved > 0) {
          successMessage += `. Removed ${assignmentsRemoved} assignment(s)`;
        }
        
        showToast.success(successMessage);
        
        console.log('🗑️ Clearing states and refreshing data...');
        // Clear selected role states
        setSelectedRole(null);
        setSelectedRoleDetail(null);
        
        // Force refresh the roles list with cache busting
        router.refresh();
        fetchData(true);
        
        console.log('🗑️ Delete operation completed successfully');
      } else {
        const errorText = await deleteResponse.text();
        console.error('❌ Failed to delete role. Response:', errorText);
        
        let errorMessage = 'Failed to delete role';
        
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
          if (errorText.includes('Cannot delete role')) {
            errorMessage = errorText;
          }
        }
        
        showToast.error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error deleting role:', error);
      showToast.error('Failed to delete role');
    } finally {
      // Dismiss loading toast
      showToast.dismiss(loadingToast);
    }
  };



  const handleViewUsers = async () => {
    if (!selectedRole) return;
    
    console.log('🔍 Fetching users for role:', selectedRole.id, selectedRole.name);
    setRoleUsersLoading(true);
    
    try {
      // Fetch users for this role
      const response = await fetch(`/api/admin/roles/${selectedRole.id}/users`);
      console.log('🔍 API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 API response data:', data);
        
        // Handle the response structure: { users: [...] }
        const users = data.users || data || [];
        console.log('🔍 Users extracted:', users);
        
        setRoleUsers(users);
        
        // Update the selectedRole and selectedRoleDetail with the correct user count
        const updatedRole = {
          ...selectedRole,
          userCount: users.length
        };
        setSelectedRole(updatedRole);
        setSelectedRoleDetail(updatedRole);
        
        console.log('🔍 Updated role with user count:', updatedRole);
        
        // Set active tab to users to show the users list
        setActiveTab('users');
        
        if (users.length === 0) {
          console.log('🔍 No users found for role:', selectedRole.name);
        } else {
          console.log('🔍 Found users for role:', users.length);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 API error response:', errorData);
        setRoleUsers([]);
        showToast.error(`Failed to fetch role users: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('🔍 Error fetching role users:', error);
      setRoleUsers([]);
      showToast.error('Failed to fetch role users');
    } finally {
      setRoleUsersLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSelectAllRoles = () => {
    if (selectedRoles.length === paginatedRoles.length) {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(paginatedRoles.map(role => role.id));
    }
  };

  const handleRoleSelection = (roleId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedRoles((prev: string[]) => [...prev, roleId]);
    } else {
              setSelectedRoles((prev: string[]) => prev.filter(id => id !== roleId));
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

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const filteredRoles = filterByAlphabet(roles, rolesFilter, 'name');
  const searchedRoles = filteredRoles.filter(role =>
    role.name?.toLowerCase().includes(rolesSearch.toLowerCase()) ||
    role.description?.toLowerCase().includes(rolesSearch.toLowerCase())
  );
  const sortedRoles = sortData(searchedRoles, sortField, sortDirection);
  const paginatedRoles = getPaginatedData(sortedRoles, currentPage, itemsPerPage);
  const totalPages = getTotalPages(sortedRoles, itemsPerPage);

  const banner = (
    <HeadingCard
      title="Role Management"
      subtitle="Manage user roles and permissions"
      Icon={Shield}
      rightSlot={
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}</span>
          <RefreshButton
            endpoint="/api/admin/roles"
            onData={(data) => { setRoles(data); setLastUpdated(new Date()); }}
            className="h-9 px-3"
            disabled={refreshing}
          />
        </div>
      }
    />
  );

  // Show create role form when isCreating is true
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
              Back to Roles
            </Button>
          </div>

          {/* Create Role Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create New Role</h2>
                <p className="text-gray-600">Add a new role to the system</p>
              </div>
            </div>

            {/* Custom Create Role Form */}
            <form onSubmit={handleCreateRoleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Role Name */}
                <div>
                  <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-2">
                    Role Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="roleName"
                    value={creatingRoleData.name || ''}
                    onChange={(e) => setCreatingRoleData((prev: any) => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter role name"
                  />
                </div>

                {/* Role Description */}
                <div>
                  <label htmlFor="roleDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id="roleDescription"
                    value={creatingRoleData.description || ''}
                    onChange={(e) => setCreatingRoleData((prev: any) => ({ ...prev, description: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter role description"
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
                  disabled={!creatingRoleData.name || !creatingRoleData.description}
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

  if (selectedRoleDetail) {
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
              Back to Roles
            </Button>
          </div>

          {/* Role Detail View */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedRole.name}</h2>
                <p className="text-gray-600">{selectedRole.description}</p>
              </div>

              
              



              <div className="flex gap-2">
                <Button onClick={handleEditRole} disabled={isEditing}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => confirmDeleteRole(selectedRole)}
                  disabled={isEditing}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>



            {/* Tab Content */}
            {activeTab === 'roleInfo' && (
              <>

                
                {/* Role Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Information</h3>
                    <div className="space-y-4">
                      {/* Role Name */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">
                          Role Name {isEditing && <span className="text-red-600">*</span>}
                        </label>
                        {!isEditing ? (
                          <p className="text-gray-900 font-medium">{selectedRole.name || 'Not provided'}</p>
                        ) : (
                          <input
                            type="text"
                            value={editingRoleData.name || ''}
                            onChange={(e) => setEditingRoleData((prev: any) => ({ ...prev, name: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter role name"
                          />
                        )}
                      </div>

                      {/* Role Description */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">
                          Description {isEditing && <span className="text-red-600">*</span>}
                        </label>
                        {!isEditing ? (
                          <p className="text-gray-900">{selectedRole.description || 'No description provided'}</p>
                        ) : (
                          <textarea
                            value={editingRoleData.description || ''}
                            onChange={(e) => setEditingRoleData((prev: any) => ({ ...prev, description: e.target.value }))}
                            required
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter role description"
                          />
                        )}
                      </div>

                      {/* Role Level - REMOVED */}
                      
                      {/* Parent Role - REMOVED */}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                    <div className="space-y-4">
                      {/* Role ID */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Role ID</label>
                        <p className="text-gray-900 font-mono text-sm">{selectedRole.id || 'Not available'}</p>
                      </div>

                      {/* User Count */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Users Assigned</label>
                        <p className="text-gray-900">{selectedRole.userCount || 0} users</p>
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
                            onClick={handleEditRoleSubmit}
                            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Update Role
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'users' && (
              <div>
                
                
                {/* Debug Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Debug: Users Data</h4>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <p>roleUsers array: {JSON.stringify(roleUsers)}</p>
                    <p>roleUsers length: {roleUsers?.length || 0}</p>
                    <p>roleUsersLoading: {roleUsersLoading ? 'true' : 'false'}</p>
                    <p>Selected role: {selectedRole?.name} (ID: {selectedRole?.id})</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  {roleUsersLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-flex items-center space-x-2 text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span className="text-sm">Loading users...</span>
                      </div>
                    </div>
                  ) : roleUsers.length > 0 ? (
                    <div className="space-y-3">
                      {roleUsers.map((user: any) => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {user.username || 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                              {user.profile && (
                                <p className="text-xs text-blue-600">Profile: {user.profile}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.enabled ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No users assigned</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        This role doesn't have any users assigned to it yet.
                      </p>
                    </div>
                  )}
                </div>
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
        

                 {/* Roles Table/Grid */}
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
                       placeholder="Search roles..."
                       value={rolesSearch}
                       onChange={(e) => setRolesSearch(e.target.value)}
                       className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                 </div>
                 
                 {/* View Mode Selector */}
                 <select
                   value={rolesViewMode}
                   onChange={(e) => setRolesViewMode(e.target.value)}
                   className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 >
                   <option value="table">Table View</option>
                   <option value="card">Card View</option>
                 </select>
               </div>
               
               {/* Create Role Button and Alphabet Filter */}
               <div className="flex items-center flex-wrap gap-2">
                 <Button onClick={handleCreateRole}>
                   <Plus className="mr-2 h-4 w-4" />
                   Create
                 </Button>
                 
                 <AlphabetFilter
                   className="flex-1"
                   selectedFilter={rolesFilter}
                   onFilterChange={(filter) => setRolesFilter(filter)}
                 />
               </div>
             </div>
           </div>
          {rolesViewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableTableHeader
                      field="name"
                      label="Role"
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
                  {paginatedRoles.map((role) => (
                    <tr
                      key={role.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Shield className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div 
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/admin/roles/${role.id}`;
                              }}
                            >
                              {role.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {role.description || 'No description'}
                      </td>
                      

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {paginatedRoles.map((role) => (
                <div
                  key={role.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/admin/roles/${role.id}`;
                        }}
                      >
                        {role.name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-2">
                      {role.description || 'No description provided'}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Users:</span>
                      <span className="text-gray-900 font-medium">{role.userCount || 0}</span>
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
            totalItems={searchedRoles.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </SalesforceTableContainer>
      </div>



      <RoleModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSave={handleSaveRole}
        role={isEditing ? editingRoleData : creatingRoleData}
        mode={isEditing ? 'edit' : 'add'}
        loading={false}
        availableProfiles={availableProfiles}
      />





    </DashboardLayout>
  );
}

export default function RolesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RolesContent />
    </Suspense>
  );
}
