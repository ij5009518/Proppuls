import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Building2, Users, Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { Organization } from '../../../shared/schema';

export default function Organizations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    plan: 'basic',
    maxUsers: 10,
    maxProperties: 50,
  });

  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ['/api/organizations'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create organization');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setIsCreateDialogOpen(false);
      setFormData({ name: '', domain: '', plan: 'basic', maxUsers: 10, maxProperties: 50 });
      toast({ title: 'Organization created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create organization', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update organization');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      setEditingOrg(null);
      setFormData({ name: '', domain: '', plan: 'basic', maxUsers: 10, maxProperties: 50 });
      toast({ title: 'Organization updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update organization', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete organization');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/organizations'] });
      toast({ title: 'Organization deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete organization', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      domain: org.domain || '',
      plan: org.plan,
      maxUsers: org.maxUsers,
      maxProperties: org.maxProperties,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this organization?')) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', domain: '', plan: 'basic', maxUsers: 10, maxProperties: 50 });
    setEditingOrg(null);
  };

  if (isLoading) {
    return <div className="p-6">Loading organizations...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">Manage client organizations and their access</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingOrg ? 'Edit Organization' : 'Create Organization'}</DialogTitle>
              <DialogDescription>
                {editingOrg ? 'Update organization details' : 'Create a new client organization with isolated data'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter organization name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="company.com"
                />
              </div>
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Select value={formData.plan} onValueChange={(value) => setFormData({ ...formData, plan: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxUsers">Max Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={formData.maxUsers}
                    onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxProperties">Max Properties</Label>
                  <Input
                    id="maxProperties"
                    type="number"
                    value={formData.maxProperties}
                    onChange={(e) => setFormData({ ...formData, maxProperties: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingOrg ? 'Update' : 'Create'} Organization
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <CardTitle className="text-lg">{org.name}</CardTitle>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleEdit(org);
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(org.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                {org.domain && (
                  <span className="text-sm text-muted-foreground">{org.domain}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Plan</span>
                  <Badge variant={org.plan === 'enterprise' ? 'default' : 'secondary'}>
                    {org.plan}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={org.status === 'active' ? 'default' : 'secondary'}>
                    {org.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      Max Users
                    </span>
                    <span>{org.maxUsers}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <Building2 className="h-4 w-4 mr-1" />
                      Max Properties
                    </span>
                    <span>{org.maxProperties}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(org.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {organizations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Organizations</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first organization to start managing client data
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}