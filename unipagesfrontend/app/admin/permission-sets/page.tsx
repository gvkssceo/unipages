'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import HeadingCard from '@/components/ui/HeadingCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SalesforceTableContainer } from '@/components/ui/SalesforceContainer';
import { ChevronLeftIcon } from '@/components/ui/icons';
import {
  Key,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Database,
  ArrowLeft,
  ArrowRight,
  Search,
  Settings,
  Save,
  X
} from 'lucide-react';

import PermissionSetModal from "../../../components/PermissionSetModal";
import InlineTableManager from "../../../components/InlineTableManager";
import { AlphabetFilter } from "@/components/ui/AlphabetFilter";
import { Pagination } from "@/components/ui/Pagination";
import { SortableTableHeader } from "@/components/ui/SortableTableHeader";
import { showToast } from '@/utils/toast';
import { cn } from '@/lib/utils';


interface PermissionSetData {
  name: string;
  description: string;
}

function PermissionSetsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [permissionSets, setPermissionSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Search and filter states
  const [permissionSetsSearch, setPermissionSetsSearch] = useState('');
  const [permissionSetsFilter, setPermissionSetsFilter] = useState('All');
  const [permissionSetsViewMode, setPermissionSetsViewMode] = useState('table');
  const [selectedPermissionSet, setSelectedPermissionSet] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedPermissionSets, setSelectedPermissionSets] = useState<string[]>([]);
  
  // Sorting states
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Detail view states
  const [selectedPermissionSetDetail, setSelectedPermissionSetDetail] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'tables' | 'fields'>('info');
  const [editingPermissionSetData, setEditingPermissionSetData] = useState<PermissionSetData>({
    name: '',
    description: ''
  });
  const [creatingPermissionSetData, setCreatingPermissionSetData] = useState<PermissionSetData>({
    name: '',
    description: ''
  });

  // Tables and Fields states
  const [permissionSetTables, setPermissionSetTables] = useState<any[]>([]);
  const [permissionSetFields, setPermissionSetFields] = useState<any[]>([]);
  const [allAvailableTables, setAllAvailableTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [loadingAllTables, setLoadingAllTables] = useState(false);
  
  // Editing permissions states
  const [editingTablePermissions, setEditingTablePermissions] = useState<{[key: string]: any}>({});
  const [editingFieldPermissions, setEditingFieldPermissions] = useState<{[key: string]: any}>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Modal states
  const [showPermissionSetModal, setShowPermissionSetModal] = useState(false);

  // Debug: Track state changes
  useEffect(() => {
    console.log('🔄 [STATE] permissionSets state changed:', permissionSets.length, 'items');
    console.log('🔄 [STATE] permissionSets items:', permissionSets.map(ps => ({ id: ps.id, name: ps.name })));
  }, [permissionSets]);

  useEffect(() => {
    console.log('🔄 [STATE] loading state changed:', loading);
  }, [loading]);

  useEffect(() => {
    console.log('🔄 [STATE] refreshing state changed:', refreshing);
  }, [refreshing]);

  useEffect(() => {
    console.log('🔄 [STATE] selectedPermissionSet state changed:', selectedPermissionSet);
  }, [selectedPermissionSet]);

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
  }, [status, router, searchParams]);

  // Reset sorting when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
    setSortField('name');
    setSortDirection('asc');
  }, [permissionSetsSearch, permissionSetsFilter]);

  const fetchData = async (isRefresh = false) => {
    console.log('🔄 [FETCH_DATA] Starting fetchData with isRefresh:', isRefresh);
    console.log('🔄 [FETCH_DATA] Current permissionSets state before fetch:', permissionSets.length, 'items');
    
    if (isRefresh) {
      setRefreshing(true);
      console.log('🔄 [FETCH_DATA] Set refreshing to true');
    }

    try {
      // Add cache busting parameter for refresh requests
      const url = isRefresh 
        ? `/api/admin/permission-sets?t=${Date.now()}` 
        : '/api/admin/permission-sets';
        
      console.log('🔄 [FETCH_DATA] Fetching from URL:', url);
      console.log('🔄 [FETCH_DATA] Cache strategy:', isRefresh ? 'no-store' : 'default');
        
      const permissionSetsResponse = await fetch(url, {
        cache: isRefresh ? 'no-store' : 'default',
        headers: isRefresh ? {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        } : {}
      });
      
      console.log('🔄 [FETCH_DATA] Response status:', permissionSetsResponse.status);
      console.log('🔄 [FETCH_DATA] Response ok:', permissionSetsResponse.ok);
      
      if (permissionSetsResponse.ok) {
        const permissionSetsData = await permissionSetsResponse.json();
        console.log('🔄 [FETCH_DATA] Received data:', permissionSetsData);
        console.log('🔄 [FETCH_DATA] Data length:', permissionSetsData.length);
        console.log('🔄 [FETCH_DATA] Data items:', permissionSetsData.map((ps: any) => ({ id: ps.id, name: ps.name })));
        
        setPermissionSets(permissionSetsData);
        console.log('✅ [FETCH_DATA] Permission sets state updated with', permissionSetsData.length, 'items');
      } else {
        console.error('❌ [FETCH_DATA] Failed to fetch permission sets:', permissionSetsResponse.status);
        console.error('❌ [FETCH_DATA] Response status text:', permissionSetsResponse.statusText);
        showToast.error('Failed to fetch permission sets data');
      }

      setLastUpdated(new Date());
      console.log('🔄 [FETCH_DATA] Last updated timestamp set');
    } catch (error) {
      console.error('❌ [FETCH_DATA] Error fetching permission sets:', error);
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
    setSelectedPermissionSet(null);
    setSelectedPermissionSetDetail(null);
    setIsEditing(false);
    setIsCreating(false);
    setPermissionSetTables([]);
    setPermissionSetFields([]);
    setAllAvailableTables([]);
    setEditingTablePermissions({});
    setEditingFieldPermissions({});
    
    // Force Next.js router refresh to clear any cached page data
    router.refresh();
    
    // Clear any cached data and force fresh fetch
    fetchData(true).finally(() => {
      showToast.dismiss(loadingToast);
      showToast.success('Data refreshed successfully');
    });
  };

  const handleBackToList = () => {
    setSelectedPermissionSetDetail(null);
    setSelectedPermissionSet(null);
    setIsEditing(false);
    setIsCreating(false);
    setActiveTab('info');
    setPermissionSetTables([]);
    setPermissionSetFields([]);
    setAllAvailableTables([]);
    setEditingPermissionSetData({
      name: '',
      description: ''
    });
    setCreatingPermissionSetData({
      name: '',
      description: ''
    });
  };

  const handleRecordClick = (record: any) => {
    setSelectedPermissionSetDetail(record);
    setSelectedPermissionSet(record);
    setActiveTab('info');
    fetchPermissionSetTables(record.id);
    fetchPermissionSetFields(record.id);
    fetchAllAvailableTables();
  };

  const fetchPermissionSetTables = async (permissionSetId: string) => {
    if (!permissionSetId) return;
    
    setLoadingTables(true);
    try {
      const response = await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`);
      if (response.ok) {
        const data = await response.json();
        setPermissionSetTables(data.tables || []);
      } else {
        setPermissionSetTables([]);
      }
    } catch (error) {
      setPermissionSetTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  const fetchAllAvailableTables = async () => {
    setLoadingAllTables(true);
    try {
      const response = await fetch('/api/admin/tables');
      if (response.ok) {
        const data = await response.json();
        setAllAvailableTables(data || []);
      } else {
        setAllAvailableTables([]);
      }
    } catch (error) {
      setAllAvailableTables([]);
    } finally {
      setLoadingAllTables(false);
    }
  };

  const fetchPermissionSetFields = async (permissionSetId: string) => {
    if (!permissionSetId) return;
    
    setLoadingFields(true);
    try {
      const response = await fetch(`/api/admin/permission-sets/${permissionSetId}/fields`);
      if (response.ok) {
        const data = await response.json();
        setPermissionSetFields(data.fields || []);
      } else {
        setPermissionSetFields([]);
      }
    } catch (error) {
      setPermissionSetFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  const handleTablesTabClick = () => {
    if (selectedPermissionSet && !isEditing) {
      fetchPermissionSetTables(selectedPermissionSet.id);
    }
  };

  const handleFieldsTabClick = () => {
    if (selectedPermissionSet && !isEditing) {
      fetchPermissionSetFields(selectedPermissionSet.id);
    }
  };

  const handleCreatePermissionSet = () => {
    setIsCreating(true);
  };

  // Create permission set form submission function
  const handleCreatePermissionSetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('➕ [CREATE] handleCreatePermissionSetSubmit called');
    console.log('➕ [CREATE] creatingPermissionSetData:', creatingPermissionSetData);
    
    if (!creatingPermissionSetData.name || !creatingPermissionSetData.description) {
      console.error('❌ [CREATE] Missing required fields');
      showToast.error('Please fill all required fields');
      return;
    }

    try {
      // Prepare permission set data
      const permissionSetData = {
        name: creatingPermissionSetData.name,
        description: creatingPermissionSetData.description
      };
      console.log('➕ [CREATE] Permission set data to create:', permissionSetData);

      // Create permission set
      const response = await fetch('/api/admin/permission-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissionSetData),
      });

      console.log('➕ [CREATE] Create response status:', response.status);
      console.log('➕ [CREATE] Create response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [CREATE] Permission set created successfully, result:', result);
        showToast.success('Permission set created successfully');
        
        console.log('✅ [CREATE] Calling router.refresh()');
        router.refresh();
        
        console.log('✅ [CREATE] Force refreshing data...');
        fetchData(true); // Force refresh the permission sets list
        console.log('✅ [CREATE] Data refresh initiated');
        
        console.log('✅ [CREATE] Calling handleBackToList()');
        handleBackToList();
      } else {
        const error = await response.json();
        console.error('❌ [CREATE] Failed to create permission set:', error);
        showToast.error(`Failed to create permission set: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [CREATE] Error creating permission set:', error);
      console.error('❌ [CREATE] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      showToast.error('Failed to create permission set');
    }
  };

  // Updated Edit button handler
  const handleEdit = () => {
    setIsEditing(true);
    setEditingPermissionSetData({
      name: selectedPermissionSet.name || '',
      description: selectedPermissionSet.description || ''
    });
    
    // Initialize field permissions for editing
    const initialFieldPermissions: {[key: string]: any} = {};
    permissionSetFields.forEach(field => {
      initialFieldPermissions[field.id] = {
        can_view: field.can_view,
        can_edit: field.can_edit
      };
    });
    setEditingFieldPermissions(initialFieldPermissions);
    
    // Initialize table permissions for editing
    const initialTablePermissions: {[key: string]: any} = {};
    permissionSetTables.forEach(table => {
      initialTablePermissions[table.id] = {
        can_create: table.can_create,
        can_read: table.can_read,
        can_update: table.can_update,
        can_delete: table.can_delete
      };
    });
    setEditingTablePermissions(initialTablePermissions);
  };

  // Edit permission set form submission function for inline editing
  const handleEditPermissionSetSubmit = async () => {
    console.log('✏️ [EDIT] handleEditPermissionSetSubmit called');
    console.log('✏️ [EDIT] selectedPermissionSet:', selectedPermissionSet);
    console.log('✏️ [EDIT] editingPermissionSetData:', editingPermissionSetData);
    
    if (!selectedPermissionSet) {
      console.error('❌ [EDIT] No permission set selected for editing');
      showToast.error('No permission set selected for editing');
      return;
    }

    try {
      // Prepare permission set data for update
      const permissionSetData = {
        name: editingPermissionSetData.name,
        description: editingPermissionSetData.description
      };
      console.log('✏️ [EDIT] Permission set data to update:', permissionSetData);

      const updateUrl = `/api/admin/permission-sets/${selectedPermissionSet.id}`;
      console.log('✏️ [EDIT] Update URL:', updateUrl);

      // Update permission set
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(permissionSetData),
      });

      console.log('✏️ [EDIT] Update response status:', response.status);
      console.log('✏️ [EDIT] Update response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [EDIT] Permission set updated successfully, result:', result);
        showToast.success('Permission set updated successfully');
        setIsEditing(false); // Return to display mode
        console.log('✅ [EDIT] Set isEditing to false');
        
        console.log('✅ [EDIT] Calling router.refresh()');
        router.refresh();
        
        console.log('✅ [EDIT] Force refreshing data...');
        fetchData(true); // Force refresh the permission sets list
        console.log('✅ [EDIT] Data refresh initiated');
      } else {
        const error = await response.json();
        console.error('❌ [EDIT] Failed to update permission set:', error);
        showToast.error(`Failed to update permission set: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ [EDIT] Error updating permission set:', error);
      console.error('❌ [EDIT] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      showToast.error('Failed to update permission set');
    }
  };

  const handleDeletePermissionSet = async () => {
    console.log('🔍 Delete button clicked!');
    console.log('🔍 selectedPermissionSet:', selectedPermissionSet);
    console.log('🔍 selectedPermissionSetDetail:', selectedPermissionSetDetail);
    
    if (!selectedPermissionSet) {
      console.error('❌ No permission set selected! Cannot delete.');
      showToast.error('Please select a permission set first');
      return;
    }
    
    // Direct delete - no confirmation needed
    await confirmDeletePermissionSet();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSelectAllPermissionSets = () => {
    if (selectedPermissionSets.length === paginatedPermissionSets.length) {
      setSelectedPermissionSets([]);
    } else {
      setSelectedPermissionSets(paginatedPermissionSets.map(permissionSet => permissionSet.id));
    }
  };

  const handlePermissionSetSelection = (permissionSetId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedPermissionSets(prev => [...prev, permissionSetId]);
    } else {
      setSelectedPermissionSets(prev => prev.filter(id => id !== permissionSetId));
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
    return isEditing || Object.keys(editingTablePermissions).length > 0 || Object.keys(editingFieldPermissions).length > 0;
  };

  // Handle table permission changes - auto-save
  const handleTablePermissionChange = async (tableId: string, permission: string, value: boolean) => {
    if (!selectedPermissionSet) return;
    
    // Update local state immediately for UI responsiveness
    setEditingTablePermissions(prev => ({
      ...prev,
      [tableId]: {
        ...prev[tableId],
        [permission]: value
      }
    }));

    // Auto-save to database
    try {
      const currentPermissions = editingTablePermissions[tableId] || {};
      const updatedPermissions = {
        ...currentPermissions,
        [permission]: value
      };

      const response = await fetch(`/api/admin/permission-sets/${selectedPermissionSet.id}/tables`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableId,
          permissions: updatedPermissions
        }),
      });

      if (response.ok) {
        // Update the local table data to reflect the change
        setPermissionSetTables(prev => 
          prev.map(table => 
            table.id === tableId 
              ? { ...table, [permission]: value }
              : table
          )
        );
      } else {
        // Revert the change if save failed
        setEditingTablePermissions(prev => ({
          ...prev,
          [tableId]: {
            ...prev[tableId],
            [permission]: !value
          }
        }));
        const error = await response.json();
        showToast.error(`Failed to update table permission: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      // Revert the change if save failed
      setEditingTablePermissions(prev => ({
        ...prev,
        [tableId]: {
          ...prev[tableId],
          [permission]: !value
        }
      }));
      showToast.error('Failed to update table permission');
    }
  };

  // Handle field permission changes - auto-save
  const handleFieldPermissionChange = async (fieldId: string, permission: string, value: boolean) => {
    if (!selectedPermissionSet) return;
    
    // Update local state immediately for UI responsiveness
    setEditingFieldPermissions(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [permission]: value
      }
    }));

    // Auto-save to database
    try {
      const currentPermissions = editingFieldPermissions[fieldId] || {};
      const updatedPermissions = {
        ...currentPermissions,
        [permission]: value
      };

      const response = await fetch(`/api/admin/permission-sets/${selectedPermissionSet.id}/fields`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldId,
          permissions: updatedPermissions
        }),
      });

      if (response.ok) {
        // Update the local field data to reflect the change
        setPermissionSetFields(prev => 
          prev.map(field => 
            field.id === fieldId 
              ? { ...field, [permission]: value }
              : field
          )
        );
      } else {
        // Revert the change if save failed
        setEditingFieldPermissions(prev => ({
          ...prev,
          [fieldId]: {
            ...prev[fieldId],
            [permission]: !value
          }
        }));
        const error = await response.json();
        showToast.error(`Failed to update field permission: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      // Revert the change if save failed
      setEditingFieldPermissions(prev => ({
        ...prev,
        [fieldId]: {
          ...prev[fieldId],
          [permission]: !value
        }
      }));
      showToast.error('Failed to update field permission');
    }
  };

  const confirmDeletePermissionSet = async () => {
    console.log('🗑️ [DELETE] confirmDeletePermissionSet called');
    console.log('🗑️ [DELETE] selectedPermissionSet:', selectedPermissionSet);
    console.log('🗑️ [DELETE] Current permissionSets state before deletion:', permissionSets.length, 'items');
    console.log('🗑️ [DELETE] Current permissionSets items:', permissionSets.map(ps => ({ id: ps.id, name: ps.name })));
    
    if (!selectedPermissionSet) {
      console.error('❌ [DELETE] No permission set selected! Cannot delete.');
      return;
    }
    
    // Show loading toast
    const loadingToast = showToast.loading('Deleting permission set...');
    console.log('🗑️ [DELETE] Loading toast shown');
    
    // Store the permission set to delete for optimistic UI update
    const permissionSetToDelete = selectedPermissionSet;
    console.log('🗑️ [DELETE] Stored permission set to delete:', permissionSetToDelete);
    
    try {
      console.log('🗑️ [DELETE] Starting deletion process for permission set:', permissionSetToDelete.name);
      console.log('🗑️ [DELETE] Permission set ID to delete:', permissionSetToDelete.id);
      
      // Optimistically update the UI immediately
      console.log('🗑️ [DELETE] Applying optimistic UI update...');
      const beforeOptimisticUpdate = permissionSets.length;
      setPermissionSets(prev => {
        const filtered = prev.filter(ps => ps.id !== permissionSetToDelete.id);
        console.log('🗑️ [DELETE] Optimistic update - before:', prev.length, 'after:', filtered.length);
        console.log('🗑️ [DELETE] Optimistic update - filtered items:', filtered.map(ps => ({ id: ps.id, name: ps.name })));
        return filtered;
      });
      setSelectedPermissionSet(null);
      setSelectedPermissionSetDetail(null);
      console.log('🗑️ [DELETE] Optimistic UI update completed');
      
      // Step 1: Remove all profile assignments for this permission set
      console.log('🔧 [DELETE] Step 1: Removing profile assignments...');
      const removeAssignmentsUrl = `/api/admin/permission-sets/${permissionSetToDelete.id}/profiles`;
      console.log('🔧 [DELETE] Remove assignments URL:', removeAssignmentsUrl);
      
      const removeAssignmentsResponse = await fetch(removeAssignmentsUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔧 [DELETE] Remove assignments response status:', removeAssignmentsResponse.status);
      console.log('🔧 [DELETE] Remove assignments response ok:', removeAssignmentsResponse.ok);

      if (!removeAssignmentsResponse.ok) {
        const assignmentError = await removeAssignmentsResponse.json();
        console.warn('⚠️ [DELETE] Warning: Failed to remove some profile assignments:', assignmentError);
        // Continue with deletion even if assignment removal fails
      } else {
        console.log('✅ [DELETE] Profile assignments removed successfully');
      }

      // Step 2: Delete the permission set
      console.log('🗑️ [DELETE] Step 2: Deleting permission set...');
      const deleteUrl = `/api/admin/permission-sets/${permissionSetToDelete.id}`;
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
        console.log('✅ [DELETE] Permission set deleted successfully, result:', result);
        console.log('✅ [DELETE] Showing success toast...');
        
        // Show success message with details about removed profiles
        if (result.removedProfiles && result.removedProfiles > 0) {
          showToast.success(`Permission set deleted successfully. Removed ${result.removedProfiles} profile assignment(s).`);
          console.log('✅ [DELETE] Success toast shown with profile count:', result.removedProfiles);
        } else {
          showToast.success('Permission set deleted successfully');
          console.log('✅ [DELETE] Success toast shown');
        }
        
        console.log('✅ [DELETE] Clearing all related states...');
        
        // Clear all related states
        setPermissionSetTables([]);
        setPermissionSetFields([]);
        setAllAvailableTables([]);
        setEditingTablePermissions({});
        setEditingFieldPermissions({});
        setIsEditing(false);
        setIsCreating(false);
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
        const error = await deleteResponse.json();
        console.error('❌ [DELETE] Failed to delete permission set:', error);
        console.error('❌ [DELETE] Error response status:', deleteResponse.status);
        
        // Revert the optimistic update by refetching data
        console.log('❌ [DELETE] Reverting optimistic update by refetching data...');
        await fetchData(true);
        console.log('❌ [DELETE] Data refetch completed for error recovery');
        
        // Better error message handling
        let errorMessage = 'Unknown error';
        if (error.error) {
          errorMessage = error.error;
          if (error.details) {
            errorMessage += `: ${error.details}`;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        console.log('❌ [DELETE] Showing error toast with message:', errorMessage);
        showToast.error(`Failed to delete permission set: ${errorMessage}`);
      }
    } catch (error) {
      console.error('❌ [DELETE] Error deleting permission set:', error);
      console.error('❌ [DELETE] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Revert the optimistic update by refetching data
      console.log('❌ [DELETE] Reverting optimistic update due to error...');
      await fetchData(true);
      console.log('❌ [DELETE] Data refetch completed for error recovery');
      
      showToast.error('Failed to delete permission set');
    } finally {
      // Dismiss loading toast
      console.log('🗑️ [DELETE] Dismissing loading toast');
      showToast.dismiss(loadingToast);
      console.log('🗑️ [DELETE] Delete operation finished');
    }
  };


  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const filteredPermissionSets = filterByAlphabet(permissionSets, permissionSetsFilter, 'name');
  const searchedPermissionSets = filteredPermissionSets.filter(permissionSet =>
    permissionSet.name?.toLowerCase().includes(permissionSetsSearch.toLowerCase()) ||
    permissionSet.description?.toLowerCase().includes(permissionSetsSearch.toLowerCase())
  );
  const sortedPermissionSets = sortData(searchedPermissionSets, sortField, sortDirection);
  const paginatedPermissionSets = getPaginatedData(sortedPermissionSets, currentPage, itemsPerPage);
  const totalPages = getTotalPages(sortedPermissionSets, itemsPerPage);

  // Debug: Log render data
  console.log('🎨 [RENDER] Render data:');
  console.log('🎨 [RENDER] - permissionSets:', permissionSets.length, 'items');
  console.log('🎨 [RENDER] - filteredPermissionSets:', filteredPermissionSets.length, 'items');
  console.log('🎨 [RENDER] - searchedPermissionSets:', searchedPermissionSets.length, 'items');
  console.log('🎨 [RENDER] - paginatedPermissionSets:', paginatedPermissionSets.length, 'items');
  console.log('🎨 [RENDER] - totalPages:', totalPages);
  console.log('🎨 [RENDER] - currentPage:', currentPage);
  console.log('🎨 [RENDER] - itemsPerPage:', itemsPerPage);
  console.log('🎨 [RENDER] - paginatedPermissionSets items:', paginatedPermissionSets.map(ps => ({ id: ps.id, name: ps.name })));

  const banner = (
    <HeadingCard
      title="Permission Set Management"
      subtitle="Manage permission sets and access levels"
      Icon={Key}
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

  // Show create permission set form when isCreating is true
  if (isCreating) {
    return (
      <DashboardLayout banner={banner}>
        <div className="h-full flex flex-col space-y-4 sm:space-y-6">
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="flex items-center gap-2"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back to Permission Sets
            </Button>
          </div>

          {/* Create Permission Set Form */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create New Permission Set</h2>
                <p className="text-gray-600">Add a new permission set to the system</p>
              </div>
            </div>

            {/* Custom Create Permission Set Form */}
            <form onSubmit={handleCreatePermissionSetSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Permission Set Name */}
                <div>
                  <label htmlFor="permissionSetName" className="block text-sm font-medium text-gray-700 mb-2">
                    Permission Set Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="permissionSetName"
                    value={creatingPermissionSetData.name || ''}
                    onChange={(e) => setCreatingPermissionSetData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter permission set name"
                  />
                </div>

                {/* Permission Set Description */}
                <div>
                  <label htmlFor="permissionSetDescription" className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="permissionSetDescription"
                    value={creatingPermissionSetData.description || ''}
                    onChange={(e) => setCreatingPermissionSetData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter permission set description"
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
                  disabled={!creatingPermissionSetData.name || !creatingPermissionSetData.description}
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

  if (selectedPermissionSetDetail) {
    return (
      <DashboardLayout banner={banner}>
        <div className="h-full flex flex-col space-y-4 sm:space-y-6">
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="flex items-center gap-2"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back to Permission Sets
            </Button>
          </div>

          {/* Permission Set Detail View */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedPermissionSet.name}</h2>
                <p className="text-gray-600">{selectedPermissionSet.description}</p>
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
                          await handleEditPermissionSetSubmit();
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
                  <Button variant="destructive" onClick={handleDeletePermissionSet}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>



            {/* Tab Content */}
            {activeTab === 'info' && (
              <>
                {/* Permission Set Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Permission Set Information</h3>
                    <div className="space-y-4">
                      {/* Permission Set Name */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">
                          Permission Set Name {isEditing && <span className="text-red-600">*</span>}
                        </label>
                        {!isEditing ? (
                          <p className="text-gray-900 font-medium">{selectedPermissionSet.name || 'Not provided'}</p>
                        ) : (
                          <input
                            type="text"
                            value={editingPermissionSetData.name || ''}
                            onChange={(e) => setEditingPermissionSetData(prev => ({ ...prev, name: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter permission set name"
                          />
                        )}
                      </div>

                      {/* Permission Set Description */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">
                          Description {isEditing && <span className="text-red-600">*</span>}
                        </label>
                        {!isEditing ? (
                          <p className="text-gray-900">{selectedPermissionSet.description || 'No description provided'}</p>
                        ) : (
                          <textarea
                            value={editingPermissionSetData.description || ''}
                            onChange={(e) => setEditingPermissionSetData(prev => ({ ...prev, description: e.target.value }))}
                            required
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter permission set description"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                    <div className="space-y-4">
                      {/* Permission Set ID */}
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-1">Permission Set ID</label>
                        <p className="text-gray-900 font-mono text-sm">{selectedPermissionSet.id || 'Not available'}</p>
                      </div>

                                             {/* Tables Count */}
                       <div>
                         <label className="text-sm font-medium text-gray-500 block mb-1">Tables Assigned</label>
                         <p className="text-gray-900">{permissionSetTables.length} tables</p>
                       </div>

                       {/* Fields Count */}
                       <div>
                         <label className="text-sm font-medium text-gray-500 block mb-1">Fields Assigned</label>
                         <p className="text-gray-900">{permissionSetFields.length} fields</p>
                       </div>
                    </div>
                  </div>
                </div>
              </>
            )}

                        {activeTab === 'tables' && (
              <div>
                {!isEditing ? (
                  // Regular table view (when not editing) - Show only assigned tables
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Tables Assigned to Permission Set</h3>
                        {isEditing && (
                          <p className="text-sm text-blue-600 mt-1">
                            ✏️ Edit mode active - Click checkboxes to modify table permissions
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleTablesTabClick}
                          variant="outline"
                          size="sm"
                          disabled={loadingTables}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className={`h-4 w-4 ${loadingTables ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                    </div>

                    {loadingTables ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : permissionSetTables.length > 0 ? (
                      <div className="space-y-3">
                        {permissionSetTables.map((table) => {
                          const isEditingTable = editingTablePermissions[table.id];
                          const currentPermissions = isEditingTable || {
                            can_create: table.can_create,
                            can_read: table.can_read,
                            can_update: table.can_update,
                            can_delete: table.can_delete
                          };

                          return (
                            <div
                              key={table.id}
                              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{table.name}</h4>
                                <p className="text-sm text-gray-600">Table: {table.name}</p>
                                
                                {isEditing ? (
                                  // Editable permissions when in edit mode
                                  <div className="mt-3 space-y-2">
                                    <div className="bg-white p-3 rounded border border-gray-200">
                                      <div className="text-sm font-medium text-gray-700 mb-2">Table Permissions (Click to edit):</div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center space-x-3">
                                          <Checkbox
                                            checked={currentPermissions.can_create}
                                            onCheckedChange={(checked) =>
                                              handleTablePermissionChange(table.id, 'can_create', !!checked)
                                            }
                                            className="text-blue-600"
                                          />
                                          <span className="text-sm font-medium">Create</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <Checkbox
                                            checked={currentPermissions.can_read}
                                            onCheckedChange={(checked) =>
                                              handleTablePermissionChange(table.id, 'can_read', !!checked)
                                            }
                                            className="text-blue-600"
                                          />
                                          <span className="text-sm font-medium">Read</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <Checkbox
                                            checked={currentPermissions.can_update}
                                            onCheckedChange={(checked) =>
                                              handleTablePermissionChange(table.id, 'can_update', !!checked)
                                            }
                                            className="text-blue-600"
                                          />
                                          <span className="text-sm font-medium">Update</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <Checkbox
                                            checked={currentPermissions.can_delete}
                                            onCheckedChange={(checked) =>
                                              handleTablePermissionChange(table.id, 'can_delete', !!checked)
                                            }
                                            className="text-blue-600"
                                          />
                                          <span className="text-sm font-medium">Delete</span>
                                        </div>
                                      </div>
                                      
                                      {/* Auto-save when permissions change */}
                                      <div className="text-xs text-green-600 mt-2 font-medium">
                                        ✓ Changes are automatically saved
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // Display permissions when not in edit mode
                                  <div className="mt-2">
                                    <div className="text-sm font-medium text-gray-700 mb-2">Current Permissions:</div>
                                    <div className="flex gap-4 text-xs">
                                      <span className={`px-2 py-1 rounded ${table.can_create ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {table.can_create ? '✓' : '✗'} Create
                                      </span>
                                      <span className={`px-2 py-1 rounded ${table.can_read ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {table.can_read ? '✓' : '✗'} Read
                                      </span>
                                      <span className={`px-2 py-1 rounded ${table.can_update ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {table.can_update ? '✓' : '✗'} Update
                                      </span>
                                      <span className={`px-2 py-1 rounded ${table.can_delete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {table.can_delete ? '✓' : '✗'} Delete
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end gap-2">
                                <Badge 
                                  variant="secondary" 
                                  className="bg-blue-100 text-blue-800"
                                >
                                  Assigned
                                </Badge>
                                

                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-8 text-center">
                        <Database className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Tables Assigned</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          This permission set has no tables assigned yet.
                        </p>
                        <div className="mt-4 space-y-2">
                          <Button
                            onClick={() => setIsEditing(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Assign Tables
                          </Button>
                          <p className="text-xs text-gray-400">
                            After assigning tables, you can edit their CRUD permissions here
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Table management interface (when editing)
                  <InlineTableManager
                    permissionSetId={selectedPermissionSet?.id || ''}
                    permissionSetName={selectedPermissionSet?.name || ''}
                    onBack={() => setIsEditing(false)}
                    onTablesUpdated={() => {
                      fetchPermissionSetTables(selectedPermissionSet?.id || '');
                      fetchAllAvailableTables();
                    }}
                  />
                )}
              </div>
            )}

                        {activeTab === 'fields' && (
              <div>
                

                {loadingFields ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : permissionSetTables.length > 0 ? (
                  <div className="space-y-6">
                    {permissionSetTables.map((table) => {
                      // Get fields for this specific table
                      const tableFields = permissionSetFields.filter(field => field.table_name === table.name);
                      
                      return (
                        <div key={table.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Table Header with CRUD Permissions */}
                          <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">{table.name}</h4>
                                <p className="text-sm text-gray-600">Table: {table.name}</p>
                              </div>
                              <div className="flex gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded-full ${table.can_create ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                  <span className={table.can_create ? 'text-green-700' : 'text-red-700'}>
                                    {table.can_create ? '✓' : '✗'} Create
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded-full ${table.can_read ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                  <span className={table.can_read ? 'text-green-700' : 'text-red-700'}>
                                    {table.can_read ? '✓' : '✗'} Read
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded-full ${table.can_update ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                  <span className={table.can_update ? 'text-green-700' : 'text-red-700'}>
                                    {table.can_update ? '✓' : '✗'} Update
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded-full ${table.can_delete ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                  <span className={table.can_delete ? 'text-green-700' : 'text-red-700'}>
                                    {table.can_delete ? '✓' : '✗'} Delete
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Table Fields */}
                          {tableFields.length > 0 ? (
                            <div className="bg-white">
                              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                                <h5 className="text-sm font-medium text-gray-700">Fields ({tableFields.length})</h5>
                              </div>
                              <div className="divide-y divide-gray-200">
                                {tableFields.map((field) => {
                                  const isEditingField = editingFieldPermissions[field.id];
                                  const currentFieldPermissions = isEditingField || {
                                    can_view: field.can_view,
                                    can_edit: field.can_edit
                                  };

                                  return (
                                    <div key={field.id} className="px-4 py-3 flex items-center justify-between">
                                      <div className="flex-1">
                                        <h6 className="text-sm font-medium text-gray-900">{field.field_name}</h6>
                                        <p className="text-xs text-gray-500">Field: {field.field_name}</p>
                                        
                                        {isEditing ? (
                                          // Editable field permissions when in edit mode
                                          <div className="mt-2 space-y-2">
                                            <div className="flex gap-4">
                                              <div className="flex items-center space-x-3">
                                                <Checkbox
                                                  checked={currentFieldPermissions.can_view}
                                                  onCheckedChange={(checked) =>
                                                    handleFieldPermissionChange(field.id, 'can_view', !!checked)
                                                  }
                                                />
                                                <span className="text-sm">View</span>
                                              </div>
                                              <div className="flex items-center space-x-3">
                                                <Checkbox
                                                  checked={currentFieldPermissions.can_edit}
                                                  onCheckedChange={(checked) =>
                                                    handleFieldPermissionChange(field.id, 'can_edit', !!checked)
                                                  }
                                                />
                                                <span className="text-sm">Edit</span>
                                              </div>
                                            </div>
                                            
                                            {/* Auto-save when permissions change */}
                                            <div className="text-xs text-gray-500">
                                              Changes are automatically saved
                                            </div>
                                          </div>
                                        ) : (
                                          // Display field permissions when not in edit mode
                                          <div className="flex gap-3 text-xs mt-2">
                                            <span className={`px-2 py-1 rounded ${field.can_view ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                              {field.can_view ? '✓' : '✗'} View
                                            </span>
                                            <span className={`px-2 py-1 rounded ${field.can_edit ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                              {field.can_edit ? '✓' : '✗'} Edit
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="px-4 py-6 text-center bg-gray-50">
                              <p className="text-sm text-gray-500">No fields assigned to this table</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <Database className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Tables Assigned</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      This permission set doesn't have any tables assigned yet.
                    </p>
                    <div className="mt-4">
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Assign Tables
                      </Button>
                    </div>
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
      <div className="space-y-4 sm:space-y-6">
        

        {/* Permission Sets Table/Grid */}
        <SalesforceTableContainer className="flex flex-col">
          {/* Search and Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3 overflow-hidden">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search permission sets..."
                      value={permissionSetsSearch}
                      onChange={(e) => setPermissionSetsSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* View Mode Selector */}
                <select
                  value={permissionSetsViewMode}
                  onChange={(e) => setPermissionSetsViewMode(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="table">Table View</option>
                  <option value="card">Card View</option>
                </select>
              </div>
              
              {/* Create Permission Set Button and Alphabet Filter */}
              <div className="flex items-center justify-between">
                <Button onClick={handleCreatePermissionSet}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create
                </Button>
                
                <AlphabetFilter
                  selectedFilter={permissionSetsFilter}
                  onFilterChange={(filter) => setPermissionSetsFilter(filter)}
                />
              </div>
            </div>
          </div>
          
          {/* Content Area with proper scrolling */}
          <div className="overflow-auto">
          {permissionSetsViewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableTableHeader
                      field="name"
                      label="Permission Set"
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
                  {paginatedPermissionSets.map((permissionSet) => (
                    <tr
                      key={permissionSet.id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Key className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div 
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/admin/permission-sets/${permissionSet.id}`;
                              }}
                            >
                              {permissionSet.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {permissionSet.description || 'No description'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {paginatedPermissionSets.map((permissionSet) => (
                <div
                  key={permissionSet.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Key className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/admin/permission-sets/${permissionSet.id}`;
                        }}
                      >
                        {permissionSet.name}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-2">
                      {permissionSet.description || 'No description provided'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Pagination - Compact and responsive */}
          <div className="flex-shrink-0 mt-3">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={searchedPermissionSets.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
              className="text-xs"
          />
          </div>
        </SalesforceTableContainer>
      </div>

      {/* Delete modal removed - now deleting automatically */}



             <PermissionSetModal
         isOpen={showPermissionSetModal}
         onClose={() => setShowPermissionSetModal(false)}
         permissionSet={selectedPermissionSet}
         mode="edit"
         onSave={async (permissionSetData) => {
           // Handle save logic here
           setShowPermissionSetModal(false);
           setIsEditing(false);
           setIsCreating(false);
           fetchData();
         }}
       />

    </DashboardLayout>
  );
}

export default function PermissionSetsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PermissionSetsContent />
    </Suspense>
  );
}
