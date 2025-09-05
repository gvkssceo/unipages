"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import HeadingCard from "@/components/ui/HeadingCard";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/toast";
import { Key, RefreshCw, Trash2, Database, Edit, FileText, ChevronLeft } from "lucide-react";
import InlineTableManager from "@/components/InlineTableManager";

// PHASE 1 OPTIMIZATION: Batch field update function to eliminate sequential API calls
const handleBatchFieldUpdates = async (fields: any[], permissionSetId: string) => {
  const startTime = Date.now();
  
  // Prepare all field updates
  const fieldUpdates = fields.map(field => {
    if (!field.id) return null;
    
    // Ensure field permissions respect permission hierarchy
    let fieldPermissions = {
      can_view: field.can_view || false,
      can_edit: field.can_edit || false
    };
    
    // Ensure field-level hierarchy: if VIEW is false, EDIT must also be false
    if (!fieldPermissions.can_view) {
      fieldPermissions.can_edit = false;
    }
    
    return fetch(`/api/admin/permission-sets/${permissionSetId}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldId: field.id,
        permissions: fieldPermissions
      })
    });
  }).filter(Boolean);
  
  // Execute all updates in parallel
  const results = await Promise.all(fieldUpdates);
  
  const updateTime = Date.now() - startTime;
  console.log(`📊 Batch field updates completed in ${updateTime}ms for ${fields.length} fields`);
  
  // Check for any failures
  const failures = results.filter(result => result && !result.ok);
  if (failures.length > 0) {
    throw new Error(`Failed to update ${failures.length} fields`);
  }
  
  return results;
};

export default function PermissionSetDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const id = routeParams?.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [permissionSet, setPermissionSet] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<any>({ name: "", description: "" });
  const [validationErrors, setValidationErrors] = useState<any>({});

  // Validation functions
  const validateField = (fieldName: string, value: any) => {
    const errors: any = { ...validationErrors };

    switch (fieldName) {
      case 'name':
        if (!value || value.trim() === '') {
          errors.name = 'Permission set name is required';
        } else if (value.trim().length < 2) {
          errors.name = 'Permission set name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          errors.name = 'Permission set name cannot exceed 100 characters';
        } else {
          delete errors.name;
        }
        break;

      case 'description':
        // Description is optional, but if provided, validate length
        if (value && value.length > 500) {
          errors.description = 'Description cannot exceed 500 characters';
        } else {
          delete errors.description;
        }
        break;

      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAllFields = () => {
    const fields = ['name', 'description'];
    let isValid = true;

    fields.forEach(field => {
      if (!validateField(field, editingData[field])) {
        isValid = false;
      }
    });

    return isValid;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditingData((prev: any) => ({ ...prev, [fieldName]: value }));
    validateField(fieldName, value);
  };

  const [activeTab, setActiveTab] = useState<"info" | "tables">("info");
  const [tables, setTables] = useState<any[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [isEditingTables, setIsEditingTables] = useState(false);
  const [hasTableChanges, setHasTableChanges] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [tableFields, setTableFields] = useState<any[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  
  // Ref to access InlineTableManager methods
  const tableManagerRef = useRef<any>(null);


  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    fetchAll();
  }, [status, id]);

  const fetchAll = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/permission-sets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPermissionSet(data);
        setLastUpdated(new Date());
      } else {
        showToast.error("Failed to load permission set");
      }
    } catch (e) {
      showToast.error("Failed to load permission set");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    const t = showToast.loading("Refreshing data...");
    try {
      await fetchAll(true);
      showToast.dismiss(t);
      showToast.success("Data refreshed successfully");
    } catch (error) {
      showToast.dismiss(t);
      showToast.error("Failed to refresh data");
    }
  };

  const handleEdit = () => {
    if (!permissionSet) return;
    setIsEditing(true);
    setEditingData({ name: permissionSet.name || "", description: permissionSet.description || "" });
    setValidationErrors({}); // Clear validation errors when entering edit mode
    
    // If we're in the Tables tab but viewing individual table fields, don't enable table editing
    // Only enable table editing when viewing the table list
    if (activeTab === 'tables' && !selectedTable) {
      setIsEditingTables(true);
    }
  };



  const handleTableClick = async (table: any) => {
    setSelectedTable(table);
    setFieldsLoading(true);
    try {
      // Fetch all fields for the permission set and filter by table
      const res = await fetch(`/api/admin/permission-sets/${permissionSet.id}/fields`);
      if (res.ok) {
        const data = await res.json();
                 // Filter fields by the selected table and initialize original permissions
         const tableFields = data.fields?.filter((field: any) => field.table_name === table.name) || [];
         const fieldsWithOriginals = tableFields.map((field: any) => {
           // Enforce permission hierarchy:
           // - View permission requires table READ access
           // - Edit permission requires table READ access AND table UPDATE access
           // - Field-level: EDIT permission requires VIEW permission
           let enforcedPermissions = {
             can_view: table.can_read ? field.can_view : false,
             can_edit: (table.can_read && table.can_update) ? field.can_edit : false
           };
           
           // Ensure field-level hierarchy: if VIEW is false, EDIT must also be false
           if (!enforcedPermissions.can_view) {
             enforcedPermissions.can_edit = false;
           }
           
           return {
             ...field,
             ...enforcedPermissions, // Override with enforced permissions
             hasChanges: false,
             originalPermissions: { can_view: field.can_view, can_edit: field.can_edit }
           };
         });
        setTableFields(fieldsWithOriginals);
        
                 // Show warning if table has no READ access
         if (!table.can_read) {
           showToast.error("Table has no READ access - all field permissions are disabled");
         } else if (!table.can_update) {
           showToast.error("Table has no UPDATE access - field EDIT permissions are disabled");
         }
      } else {
        showToast.error("Failed to load table fields");
        setTableFields([]);
      }
    } catch (e) {
      showToast.error("Failed to load table fields");
      setTableFields([]);
    } finally {
      setFieldsLoading(false);
    }
  };

  const handleBackToTables = () => {
    setSelectedTable(null);
    setTableFields([]);
  };

  const handleFieldPermissionChange = async (field: any, permission: string, value: boolean) => {
    try {
      // Check if the selected table has READ permission (required for all field permissions)
      if (selectedTable && !selectedTable.can_read) {
        if (value === true) {
          showToast.error("Cannot enable field permissions when table has no READ access");
          return;
        }
      }
      
      // Check if trying to enable EDIT permission without table UPDATE permission
      if (permission === 'can_edit' && value === true && selectedTable && !selectedTable.can_update) {
        showToast.error("Cannot enable field EDIT permission when table has no UPDATE access");
        return;
      }
      
      // Enforce field-level permission hierarchy: if VIEW is unchecked, EDIT must also be unchecked
      if (permission === 'can_view' && !value) {
        // If VIEW is being unchecked, force EDIT to also be unchecked
        setTableFields(prev => prev.map(f => 
          f.id === field.id ? { 
            ...f, 
            can_view: false,
            can_edit: false, // Force EDIT to false when VIEW is unchecked
            hasChanges: true,
            originalPermissions: f.originalPermissions || { can_view: f.can_view, can_edit: f.can_edit }
          } : f
        ));
        
        showToast.success("VIEW permission disabled - EDIT permission automatically disabled");
        return;
      }
      
      // Check if trying to enable EDIT when VIEW is disabled
      if (permission === 'can_edit' && value === true) {
        const currentField = tableFields.find(f => f.id === field.id);
        if (currentField && !currentField.can_view) {
          showToast.error("Cannot enable EDIT permission when VIEW permission is disabled");
          return;
        }
      }
      
      // Update field permission in the local state and mark as changed
      setTableFields(prev => prev.map(f => 
        f.id === field.id ? { 
          ...f, 
          [permission]: value,
          hasChanges: true,
          originalPermissions: f.originalPermissions || { can_view: f.can_view, can_edit: f.can_edit }
        } : f
      ));
      
      // TODO: Save to backend when Save button is clicked
      // This will be handled by the main Save function
    } catch (e) {
      showToast.error("Failed to update field permission");
    }
  };



  const handleSave = async () => {
    if (!permissionSet) return;

    // Validate all fields before saving
    if (!validateAllFields()) {
      showToast.error("Please fix validation errors before saving");
      return;
    }

    try {
      // Save permission set basic info
      const res = await fetch(`/api/admin/permission-sets/${permissionSet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingData.name, description: editingData.description })
      });
      
      if (res.ok) {
        // PHASE 1 OPTIMIZATION: Batch field permission updates instead of sequential calls
        if (tableFields.length > 0) {
          try {
            await handleBatchFieldUpdates(tableFields, permissionSet.id);
            console.log('✅ All field permissions updated successfully');
          } catch (fieldError) {
            console.error("Failed to save some field permissions:", fieldError);
            // Continue with the save process even if field permissions fail
          }
        }
        
        // Save table permission changes if any (when editing tables)
        if (isEditingTables && tableManagerRef.current) {
          try {
            // Call the save method on the InlineTableManager
            await tableManagerRef.current.saveTablePermissions();
            showToast.success("Table permissions saved successfully");
          } catch (tableError) {
            console.error("Failed to save table permissions:", tableError);
            showToast.error("Failed to save table permissions");
            // Continue with the save process even if table permissions fail
          }
        }
        
        showToast.success("Permission set and permissions updated successfully");
        setIsEditing(false);
        setIsEditingTables(false); // Disable table editing after save
        setHasTableChanges(false); // Reset table changes state
        
        // Reset change tracking for fields
        setTableFields(prev => prev.map(field => ({
          ...field,
          hasChanges: false,
          originalPermissions: { can_view: field.can_view, can_edit: field.can_edit }
        })));
        
        // Refresh all data to show updated state
        await fetchAll(true);
      } else {
        const err = await res.json().catch(() => ({} as any));
        showToast.error(err?.error || "Failed to update permission set");
      }
    } catch (e) {
      showToast.error("Failed to update permission set");
    }
  };

  const handleTablesTabClick = async () => {
    if (!permissionSet || tables.length > 0) return;
    setTablesLoading(true);
    try {
      const res = await fetch(`/api/admin/permission-sets/${permissionSet.id}/tables`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || data || []);
      }
    } catch (e) {
      showToast.error("Failed to load tables");
    } finally {
      setTablesLoading(false);
    }
  };

  const handleTablesUpdated = () => {
    handleTablesTabClick();
  };

  const banner = (
    <HeadingCard
      title="Permission Set Management"
      subtitle="Manage permission sets"
      Icon={Key}
      rightSlot={
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Loading..."}</span>
          <Button onClick={handleRefresh} disabled={refreshing} className="h-9 px-3">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    />
  );

  const handleDelete = async () => {
    if (!permissionSet) return;
    const t = showToast.loading("Deleting permission set...");
    try {
      // Best-effort assignment cleanup
      try { await fetch(`/api/admin/permission-sets/${permissionSet.id}/profiles`, { method: "DELETE" }); } catch {}

      const res = await fetch(`/api/admin/permission-sets/${permissionSet.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast.success("Permission set deleted successfully");
        router.refresh();
        router.push("/admin/permission-sets");
      } else {
        const text = await res.text();
        let msg = "Failed to delete permission set";
        try { const j = JSON.parse(text); msg = j.error || j.message || msg; } catch {}
        showToast.error(msg);
      }
    } catch (e) {
      showToast.error("Failed to delete permission set");
    } finally {
      showToast.dismiss(t);
    }
  };

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!permissionSet) {
    return (
      <DashboardLayout banner={banner}>
        <div className="space-y-4 sm:space-y-6 pb-24">
          <div className="bg-white border border-gray-200 rounded-lg p-6">Permission set not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout banner={banner}>
      <div className="space-y-4 sm:space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/admin/permission-sets")} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Permission Sets
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{permissionSet.name}</h2>
              <p className="text-gray-600">{permissionSet.description}</p>
            </div>
                         <div className="flex gap-2">
               {!isEditing ? (
                 <>
                   <Button onClick={handleEdit}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                   <Button variant="destructive" onClick={handleDelete}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                 </>
               ) : (
                 <>
                   <Button variant="outline" onClick={() => {
                     setIsEditing(false);
                     setIsEditingTables(false); // Also disable table editing when canceling
                     setHasTableChanges(false); // Reset table changes state
                     // Reset field editing state
                     setTableFields(prev => prev.map(field => ({
                       ...field,
                       hasChanges: false,
                       originalPermissions: { can_view: field.can_view, can_edit: field.can_edit }
                     })));
                   }}>Cancel</Button>
                   <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                     Save
                   </Button>
                 </>
               )}
             </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6">
            <nav className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'info'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isEditing && setActiveTab('info')}
                disabled={isEditing}
              >
                📋 Info
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'tables'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isEditing) {
                    setActiveTab('tables');
                    handleTablesTabClick();
                  }
                }}
                disabled={isEditing}
              >
                📊 Tables
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Validation Summary */}
              {isEditing && Object.keys(validationErrors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-red-600 font-medium">⚠️ Please fix the following errors:</span>
                  </div>
                  <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                    {Object.entries(validationErrors).map(([field, error]) => (
                      <li key={field}>
                        <span className="capitalize">{field.replace(/([A-Z])/g, ' $1').toLowerCase()}: </span>
                        {error as string}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Indicator */}
              {isEditing && Object.keys(validationErrors).length === 0 && editingData.name && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-green-600 font-medium">✅ Permission set information is valid!</span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Permission Set Information</h3>
                  {isEditing && (
                    <div className="text-sm text-gray-500">
                      <span className="text-red-600">*</span> Required fields
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Name <span className="text-red-600">*</span>
                    </label>
                    {!isEditing ? (
                      <p className="text-gray-900 font-medium">{permissionSet.name || "Not provided"}</p>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={editingData.name || ""}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter permission set name"
                        />
                        {validationErrors.name && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Description <span className="text-gray-500">(optional)</span>
                    </label>
                    {!isEditing ? (
                      <p className="text-gray-900">{permissionSet.description || "No description provided"}</p>
                    ) : (
                      <div>
                        <textarea
                          value={editingData.description || ""}
                          onChange={(e) => handleFieldChange('description', e.target.value)}
                          rows={3}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.description ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter permission set description (optional)"
                        />
                        {validationErrors.description && (
                          <p className="text-red-500 text-xs mt-1">{validationErrors.description}</p>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Permission Set ID</label>
                    <p className="text-gray-900 font-mono text-sm">{permissionSet.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

                     {activeTab === 'tables' && (
             <div>
               {!isEditingTables ? (
                 <>
                   {selectedTable ? (
                     // Show fields for selected table
                     <div>
                                               <div className="mb-4">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleBackToTables}
                              disabled={isEditing}
                              className={`flex items-center gap-2 ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Back to Tables
                            </Button>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Fields for {selectedTable.name}
                            </h3>
                          </div>
                        </div>

                                               {fieldsLoading ? (
                          <div className="text-center py-8">Loading fields...</div>
                        ) : tableFields.length > 0 ? (
                          <div className="space-y-4">
                            {/* Warning when table has no READ access */}
                            {selectedTable && !selectedTable.can_read && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div className="ml-3">
                                    <h3 className="text-sm font-medium text-red-800">
                                      Table Access Restricted
                                    </h3>
                                    <div className="mt-2 text-sm text-red-700">
                                                                             <p>
                                         This table has no READ permission. All field permissions are automatically disabled and cannot be enabled.
                                         You must first enable READ permission for the table to manage field permissions.
                                       </p>
                                       {selectedTable?.can_read && !selectedTable?.can_update && (
                                         <p className="mt-2">
                                           <strong>Note:</strong> This table has READ permission but no UPDATE permission. 
                                           Field VIEW permissions can be managed, but field EDIT permissions are disabled.
                                         </p>
                                       )}
                                       {selectedTable?.can_read && selectedTable?.can_update && (
                                         <p className="mt-2">
                                           <strong>Note:</strong> This table has full access. Field VIEW permissions can be managed, 
                                           and field EDIT permissions can be managed (but require VIEW permission to be enabled first).
                                         </p>
                                       )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {tableFields.map((field: any) => (
                              <div key={field.id || field.field_name} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <FileText className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900">{field.field_name || "Unknown Field"}</h4>
                                      <p className="text-xs text-gray-500">Table: {field.table_name}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-4 text-sm">
                                    {isEditing ? (
                                      // Show editable checkboxes when editing
                                      <>
                                                                                 <label className="flex items-center gap-2">
                                           <input
                                             type="checkbox"
                                             checked={selectedTable?.can_read ? (field.can_view || false) : false}
                                             onChange={(e) => handleFieldPermissionChange(field, 'can_view', e.target.checked)}
                                             disabled={!selectedTable?.can_read}
                                             className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                               !selectedTable?.can_read ? 'opacity-50 cursor-not-allowed' : ''
                                             }`}
                                           />
                                           <span className={`text-gray-700 ${!selectedTable?.can_read ? 'text-gray-400' : ''}`}>
                                             View
                                             {!selectedTable?.can_read && <span className="ml-1 text-xs text-red-600">(No Table Access)</span>}
                                           </span>
                                         </label>
                                         <label className="flex items-center gap-2">
                                           <input
                                             type="checkbox"
                                             checked={(selectedTable?.can_read && selectedTable?.can_update && field.can_view) ? (field.can_edit || false) : false}
                                             onChange={(e) => handleFieldPermissionChange(field, 'can_edit', e.target.checked)}
                                             disabled={!(selectedTable?.can_read && selectedTable?.can_update && field.can_view)}
                                             className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${
                                               !(selectedTable?.can_read && selectedTable?.can_update && field.can_view) ? 'opacity-50 cursor-not-allowed' : ''
                                             }`}
                                           />
                                           <span className={`text-gray-700 ${!(selectedTable?.can_read && selectedTable?.can_update && field.can_view) ? 'text-gray-400' : ''}`}>
                                             Edit
                                             {!selectedTable?.can_read && <span className="ml-1 text-xs text-red-600">(No Table Access)</span>}
                                             {selectedTable?.can_read && !selectedTable?.can_update && <span className="ml-1 text-xs text-orange-600">(No Update Access)</span>}
                                             {selectedTable?.can_read && selectedTable?.can_update && !field.can_view && <span className="ml-1 text-xs text-blue-600">(No View Access)</span>}
                                           </span>
                                         </label>
                                      </>
                                    ) : (
                                                                             // Show current permission status when not editing
                                       <>
                                         <span className={`px-3 py-1 rounded text-xs font-medium ${
                                           selectedTable?.can_read && field.can_view ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                         } ${!selectedTable?.can_read ? 'opacity-50' : ''}`}>
                                           {selectedTable?.can_read && field.can_view ? '✓' : '✗'} View
                                           {!selectedTable?.can_read && <span className="ml-1 text-xs text-gray-500">(No Table Access)</span>}
                                         </span>
                                         <span className={`px-3 py-1 rounded text-xs font-medium ${
                                           (selectedTable?.can_read && selectedTable?.can_update && field.can_view && field.can_edit) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                         } ${!(selectedTable?.can_read && selectedTable?.can_update && field.can_view) ? 'opacity-50' : ''}`}>
                                           {(selectedTable?.can_read && selectedTable?.can_update && field.can_view && field.can_edit) ? '✓' : '✗'} Edit
                                           {!selectedTable?.can_read && <span className="ml-1 text-xs text-gray-500">(No Table Access)</span>}
                                           {selectedTable?.can_read && !selectedTable?.can_update && <span className="ml-1 text-xs text-orange-500">(No Update Access)</span>}
                                           {selectedTable?.can_read && selectedTable?.can_update && !field.can_view && <span className="ml-1 text-xs text-blue-500">(No View Access)</span>}
                                         </span>
                                       </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-8 text-center">
                            <FileText className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No fields found</h3>
                            <p className="mt-1 text-sm text-gray-500">This table doesn't have any fields defined.</p>
                          </div>
                        )}
                     </div>
                   ) : (
                     // Show table list
                     <>
                                               <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Table Permissions</h3>
                          <p className="text-sm text-gray-600">Click on table names to view and edit field permissions</p>
                        </div>

                       {tablesLoading ? (
                         <div className="text-center py-8">Loading tables...</div>
                       ) : tables.length > 0 ? (
                         <div className="space-y-4">
                           {tables.map((table: any) => (
                             <div 
                               key={table.id || table.name} 
                               className={`border rounded-lg p-4 transition-colors ${
                                 !table.can_read 
                                   ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                                   : !table.can_update 
                                   ? 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                                   : 'border-gray-200 hover:bg-gray-50'
                               }`}
                             >
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center space-x-3">
                                   <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                     <Database className="h-4 w-4 text-blue-600" />
                                   </div>
                                   <div>
                                     <h4 className="text-sm font-medium text-gray-900">
                                       <button 
                                         onClick={() => !isEditing && handleTableClick(table)}
                                         disabled={isEditing}
                                         className={`text-blue-600 hover:text-blue-800 hover:underline transition-colors ${
                                           isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                         }`}
                                       >
                                         {table.name || "Unknown Table"}
                                       </button>
                                     </h4>
                                     <p className="text-xs text-gray-500">{table.description || "No description"}</p>
                                                                           {!table.can_read && (
                                        <div className="mt-1 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-2 py-1">
                                          ⚠️ No READ access - All field permissions disabled
                                        </div>
                                      )}
                                      {table.can_read && !table.can_update && (
                                        <div className="mt-1 text-xs text-orange-600 bg-orange-100 border border-orange-200 rounded px-2 py-1">
                                          ⚠️ No UPDATE access - Field EDIT permissions disabled
                                        </div>
                                      )}
                                   </div>
                                 </div>
                                 <div className="flex gap-2 text-xs">
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
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="bg-gray-50 rounded-lg p-8 text-center">
                           <Database className="mx-auto h-12 w-12 text-gray-400" />
                           <h3 className="mt-2 text-sm font-medium text-gray-900">No tables assigned</h3>
                           <p className="mt-1 text-sm text-gray-500">This permission set doesn't have any tables assigned to it yet.</p>
                         </div>
                       )}
                     </>
                   )}
                 </>
               ) : (
                                   <InlineTableManager
                    ref={tableManagerRef}
                    permissionSetId={permissionSet.id}
                    permissionSetName={permissionSet.name}
                    onBack={() => setIsEditingTables(false)}
                    onTablesUpdated={handleTablesUpdated}
                    onTablePermissionsChanged={(hasChanges) => {
                      setHasTableChanges(hasChanges);
                    }}
                  />
               )}
             </div>
           )}




        </div>
      </div>
    </DashboardLayout>
  );
}
