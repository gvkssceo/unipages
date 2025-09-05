
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import HeadingCard from "@/components/ui/HeadingCard";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/toast";
import { UserCheck, RefreshCw, Edit, Trash2, Key, Plus, ChevronLeft } from "lucide-react";

export default function ProfileDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const id = routeParams?.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<any>({ name: "", description: "" });
  const [validationErrors, setValidationErrors] = useState<any>({});

  // Validation functions
  const validateField = (fieldName: string, value: any) => {
    const errors: any = { ...validationErrors };

    switch (fieldName) {
      case 'name':
        if (!value || value.trim() === '') {
          errors.name = 'Profile name is required';
        } else if (value.trim().length < 2) {
          errors.name = 'Profile name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          errors.name = 'Profile name cannot exceed 100 characters';
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

  const [activeTab, setActiveTab] = useState<"info" | "permissionSets">("info");
  const [permissionSets, setPermissionSets] = useState<any[]>([]);
  const [permissionSetsLoading, setPermissionSetsLoading] = useState(false);
  const [isEditingPermissionSets, setIsEditingPermissionSets] = useState(false);
  const [availablePermissionSets, setAvailablePermissionSets] = useState<any[]>([]);
  const [selectedPermissionSets, setSelectedPermissionSets] = useState<string[]>([]);
  const [selectedAssignedPermissionSets, setSelectedAssignedPermissionSets] = useState<string[]>([]);
  // Staged changes – applied on Save
  const [pendingAddPermissionSets, setPendingAddPermissionSets] = useState<string[]>([]);
  const [pendingRemovePermissionSets, setPendingRemovePermissionSets] = useState<string[]>([]);

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
      // Prefer direct GET by id; if not found, fallback to list and filter
      let data: any | null = null;
      try {
        const res = await fetch(`/api/admin/profiles/${id}`, {
          headers: {
            'Content-Type': 'application/json',
            // Add any required authentication headers here
          }
        });
        if (res.ok) {
          data = await res.json();
        } else {
          console.error(`Profile fetch failed: ${res.status} ${res.statusText}`);
          const errorText = await res.text();
          console.error('Error details:', errorText);
          
          // Try to parse error details for better user feedback
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.details && errorData.details.includes('column "type" does not exist')) {
              showToast.error("Database schema mismatch: Missing 'type' column. Please check your backend database setup.");
            } else {
              showToast.error(errorData.error || `Failed to load profile: ${res.status}`);
            }
          } catch {
            showToast.error(`Failed to load profile: ${res.status} ${res.statusText}`);
          }
        }
      } catch (e) {
        console.error('Profile fetch error:', e);
        showToast.error("Network error: Unable to connect to backend server");
      }
      if (!data) {
        const listRes = await fetch(`/api/admin/profiles`, {
        headers: {
          'Content-Type': 'application/json',
          // Add any required authentication headers here
        }
      });
        if (listRes.ok) {
          const list = await listRes.json();
          data = (list || []).find((p: any) => p.id === id) || null;
        }
      }
      if (data) {
        setProfile(data);
        setLastUpdated(new Date());
      }
    } catch (e) {
      showToast.error("Failed to load profile");
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

  const handlePermissionSetsTabClick = async () => {
    if (!profile || permissionSets.length > 0) return;
    setPermissionSetsLoading(true);
    try {
      const res = await fetch(`/api/admin/profiles/${profile.id}/permission-sets`, {
        headers: {
          'Content-Type': 'application/json',
          // Add any required authentication headers here
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPermissionSets(data.permissionSets || data || []);
      }
    } catch (e) {
      showToast.error("Failed to load permission sets");
    } finally {
      setPermissionSetsLoading(false);
    }
  };

  const refreshAssignedPermissionSets = async () => {
    if (!profile) return;
    setPermissionSetsLoading(true);
    try {
      const res = await fetch(`/api/admin/profiles/${profile.id}/permission-sets`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setPermissionSets(data.permissionSets || data || []);
      }
    } catch (e) {
      // keep quiet unless on explicit actions
    } finally {
      setPermissionSetsLoading(false);
    }
  };

  const fetchAvailablePermissionSets = async () => {
    try {
      const res = await fetch('/api/admin/permission-sets', {
        headers: {
          'Content-Type': 'application/json',
          // Add any required authentication headers here
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailablePermissionSets(data);
      }
    } catch (e) {
      showToast.error("Failed to fetch available permission sets");
    }
  };

  const handleAssignPermissionSets = async () => {
    if (selectedPermissionSets.length === 0) return;
    // Stage additions locally; persist on Save
    const toAdd = selectedPermissionSets.filter(id => !pendingAddPermissionSets.includes(id));
    if (toAdd.length > 0) {
      setPendingAddPermissionSets(prev => [...prev, ...toAdd]);
      // Reflect immediately in UI by appending their objects
      setPermissionSets(prev => {
        const existingIds = new Set(prev.map(ps => ps.id));
        const additions = availablePermissionSets
          .filter(ps => toAdd.includes(ps.id) && !existingIds.has(ps.id));
        return [...prev, ...additions];
      });
    }
    setSelectedPermissionSets([]);
  };

  const handleUnassignPermissionSets = async () => {
    if (selectedAssignedPermissionSets.length === 0) return;
    const toProcess = selectedAssignedPermissionSets;
    setSelectedAssignedPermissionSets([]);

    // If any were newly added in this session, undo the pending addition
    const wasPending = toProcess.filter(id => pendingAddPermissionSets.includes(id));
    if (wasPending.length > 0) {
      setPendingAddPermissionSets(prev => prev.filter(id => !wasPending.includes(id)));
    }

    // For existing assignments, stage removal
    const existing = toProcess.filter(id => !wasPending.includes(id));
    if (existing.length > 0) {
      setPendingRemovePermissionSets(prev => [...prev, ...existing.filter(id => !prev.includes(id))]);
    }

    // Reflect immediately in UI
    setPermissionSets(prev => prev.filter(ps => !toProcess.includes(ps.id)));
  };

  const banner = (
    <HeadingCard
      title="Profile Management"
      subtitle="Manage user profiles"
      Icon={UserCheck}
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
    if (!profile) return;
    setIsEditing(true);
    setEditingData({ name: profile.name || "", description: profile.description || "" });
    setValidationErrors({}); // Clear validation errors when entering edit mode
    // Also enable permission sets editing when main edit is clicked
    setIsEditingPermissionSets(true);
    fetchAvailablePermissionSets();
  };

  const handleSave = async () => {
    if (!profile) return;

    // Validate all fields before saving
    if (!validateAllFields()) {
      showToast.error("Please fix validation errors before saving");
      return;
    }

    try {
      const res = await fetch(`/api/admin/profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingData.name, description: editingData.description })
      });
      if (res.ok) {
        // Apply staged permission set changes
        try {
          for (const psId of pendingAddPermissionSets) {
            const r = await fetch(`/api/admin/profiles/${profile.id}/permission-sets`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ permissionSetId: psId })
            });
            if (!r.ok) throw new Error('assign failed');
          }
          for (const psId of pendingRemovePermissionSets) {
            const r = await fetch(`/api/admin/profiles/${profile.id}/permission-sets`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ permissionSetId: psId })
            });
            if (!r.ok) throw new Error('unassign failed');
          }
        } catch (permErr) {
          showToast.error('Failed to apply permission set changes');
          // Continue but do not clear staged changes so user can retry
          return;
        }

        showToast.success("Profile and permission sets updated successfully");
        setIsEditing(false);
        setIsEditingPermissionSets(false); // Also disable permission sets editing
        // Clear staged state and refresh lists
        setPendingAddPermissionSets([]);
        setPendingRemovePermissionSets([]);
        await fetchAll(true);
        await refreshAssignedPermissionSets();
      } else {
        const err = await res.json().catch(() => ({} as any));
        showToast.error(err?.error || "Failed to update profile");
      }
    } catch (e) {
      showToast.error("Failed to update profile");
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    console.log('🗑️ [DELETE] Starting profile deletion for:', profile.id, profile.name);
    const t = showToast.loading("Deleting profile...");
    
    try {
      // Best-effort assignment cleanup
      console.log('🗑️ [DELETE] Step 1: Removing user assignments...');
      try { 
        const userRes = await fetch(`/api/admin/profiles/${profile.id}/users`, { method: "DELETE" });
        console.log('🗑️ [DELETE] User assignments removal response:', userRes.status, userRes.ok);
        if (!userRes.ok) {
          const userError = await userRes.text();
          console.error('🗑️ [DELETE] User assignments removal failed:', userError);
        }
      } catch (userError) {
        console.error('🗑️ [DELETE] User assignments removal error:', userError);
      }
      
      console.log('🗑️ [DELETE] Step 2: Removing permission set assignments...');
      try { 
        const permRes = await fetch(`/api/admin/profiles/${profile.id}/permission-sets`, { method: "DELETE" });
        console.log('🗑️ [DELETE] Permission sets removal response:', permRes.status, permRes.ok);
        if (!permRes.ok) {
          const permError = await permRes.text();
          console.error('🗑️ [DELETE] Permission sets removal failed:', permError);
        }
      } catch (permError) {
        console.error('🗑️ [DELETE] Permission sets removal error:', permError);
      }

      console.log('🗑️ [DELETE] Step 3: Deleting profile...');
      const res = await fetch(`/api/admin/profiles/${profile.id}`, { method: "DELETE" });
      console.log('🗑️ [DELETE] Profile deletion response:', res.status, res.ok);
      
      if (res.ok) {
        const result = await res.json();
        console.log('✅ [DELETE] Profile deleted successfully:', result);
        showToast.success("Profile deleted successfully");
        router.refresh();
        router.push("/admin/profiles?deleted=true");
      } else {
        const text = await res.text();
        console.error('❌ [DELETE] Profile deletion failed:', res.status, text);
        let msg = "Failed to delete profile";
        try { const j = JSON.parse(text); msg = j.error || j.message || msg; } catch {}
        showToast.error(msg);
      }
    } catch (e) {
      console.error('❌ [DELETE] Profile deletion error:', e);
      showToast.error("Failed to delete profile");
    } finally {
      showToast.dismiss(t);
    }
  };

  // Handle profile not found case
  useEffect(() => {
    if (!profile && !loading && status !== 'loading') {
      console.log('🔄 Profile not found, redirecting to profiles list with refresh...');
      router.push("/admin/profiles?refresh=true");
    }
  }, [profile, loading, status, router]);

  if (status === "loading" || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout banner={banner}>
        <div className="space-y-4 sm:space-y-6 pb-24">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Profile not found.</p>
              <p className="text-sm text-gray-500">Redirecting back to profiles list...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout banner={banner}>
      <div className="space-y-4 sm:space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/admin/profiles")} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Profiles
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{profile.name}</h2>
              <p className="text-gray-600">{profile.description}</p>
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
                    setIsEditingPermissionSets(false); // Also cancel permission sets editing
                  }}>Cancel</Button>
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
                  activeTab === 'permissionSets'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isEditing) {
                    setActiveTab('permissionSets');
                    handlePermissionSetsTabClick();
                  }
                }}
                disabled={isEditing}
              >
                🔐 Permission Sets
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
                    <span className="text-green-600 font-medium">✅ Profile information is valid!</span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                  {isEditing && (
                    <div className="text-sm text-gray-500">
                      <span className="text-red-600">*</span> Required fields
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">
                      Profile Name <span className="text-red-600">*</span>
                    </label>
                    {!isEditing ? (
                      <p className="text-gray-900 font-medium">{profile.name || "Not provided"}</p>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={editingData.name || ""}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter profile name"
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
                      <p className="text-gray-900">{profile.description || "No description provided"}</p>
                    ) : (
                      <div>
                        <textarea
                          value={editingData.description || ""}
                          onChange={(e) => handleFieldChange('description', e.target.value)}
                          rows={3}
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            validationErrors.description ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter profile description (optional)"
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
                    <label className="text-sm font-medium text-gray-500 block mb-1">Profile ID</label>
                    <p className="text-gray-900 font-mono text-sm">{profile.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'permissionSets' && (
            <div>
              {!isEditingPermissionSets ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Assigned Permission Sets</h3>
                    {isEditing && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setIsEditingPermissionSets(true);
                            fetchAvailablePermissionSets();
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Manage Permission Sets
                        </Button>
                      </div>
                    )}
                  </div>

                  {permissionSetsLoading ? (
                    <div className="text-center py-8">Loading permission sets...</div>
                  ) : permissionSets.length > 0 ? (
                    <div className="space-y-4">
                      {permissionSets.map((ps: any) => (
                        <div key={ps.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Key className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{ps.name || "Unknown Permission Set"}</h4>
                                <p className="text-xs text-gray-500">{ps.description || "No description"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <Key className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No permission sets assigned</h3>
                      <p className="mt-1 text-sm text-gray-500">This profile doesn't have any permission sets assigned to it yet.</p>
                      <div className="mt-4">
                        {isEditing && (
                          <Button
                            onClick={() => {
                              setIsEditingPermissionSets(true);
                              fetchAvailablePermissionSets();
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Assign Permission Sets
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                                 <div className="space-y-6">

                  {/* Permission Set Selection Section */}
                  <div className="flex space-x-6">
                    {/* Available Permission Sets */}
                    <div className="flex-1 border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Available Permission Sets</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availablePermissionSets
                          .filter(ps => !permissionSets.find(assigned => assigned.id === ps.id))
                          .map((ps) => (
                            <div
                              key={ps.id}
                              className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={selectedPermissionSets.includes(ps.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPermissionSets(prev => [...prev, ps.id]);
                                  } else {
                                    setSelectedPermissionSets(prev => prev.filter(id => id !== ps.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{ps.name}</div>
                                <div className="text-sm text-gray-500">{ps.description || "No description"}</div>
                              </div>
                            </div>
                          ))}
                        {availablePermissionSets.filter(ps => !permissionSets.find(assigned => assigned.id === ps.id)).length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            No available permission sets
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transfer Controls */}
                    <div className="flex flex-col justify-center space-y-2">
                      <Button
                        onClick={handleAssignPermissionSets}
                        disabled={selectedPermissionSets.length === 0}
                        size="sm"
                        className="px-3"
                      >
                        →
                      </Button>
                      <Button
                        onClick={handleUnassignPermissionSets}
                        disabled={selectedAssignedPermissionSets.length === 0}
                        size="sm"
                        variant="outline"
                        className="px-3"
                      >
                        ←
                      </Button>
                    </div>

                    {/* Assigned Permission Sets */}
                    <div className="flex-1 border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Assigned Permission Sets</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {permissionSets.map((ps) => (
                          <div
                            key={ps.id}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAssignedPermissionSets.includes(ps.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAssignedPermissionSets(prev => [...prev, ps.id]);
                                } else {
                                  setSelectedAssignedPermissionSets(prev => prev.filter(id => id !== ps.id));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{ps.name}</div>
                              <div className="text-sm text-gray-500">{ps.description || "No description"}</div>
                            </div>
                          </div>
                        ))}
                        {permissionSets.length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            No permission sets assigned
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
