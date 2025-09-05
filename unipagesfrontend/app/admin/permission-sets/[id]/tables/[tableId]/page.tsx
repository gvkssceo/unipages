"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import HeadingCard from "@/components/ui/HeadingCard";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/toast";
import { Database, FileText, Edit, ArrowLeft, Save, X, ChevronLeft } from "lucide-react";

export default function TableDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const routeParams = useParams<{ id: string; tableId: string }>();
  const permissionSetId = routeParams?.id as string;
  const tableId = routeParams?.tableId as string;

  const [loading, setLoading] = useState(true);
  const [permissionSet, setPermissionSet] = useState<any>(null);
  const [table, setTable] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFields, setEditingFields] = useState<any[]>([]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    fetchData();
  }, [status, permissionSetId, tableId]);

  const fetchData = async () => {
    if (!permissionSetId || !tableId) return;
    setLoading(true);
    
    try {
      // Fetch permission set details
      const permissionSetRes = await fetch(`/api/admin/permission-sets/${permissionSetId}`);
      if (permissionSetRes.ok) {
        const permissionSetData = await permissionSetRes.json();
        setPermissionSet(permissionSetData);
      }

      // Fetch table details
      const tableRes = await fetch(`/api/admin/tables`);
      if (tableRes.ok) {
        const tablesData = await tableRes.json();
        const foundTable = tablesData.find((t: any) => t.id === tableId || t.name === tableId);
        if (foundTable) {
          setTable(foundTable);
        }
      }

      // Fetch fields for this table
      await fetchTableFields();
    } catch (e) {
      showToast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTableFields = async () => {
    if (!permissionSetId) return;
    setFieldsLoading(true);
    
    try {
      const res = await fetch(`/api/admin/permission-sets/${permissionSetId}/fields`);
      if (res.ok) {
        const data = await res.json();
        // Filter fields by the current table
        const tableFields = data.fields?.filter((field: any) => field.table_name === tableId) || [];
        setFields(tableFields);
        setEditingFields(tableFields.map((f: any) => ({ ...f }))); // Create editable copy
      }
    } catch (e) {
      showToast.error("Failed to load table fields");
    } finally {
      setFieldsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // Save field permission changes
      for (const field of editingFields) {
        if (field.id) {
          await fetch(`/api/admin/permission-sets/${permissionSetId}/fields`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fieldId: field.id,
              permissions: {
                can_view: field.can_view || false,
                can_edit: field.can_edit || false
              }
            })
          });
        }
      }
      
      showToast.success("Field permissions updated successfully");
      setIsEditing(false);
      await fetchTableFields(); // Refresh data
    } catch (e) {
      showToast.error("Failed to save field permissions");
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingFields(fields.map(f => ({ ...f }))); // Reset to original values
  };

  const handleFieldPermissionChange = (fieldId: string, permission: string, value: boolean) => {
    setEditingFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, [permission]: value } : f
    ));
  };

  const banner = (
    <HeadingCard
      title={`Table: ${table?.name || tableId}`}
      subtitle={`Permission Set: ${permissionSet?.name || 'Loading...'}`}
      Icon={Database}
      rightSlot={
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={handleEdit}><Edit className="mr-2 h-4 w-4" />Edit Fields</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}><X className="mr-2 h-4 w-4" />Cancel</Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700"><Save className="mr-2 h-4 w-4" />Save</Button>
            </>
          )}
        </div>
      }
    />
  );

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!permissionSet || !table) {
    return (
      <DashboardLayout banner={banner}>
        <div className="space-y-4 sm:space-y-6 pb-24">
          <div className="bg-white border border-gray-200 rounded-lg p-6">Table not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout banner={banner}>
      <div className="space-y-4 sm:space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push(`/admin/permission-sets/${permissionSetId}`)} 
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Permission Set
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Table Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">Table Name</label>
                <p className="text-gray-900 font-medium">{table.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 block mb-1">Description</label>
                <p className="text-gray-900">{table.description || "No description"}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Field Permissions</h3>
            
            {fieldsLoading ? (
              <div className="text-center py-8">Loading fields...</div>
            ) : fields.length > 0 ? (
              <div className="space-y-4">
                {editingFields.map((field) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4">
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
                      {isEditing ? (
                        <div className="flex gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.can_view || false}
                              onChange={(e) => handleFieldPermissionChange(field.id, 'can_view', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-gray-700">View</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={field.can_edit || false}
                              onChange={(e) => handleFieldPermissionChange(field.id, 'can_edit', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-gray-700">Edit</span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex gap-2 text-xs">
                          <span className={`px-2 py-1 rounded ${field.can_view ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {field.can_view ? '✓' : '✗'} View
                          </span>
                          <span className={`px-2 py-1 rounded ${field.can_edit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {field.can_edit ? '✓' : '✗'} Edit
                          </span>
                        </div>
                      )}
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
        </div>
      </div>
    </DashboardLayout>
  );
}
