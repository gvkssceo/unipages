'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, ArrowLeft, Save, ArrowLeft as BackArrow } from 'lucide-react';
import { showToast } from '@/utils/toast';

interface Table {
  id: string;
  name: string;
  description: string;
}

interface TableAccess {
  id: string;
  table_name: string;
  can_create: boolean;
  can_delete: boolean;
  can_read: boolean;
  can_update: boolean;
}

interface InlineTableManagerProps {
  permissionSetId: string;
  permissionSetName: string;
  onBack: () => void;
  onTablesUpdated: () => void;
  onTablePermissionsChanged?: (hasChanges: boolean) => void;
}

const InlineTableManager = forwardRef<any, InlineTableManagerProps>(({
  permissionSetId,
  permissionSetName,
  onBack,
  onTablesUpdated,
  onTablePermissionsChanged
}, ref) => {
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [selectedTables, setSelectedTables] = useState<TableAccess[]>([]);
  const [selectedAvailableTables, setSelectedAvailableTables] = useState<string[]>([]);
  const [selectedAssignedTables, setSelectedAssignedTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tablePermissions, setTablePermissions] = useState<{
    can_create: boolean;
    can_delete: boolean;
    can_read: boolean;
    can_update: boolean;
  }>({
    can_create: true,
    can_delete: true,
    can_read: true,
    can_update: true
  });
  
  // Staged assignment changes (apply on Save)
  const [pendingAssignments, setPendingAssignments] = useState<string[]>([]); // tableIds to assign
  const [pendingUnassignments, setPendingUnassignments] = useState<string[]>([]); // mapping ids to unassign

  // State for editing table permissions with persistent storage
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<{
    can_create: boolean;
    can_delete: boolean;
    can_read: boolean;
    can_update: boolean;
  }>({
    can_create: true,
    can_delete: true,
    can_read: true,
    can_update: true
  });
  
  // Persistent storage for table permissions to avoid resetting
  const [tablePermissionsCache, setTablePermissionsCache] = useState<{
    [tableId: string]: {
      can_create: boolean;
      can_delete: boolean;
      can_read: boolean;
      can_update: boolean;
    };
  }>({});

  useEffect(() => {
    if (permissionSetId) {
      fetchAvailableTables();
      fetchAssignedTables();
    }
  }, [permissionSetId]);
  
  // Initialize cache when assigned tables are loaded
  useEffect(() => {
    if (selectedTables.length > 0) {
      console.log(`🔄 Initializing cache for ${selectedTables.length} tables:`, selectedTables);
      const initialCache: { [key: string]: any } = {};
      selectedTables.forEach(table => {
        initialCache[table.id] = {
          can_create: table.can_create,
          can_delete: table.can_delete,
          can_read: table.can_read,
          can_update: table.can_update
        };
      });
      console.log(`💾 Setting initial cache:`, initialCache);
      setTablePermissionsCache(initialCache);
    }
  }, [selectedTables]);

  const fetchAvailableTables = async () => {
    try {
      const response = await fetch('/api/admin/tables');
      if (response.ok) {
        const data = await response.json();
        setAvailableTables(data);
      }
    } catch (error) {
      console.error('Error fetching available tables:', error);
      showToast.error('Failed to fetch available tables');
    }
  };

  const fetchAssignedTables = async () => {
    try {
      const response = await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTables(data.tables || []);
      }
    } catch (error) {
      console.error('Error fetching assigned tables:', error);
      showToast.error('Failed to fetch assigned tables');
    }
  };

  const handleAssignTables = async () => {
    if (selectedAvailableTables.length === 0) return;

    // Stage assignment locally, persist on Save
    const tablesToAssign = availableTables.filter(table => selectedAvailableTables.includes(table.id));

    // Add to selected tables view with temporary pending IDs and default permissions
    const pendingSelected = tablesToAssign.map((table) => ({
      id: `pending:${table.id}`,
      table_name: (table as any).name,
      name: (table as any).name,
      can_create: tablePermissions.can_create,
      can_delete: tablePermissions.can_delete,
      can_read: tablePermissions.can_read,
      can_update: tablePermissions.can_update
    }));

    setSelectedTables((prev) => [...prev, ...pendingSelected]);
    setPendingAssignments((prev) => [...prev, ...tablesToAssign.map((t) => t.id)]);
    setSelectedAvailableTables([]);
  };

  const handleUnassignTables = async () => {
    if (selectedAssignedTables.length === 0) return;

    // Stage unassignment locally
    const toProcess = selectedAssignedTables;
    setSelectedAssignedTables([]);

    setSelectedTables((prev) => prev.filter((t) => !toProcess.includes(t.id)));

    // For pending additions (ids like pending:<tableId>), remove from pendingAssignments
    const pendingIds = toProcess.filter((id) => id.startsWith('pending:'));
    if (pendingIds.length > 0) {
      const tableIds = pendingIds.map((pid) => pid.replace('pending:', ''));
      setPendingAssignments((prev) => prev.filter((id) => !tableIds.includes(id)));
    }

    // For existing mappings, stage unassignment by mapping id
    const existingIds = toProcess.filter((id) => !id.startsWith('pending:'));
    if (existingIds.length > 0) {
      setPendingUnassignments((prev) => [...prev, ...existingIds]);
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      console.log('🔄 Starting save process...');
      console.log('📋 Current cache:', tablePermissionsCache);
      console.log('📊 Selected tables:', selectedTables);
      // First, save any pending permission changes if a table is being edited
      if (editingTableId) {
        const response = await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId: editingTableId,
            permissions: editingPermissions
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to update table permissions');
        }

                 // Update local state for the edited table
         setSelectedTables(prev => 
           prev.map(table => 
             table.id === editingTableId 
               ? { ...table, ...editingPermissions }
               : table
           )
         );
         
         // Also update the original table data to reflect saved changes
         setSelectedTables(prev => 
           prev.map(table => {
             const cachedPermissions = tablePermissionsCache[table.id];
             if (cachedPermissions && (
               cachedPermissions.can_create !== table.can_create ||
               cachedPermissions.can_delete !== table.can_delete ||
               cachedPermissions.can_read !== table.can_read ||
               cachedPermissions.can_update !== table.can_update
             )) {
               return { ...table, ...cachedPermissions };
             }
             return table;
           })
         );

                 // Clear editing state
         setEditingTableId(null);
         setEditingPermissions({
           can_create: true,
           can_delete: true,
           can_read: true,
           can_update: true
         });
         
         // Clear the cache for this table since it's been saved
         setTablePermissionsCache(prev => {
           const newCache = { ...prev };
           delete newCache[editingTableId];
           return newCache;
         });
      }

             // Update permissions for all assigned tables using cached permissions
       for (const table of selectedTables) {
         // Check if this table has cached permissions that differ from original
         const cachedPermissions = tablePermissionsCache[table.id];
         if (cachedPermissions && (
           cachedPermissions.can_create !== table.can_create ||
           cachedPermissions.can_delete !== table.can_delete ||
           cachedPermissions.can_read !== table.can_read ||
           cachedPermissions.can_update !== table.can_update
         )) {
                       console.log(`💾 Updating permissions for table ${(table as any).name}:`, {
             original: {
               can_create: table.can_create,
               can_delete: table.can_delete,
               can_read: table.can_read,
               can_update: table.can_update
             },
             new: cachedPermissions
           });
           
           const response = await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`, {
             method: 'PUT',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               tableId: table.id,
               permissions: cachedPermissions
             })
           });
           
           if (!response.ok) {
             const error = await response.json();
                           throw new Error(`Failed to update table ${(table as any).name}: ${error.message || 'Unknown error'}`);
           }
           
                       console.log(`✅ Successfully updated table ${(table as any).name}`);
         } else {
           console.log(`⏭️ Skipping table ${(table as any).name} - no changes detected`);
         }
       }

             // Count how many tables were updated
       const updatedTablesCount = Object.keys(tablePermissionsCache).length;
       showToast.success(`All changes saved successfully! Updated ${updatedTablesCount} table(s)`);
       
       // Clear the entire cache after all changes have been saved
       setTablePermissionsCache({});
       
       onTablesUpdated();
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast.error(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking on a table to edit its permissions
  const handleTableClick = (table: TableAccess) => {
    // Check if user can edit permissions for this table
    if (!canEditTablePermissions(table)) {
      showToast.error("You need at least READ permission to edit table permissions");
      return;
    }

    // Only update editingTableId if it's a different table
    if (editingTableId !== table.id) {
      console.log(`🖱️ Clicking on table: ${(table as any).name} (ID: ${table.id})`);
      console.log(`📋 Current cache state:`, tablePermissionsCache);
      
      setEditingTableId(table.id);
      
      // Check if we have cached permissions for this table
      let permissionsToEdit: any;
      if (tablePermissionsCache[table.id]) {
        console.log(`✅ Using cached permissions for table ${(table as any).name}:`, tablePermissionsCache[table.id]);
        permissionsToEdit = tablePermissionsCache[table.id];
      } else {
        console.log(`🆕 Initializing permissions for table ${(table as any).name}:`, {
          can_create: table.can_create,
          can_delete: table.can_delete,
          can_read: table.can_read,
          can_update: table.can_update
        });
        // Set initial permissions from table data and cache them
        permissionsToEdit = {
          can_create: table.can_create,
          can_delete: table.can_delete,
          can_read: table.can_read,
          can_update: table.can_update
        };
      }
      
      // Fix any permission hierarchy inconsistencies
      if (!permissionsToEdit.can_read && (permissionsToEdit.can_update || permissionsToEdit.can_delete)) {
        console.log(`🔧 Fixing permission hierarchy for table ${(table as any).name} - READ=false, so UPDATE/DELETE must be false`);
        permissionsToEdit = {
          ...permissionsToEdit,
          can_update: false,
          can_delete: false
        };
        
        // Update the cache with fixed permissions
        setTablePermissionsCache(prev => ({
          ...prev,
          [table.id]: permissionsToEdit
        }));
        
        showToast.success("Permission hierarchy automatically fixed - UPDATE/DELETE disabled due to READ being false");
      }
      
      setEditingPermissions(permissionsToEdit);
      
      // Cache the permissions (either original or fixed)
      if (!tablePermissionsCache[table.id]) {
        setTablePermissionsCache(prev => {
          const newCache = {
            ...prev,
            [table.id]: permissionsToEdit
          };
          console.log(`💾 Cached initial permissions for table ${table.id}:`, newCache);
          return newCache;
        });
      }
    }
  };

  // Handle permission changes with permission hierarchy enforcement
  const handlePermissionChange = (permission: string, value: boolean) => {
    // Enforce permission hierarchy: if READ is false, UPDATE and DELETE must also be false
    let newPermissions = { ...editingPermissions };
    
    if (permission === 'can_read' && !value) {
      // If READ is being set to false, force UPDATE and DELETE to false
      newPermissions = {
        ...newPermissions,
        can_read: false,
        can_update: false,
        can_delete: false
      };
      console.log(`🔒 Enforcing permission hierarchy: READ=false, so UPDATE and DELETE forced to false`);
      showToast.success("READ permission disabled - UPDATE and DELETE automatically disabled due to permission hierarchy");
    } else if (permission === 'can_update' && value && !newPermissions.can_read) {
      // If trying to set UPDATE to true but READ is false, prevent it
      console.log(`🔒 Cannot set UPDATE=true when READ=false due to permission hierarchy`);
      showToast.error("Cannot enable UPDATE permission when READ is disabled");
      return;
    } else if (permission === 'can_delete' && value && !newPermissions.can_read) {
      // If trying to set DELETE to true but READ is false, prevent it
      console.log(`🔒 Cannot set DELETE=true when READ=false due to permission hierarchy`);
      showToast.error("Cannot enable DELETE permission when READ is disabled");
      return;
    } else {
      // Normal permission change
      (newPermissions as any)[permission] = value;
    }
    
    console.log(`🔧 Permission change for table ${editingTableId}:`, {
      permission,
      value,
      oldPermissions: editingPermissions,
      newPermissions,
      hierarchyEnforced: permission === 'can_read' && !value
    });
    
    setEditingPermissions(newPermissions);
    
    // Update the cache to persist changes across table switches
    if (editingTableId) {
      setTablePermissionsCache(prev => {
        const updatedCache = {
          ...prev,
          [editingTableId]: newPermissions
        };
        console.log(`💾 Updated cache for table ${editingTableId}:`, updatedCache);
        return updatedCache;
      });
    }
  };





  const getAvailableTablesForDisplay = () => {
    const assignedTableNames = selectedTables.map((t: any) => t.name);
    return availableTables.filter(table => !assignedTableNames.includes((table as any).name));
  };
  
  // Check if there are any unsaved changes
  const hasUnsavedChanges = () => {
    return (
      Object.keys(tablePermissionsCache).length > 0 ||
      pendingAssignments.length > 0 ||
      pendingUnassignments.length > 0
    );
  };

  // Check if current user can edit permissions for a table
  // Users can edit permissions if they have at least READ access to the table
  const canEditTablePermissions = (table: TableAccess) => {
    return table.can_read === true;
  };

  // Notify parent component of changes
  useEffect(() => {
    if (onTablePermissionsChanged) {
      onTablePermissionsChanged(hasUnsavedChanges());
    }
  }, [tablePermissionsCache, pendingAssignments, pendingUnassignments, onTablePermissionsChanged]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    saveTablePermissions: async () => {
      console.log('🔧 Starting to save table permissions...');
      console.log('🔧 Cache contents:', tablePermissionsCache);
      console.log('🔧 Pending assignments:', pendingAssignments);
      console.log('🔧 Pending unassignments:', pendingUnassignments);
      
      if (
        Object.keys(tablePermissionsCache).length === 0 &&
        pendingAssignments.length === 0 &&
        pendingUnassignments.length === 0
      ) {
        console.log('🔧 No changes to save');
        return; // No changes to save
      }
      
      try {
        // First, process pending assignments (new tables) against /tables POST
        for (const tableId of pendingAssignments) {
          const cacheKey = `pending:${tableId}`;
          const permissions = tablePermissionsCache[cacheKey] || tablePermissions;
          const tableObj = availableTables.find((t) => t.id === tableId);
          const tableName = (tableObj as any)?.name;
          if (!tableName) {
            throw new Error(`Table metadata not found for id ${tableId}`);
          }
          const response = await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableName, permissions })
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to assign table ${tableName}: ${errorData.error || 'Unknown error'}`);
          }
        }

        // Next, process pending unassignments (existing mappings) against /tables DELETE
        for (const mappingId of pendingUnassignments) {
          const response = await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableId: mappingId })
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to unassign table ${mappingId}: ${errorData.error || 'Unknown error'}`);
          }
        }

        // Save all table permission changes against /tables PUT
        for (const [tableId, permissions] of Object.entries(tablePermissionsCache)) {
          // Skip cache entries for pending items; they were handled in assignments above
          if (tableId.startsWith('pending:')) continue;
          // Skip tables that are being removed in this save
          if (pendingUnassignments.includes(tableId)) {
            console.log(`⏭️ Skipping update for ${tableId} due to pending removal`);
            continue;
          }
          console.log(`🔧 Updating table ${tableId} with permissions:`, permissions);
          
          const response = await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableId, permissions })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`🔧 Failed to update table ${tableId}:`, errorData);
            throw new Error(`Failed to update table ${tableId}: ${errorData.error || 'Unknown error'}`);
          }
          
          console.log(`🔧 Successfully updated table ${tableId}`);
        }
        
        console.log('🔧 All table permissions saved successfully');
        
        // Clear staged changes after successful save
        setTablePermissionsCache({});
        setPendingAssignments([]);
        setPendingUnassignments([]);
        
        // Refresh the assigned tables
        await fetchAssignedTables();
        
        // Notify parent of successful save
        onTablesUpdated();
        
        return true;
      } catch (error) {
        console.error('Failed to save table permissions:', error);
        throw error;
      }
    }
  }));

  return (
    <div className="space-y-6">


      {/* Table Selection Section */}
      <div className="flex space-x-6">
        {/* Available Tables */}
        <div className="flex-1 border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Available Tables</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {getAvailableTablesForDisplay().map((table) => (
              <div
                key={table.id}
                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
              >
                <Checkbox
                  checked={selectedAvailableTables.includes(table.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedAvailableTables(prev => [...prev, table.id]);
                    } else {
                      setSelectedAvailableTables(prev => prev.filter(id => id !== table.id));
                    }
                  }}
                />
                <div className="flex-1">
                  <div className="font-medium">{(table as any).name}</div>
                  <div className="text-sm text-gray-500">Table: {(table as any).name}</div>
                </div>
              </div>
            ))}
            {getAvailableTablesForDisplay().length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No available tables
              </div>
            )}
          </div>
        </div>

        {/* Transfer Controls */}
        <div className="flex flex-col justify-center space-y-2">
          <Button
            onClick={handleAssignTables}
            disabled={selectedAvailableTables.length === 0 || loading}
            size="sm"
            className="px-3"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleUnassignTables}
            disabled={selectedAssignedTables.length === 0 || loading}
            size="sm"
            variant="outline"
            className="px-3"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Selected Tables */}
        <div className="flex-1 border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Selected Tables</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {selectedTables.map((table) => (
              <div
                key={table.id}
                className={`flex items-center space-x-3 p-2 rounded transition-colors ${
                  editingTableId === table.id 
                    ? 'bg-blue-50 border border-blue-200' 
                    : tablePermissionsCache[table.id] && (
                        tablePermissionsCache[table.id].can_create !== table.can_create ||
                        tablePermissionsCache[table.id].can_delete !== table.can_delete ||
                        tablePermissionsCache[table.id].can_read !== table.can_read ||
                        tablePermissionsCache[table.id].can_update !== table.can_update
                      )
                    ? 'bg-yellow-50 border border-yellow-200'
                    : canEditTablePermissions(table)
                    ? 'hover:bg-gray-50 cursor-pointer'
                    : 'bg-gray-100 cursor-not-allowed opacity-60'
                }`}
                onClick={() => canEditTablePermissions(table) && handleTableClick(table)}
              >
                <Checkbox
                  checked={selectedAssignedTables.includes(table.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedAssignedTables(prev => [...prev, table.id]);
                    } else {
                      setSelectedAssignedTables(prev => prev.filter(id => id !== table.id));
                    }
                  }}
                  onClick={(e) => e.stopPropagation()} // Prevent table click when clicking checkbox
                />
                <div className="flex-1">
                  <div className="font-medium">{(table as any).name}</div>
                                     <div className="text-sm text-gray-500">
                     {editingTableId === table.id ? 'Editing permissions...' : 
                        canEditTablePermissions(table) ? 'Click to edit permissions' : 'No permission to edit (need READ access)'}
                     {tablePermissionsCache[table.id] && (
                       tablePermissionsCache[table.id].can_create !== table.can_create ||
                       tablePermissionsCache[table.id].can_delete !== table.can_delete ||
                       tablePermissionsCache[table.id].can_read !== table.can_read ||
                       tablePermissionsCache[table.id].can_update !== table.can_update
                     ) && (
                       <span className="ml-2 text-xs text-yellow-600 font-medium">(Modified)</span>
                     )}
                   </div>
                  {/* Show current permissions */}
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className={`px-2 py-1 rounded ${table.can_create ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {table.can_create ? '✓' : '✗'} Create
                      <span className="ml-1 text-xs text-green-600">(Indep)</span>
                    </span>
                    <span className={`px-2 py-1 rounded ${table.can_read ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {table.can_read ? '✓' : '✗'} Read
                    </span>
                    <span className={`px-2 py-1 rounded ${table.can_update ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} ${!table.can_read ? 'opacity-50' : ''}`}>
                      {table.can_update ? '✓' : '✗'} Update
                      {!table.can_read && <span className="ml-1 text-gray-500">(Read)</span>}
                    </span>
                    <span className={`px-2 py-1 rounded ${table.can_delete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} ${!table.can_read ? 'opacity-50' : ''}`}>
                      {table.can_delete ? '✓' : '✗'} Delete
                      {!table.can_read && <span className="ml-1 text-gray-500">(Read)</span>}
                    </span>
                  </div>
                  
                  {/* Show permission hierarchy warning if needed */}
                  {!table.can_read && (table.can_update || table.can_delete) && (
                    <div className="mt-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                      ⚠️ Warning: UPDATE/DELETE enabled without READ permission (will be fixed on save)
                    </div>
                  )}
                </div>
              </div>
            ))}
            {selectedTables.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No tables assigned
              </div>
            )}
          </div>
        </div>
      </div>

             {/* Table Permissions Editing Section */}
       {editingTableId && (
         <div className="border rounded-lg p-4 bg-gray-50">
           <div className="mb-4">
             <h4 className="text-lg font-semibold text-gray-900">
               Edit Table Permissions
             </h4>
             <p className="text-sm text-gray-600 mt-1">
               💡 <strong>Permission Hierarchy:</strong> READ permission controls UPDATE and DELETE access - if READ is disabled, 
               UPDATE and DELETE permissions are automatically disabled. CREATE permission works independently 
               and can be enabled even without READ access. This allows users to create records without viewing them.
             </p>
             
             <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
               <h5 className="text-sm font-semibold text-blue-900 mb-2">📋 Permission Rules:</h5>
               <ul className="text-xs text-blue-800 space-y-1">
                 <li>• <strong>CREATE:</strong> Independent permission - can create records even without READ access</li>
                 <li>• <strong>READ:</strong> Required for UPDATE and DELETE - automatically disables them when false</li>
                 <li>• <strong>UPDATE:</strong> Requires READ permission - automatically disabled if READ is false</li>
                 <li>• <strong>DELETE:</strong> Requires READ permission - automatically disabled if READ is false</li>
               </ul>
             </div>
           </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={editingPermissions.can_create}
                  onCheckedChange={(checked) => handlePermissionChange('can_create', !!checked)}
                />
                <span className="text-sm font-medium">Create Records</span>
                <span className="text-xs text-green-600 font-medium">(Independent)</span>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={editingPermissions.can_read}
                  onCheckedChange={(checked) => handlePermissionChange('can_read', !!checked)}
                />
                <span className="text-sm font-medium">Read Records</span>
                <span className="text-xs text-blue-600 font-medium">(Primary)</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={editingPermissions.can_update}
                  onCheckedChange={(checked) => handlePermissionChange('can_update', !!checked)}
                  disabled={!editingPermissions.can_read}
                />
                <span className={`text-sm font-medium ${!editingPermissions.can_read ? 'text-gray-400' : ''}`}>
                  Update Records
                </span>
                {!editingPermissions.can_read && (
                  <span className="text-xs text-red-600 font-medium">(Requires Read)</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={editingPermissions.can_delete}
                  onCheckedChange={(checked) => handlePermissionChange('can_delete', !!checked)}
                  disabled={!editingPermissions.can_read}
                />
                <span className={`text-sm font-medium ${!editingPermissions.can_read ? 'text-gray-400' : ''}`}>
                  Delete Records
                </span>
                {!editingPermissions.can_read && (
                  <span className="text-xs text-red-600 font-medium">(Requires Read)</span>
                )}
              </div>
            </div>
          </div>
          
                     <div className="mt-4 text-xs text-gray-600">
             💡 Click on any table in the "Selected Tables" panel above to edit its permissions. All changes will be saved when you click the main "Save Changes" button below. Use the main "Cancel" button to cancel all changes.
           </div>
        </div>
      )}

                    {/* Debug Section */}
       <div className="border rounded-lg p-4 bg-gray-50">
         <h4 className="text-sm font-semibold text-gray-900 mb-2">Debug Info</h4>
         <div className="text-xs text-gray-600 space-y-1">
           <div>Editing Table ID: {editingTableId || 'None'}</div>
           <div>Cache Keys: {Object.keys(tablePermissionsCache).join(', ') || 'None'}</div>
           <div>Selected Tables Count: {selectedTables.length}</div>
           <div>Has Unsaved Changes: {hasUnsavedChanges() ? 'Yes' : 'No'}</div>
         </div>
       </div>

       {/* Note: Action buttons removed - use main header buttons instead */}
       <div className="mt-4 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
         💡 <strong>Note:</strong> Use the main "Save Changes" button in the header above to save all table permission changes. Use the main "Cancel" button to discard all changes.
         <br />
         🔐 <strong>Permission Management:</strong> READ permission controls UPDATE and DELETE - if READ is disabled, the others are automatically disabled. CREATE works independently and can be enabled without READ access.
       </div>
    </div>
  );
});

export default InlineTableManager;
