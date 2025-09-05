'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { AppName } from '@/components/ui/AppName';

interface Role {
  id: string;
  name: string;
  description: string;
  composite: boolean;
}

interface User {
  id?: string;
  name: string;
  email: string;
  username: string;
  enabled: boolean;
  status?: 'active' | 'inactive' | 'pending';
  phoneNumber?: string;
  roles?: string[]; // Keep as array for compatibility, but will only contain one role
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  user?: User | null;
  mode: 'add' | 'edit';
  loading: boolean;
  availableProfiles?: Array<{ id: string; name: string }>;
  availableRoles?: Array<{ id: string; name: string; description: string }>;
}

export default function UserModal({ isOpen, onClose, onSave, user, mode, loading, availableProfiles = [], availableRoles = [] }: UserModalProps) {
  const [formData, setFormData] = useState({
    profileId: '',
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    enabled: true,
    temporaryPassword: false,
    selectedRoles: [] as string[],
    status: 'active' as 'active' | 'inactive' | 'pending'
  });

  // Permission management state
  const [availableTables, setAvailableTables] = useState<Array<{ name: string; fields: string[] }>>([]);
  const [allTables, setAllTables] = useState<Array<{ name: string; fields: string[] }>>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [highlightedAvailable, setHighlightedAvailable] = useState<string[]>([]);
  const [highlightedSelected, setHighlightedSelected] = useState<string[]>([]);
  const [activeTable, setActiveTable] = useState<string>('');
  const [fieldPermissions, setFieldPermissions] = useState<Array<{ field: string; canView: boolean; canEdit: boolean }>>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingProfilePermissions, setLoadingProfilePermissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profilePermissionSets, setProfilePermissionSets] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [profileTables, setProfileTables] = useState<string[]>([]);

  useEffect(() => {
    if (user && mode === 'edit') {
      // Split the name into first and last name
      const nameParts = user.name.split(' ');
      setFormData({
        profileId: '',
        username: user.username,
        email: user.email,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        phoneNumber: user.phoneNumber || '',
        password: '',
        confirmPassword: '',
        enabled: user.enabled,
        temporaryPassword: false,
        selectedRoles: user.roles || [],
        status: user.status || 'active' // Default to active for edit mode
      });
    } else {
      setFormData({
        profileId: '',
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        enabled: true,
        temporaryPassword: false,
        selectedRoles: [],
        status: 'active' // Default to active for add mode
      });
    }
  }, [user, mode]);

  // Fetch available tables when modal opens
  useEffect(() => {
    const fetchTables = async () => {
      if (isOpen) {
        setLoadingTables(true);
        try {
          const response = await fetch('/api/admin/db/app-tables');
          if (response.ok) {
            const tableNames = await response.json();
            // Fetch fields for each table
            const tablesWithFields = await Promise.all(
              tableNames.map(async (tableName: string) => {
                try {
                  const fieldsResponse = await fetch(`/api/admin/db/app-tables/${tableName}/columns`);
                  if (fieldsResponse.ok) {
                    const fields = await fieldsResponse.json();
                    return { name: tableName, fields };
                  }
                  return { name: tableName, fields: [] };
                } catch (error) {
                  console.error(`Error fetching fields for table ${tableName}:`, error);
                  return { name: tableName, fields: [] };
                }
              })
            );
            setAllTables(tablesWithFields);
            setAvailableTables(tablesWithFields);
            showToast.success(`Initial tables loaded: ${tablesWithFields.length} tables`);
        console.log('Initial tables loaded:', tablesWithFields.map(t => t.name));
          }
        } catch (error) {
          console.error('Error fetching tables:', error);
        } finally {
          setLoadingTables(false);
        }
      }
    };

    fetchTables();
  }, [isOpen]);

  // Permission management functions
  const handleTableSelection = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      // Only allow removing user-added tables, not inherited ones
      const isInherited = profileTables.includes(tableName);
      if (!isInherited) {
        setSelectedTables(prev => prev.filter(t => t !== tableName));
        if (activeTable === tableName) {
          setActiveTable('');
          setFieldPermissions([]);
        }
        // Add back to available tables
        setAvailableTables(prev => [...prev, allTables.find(t => t.name === tableName)!]);
      }
    } else {
      setSelectedTables(prev => [...prev, tableName]);
      setActiveTable(tableName);
      // Load field permissions for the selected table
      loadTableFields(tableName);
      // Remove from available tables
      setAvailableTables(prev => prev.filter(t => t.name !== tableName));
    }
  };

  const handleFieldPermissionChange = (field: string, permission: 'view' | 'edit', value: boolean) => {
    setFieldPermissions(prev => 
      prev.map(fp => 
        fp.field === field 
          ? { ...fp, [permission === 'view' ? 'canView' : 'canEdit']: value }
          : fp
      )
    );
  };

  const filteredTables = availableTables.filter(table =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // If profile is being changed, fetch and apply profile permissions
    if (field === 'profileId') {
      if (value && typeof value === 'string') {
        fetchProfilePermissions(value);
      } else {
        // Profile cleared - reset to default state
        setSelectedTables([]);
        setActiveTable('');
        setFieldPermissions([]);
        setProfilePermissionSets([]);
        setProfileTables([]); // Clear profile tables
        setAvailableTables(allTables);
        setHighlightedAvailable([]);
        setHighlightedSelected([]);
        showToast.success('Profile cleared, all tables are now available');
        console.log('Profile cleared, showing all tables as available:', allTables.map(t => t.name));
      }
    }
  };

  // Fetch profile permission sets and apply them
  const fetchProfilePermissions = async (profileId: string) => {
    setLoadingProfilePermissions(true);
    try {
      const response = await fetch(`/api/admin/profiles/${profileId}/permission-sets`);
      if (response.ok) {
        const permissionSets = await response.json();
        setProfilePermissionSets(permissionSets);
        
        // Get all tables from permission sets
        const profileTables = new Set<string>();
        for (const ps of permissionSets) {
          try {
            const tablesResponse = await fetch(`/api/admin/permission-sets/${ps.id}/tables`);
            if (tablesResponse.ok) {
              const tables = await tablesResponse.json();
              showToast.success(`Permission set ${ps.id} tables loaded: ${tables.length} tables`);
        console.log(`Tables for permission set ${ps.id}:`, tables);
              tables.forEach((table: any) => {
                if (table.table_name) {
                  profileTables.add(table.table_name);
                } else {
                  console.warn('Table missing table_name:', table);
                }
              });
            }
          } catch (error) {
            console.error(`Error fetching tables for permission set ${ps.id}:`, error);
          }
        }

        showToast.success(`Profile permissions loaded: ${Array.from(profileTables).length} tables`);
        console.log('Profile tables found:', Array.from(profileTables));
        console.log('All tables available:', allTables.map(t => t.name));

        // Set selected tables to profile tables (only if they exist in allTables)
        const validProfileTables = Array.from(profileTables).filter(tableName => 
          allTables.some(table => table.name === tableName)
        );
        
        // Store profile tables in state for proper identification
        setProfileTables(validProfileTables);
        setSelectedTables(validProfileTables);
        
        // Remove profile tables from available tables (only valid ones)
        const availableTablesFiltered = allTables.filter(table => !validProfileTables.includes(table.name));
        setAvailableTables(availableTablesFiltered);
        
        showToast.success(`Available tables filtered: ${availableTablesFiltered.length} tables`);
        console.log('Available tables after filtering:', availableTablesFiltered.map(t => t.name));
        
        // Don't set profile tables as active - they should be read-only
        // Users can only activate tables they add themselves
        setActiveTable('');
        setFieldPermissions([]);
        
        // If no valid profile tables found, show all tables as available
        if (validProfileTables.length === 0) {
          showToast.success('No profile restrictions found, all tables available');
        console.log('No valid profile tables found, showing all tables as available');
          setAvailableTables(allTables);
          setSelectedTables([]); // Clear selected tables if no profile tables
          setProfileTables([]); // Clear profile tables
        }
      }
    } catch (error) {
      console.error('Error fetching profile permissions:', error);
      // On error, show all tables as available
      setAvailableTables(allTables);
      setProfileTables([]); // Clear profile tables
    } finally {
      setLoadingProfilePermissions(false);
    }
  };

  // Load fields for a specific table
  const loadTableFields = (tableName: string) => {
    const table = allTables.find(t => t.name === tableName);
    if (table) {
      setFieldPermissions(
        table.fields.map(field => ({
          field,
          canView: true,
          canEdit: false
        }))
      );
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedRoles: prev.selectedRoles.includes(roleId)
        ? prev.selectedRoles.filter(id => id !== roleId)
        : [...prev.selectedRoles, roleId]
    }));
  };

  //

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.username || !formData.email) {
      showToast.usernameEmailRequired();
      return;
    }

    // Username length validation (Keycloak requires 3-255 characters)
    if (formData.username.length < 3) {
      showToast.error('Username must be at least 3 characters long');
      return;
    }

    if (mode === 'add' && !formData.password) {
      showToast.passwordRequired();
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast.passwordMismatch();
      return;
    }

    // Send data in the format the API expects
    const userData = {
      id: user?.id,
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      username: formData.username,
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      enabled: formData.enabled,
      password: formData.password, // Include password for new users
      temporaryPassword: formData.temporaryPassword,
      roles: formData.selectedRoles,
      phoneNumber: formData.phoneNumber,
      status: formData.status
    };

    onSave(userData);
  };

  const handleClose = () => {
    setFormData({
      profileId: '',
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      enabled: true,
      temporaryPassword: false,
      selectedRoles: [],
      status: 'active'
    });
    // Reset permission configuration
    setSelectedTables([]);
    setActiveTable('');
    setFieldPermissions([]);
    setProfilePermissionSets([]);
    setAvailableTables(allTables);
    setHighlightedAvailable([]);
    setHighlightedSelected([]);
    setSearchQuery('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center"><AppName /></DialogTitle>
          <div className="text-center text-lg font-semibold">{mode === 'add' ? 'Create User' : 'Update User'}</div>
          <DialogDescription className="text-sm text-gray-600 text-center">
            {mode === 'add' ? 'Create a new user account with profile and role assignments.' : 'Update existing user information and permissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profileId">Profile <span className="text-red-600">*</span></Label>
                <Select value={formData.profileId} onValueChange={(value) => handleInputChange('profileId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.profileId && (
                  <div className="flex items-center gap-2">
                    {loadingProfilePermissions ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <p className="text-xs text-blue-600">Loading profile permissions...</p>
                      </>
                    ) : (
                      <p className="text-xs text-blue-600">
                        ✓ Profile permissions loaded ({selectedTables.length} tables) - Profile tables are read-only
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">First Name <span className="text-red-600">*</span></Label>
                <Input id="firstName" value={formData.firstName} onChange={(e)=>handleInputChange('firstName', e.target.value)} placeholder="Enter first name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email <span className="text-red-600">*</span></Label>
                <Input id="email" type="email" value={formData.email} onChange={(e)=>handleInputChange('email', e.target.value)} placeholder="Enter email address" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username <span className="text-red-600">*</span></Label>
                <Input id="username" value={formData.username} onChange={(e)=>handleInputChange('username', e.target.value)} placeholder="Enter username" required />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="selectedRoles">Role <span className="text-red-600">*</span></Label>
                <Select value={formData.selectedRoles[0] || ''} onValueChange={(value) => handleInputChange('selectedRoles', [value])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name <span className="text-red-600">*</span></Label>
                <Input id="lastName" value={formData.lastName} onChange={(e)=>handleInputChange('lastName', e.target.value)} placeholder="Enter last name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e)=>handleInputChange('phoneNumber', e.target.value)} placeholder="Enter phone number" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">User Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mode === 'add' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password <span className="text-red-600">*</span></Label>
                    <Input id="password" type="password" value={formData.password} onChange={(e)=>handleInputChange('password', e.target.value)} placeholder="Enter password" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-600">*</span></Label>
                    <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e)=>handleInputChange('confirmPassword', e.target.value)} placeholder="Confirm password" required />
                  </div>
                  {/* Permission sets section removed */}
                </>
              )}
            </div>
          </div>

          {/* Permissions Configuration */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Permissions Configuration</h3>
              {profilePermissionSets.length > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {profilePermissionSets.length} permission set(s) from profile
                  </span>
                </div>
              )}
            </div>
            {profilePermissionSets.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>🔒 Profile Tables Are Locked:</strong> The {profileTables.length} tables below are inherited from your profile and are <strong>completely unchangeable</strong>. 
                  They cannot be modified, removed, or edited in any way. You can only add extra tables and configure permissions for those additional tables.
                </p>
              </div>
            )}
            

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search tables..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="border rounded-md overflow-hidden w-full">
                    <div className="px-3 py-2 text-xs font-semibold bg-gray-50 border-b">Available Tables</div>
                    <div className="max-h-64 overflow-y-auto">
                      {loadingTables ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-xs text-gray-500 mt-2">Loading tables...</p>
                        </div>
                      ) : (
                        filteredTables.map(table => {
                          const isHighlighted = highlightedAvailable.includes(table.name);
                          const isSelected = selectedTables.includes(table.name);
                          const isProfileTable = profilePermissionSets.some(ps => ps.name === table.name);
                          return (
                            <button
                              key={table.name}
                              type="button"
                              onClick={() => {
                                setHighlightedAvailable(prev => prev.includes(table.name)
                                  ? prev.filter(n => n !== table.name)
                                  : [...prev, table.name]);
                              }}
                              onDoubleClick={() => handleTableSelection(table.name)}
                              disabled={isProfileTable}
                              className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${
                                isHighlighted ? 'bg-blue-50' : isSelected ? 'bg-green-50' : 
                                isProfileTable ? 'bg-gray-100 cursor-not-allowed opacity-75' : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="font-medium flex items-center gap-2">
                                {table.name}
                                {isProfileTable && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    Profile
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                {isProfileTable ? 'Already inherited from profile' : `${table.fields.length} fields`}
                              </div>
                            </button>
                          );
                        })
                      )}
                      {(!loadingTables && filteredTables.length === 0) && (
                        <div className="text-center py-4 text-sm text-gray-500">No tables found</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (highlightedAvailable.length > 0) {
                          highlightedAvailable.forEach(name => handleTableSelection(name));
                          setHighlightedAvailable([]);
                        }
                      }}
                      disabled={highlightedAvailable.length === 0}
                      className="px-2 py-1"
                      title="Add selected tables to user permissions"
                    >
                      →
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (highlightedSelected.length > 0) {
                          // Filter out inherited tables - only allow removing user-added tables
                          const userAddedTables = highlightedSelected.filter(tableName => 
                            !profileTables.includes(tableName)
                          );
                          
                          if (userAddedTables.length > 0) {
                            userAddedTables.forEach(tableName => {
                              setSelectedTables(prev => prev.filter(t => t !== tableName));
                              if (activeTable === tableName) {
                                setActiveTable('');
                                setFieldPermissions([]);
                              }
                              // Add back to available tables
                              setAvailableTables(prev => [...prev, allTables.find(t => t.name === tableName)!]);
                            });
                            setHighlightedSelected([]);
                          }
                        }
                      }}
                      disabled={highlightedSelected.length === 0 || 
                               highlightedSelected.every(tableName => 
                                 profileTables.includes(tableName)
                               )}
                      className="px-2 py-1"
                      title="Remove selected user-added tables (profile tables cannot be removed)"
                    >
                      ←
                    </Button>
                  </div>
                  <div className="border rounded-md overflow-hidden w-full">
                    <div className="px-3 py-2 text-xs font-semibold bg-gray-50 border-b">Selected Tables</div>
                    <div className="max-h-64 overflow-y-auto">
                      {selectedTables.length > 0 ? (
                        (() => {
                          const profileTablesList = selectedTables.filter(tableName => 
                            profileTables.includes(tableName)
                          );
                          const userAddedTables = selectedTables.filter(tableName => 
                            !profileTables.includes(tableName)
                          );
                          
                          return (
                            <>
                              {/* Profile Tables Section */}
                              {profileTablesList.length > 0 && (
                                <>
                                  <div className="px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-700 border-b">
                                    🔒 Profile Tables (Locked)
                                  </div>
                                  {profileTablesList.map(tableName => (
                                    <button
                                      key={tableName}
                                      type="button"
                                      disabled={true}
                                      className="w-full text-left px-3 py-2 text-sm border-b bg-gray-100 cursor-not-allowed opacity-75"
                                    >
                                      <div className="font-medium flex items-center gap-2">
                                        {tableName}
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                          Profile (Locked)
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Inherited from profile - Cannot be modified
                                      </div>
                                    </button>
                                  ))}
                                </>
                              )}
                              
                              {/* User Added Tables Section */}
                              {userAddedTables.length > 0 && (
                                <>
                                  <div className="px-3 py-2 text-xs font-semibold bg-green-50 text-green-700 border-b">
                                    ✨ User Added Tables (Editable)
                                  </div>
                                  {userAddedTables.map(tableName => {
                                    const isHighlighted = highlightedSelected.includes(tableName);
                                    const isActive = activeTable === tableName;
                                    return (
                                      <button
                                        key={tableName}
                                        type="button"
                                        onClick={() => {
                                          // Single click activates the table
                                          setActiveTable(tableName);
                                          loadTableFields(tableName);
                                          // Clear any existing highlights
                                          setHighlightedSelected([]);
                                        }}
                                        onDoubleClick={() => {
                                          // Double click toggles highlighting for removal
                                          setHighlightedSelected(prev => prev.includes(tableName)
                                            ? prev.filter(n => n !== tableName)
                                            : [...prev, tableName]);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${
                                          isHighlighted ? 'bg-blue-50' : isActive ? 'bg-yellow-50' : 'hover:bg-gray-50'
                                        }`}
                                      >
                                        <div className="font-medium">{tableName}</div>
                                        <div className="text-xs text-gray-500">
                                          {isActive ? 'Active' : 'Click to activate • Double-click to highlight for removal'}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <div className="text-center py-4 text-sm text-gray-500">None selected</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Field Permissions */}
              <div className="space-y-4">
                {/* Table Selector for User Added Tables */}
                {(() => {
                  const userAddedTables = selectedTables.filter(tableName => 
                    !profileTables.includes(tableName)
                  );
                  
                  return userAddedTables.length > 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      <label className="text-sm font-medium text-gray-700">Select Table to Configure:</label>
                      <select
                        value={activeTable}
                        onChange={(e) => {
                          const selectedTable = e.target.value;
                          if (selectedTable) {
                            setActiveTable(selectedTable);
                            loadTableFields(selectedTable);
                            setHighlightedSelected([]); // Clear highlights
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Choose a table...</option>
                        {userAddedTables.map(tableName => (
                          <option key={tableName} value={tableName}>
                            {tableName}
                          </option>
                        ))}
                      </select>
                      <div className="text-xs text-gray-500">
                        {userAddedTables.length} table(s) available
                      </div>
                    </div>
                  ) : null;
                })()}
                
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800">Fields</h4>
                  <div className="text-xs text-gray-600">
                    {activeTable ? (
                      <div className="flex items-center gap-2">
                        <span>Active: {activeTable}</span>
                        {profileTables.includes(activeTable) && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                            Profile Table (Read-only)
                          </span>
                        )}
                      </div>
                    ) : (
                      'No active table'
                    )}
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-3 bg-gray-50 border-b">
                    <div className="px-4 py-2 font-medium text-sm text-gray-700">Field</div>
                    <div className="px-4 py-2 font-medium text-sm text-gray-700 text-center">View</div>
                    <div className="px-4 py-2 font-medium text-sm text-gray-700 text-center">Edit</div>
                  </div>
                  {activeTable && fieldPermissions.length > 0 ? (
                    (() => {
                      const isInheritedTable = profileTables.includes(activeTable);
                      if (isInheritedTable) {
                        return (
                          <div className="text-center py-4">
                            <p className="text-sm text-red-600 font-medium">
                              Profile tables cannot be modified
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              This table is inherited from your profile and is read-only
                            </p>
                          </div>
                        );
                      }
                      return fieldPermissions.map((fp, index) => (
                        <div key={index} className="grid grid-cols-3 border-b last:border-b-0">
                          <div className="px-4 py-2 text-sm text-gray-900">{fp.field}</div>
                          <div className="px-4 py-2 flex items-center justify-center">
                            <Checkbox
                              checked={fp.canView}
                              onCheckedChange={(checked) => 
                                handleFieldPermissionChange(fp.field, 'view', checked as boolean)
                              }
                            />
                          </div>
                          <div className="px-4 py-2 flex items-center justify-center">
                            <Checkbox
                              checked={fp.canEdit}
                              onCheckedChange={(checked) => 
                                handleFieldPermissionChange(fp.field, 'edit', checked as boolean)
                              }
                            />
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        {activeTable ? 'No fields found for this table.' : 'Select a table to configure field permissions.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User Status */}
          <div className="flex items-center space-x-2">
            <Checkbox id="enabled" checked={formData.enabled} onCheckedChange={(checked)=>handleInputChange('enabled', checked as boolean)} />
            <Label htmlFor="enabled">User account is enabled</Label>
          </div>

          {/* Temporary password option */}
          {mode === 'add' && (
            <div className="flex items-center space-x-2">
              <Checkbox id="temporaryPassword" checked={formData.temporaryPassword} onCheckedChange={(checked)=>handleInputChange('temporaryPassword', checked as boolean)} />
              <Label htmlFor="temporaryPassword">User must change password on first login</Label>
            </div>
          )}

          {/* Form Actions */}
          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[100px] bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 