'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppName } from '@/components/ui/AppName';

interface Role {
  id?: string;
  name: string;
  description: string;
  phoneNumber?: string;
  status?: 'active' | 'inactive' | 'pending';
  profileId?: string;
  userCount?: number;
}

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: Role) => void;
  role?: Role | null;
  mode: 'add' | 'edit';
  loading: boolean;
  availableProfiles?: Array<{ id: string; name: string }>;
}

export default function RoleModal({ isOpen, onClose, onSave, role, mode, loading, availableProfiles = [] }: RoleModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phoneNumber: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
    profileId: '',
  });

  useEffect(() => {
    if (role && mode === 'edit') {
      setFormData({
        name: role.name,
        description: role.description,
        phoneNumber: role.phoneNumber || '',
        status: role.status || 'active',
        profileId: role.profileId || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        phoneNumber: '',
        status: 'active',
        profileId: '',
      });
    }
  }, [role, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roleData = {
      id: role?.id,
      name: formData.name,
      description: formData.description,
      phoneNumber: formData.phoneNumber,
      status: formData.status,
      profileId: formData.profileId,
    };
    onSave(roleData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-blue-600 mb-2"><AppName /></h1>
            <DialogTitle className="text-xl font-bold text-gray-800">
              {mode === 'add' ? 'Create Role' : 'Edit Role'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Create or edit a user role with appropriate permissions and details.
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Role Name <span className="text-red-600">*</span></Label>
              <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter role name" className="w-full" disabled={loading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-semibold text-gray-700">Phone Number</Label>
              <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder="Enter phone number" className="w-full" disabled={loading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700">Description <span className="text-red-600">*</span></Label>
            <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter role description" className="w-full min-h-[80px] resize-none" disabled={loading} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-semibold text-gray-700">Role Status</Label>
              <Select value={formData.status} onValueChange={(value: 'active' | 'inactive' | 'pending') => setFormData({ ...formData, status: value })} disabled={loading}>
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

            <div className="space-y-2">
              <Label htmlFor="profileId" className="text-sm font-semibold text-gray-700">Assign Profile</Label>
              <Select value={formData.profileId} onValueChange={(value) => setFormData({ ...formData, profileId: value })} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Profile</SelectItem>
                  {availableProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === 'edit' && role?.userCount !== undefined && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                <strong>{role.userCount}</strong> user{role.userCount !== 1 ? 's' : ''} currently have this role
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button type="button" variant="destructive" onClick={onClose} disabled={loading} className="px-6">Cancel</Button>
            <Button type="submit" disabled={loading || !formData.name.trim()} className="px-6 bg-green-600 hover:bg-green-700">{loading ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 