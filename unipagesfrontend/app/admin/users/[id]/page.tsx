"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import HeadingCard from "@/components/ui/HeadingCard";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/toast";
import { Users as UsersIcon, RefreshCw, Trash2, Shield, UserCheck, Plus, Edit, Settings, ArrowRight, ArrowLeft } from "lucide-react";

interface PermissionSet {
  id: string;
  name: string;
  description?: string;
  source_type?: string;
  assignment_id?: string;
}

export default function UserDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const id = routeParams?.id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"userInfo" | "roleProfile">("userInfo");
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [isEditingProfiles, setIsEditingProfiles] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [selectedAssignedRoles, setSelectedAssignedRoles] = useState<string[]>([]);
  const [selectedAssignedProfiles, setSelectedAssignedProfiles] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserData, setEditingUserData] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<any>({});
  const [emailAvailability, setEmailAvailability] = useState<'checking' | 'available' | 'unavailable' | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  
  // Permission sets state
  const [userPermissionSets, setUserPermissionSets] = useState<PermissionSet[]>([]);
  const [availablePermissionSets, setAvailablePermissionSets] = useState<PermissionSet[]>([]);
  const [permissionSetsLoading, setPermissionSetsLoading] = useState(false);
  const [pendingPermissionSetAssignments, setPendingPermissionSetAssignments] = useState<string[]>([]);
  const [pendingPermissionSetUnassignments, setPendingPermissionSetUnassignments] = useState<string[]>([]);
  const [selectedAvailablePermissionSets, setSelectedAvailablePermissionSets] = useState<string[]>([]);
  const [selectedAssignedPermissionSets, setSelectedAssignedPermissionSets] = useState<string[]>([]);

  // Validation functions
  const validateField = (fieldName: string, value: any) => {
    const errors: any = { ...validationErrors };

    switch (fieldName) {
      case 'firstName':
        if (!value || value.trim() === '') {
          errors.firstName = 'First name is required';
        } else if (value.trim().length < 2) {
          errors.firstName = 'First name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          errors.firstName = 'First name cannot exceed 50 characters';
        } else {
          delete errors.firstName;
        }
        break;

      case 'lastName':
        if (!value || value.trim() === '') {
          errors.lastName = 'Last name is required';
        } else if (value.trim().length < 2) {
          errors.lastName = 'Last name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          errors.lastName = 'Last name cannot exceed 50 characters';
        } else {
          delete errors.lastName;
        }
        break;

      case 'email':
        if (!value || value.trim() === '') {
          errors.email = 'Email is required';
        } else {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value.trim())) {
            errors.email = 'Please enter a valid email address';
          } else {
            delete errors.email;
          }
        }
        break;

      case 'phone':
        if (!value || value.trim() === '') {
          errors.phone = 'Phone number is required';
        } else {
          // Validate phone number based on country code
          const countryCode = editingUserData.countryCode || '+91';
          const digits = value.replace(/\D/g, '');
          let isValid = false;
          
          switch (countryCode) {
            case '+91': // India: 10 digits
              isValid = digits.length === 10;
              break;
            case '+1': // USA/Canada: 10 digits
              isValid = digits.length === 10;
              break;
            case '+44': // UK: 10-11 digits
              isValid = digits.length >= 10 && digits.length <= 11;
              break;
            case '+61': // Australia: 9 digits
              isValid = digits.length === 9;
              break;
            case '+86': // China: 11 digits
              isValid = digits.length === 11;
              break;
            default:
              isValid = digits.length >= 8;
          }
          
          if (!isValid) {
            errors.phone = 'Please enter a valid phone number for the selected country';
          } else {
            delete errors.phone;
          }
        }
        break;

      default:
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateAllFields = () => {
    const fields = ['firstName', 'lastName', 'email', 'phone'];
    let isValid = true;

    fields.forEach(field => {
      if (!validateField(field, editingUserData[field])) {
        isValid = false;
      }
    });

    return isValid;
  };

  // Phone number formatting function
  const formatPhoneNumber = (phone: string, countryCode: string) => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    switch (countryCode) {
      case '+91': // India: 98765 43210
        return digits.replace(/(\d{5})(\d{5})/, '$1 $2');
      case '+1': // USA/Canada: (555) 123-4567
        return digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
      case '+44': // UK: 20 7946 0958
        return digits.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3');
      case '+61': // Australia: 2 9374 4000
        return digits.replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2 $3');
      case '+86': // China: 138 0013 8000
        return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
      default:
        return digits;
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setEditingUserData((prev: any) => ({ ...prev, [fieldName]: value }));
    validateField(fieldName, value);
    
    // Check email availability when email changes
    if (fieldName === 'email') {
      handleEmailChange(value);
    }
  };

  // Email availability checking function
  const handleEmailChange = async (email: string) => {
    if (email.length < 5) {
      setEmailAvailability(null);
      return;
    }

    setEmailAvailability('checking');
    setIsCheckingEmail(true);

    try {
      const response = await fetch(`/api/admin/users/check-email?email=${encodeURIComponent(email)}&excludeUserId=${user?.id || ''}`);
      if (response.ok) {
        const data = await response.json();
        setEmailAvailability(data.available ? 'available' : 'unavailable');
      } else {
        setEmailAvailability('unavailable');
      }
    } catch (error) {
      setEmailAvailability('unavailable');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    fetchAll();
  }, [status, id]);

  // Debug effect to monitor userProfiles changes
  useEffect(() => {
    console.log("userProfiles changed:", userProfiles);
    if (userProfiles.length > 0 && user) {
      console.log("User has profiles, fetching profile permission sets...");
      fetchProfilePermissionSetsWithProfile(userProfiles[0].id);
    }
  }, [userProfiles, user]);

  // Debug effect to monitor userPermissionSets changes
  useEffect(() => {
    console.log("userPermissionSets changed:", userPermissionSets);
  }, [userPermissionSets]);

  const fetchAll = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setEditingUserData(data); // Initialize editing data with current user data
        
        // Also fetch roles and profiles for this user
        if (data) {
          handleRoleProfileTabClick();
        }
      }
      setLastUpdated(new Date());
    } catch (e) {
      showToast.error("Failed to load user");
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

  const handleRoleProfileTabClick = async () => {
    if (!user) return;
    
    // Load roles
    setRolesLoading(true);
    try {
      const rolesRes = await fetch(`/api/admin/users/${user.id}/roles`);
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setUserRoles(rolesData.roles || rolesData || []);
      }
    } catch (e) {
      showToast.error("Failed to load user roles");
    } finally {
      setRolesLoading(false);
    }

    // Load profiles
    setProfilesLoading(true);
    try {
      const profilesRes = await fetch(`/api/admin/users/${user.id}/profiles`);
      if (profilesRes.ok) {
        const profilesData = await profilesRes.json();
        const profiles = profilesData.profiles || profilesData || [];
        setUserProfiles(profiles);
        
        // Load permission sets after profiles are set
        await fetchUserPermissionSets();
        
        // Load profile permission sets if user has profiles
        if (profiles.length > 0) {
          await fetchProfilePermissionSetsWithProfile(profiles[0].id);
        }
      }
    } catch (e) {
      showToast.error("Failed to load user profiles");
    } finally {
      setProfilesLoading(false);
    }
  };

  const fetchAvailableRoles = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        setAvailableRoles(data);
      }
    } catch (e) {
      showToast.error("Failed to fetch available roles");
    }
  };

  const fetchAvailableProfiles = async () => {
    try {
      const res = await fetch('/api/admin/profiles');
      if (res.ok) {
        const data = await res.json();
        setAvailableProfiles(data);
      }
    } catch (e) {
      showToast.error("Failed to fetch available profiles");
    }
  };

  const fetchUserPermissionSets = async () => {
    if (!user) return;
    
    setPermissionSetsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/permission-sets`);
      if (res.ok) {
        const data = await res.json();
        setUserPermissionSets(data.permissionSets || []);
      }
    } catch (e) {
      showToast.error("Failed to load user permission sets");
    } finally {
      setPermissionSetsLoading(false);
    }
  };

  const fetchProfilePermissionSetsWithProfile = async (profileId: string) => {
    try {
      console.log(`Fetching permission sets for profile: ${profileId}`);
      
      const res = await fetch(`/api/admin/profiles/${profileId}/permission-sets`);
      if (res.ok) {
        const data = await res.json();
        console.log("Profile permission sets response:", data);
        
        const profilePermissionSets: PermissionSet[] = (data.permissionSets || []).map((ps: any) => ({
          ...ps,
          source_type: 'profile',
          assignment_id: `profile-${ps.id}`
        }));
        
        console.log("Processed profile permission sets:", profilePermissionSets);
        
        // Add profile permission sets to user permission sets if not already there
        setUserPermissionSets(prev => {
          const existingIds = prev.map(ps => ps.id);
          const newProfileSets = profilePermissionSets.filter(ps => !existingIds.includes(ps.id));
          console.log("Adding new profile permission sets:", newProfileSets);
          const updated = [...prev, ...newProfileSets];
          
          // Update available permission sets to remove the newly assigned ones
          setAvailablePermissionSets(prevAvailable => {
            const newAssignedIds = newProfileSets.map(ps => ps.id);
            return prevAvailable.filter(ps => !newAssignedIds.includes(ps.id));
          });
          
          return updated;
        });
      } else {
        console.error("Failed to fetch profile permission sets:", res.status, res.statusText);
      }
    } catch (e) {
      console.error("Failed to load profile permission sets:", e);
    }
  };

  const fetchProfilePermissionSets = async () => {
    if (!user || userProfiles.length === 0) {
      console.log("No user or userProfiles available for fetching profile permission sets");
      return;
    }
    
    await fetchProfilePermissionSetsWithProfile(userProfiles[0].id);
  };

  const fetchAvailablePermissionSets = async () => {
    if (!user) return;
    
    try {
      const res = await fetch(`/api/admin/users/${user.id}/available-permission-sets`);
      if (res.ok) {
        const data = await res.json();
        // Filter out permission sets that are already assigned (including profile-based ones)
        const assignedIds = userPermissionSets.map(ps => ps.id);
        const available = (data.availablePermissionSets || []).filter((ps: PermissionSet) => !assignedIds.includes(ps.id));
        setAvailablePermissionSets(available);
      }
    } catch (e) {
      showToast.error("Failed to fetch available permission sets");
    }
  };

  const handleAssignRoles = async () => {
    if (selectedRoles.length === 0) return;
    
    try {
      for (const roleId of selectedRoles) {
        await fetch(`/api/admin/users/${user.id}/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId })
        });
      }
      
      showToast.success('Roles assigned successfully');
      setSelectedRoles([]);
      handleRoleProfileTabClick();
      fetchAvailableRoles();
    } catch (e) {
      showToast.error("Failed to assign roles");
    }
  };

  const handleUnassignRoles = async () => {
    if (selectedAssignedRoles.length === 0) return;
    
    try {
      for (const roleId of selectedAssignedRoles) {
        await fetch(`/api/admin/users/${user.id}/roles`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleId })
        });
      }
      
      showToast.success('Roles unassigned successfully');
      setSelectedAssignedRoles([]);
      handleRoleProfileTabClick();
      fetchAvailableRoles();
    } catch (e) {
      showToast.error("Failed to unassign roles");
    }
  };

  const handleAssignProfiles = async () => {
    if (selectedProfiles.length === 0) return;
    
    try {
      for (const profileId of selectedProfiles) {
        await fetch(`/api/admin/users/${user.id}/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId })
        });
      }
      
      showToast.success('Profiles assigned successfully');
      setSelectedProfiles([]);
      handleRoleProfileTabClick();
      fetchAvailableProfiles();
    } catch (e) {
      showToast.error("Failed to assign profiles");
    }
  };

  const handleUnassignProfiles = async () => {
    if (selectedAssignedProfiles.length === 0) return;
    
    try {
      for (const profileId of selectedAssignedProfiles) {
        await fetch(`/api/admin/users/${user.id}/profiles`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId })
        });
      }
      
      showToast.success('Profiles unassigned successfully');
      setSelectedAssignedProfiles([]);
      handleRoleProfileTabClick();
      fetchAvailableProfiles();
    } catch (e) {
      showToast.error("Failed to unassign profiles");
    }
  };

  const handleAssignPermissionSets = () => {
    if (selectedAvailablePermissionSets.length === 0) return;
    
    // Add to pending assignments
    setPendingPermissionSetAssignments(prev => [...prev, ...selectedAvailablePermissionSets]);
    
    // Move from available to assigned
    const permissionSetsToMove = availablePermissionSets.filter(ps => selectedAvailablePermissionSets.includes(ps.id));
    setUserPermissionSets(prev => [...prev, ...permissionSetsToMove.map(ps => ({ ...ps, source_type: 'direct', assignment_id: `pending-${ps.id}` }))]);
    setAvailablePermissionSets(prev => prev.filter(ps => !selectedAvailablePermissionSets.includes(ps.id)));
    
    // Clear selection
    setSelectedAvailablePermissionSets([]);
  };

  const handleUnassignPermissionSets = () => {
    if (selectedAssignedPermissionSets.length === 0) return;
    
    // Filter out profile-based permission sets from selection
    const directPermissionSets = selectedAssignedPermissionSets.filter(id => {
      const permissionSet = userPermissionSets.find(ps => ps.id === id);
      return permissionSet && permissionSet.source_type !== 'profile';
    });
    
    if (directPermissionSets.length === 0) {
      showToast.error("Cannot remove permission sets assigned through profiles");
      return;
    }
    
    if (directPermissionSets.length < selectedAssignedPermissionSets.length) {
      showToast.error("Some permission sets cannot be removed as they are assigned through profiles");
    }
    
    // Add to pending unassignments
    setPendingPermissionSetUnassignments(prev => [...prev, ...directPermissionSets]);
    
    // Move from assigned to available
    const permissionSetsToMove = userPermissionSets.filter(ps => directPermissionSets.includes(ps.id));
    setAvailablePermissionSets(prev => [...prev, ...permissionSetsToMove].sort((a, b) => a.name.localeCompare(b.name)));
    setUserPermissionSets(prev => prev.filter(ps => !directPermissionSets.includes(ps.id)));
    
    // Clear selection
    setSelectedAssignedPermissionSets([]);
  };

  const handleAvailablePermissionSetToggle = (permissionSetId: string) => {
    setSelectedAvailablePermissionSets(prev => 
      prev.includes(permissionSetId) 
        ? prev.filter(id => id !== permissionSetId)
        : [...prev, permissionSetId]
    );
  };

  const handleAssignedPermissionSetToggle = (permissionSetId: string) => {
    // Don't allow selection of profile-based permission sets
    const permissionSet = userPermissionSets.find(ps => ps.id === permissionSetId);
    if (permissionSet && permissionSet.source_type === 'profile') {
      return;
    }
    
    setSelectedAssignedPermissionSets(prev => 
      prev.includes(permissionSetId) 
        ? prev.filter(id => id !== permissionSetId)
        : [...prev, permissionSetId]
    );
  };

  const banner = (
    <HeadingCard
      title="User Management"
      subtitle="Manage users"
      Icon={UsersIcon}
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

  const handleEdit = async () => {
    setIsEditing(true);
    setEditingUserData(user); // Initialize editing data with current user data
    setValidationErrors({}); // Clear validation errors when entering edit mode
    await handleRoleProfileTabClick(); // Re-fetch roles and profiles for editing
    fetchAvailableRoles(); // Fetch available roles for dropdown
    fetchAvailableProfiles(); // Fetch available profiles for dropdown
    // Fetch available permission sets after profile permission sets are loaded
    setTimeout(() => {
      fetchAvailablePermissionSets();
    }, 200);
    // Clear pending changes and selections
    setPendingPermissionSetAssignments([]);
    setPendingPermissionSetUnassignments([]);
    setSelectedAvailablePermissionSets([]);
    setSelectedAssignedPermissionSets([]);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate all fields before saving
    if (!validateAllFields()) {
      showToast.error("Please fix validation errors before saving");
      return;
    }

    // Check if email is available (if it was changed)
    if (editingUserData.email !== user.email) {
      if (emailAvailability === 'unavailable') {
        showToast.error("Email is already in use");
        return;
      }
      if (emailAvailability === 'checking') {
        showToast.error("Please wait for email availability check to complete");
        return;
      }
    }

    const t = showToast.loading("Saving user...");
    try {
      // Save role assignments
      if (userRoles.length > 0) {
        try {
          await fetch(`/api/admin/users/${user.id}/roles`, { 
            method: "POST", 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ roleId: userRoles[0].id }) 
          });
        } catch (e) {
          console.error("Failed to save role assignment:", e);
        }
      }

      // Save profile assignments
      if (userProfiles.length > 0) {
        try {
          await fetch(`/api/admin/users/${user.id}/profiles`, { 
            method: "POST", 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ profileId: userProfiles[0].id }) 
          });
        } catch (e) {
          console.error("Failed to save profile assignment:", e);
        }
      }

      // Save permission set assignments
      for (const permissionSetId of pendingPermissionSetAssignments) {
        try {
          await fetch(`/api/admin/users/${user.id}/permission-sets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissionSetId })
          });
        } catch (e) {
          console.error("Failed to assign permission set:", e);
        }
      }

      // Save permission set unassignments
      for (const permissionSetId of pendingPermissionSetUnassignments) {
        try {
          await fetch(`/api/admin/users/${user.id}/permission-sets`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissionSetId })
          });
        } catch (e) {
          console.error("Failed to unassign permission set:", e);
        }
      }

      // Save phone number to user_profiles table if it changed
      if (editingUserData.phone !== user.phone) {
        try {
          await fetch(`/api/admin/users/${user.id}`, { 
            method: "PUT", 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ phone: editingUserData.phone }) 
          });
        } catch (e) {
          console.error("Failed to save phone number:", e);
        }
      }

      const res = await fetch(`/api/admin/users/${user.id}`, { method: "PUT", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingUserData) });
      if (res.ok) {
        showToast.success("User saved successfully");
        setIsEditing(false);
        // Clear pending changes and selections
        setPendingPermissionSetAssignments([]);
        setPendingPermissionSetUnassignments([]);
        setSelectedAvailablePermissionSets([]);
        setSelectedAssignedPermissionSets([]);
        fetchAll(); // Refresh user data
      } else {
        const text = await res.text();
        let msg = "Failed to save user";
        try { const j = JSON.parse(text); msg = j.error || j.message || msg; } catch {}
        showToast.error(msg);
      }
    } catch (e) {
      showToast.error("Failed to save user");
    } finally {
      showToast.dismiss(t);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    const t = showToast.loading("Deleting user...");
    try {
      // Best-effort assignment cleanup
      try { await fetch(`/api/admin/users/${user.id}/permission-sets`, { method: "DELETE" }); } catch {}

      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        showToast.success("User deleted successfully");
        router.push("/admin/users");
      } else {
        const text = await res.text();
        let msg = "Failed to delete user";
        try { const j = JSON.parse(text); msg = j.error || j.message || msg; } catch {}
        showToast.error(msg);
      }
    } catch (e) {
      showToast.error("Failed to delete user");
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

  if (!user) {
    return (
      <DashboardLayout banner={banner}>
        <div className="space-y-4 sm:space-y-6 pb-24">
          <div className="bg-white border border-gray-200 rounded-lg p-6">User not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout banner={banner}>
      <div className="space-y-4 sm:space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/admin/users")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
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
                  activeTab === 'userInfo'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('userInfo')}
              >
                👤 User Info
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'roleProfile'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setActiveTab('roleProfile');
                  handleRoleProfileTabClick();
                }}
              >
                🛡️ Role & Profile
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'userInfo' && (
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
              {isEditing && Object.keys(validationErrors).length === 0 && editingUserData.firstName && editingUserData.lastName && editingUserData.email && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-green-600 font-medium">✅ All required fields are valid!</span>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">User Information</h3>
                  {isEditing && (
                    <div className="text-sm text-gray-500">
                      <span className="text-red-600">*</span> Required fields
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        First Name <span className="text-red-600">*</span>
                      </label>
                      {isEditing ? (
                        <div>
                          <input
                            type="text"
                            value={editingUserData.firstName || ''}
                            onChange={(e) => handleFieldChange('firstName', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              validationErrors.firstName ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter first name"
                          />
                          {validationErrors.firstName && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.firstName}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-900 font-medium">{user.firstName || 'Not set'}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Last Name <span className="text-red-600">*</span>
                      </label>
                      {isEditing ? (
                        <div>
                          <input
                            type="text"
                            value={editingUserData.lastName || ''}
                            onChange={(e) => handleFieldChange('lastName', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              validationErrors.lastName ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter last name"
                          />
                          {validationErrors.lastName && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.lastName}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-900 font-medium">{user.lastName || 'Not set'}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Email <span className="text-red-600">*</span>
                      </label>
                      {isEditing ? (
                        <div>
                          <div className="relative">
                            <input
                              type="email"
                              value={editingUserData.email || ''}
                              onChange={(e) => handleFieldChange('email', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                validationErrors.email ? 'border-red-500' : 
                                emailAvailability === 'available' ? 'border-green-500' : 
                                emailAvailability === 'unavailable' ? 'border-red-500' : 
                                'border-gray-300'
                              }`}
                              placeholder="Enter email address"
                            />
                            {emailAvailability === 'checking' && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            {emailAvailability === 'available' && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                                ✓
                              </div>
                            )}
                            {emailAvailability === 'unavailable' && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                                ✗
                              </div>
                            )}
                          </div>
                          {validationErrors.email && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
                          )}
                          {emailAvailability === 'unavailable' && !validationErrors.email && (
                            <p className="text-red-500 text-xs mt-1">Email is already in use</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-900 font-medium">{user.email || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Phone Number <span className="text-red-600">*</span>
                      </label>
                      {isEditing ? (
                        <div>
                          <div className="flex">
                            <select
                              value={editingUserData.countryCode || '+91'}
                              onChange={(e) => {
                                const newCountryCode = e.target.value;
                                handleFieldChange('countryCode', newCountryCode);
                                // Reformat phone number for new country code
                                if (editingUserData.phone) {
                                  const formattedPhone = formatPhoneNumber(editingUserData.phone, newCountryCode);
                                  handleFieldChange('phone', formattedPhone);
                                }
                              }}
                              className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="+91">IN +91 (India)</option>
                              <option value="+1">US +1 (USA)</option>
                              <option value="+44">GB +44 (UK)</option>
                              <option value="+61">AU +61 (Australia)</option>
                              <option value="+86">CN +86 (China)</option>
                            </select>
                            <input
                              type="tel"
                              value={editingUserData.phone || ''}
                              onChange={(e) => {
                                const formattedPhone = formatPhoneNumber(e.target.value, editingUserData.countryCode || '+91');
                                handleFieldChange('phone', formattedPhone);
                              }}
                              className={`flex-1 px-3 py-2 border rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                              }`}
                              placeholder={editingUserData.countryCode === '+91' ? '98765 43210' :
                                         editingUserData.countryCode === '+1' ? '(555) 123-4567' :
                                         editingUserData.countryCode === '+44' ? '20 7946 0958' :
                                         editingUserData.countryCode === '+61' ? '2 9374 4000' :
                                         editingUserData.countryCode === '+86' ? '138 0013 8000' : 'Enter phone number'}
                            />
                          </div>
                          <p className="mt-1 text-sm text-gray-500">
                            Format: {editingUserData.countryCode === '+91' ? '98765 43210 (India)' :
                                     editingUserData.countryCode === '+1' ? '(555) 123-4567 (USA)' :
                                     editingUserData.countryCode === '+44' ? '20 7946 0958 (UK)' :
                                     editingUserData.countryCode === '+61' ? '2 9374 4000 (Australia)' :
                                     editingUserData.countryCode === '+86' ? '138 0013 8000 (China)' : 'Enter phone number'}
                          </p>
                          {validationErrors.phone && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-900 font-medium">{user.phone || 'Not set'}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">Username</label>
                      <p className="text-gray-900 font-medium">{user.username || 'Not set'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500 block mb-1">
                        Status <span className="text-red-600">*</span>
                      </label>
                      {isEditing ? (
                        <select
                          value={editingUserData.enabled !== undefined ? (editingUserData.enabled ? 'active' : 'inactive') : (user.enabled ? 'active' : 'inactive')}
                          onChange={(e) => setEditingUserData((prev: any) => ({ ...prev, enabled: e.target.value === 'active' }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        <p className="text-gray-900 font-medium">{user.enabled ? 'Active' : 'Inactive'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">User ID</label>
                    <p className="text-gray-900 font-mono text-sm">{user.id}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roleProfile' && (
            <div className="space-y-6">
              {/* Roles Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Assigned Roles</h3>
                </div>

                                {!isEditing ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    {rolesLoading ? (
                      <div className="text-center py-8">Loading roles...</div>
                    ) : userRoles.length > 0 ? (
                      <div className="space-y-3">
                        {userRoles.map((role: any) => (
                          <div key={role.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Shield className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{role.name || "Unknown Role"}</p>
                                <p className="text-xs text-gray-500">{role.description || "No description"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Shield className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No roles assigned</h3>
                        <p className="mt-1 text-sm text-gray-500">This user doesn't have any roles assigned yet.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Select Role</label>
                        <select
                          value={userRoles.length > 0 ? userRoles[0].id : ''}
                          onChange={(e) => {
                            const roleId = e.target.value;
                            if (roleId) {
                              // Remove existing roles and assign the new one
                              setUserRoles([availableRoles.find(r => r.id === roleId)]);
                            } else {
                              setUserRoles([]);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">No role assigned</option>
                          {availableRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Profiles Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Assigned Profiles</h3>
                </div>

                {!isEditing ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    {profilesLoading ? (
                      <div className="text-center py-8">Loading profiles...</div>
                    ) : userProfiles.length > 0 ? (
                      <div className="space-y-3">
                        {userProfiles.map((profile: any) => (
                          <div key={profile.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <UserCheck className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{profile.name || "Unknown Profile"}</p>
                                <p className="text-xs text-gray-500">{profile.description || "No description"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No profiles assigned</h3>
                        <p className="mt-1 text-sm text-gray-500">This user doesn't have any profiles assigned yet.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-2">Select Profile</label>
                        <select
                          value={userProfiles.length > 0 ? userProfiles[0].id : ''}
                          onChange={async (e) => {
                            const profileId = e.target.value;
                            if (profileId) {
                              // Remove existing profiles and assign the new one
                              const newProfile = availableProfiles.find(p => p.id === profileId);
                              setUserProfiles([newProfile]);
                              
                              // Clear existing profile permission sets from user permission sets
                              setUserPermissionSets(prev => prev.filter(ps => ps.source_type !== 'profile'));
                              
                              // Fetch new profile permission sets
                              if (newProfile) {
                                await fetchProfilePermissionSetsWithProfile(newProfile.id);
                              }
                            } else {
                              setUserProfiles([]);
                              // Clear profile permission sets when no profile is selected
                              setUserPermissionSets(prev => prev.filter(ps => ps.source_type !== 'profile'));
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">No profile assigned</option>
                          {availableProfiles.map((profile) => (
                            <option key={profile.id} value={profile.id}>
                              {profile.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Permission Sets Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Permission Sets</h3>
                </div>

                {!isEditing ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    {permissionSetsLoading ? (
                      <div className="text-center py-8">Loading permission sets...</div>
                    ) : userPermissionSets.length > 0 ? (
                      <div className="space-y-3">
                        {userPermissionSets.map((permissionSet: PermissionSet) => (
                          <div key={permissionSet.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                permissionSet.source_type === 'profile' ? 'bg-green-100' : 'bg-blue-100'
                              }`}>
                                <Settings className={`h-4 w-4 ${
                                  permissionSet.source_type === 'profile' ? 'text-green-600' : 'text-blue-600'
                                }`} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{permissionSet.name || "Unknown Permission Set"}</p>
                                <p className="text-xs text-gray-500">{permissionSet.description || "No description"}</p>
                                <p className={`text-xs ${
                                  permissionSet.source_type === 'profile' ? 'text-green-600' : 'text-blue-600'
                                }`}>
                                  {permissionSet.source_type === 'profile' ? 'From Profile' : 'Direct Assignment'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Settings className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No permission sets assigned</h3>
                        <p className="mt-1 text-sm text-gray-500">This user doesn't have any permission sets assigned yet.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex space-x-6">
                    {/* Available Permission Sets */}
                    <div className="flex-1 border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Available Permission Sets</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {availablePermissionSets.map((permissionSet: any) => (
                          <div key={permissionSet.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={selectedAvailablePermissionSets.includes(permissionSet.id)}
                              data-state={selectedAvailablePermissionSets.includes(permissionSet.id) ? "checked" : "unchecked"}
                              value="on"
                              className="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                              onClick={() => handleAvailablePermissionSetToggle(permissionSet.id)}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{permissionSet.name}</div>
                              <div className="text-sm text-gray-500">{permissionSet.description || "No description"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Arrow Buttons */}
                    <div className="flex flex-col justify-center space-y-2">
                      <Button
                        className="h-9 rounded-md px-3"
                        disabled={selectedAvailablePermissionSets.length === 0}
                        onClick={handleAssignPermissionSets}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 rounded-md px-3"
                        disabled={selectedAssignedPermissionSets.length === 0}
                        onClick={handleUnassignPermissionSets}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Assigned Permission Sets */}
                    <div className="flex-1 border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">Assigned Permission Sets</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userPermissionSets.map((permissionSet: PermissionSet) => (
                          <div key={permissionSet.id} className={`flex items-center space-x-3 p-2 rounded transition-colors ${
                            permissionSet.source_type === 'profile' ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50 cursor-pointer'
                          }`}>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={selectedAssignedPermissionSets.includes(permissionSet.id)}
                              data-state={selectedAssignedPermissionSets.includes(permissionSet.id) ? "checked" : "unchecked"}
                              value="on"
                              className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground ${
                                permissionSet.source_type === 'profile' ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              onClick={() => handleAssignedPermissionSetToggle(permissionSet.id)}
                              disabled={permissionSet.source_type === 'profile'}
                            />
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {permissionSet.name}
                                {permissionSet.source_type === 'profile' && (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                    From Profile
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {permissionSet.source_type === 'profile' ? 'Automatically assigned from user profile' : 'Direct Assignment'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
