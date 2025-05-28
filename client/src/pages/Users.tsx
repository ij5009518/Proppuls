
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Edit, Trash2, UserCheck, UserX } from "lucide-react";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  phone?: string;
}

export default function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error("Failed to create user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      toast({ title: "User created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create user", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...userData }: any) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(userData),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      toast({ title: "User updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const handleCreateUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const userData = {
      email: formData.get("email"),
      password: formData.get("password"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      role: formData.get("role"),
      phone: formData.get("phone"),
    };
    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;
    
    const formData = new FormData(event.currentTarget);
    const userData: any = {
      id: editingUser.id,
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      role: formData.get("role"),
      phone: formData.get("phone"),
      isActive: formData.get("isActive") === "true",
    };
    
    const password = formData.get("password");
    if (password) {
      userData.password = password;
    }
    
    updateUserMutation.mutate(userData);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "tenant":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Users</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Users</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input name="firstName" required />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input name="lastName" required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input name="password" type="password" required />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input name="phone" />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue="tenant">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-muted-foreground">
                      {user.email}
                    </p>
                    {user.phone && (
                      <p className="text-sm text-slate-600 dark:text-muted-foreground">
                        {user.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                      {user.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <UserX className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground">
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                    {user.lastLoginAt && (
                      <p className="text-xs text-slate-500 dark:text-muted-foreground">
                        Last login: {new Date(user.lastLoginAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteUserMutation.mutate(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input name="firstName" defaultValue={editingUser.firstName} required />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input name="lastName" defaultValue={editingUser.lastName} required />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input name="email" type="email" defaultValue={editingUser.email} required />
              </div>
              <div>
                <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                <Input name="password" type="password" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input name="phone" defaultValue={editingUser.phone || ""} />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={editingUser.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="isActive">Status</Label>
                <Select name="isActive" defaultValue={editingUser.isActive.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Update User
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
