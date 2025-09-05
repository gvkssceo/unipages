"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import HeadingCard from "@/components/ui/HeadingCard";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/toast";
import { Shield, RefreshCw, Edit, Trash2, Users, Plus, ChevronLeft } from "lucide-react";

export default function RoleDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const id = routeParams?.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [role, setRole] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<any>({ name: "", description: "" });
  const [validationErrors, setValidationErrors] = useState<any>({});

  // Validation functions
  const validateField = (fieldName: string, value: any) => {
    const errors: any = { ...validationErrors };

    switch (fieldName) {
      case 'name':
        if (!value || value.trim() === '') {
          errors.name = 'Role name is required';
        } else if (value.trim().length < 2) {
          errors.name = 'Role name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          errors.name = 'Role name cannot exceed 100 characters';
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

  const [activeTab, setActiveTab] = useState<"roleInfo" | "users">("roleInfo");
  const [roleUsers, setRoleUsers] = useState<any[]>([]);
  const [roleUsersLoading, setRoleUsersLoading] = useState(false);
  const [isEditingUsers, setIsEditingUsers] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState<string[]>([]);

  const getUserDisplayName = (user: any) => {
    const first = user?.firstName || user?.given_name || user?.givenName;
    const last = user?.lastName || user?.family_name || user?.familyName;
    const full = [first, last].filter(Boolean).join(' ').trim();
    return full || user?.name || user?.username || (user?.email ? user.email.split('@')[0] : '') || 'Unknown User';
  };

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
      const res = await fetch(`/api/admin/roles/${id}`);
      if (res.ok) {
        const data = await res.json();
        setRole(data);
      }
      setLastUpdated(new Date());
    } catch (e) {
      showToast.error("Failed to load role");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    const t = showToast.loading("Refreshing data...");
    fetchAll(true).finally(() => {
      showToast.dismiss(t);
      showToast.success("Data refreshed successfully");
    });
  };

  const handleUsersTabClick = async () => {
    if (!role || roleUsers.length > 0) return;
    setRoleUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/roles/${role.id}/users`);
      if (res.ok) {
        const data = await res.json();
        setRoleUsers(data.users || data || []);
      }
    } catch (e) {
      showToast.error("Failed to load users");
    } finally {
      setRoleUsersLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setAvailableUsers(data);
      }
    } catch (e) {
      showToast.error("Failed to fetch available users");
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!role) return;
    try {
      const res = await fetch(`/api/admin/roles/${role.id}/users`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        showToast.success('User removed from role');
        // Refresh lists
        setRoleUsers(prev => prev.filter(u => u.id !== userId));
        fetchAvailableUsers();
      } else {
        const text = await res.text();
        try {
          const j = JSON.parse(text);
          showToast.error(j.error || 'Failed to remove user');
        } catch {
          showToast.error(text || 'Failed to remove user');
        }
      }
    } catch (e) {
      showToast.error('Failed to remove user');
    }
  };

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      for (const userId of selectedUsers) {
        await fetch(`/api/admin/roles/${role.id}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      }
      
      showToast.success('Users assigned successfully');
      setSelectedUsers([]);
      handleUsersTabClick();
      fetchAvailableUsers();
    } catch (e) {
      showToast.error("Failed to assign users");
    }
  };

  const handleUnassignUsers = async () => {
    if (selectedAssignedUsers.length === 0) return;
    
    try {
      for (const userId of selectedAssignedUsers) {
        await fetch(`/api/admin/roles/${role.id}/users`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      }
      
      showToast.success('Users unassigned successfully');
      setSelectedAssignedUsers([]);
      handleUsersTabClick();
      fetchAvailableUsers();
    } catch (e) {
      showToast.error("Failed to unassign users");
    }
  };

  const banner = (
    <HeadingCard
      title="Role Management"
      subtitle="Manage user roles"
      Icon={Shield}
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

  const handleEdit = () => {
    if (!role) return;
    setIsEditing(true);
    setEditingData({ name: role.name || "", description: role.description || "" });
    setValidationErrors({}); // Clear validation errors when entering edit mode
  };

  const handleSave = async () => {
    if (!role) return;

    // Validate all fields before saving
    if (!validateAllFields()) {
      showToast.error("Please fix validation errors before saving");
      return;
    }

    try {
      const res = await fetch(`/api/admin/roles/${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingData.name, description: editingData.description })
      });
      if (res.ok) {
        showToast.success("Role updated successfully");
        setIsEditing(false);
        fetchAll(true);
      } else {
        const err = await res.json().catch(() => ({} as any));
        showToast.error(err?.error || "Failed to update role");
      }
    } catch (e) {
      showToast.error("Failed to update role");
    }
  };

  const handleDelete = async () => {
    if (!role) return;
    const t = showToast.loading("Deleting role...");
    try {
      // Best-effort assignment cleanup
      try { await fetch(`/api/admin/roles/${role.id}/users`, { method: "DELETE" }); } catch {}
      try { await fetch(`/api/admin/roles/${role.id}/permission-sets`, { method: "DELETE" }); } catch {}

      const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast.success("Role deleted successfully");
        router.refresh();
        router.push("/admin/roles");
      } else {
        const text = await res.text();
        let msg = "Failed to delete role";
        try { const j = JSON.parse(text); msg = j.error || j.message || msg; } catch {}
        showToast.error(msg);
      }
    } catch (e) {
      showToast.error("Failed to delete role");
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

  if (!role) {
    return (
      <DashboardLayout banner={banner}>
        <div className="space-y-4 sm:space-y-6 pb-24">
          <div className="bg-white border border-gray-200 rounded-lg p-6">Role not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout banner={banner}>
      <div className="space-y-4 sm:space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/admin/roles")} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Roles
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{role.name}</h2>
              <p className="text-gray-600">{role.description}</p>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button onClick={handleEdit}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                  <Button variant="destructive" onClick={handleDelete}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">Save</Button>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6">
            <nav className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'roleInfo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isEditing && setActiveTab('roleInfo')}
                disabled={isEditing}
              >
                🛡️ Role Info
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isEditing) {
                    setActiveTab('users');
                    handleUsersTabClick();
                  }
                }}
                disabled={isEditing}
              >
                👥 Users
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'roleInfo' && (
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
                    <span className="text-green-600 font-medium">✅ Role information is valid!</span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Role Information</h3>
                  {isEditing && (
                    <div className="text-sm text-gray-500">
                      <span className="text-red-600">*</span> Required fields
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Role Name <span className="text-red-600">*</span>
                    </label>
                    {!isEditing ? (
                      <p className="text-gray-900 font-medium">{role.name || "Not provided"}</p>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={editingData.name || ""}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter role name"
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
                      <p className="text-gray-900">{role.description || "No description provided"}</p>
                    ) : (
                      <div>
                        <textarea
                          value={editingData.description || ""}
                          onChange={(e) => handleFieldChange('description', e.target.value)}
                          rows={3}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.description ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter role description (optional)"
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
                    <label className="text-sm font-medium text-gray-500 block mb-1">Role ID</label>
                    <p className="text-gray-900 font-mono text-sm">{role.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              {!isEditingUsers ? (
                <>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Assigned Users</h3>
                  </div>

                  {roleUsersLoading ? (
                    <div className="text-center py-8">Loading users...</div>
                  ) : roleUsers.length > 0 ? (
                    <div className="space-y-4">
                      {roleUsers.map((user: any) => (
                        <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{getUserDisplayName(user)}</h4>
                                <p className="text-xs text-gray-500">{user.email || "No email"}</p>
                                <p className="text-xs text-gray-400">Username: {user.username || "Unknown"}</p>
                              </div>
                            </div>
                            {isEditing && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleRemoveUser(user.id); }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No users assigned</h3>
                      <p className="mt-1 text-sm text-gray-500">This role doesn't have any users assigned to it yet.</p>

                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingUsers(false)}
                        className="flex items-center gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back to View
                      </Button>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Manage Users - {role.name}
                      </h3>
                    </div>
                  </div>

                  {/* User Selection Section */}
                  <div className="flex space-x-6">
                    {/* Available Users */}
                    <div className="flex-1 border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Available Users</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availableUsers
                          .filter(user => !roleUsers.find(assigned => assigned.id === user.id))
                          .map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedUsers(prev => [...prev, user.id]);
                                  } else {
                                    setSelectedUsers(prev => prev.filter(id => id !== user.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{getUserDisplayName(user)}</div>
                                <div className="text-sm text-gray-500">{user.email || "No email"}</div>
                                <div className="text-xs text-gray-400">Username: {user.username || "Unknown"}</div>
                              </div>
                            </div>
                          ))}
                        {availableUsers.filter(user => !roleUsers.find(assigned => assigned.id === user.id)).length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            No available users
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transfer Controls */}
                    <div className="flex flex-col justify-center space-y-2">
                      <Button
                        onClick={handleAssignUsers}
                        disabled={selectedUsers.length === 0}
                        size="sm"
                        className="px-3"
                      >
                        →
                      </Button>
                      <Button
                        onClick={handleUnassignUsers}
                        disabled={selectedAssignedUsers.length === 0}
                        size="sm"
                        variant="outline"
                        className="px-3"
                      >
                        ←
                      </Button>
                    </div>

                    {/* Assigned Users */}
                    <div className="flex-1 border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Assigned Users</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {roleUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAssignedUsers.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssignedUsers(prev => [...prev, user.id]);
                                } else {
                                  setSelectedAssignedUsers(prev => prev.filter(id => id !== user.id));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{getUserDisplayName(user)}</div>
                              <div className="text-sm text-gray-500">{user.email || "No email"}</div>
                              <div className="text-xs text-gray-400">Username: {user.username || "Unknown"}</div>
                            </div>
                          </div>
                        ))}
                        {roleUsers.length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            No users assigned
                          </div>
                        )}
                      </div>
                    </div>
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
