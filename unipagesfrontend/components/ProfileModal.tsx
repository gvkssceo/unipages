'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import React from 'react';
import { AppName } from '@/components/ui/AppName';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profileData: any) => Promise<void>;
  profile?: any;
  mode: 'add' | 'edit';
  loading?: boolean;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onSave,
  profile,
  mode,
  loading = false
}: ProfileModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [availableSets, setAvailableSets] = useState<{ id: string; name: string }[]>([]);
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [highlightedAvailable, setHighlightedAvailable] = useState<string[]>([]);
  const [highlightedSelected, setHighlightedSelected] = useState<string[]>([]);

  useEffect(() => {
    if (profile && mode === 'edit') {
      setFormData({
        name: profile.name || '',
        description: profile.description || ''
      });
      // preload selected permission sets for this profile
      fetch(`/api/admin/profiles/${profile.id}/permission-sets`)
        .then(r => r.json())
        .then((rows) => setSelectedSetIds(rows.map((r: any) => r.id)))
        .catch(() => setSelectedSetIds([]));
    } else {
      setFormData({
        name: '',
        description: ''
      });
      setSelectedSetIds([]);
    }
  }, [profile, mode, isOpen]);

  // Always load available permission sets when modal opens
  useEffect(() => {
    if (isOpen) {
      // load all available permission sets
      fetch('/api/admin/permission-sets?details=false')
        .then(r => r.json())
        .then((rows) => setAvailableSets(rows.map((r: any) => ({ id: r.id, name: r.name }))))
        .catch(() => setAvailableSets([]));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    try {
      await onSave({ ...formData, permissionSetIds: selectedSetIds });
      // Don't call onClose() here - let the parent component handle modal closing
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-blue-600 mb-2"><AppName /></h1>
            <DialogTitle className="text-xl font-bold text-gray-800">
              {mode === 'add' ? 'Create Profile' : 'Edit Profile'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Create or edit a user profile and assign permission sets.
            </DialogDescription>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
              Name <span className="text-red-600">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter profile name"
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
              placeholder="Enter profile description"
              className="w-full min-h-[80px] resize-none"
              required
            />
          </div>
          
          {/* Assign Permission Sets */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Add Permission Sets</Label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3">
              {/* Available */}
              <div className="border rounded-md overflow-hidden">
                <div className="px-3 py-2 text-xs font-semibold bg-gray-50 border-b">Available Permission Sets</div>
                <div className="max-h-56 overflow-y-auto">
                  {availableSets
                    .filter(s => !selectedSetIds.includes(s.id))
                    .map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setHighlightedAvailable(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                        className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${highlightedAvailable.includes(s.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        {s.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Arrows */}
              <div className="flex flex-col items-center justify-center gap-2">
                <Button type="button" variant="secondary" disabled={highlightedAvailable.length === 0}
                  onClick={() => {
                    setSelectedSetIds(prev => Array.from(new Set([...prev, ...highlightedAvailable])));
                    setHighlightedAvailable([]);
                  }}>→</Button>
                <Button type="button" variant="secondary" disabled={highlightedSelected.length === 0}
                  onClick={() => {
                    setSelectedSetIds(prev => prev.filter(id => !highlightedSelected.includes(id)));
                    setHighlightedSelected([]);
                  }}>←</Button>
              </div>

              {/* Selected */}
              <div className="border rounded-md overflow-hidden">
                <div className="px-3 py-2 text-xs font-semibold bg-gray-50 border-b">Selected Permission Sets</div>
                <div className="max-h-56 overflow-y-auto">
                  {selectedSetIds.length > 0 ? (
                    selectedSetIds.map(id => {
                      const s = availableSets.find(a => a.id === id);
                      if (!s) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setHighlightedSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                          className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 ${highlightedSelected.includes(id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          {s.name}
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

          <div className="flex justify-end space-x-3 pt-2">
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


