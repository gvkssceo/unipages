'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import React from 'react'; // Added missing import
import { AppName } from '@/components/ui/AppName';

interface PermissionSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissionSetData: any) => Promise<void>;
  permissionSet?: any;
  mode: 'add' | 'edit';
  loading?: boolean;
}

interface Entity {
  id: string;
  name: string;
  fields: string[];
}

interface FieldPermission {
  field: string;
  view: boolean;
  edit: boolean;
}

export default function PermissionSetModal({
  isOpen,
  onClose,
  onSave,
  permissionSet,
  mode,
  loading = false
}: PermissionSetModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  // Multi-select support
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [activeEntity, setActiveEntity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [recordPermissions, setRecordPermissions] = useState({
    create: true,
    delete: true
  });
  const [fieldPermissions, setFieldPermissions] = useState<FieldPermission[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  // Cache of fetched columns per table to avoid re-fetching and speed up switching
  const fieldsCacheRef = React.useRef<Record<string, string[]>>({});

  // Fetch real schema tables from API
  const [schemaTables, setSchemaTables] = useState<Entity[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Use only real schema tables (define early to avoid TDZ in callbacks)
  const availableEntities = schemaTables;

  // Preselected server tables for edit mode (raw table ids)
  const [preselectedEntityIds, setPreselectedEntityIds] = useState<string[] | null>(null);

  // Dual-list UI highlight state
  const [highlightedAvailable, setHighlightedAvailable] = useState<string[]>([]);
  const [highlightedSelected, setHighlightedSelected] = useState<string[]>([]);
  const [expandedSelected, setExpandedSelected] = useState<Record<string, boolean>>({});

  // Function to fetch field details for a specific table
  const fetchTableFields = React.useCallback(async (tableName: string) => {
    // Prevent multiple simultaneous fetches for the same table
    if (fieldsCacheRef.current[tableName + '_loading']) {
      return;
    }
    
    // Clear current field permissions to show loading state
    setFieldPermissions([]);
    
    // Serve instantly from cache if available
    const cached = fieldsCacheRef.current[tableName];
    if (cached && Array.isArray(cached)) {
      const transformedFields = cached.map((col: string) => ({
        field: col,
        view: true,
        edit: col !== 'id' && col !== 'created_at' && col !== 'updated_at'
      }));
      setFieldPermissions(transformedFields);
      return;
    }
    // Mark this table as loading to prevent duplicate requests
    (fieldsCacheRef.current as any)[tableName + '_loading'] = true;
    try {
      setLoadingFields(true);
      // Fetch detailed field information from your API
      const response = await fetch(`/api/admin/db/app-tables/${tableName}/columns`);
      if (response.ok) {
        const columns: string[] = await response.json();
        // Transform columns (array of strings) to field permissions
        const transformedFields = columns.map((col: string) => ({
          field: col,
          view: true, // Default to true, can be customized
          edit: col !== 'id' && col !== 'created_at' && col !== 'updated_at' // Don't allow editing of system fields
        }));
        setFieldPermissions(transformedFields);
        // Cache for subsequent fast loads
        fieldsCacheRef.current[tableName] = columns;
      } else {
        // No fallback - show empty state
        setFieldPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching table fields:', error);
      // No fallback - show empty state
      setFieldPermissions([]);
    } finally {
      setLoadingFields(false);
      // Clear the loading flag
      delete fieldsCacheRef.current[tableName + '_loading'];
    }
  }, []);

  // Toggle expansion of a selected table's fields (defined after fetchTableFields to avoid TDZ)
  const toggleExpandedSelected = React.useCallback((name: string) => {
    setExpandedSelected(prev => ({ ...prev, [name]: !prev[name] }));
    const ent = availableEntities.find(e => e.name === name);
    if (ent) {
      // Always fetch fields when expanding to ensure fresh data
      fetchTableFields(ent.id);
      
      // Also set this as the active entity to show its fields in the right panel
      setActiveEntity(name);
    }
  }, [availableEntities]);

  // Handle entity selection
  const handleEntitySelection = React.useCallback((entityName: string) => {
    setSelectedEntities(prev => prev.includes(entityName) ? prev : [...prev, entityName]);
    setActiveEntity(entityName);
    const entity = availableEntities.find((e) => e.name === entityName);
    if (entity) {
      // Always fetch fields when selecting a table to ensure fresh data
      fetchTableFields(entity.id);
    }
  }, [availableEntities]);

  useEffect(() => {
    // Reset transient selection state each time modal opens or target changes
    if (isOpen) {
      setSelectedEntities([]);
      setActiveEntity('');
      setExpandedSelected({});
      fieldsCacheRef.current = {};
    } else {
      // Clean up when modal closes
      fieldsCacheRef.current = {};
    }
  }, [isOpen, permissionSet?.id]);

  useEffect(() => {
    const fetchSchemaTables = async () => {
      if (!isOpen) return;
      
      try {
        setLoadingSchema(true);
        // Fetch real schema tables from your API
        const response = await fetch('/api/admin/db/app-tables');
        if (response.ok) {
          const tables: string[] = await response.json();
          // Transform the API response (array of table names) to match our Entity interface
          const transformedTables = tables.map((tableName: string) => ({
            id: tableName, // raw table name for API calls
            name: tableName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), // display name
            fields: [] as string[]
          }));
          setSchemaTables(transformedTables);
          
          // Do not auto-select a default table for new permission sets
        } else {
          // No fallback - show empty state
          setSchemaTables([]);
        }
      } catch (error) {
        console.error('Error fetching schema tables:', error);
        // No fallback - show empty state
        setSchemaTables([]);
      } finally {
        setLoadingSchema(false);
      }
    };

    fetchSchemaTables();
  }, [isOpen]);

  // availableEntities defined earlier

  useEffect(() => {
    if (permissionSet && mode === 'edit' && isOpen) {
      setFormData({
        name: permissionSet.name || '',
        description: permissionSet.description || ''
      });
      // Load selected tables from backend to preselect
      (async () => {
        try {
          const res = await fetch(`/api/admin/permission-sets/${permissionSet.id}/tables`);
          if (res.ok) {
            const rows = await res.json();
            const ids = rows.map((r: any) => r.table_name as string);
            setPreselectedEntityIds(ids);
          }
        } catch {}
      })();
    } else {
      setFormData({
        name: '',
        description: ''
      });
      // Reset permissions for new permission set
      setRecordPermissions({ create: true, delete: true });
      // Do not auto-select any table by default
    }
  }, [permissionSet, mode, isOpen]);

  // Single effect for handling preselected entities - no field loading here
  useEffect(() => {
    if (!isOpen || availableEntities.length === 0 || !preselectedEntityIds) return;
    
    const nameById = new Map(availableEntities.map(e => [e.id, e.name] as const));
    const names = preselectedEntityIds.map(id => nameById.get(id)).filter(Boolean) as string[];
    if (names.length > 0) {
      setSelectedEntities(names);
      setActiveEntity(names[0]);
    }
    // Clear after applying once
    setPreselectedEntityIds(null);
  }, [isOpen, availableEntities, preselectedEntityIds]);

  // Separate effect for loading fields when active entity changes
  useEffect(() => {
    if (!isOpen || !activeEntity || availableEntities.length === 0) return;
    
    const ent = availableEntities.find(e => e.name === activeEntity);
    if (ent) {
      // Always load fields when switching to a new table
      // This ensures the right panel shows the correct fields
      fetchTableFields(ent.id);
    }
  }, [isOpen, activeEntity, availableEntities]);

  // Remove duplicate handleEntitySelection using memoized fetchTableFields above

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      const entityNameToId: Record<string, string> = Object.fromEntries(
        availableEntities.map(e => [e.name, e.id])
      );
      const selectedEntityIds = selectedEntities
        .map(n => entityNameToId[n])
        .filter((v): v is string => Boolean(v));
      const activeEntityId = entityNameToId[activeEntity] || '';

      const permissionData = {
        id: (permissionSet as any)?.id,
        ...formData,
        entity: activeEntity,
        entityId: activeEntityId,
        selectedEntities,
        selectedEntityIds,
        recordPermissions,
        fieldPermissions
      };
      await onSave(permissionData);
      onClose();
    } catch (error) {
      console.error('Error saving permission set:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRecordPermissionChange = (permission: 'create' | 'delete', value: boolean) => {
    setRecordPermissions(prev => ({
      ...prev,
      [permission]: value
    }));
  };

  const handleFieldPermissionChange = (fieldIndex: number, permission: 'view' | 'edit', value: boolean) => {
    setFieldPermissions(prev => prev.map((item, index) => 
      index === fieldIndex ? { ...item, [permission]: value } : item
    ));
  };

  const filteredEntities = availableEntities.filter(entity =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedEntities.includes(entity.name)
  );

  const currentEntityFields = availableEntities.find(e => e.name === activeEntity)?.fields || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-6xl xl:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-blue-600 mb-2"><AppName /></h1>
            <DialogTitle className="text-xl font-bold text-gray-800">
              {mode === 'add' ? 'Create Permission Set' : 'Edit Permission Set'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Configure table and field-level permissions for this permission set.
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter permission set name"
                className="w-full"
                required
              />
        </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                Description <span className="text-red-600">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter permission set description"
                className="w-full min-h-[80px] resize-none"
                required
            />
          </div>
          </div>

          {/* Permissions Configuration */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Permissions Configuration</h3>
            
            <div className="grid grid-cols-1 xl:grid-cols-[52rem_1fr] gap-8">
              {/* Left Sidebar - Entity Selection */}
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

                <div className="grid grid-cols-1 md:grid-cols-[20rem_auto_20rem] xl:grid-cols-[24rem_auto_24rem] gap-4">
                  {/* Available */}
                  <div className="border rounded-md overflow-hidden w-full">
                    <div className="px-3 py-2 text-xs font-semibold bg-gray-50 border-b">Available Tables</div>
                    <div className="max-h-64 overflow-y-auto">
                  {loadingSchema ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-2">Loading schema tables...</p>
                    </div>
                      ) : (
                        filteredEntities.map(entity => {
                          const isHighlighted = highlightedAvailable.includes(entity.name);
                          return (
            <button
                        key={entity.id}
                        type="button"
                              onClick={() => {
                                setHighlightedAvailable(prev => prev.includes(entity.name)
                                  ? prev.filter(n => n !== entity.name)
                                  : [...prev, entity.name]);
                              }}
                              onDoubleClick={() => handleEntitySelection(entity.name)}
                              className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${
                                isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">{entity.name}</div>
                              <div className="text-xs text-gray-500">{entity.fields.length} fields</div>
                            </button>
                          );
                        })
                      )}
                      {(!loadingSchema && filteredEntities.length === 0) && (
                        <div className="text-center py-4 text-sm text-gray-500">No tables found</div>
                      )}
                    </div>
                  </div>

                  {/* Arrows */}
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (highlightedAvailable.length > 0) {
                          highlightedAvailable.forEach(name => handleEntitySelection(name));
                          setHighlightedAvailable([]);
                          setHighlightedSelected([]);
                        }
                      }}
                      disabled={highlightedAvailable.length === 0}
                      className="px-2 py-1"
                    >
                      →
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (highlightedSelected.length > 0) {
                          setSelectedEntities(prev => {
                            const remaining = prev.filter(n => !highlightedSelected.includes(n));
                            if (highlightedSelected.includes(activeEntity)) {
                              const next = remaining[0] || '';
                              setActiveEntity(next);
                              if (!next) setFieldPermissions([]);
                            }
                            return remaining;
                          });
                          setHighlightedSelected([]);
                        }
                      }}
                      disabled={highlightedSelected.length === 0}
                      className="px-2 py-1"
                    >
                      ←
                    </Button>
                  </div>

                  {/* Selected */}
                  <div className="border rounded-md overflow-hidden w-full">
                    <div className="px-3 py-2 text-xs font-semibold bg-gray-50 border-b">Selected Tables</div>
                    <div className="max-h-64 overflow-y-auto">
                      {selectedEntities.length > 0 ? (
                        selectedEntities.map(name => {
                          const isHighlighted = highlightedSelected.includes(name);
                          const isActive = activeEntity === name;
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => {
                                setHighlightedSelected(prev => prev.includes(name)
                                  ? prev.filter(n => n !== name)
                                  : [...prev, name]);
                              }}
                              onDoubleClick={() => {
                                setActiveEntity(name);
                                const ent = availableEntities.find(e => e.name === name);
                                if (ent) {
                                  // Always load fields when switching tables to ensure fresh data
                                  fetchTableFields(ent.id);
                                }
                              }}
                              className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${
                                isActive ? 'bg-blue-100 border-blue-300' : 
                                highlightedSelected.includes(name) ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                                              <div 
                                className="cursor-pointer hover:text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveEntity(name);
                                  const ent = availableEntities.find(e => e.name === name);
                                  if (ent) {
                                    // Always load fields when switching tables to ensure fresh data
                                    fetchTableFields(ent.id);
                                  }
                                }}
                              >
                                <div className="font-medium">{name}</div>
                                                                  <div className="text-xs text-gray-500">
                                    {(fieldsCacheRef.current[name]?.length) || 0} fields
                                  </div>
                              </div>
                                <div className="text-xs">
                                  <span
                                    className="cursor-pointer h-6 px-2 inline-flex items-center text-blue-600 hover:underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandedSelected(name);
                                    }}
                                  >
                                    {expandedSelected[name] ? 'Hide' : 'Show'} fields
                                  </span>
                                </div>
                              </div>
                                                                                              {expandedSelected[name] && (
                                <div className="mt-2 border-t pt-2">
                                  {(fieldsCacheRef.current[name] || []).length > 0 ? (
                                    <ul className="max-h-32 overflow-y-auto text-xs text-gray-700 list-disc pl-5">
                                      {(fieldsCacheRef.current[name] || []).map(f => (
                                        <li key={f}>{f}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="text-xs text-gray-500">
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mx-auto mb-1"></div>
                                      Loading fields…
                                    </div>
                                  )}
                                </div>
                              )}
            </button>
                          );
                        })
                  ) : (
                        <div className="text-center py-4 text-sm text-gray-500">None selected</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Area - Permissions */}
              <div className="space-y-6">
                {/* Record Permissions */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-800">Records</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Create Record</span>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="create"
                            checked={recordPermissions.create}
                            onChange={() => handleRecordPermissionChange('create', true)}
                            className="text-blue-600"
                          />
                          <span className="text-sm">Yes</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="create"
                            checked={!recordPermissions.create}
                            onChange={() => handleRecordPermissionChange('create', false)}
                            className="text-blue-600"
                          />
                          <span className="text-sm">No</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Delete Record</span>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="delete"
                            checked={recordPermissions.delete}
                            onChange={() => handleRecordPermissionChange('delete', true)}
                            className="text-blue-600"
                          />
                          <span className="text-sm">Yes</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="delete"
                            checked={!recordPermissions.delete}
                            onChange={() => handleRecordPermissionChange('delete', false)}
                            className="text-blue-600"
                          />
                          <span className="text-sm">No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field Permissions */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-800">Fields</h4>
                     <div className="text-xs text-gray-600">
                       {activeEntity ? `Active table: ${activeEntity}` : 'No active table'}
                     </div>
                   </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-3 bg-gray-50 border-b">
                      <div className="px-4 py-2 font-medium text-sm text-gray-700">Field</div>
                      <div className="px-4 py-2 font-medium text-sm text-gray-700 text-center">View</div>
                      <div className="px-4 py-2 font-medium text-sm text-gray-700 text-center">Edit</div>
                    </div>
                    
                    {loadingFields ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-xs text-gray-500 mt-2">
                          Loading fields for <strong>{activeEntity}</strong>...
                        </p>
                      </div>
                    ) : fieldPermissions.length > 0 ? (
                      fieldPermissions.map((fieldPermission, index) => (
                        <div key={fieldPermission.field} className="grid grid-cols-3 border-b last:border-b-0">
                          <div className="px-4 py-3 text-sm text-gray-700">{fieldPermission.field}</div>
                          <div className="px-4 py-3 flex items-center justify-center">
                            <Checkbox
                              checked={fieldPermission.view}
                              onCheckedChange={(checked) => 
                                handleFieldPermissionChange(index, 'view', checked as boolean)
                              }
                            />
                          </div>
                          <div className="px-4 py-3 flex items-center justify-center">
                            <Checkbox
                              checked={fieldPermission.edit}
                              onCheckedChange={(checked) => 
                                handleFieldPermissionChange(index, 'edit', checked as boolean)
                              }
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500">No fields found for this table.</p>
                      </div>
                    )}
                  </div>
          </div>
        </div>
      </div>
    </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={onClose}
              disabled={loading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="px-6 bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


