'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowRight, ArrowLeft, Save, X } from 'lucide-react';
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

interface ManageTablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionSetId: string;
  permissionSetName: string;
}

export default function ManageTablesModal({
  isOpen,
  onClose,
  permissionSetId,
  permissionSetName
}: ManageTablesModalProps) {
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

  useEffect(() => {
    if (isOpen && permissionSetId) {
      fetchAvailableTables();
      fetchAssignedTables();
    }
  }, [isOpen, permissionSetId]);

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

    setLoading(true);
    try {
      const tablesToAssign = availableTables.filter(table => 
        selectedAvailableTables.includes(table.id)
      );

      for (const table of tablesToAssign) {
        await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableName: table.name,
            permissions: tablePermissions
          })
        });
      }

      showToast.success('Tables assigned successfully');
      setSelectedAvailableTables([]);
      fetchAssignedTables();
      fetchAvailableTables(); // Refresh to remove assigned tables
    } catch (error) {
      console.error('Error assigning tables:', error);
      showToast.error('Failed to assign tables');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignTables = async () => {
    if (selectedAssignedTables.length === 0) return;

    setLoading(true);
    try {
      for (const tableId of selectedAssignedTables) {
        await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tableId })
        });
      }

      showToast.success('Tables unassigned successfully');
      setSelectedAssignedTables([]);
      fetchAssignedTables();
      fetchAvailableTables(); // Refresh to add back to available
    } catch (error) {
      console.error('Error unassigning tables:', error);
      showToast.error('Failed to unassign tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      // Update permissions for all assigned tables
      for (const table of selectedTables) {
        await fetch(`/api/admin/permission-sets/${permissionSetId}/tables`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tableId: table.id,
            permissions: tablePermissions
          })
        });
      }

      showToast.success('Changes saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast.error('Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTablesForDisplay = () => {
    const assignedTableNames = selectedTables.map(t => t.table_name);
    return availableTables.filter(table => !assignedTableNames.includes(table.name));
  };

  // Don't render if we don't have the required data
  if (!permissionSetId || !permissionSetName) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Manage Tables - {permissionSetName}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full space-y-4">
          {/* Table Selection Section */}
          <div className="flex space-x-4 flex-1 min-h-0">
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
                      <div className="font-medium">{table.name}</div>
                      <div className="text-sm text-gray-500">Table: {table.name}</div>
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
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
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
                    />
                    <div className="flex-1">
                      <div className="font-medium">{table.table_name}</div>
                      <div className="text-sm text-gray-500">Click to edit fields</div>
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

          {/* Table Permissions Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Table Permissions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={tablePermissions.can_create}
                  onCheckedChange={(checked) => 
                    setTablePermissions(prev => ({ ...prev, can_create: !!checked }))
                  }
                />
                <span>Create Record</span>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={tablePermissions.can_delete}
                  onCheckedChange={(checked) => 
                    setTablePermissions(prev => ({ ...prev, can_delete: !!checked }))
                  }
                />
                <span>Delete Record</span>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={tablePermissions.can_read}
                  onCheckedChange={(checked) => 
                    setTablePermissions(prev => ({ ...prev, can_read: !!checked }))
                  }
                />
                <span>Read Record</span>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={tablePermissions.can_update}
                  onCheckedChange={(checked) => 
                    setTablePermissions(prev => ({ ...prev, can_update: !!checked }))
                  }
                />
                <span>Update Record</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
