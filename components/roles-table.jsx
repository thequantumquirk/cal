"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Crown,
  Settings,
  Plus,
  Edit,
  Trash2,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const roleIcons = {
  admin: Crown,
  transfer_team: Shield,
  read_only: Users,
};

const roleColors = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  transfer_team: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  read_only: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  custom: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function RolesTable({ roles }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    can_manage_users: false,
    can_manage_shareholders: false,
    can_manage_transfers: false,
    can_view_reports: false,
    can_manage_own_profile: false,
  });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleCreate = async (e) => {
    e?.preventDefault();
    setError("");

    if (!formData.name) {
      setError("Role name is required");
      return;
    }

    const supabase = createClient();
    try {
      const { error } = await supabase.from("roles_new").insert({
        role_name: formData.name.toLowerCase().replace(/\s+/g, "_"),
        display_name: formData.display_name,

        permissions: {
          users: formData.can_manage_users ? "write" : "none",
          shareholders: formData.can_manage_shareholders ? "write" : "none",
          transfers: formData.can_manage_transfers ? "write" : "none",
          snapshots: formData.can_view_reports ? "read" : "none",
          profile: formData.can_manage_own_profile ? "write" : "none",
          roles: "none",
        },
      });

      if (error) throw error;

      setIsCreateOpen(false);
      setFormData({
        name: "",
        display_name: "",
        can_manage_users: false,
        can_manage_shareholders: false,
        can_manage_transfers: false,
        can_view_reports: false,
        can_manage_own_profile: false,
      });
      toast.success("Role created successfully");
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!formData.name) {
      setError("Role name is required");
      return;
    }

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("roles_new")
        .update({
          role_name: formData.name,
          display_name: formData.display_name,
          permissions: {
            users: formData.can_manage_users ? "write" : "none",
            shareholders: formData.can_manage_shareholders ? "write" : "none",
            transfers: formData.can_manage_transfers ? "write" : "none",
            snapshots: formData.can_view_reports ? "read" : "none",
            profile: formData.can_manage_own_profile ? "write" : "none",
            roles: "none",
          },
        })
        .eq("id", selectedRole.id);

      if (error) throw error;

      setIsEditOpen(false);
      setSelectedRole(null);
      setFormData({
        name: "",
        display_name: "",
        can_manage_users: false,
        can_manage_shareholders: false,
        can_manage_transfers: false,
        can_view_reports: false,
        can_manage_own_profile: false,
      });
      toast.success("Role updated successfully");
      router.refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("roles_new")
        .delete()
        .eq("id", selectedRole.id);

      if (error) throw error;

      setIsDeleteOpen(false);
      setSelectedRole(null);
      toast.success("Role deleted successfully");
      router.refresh();
    } catch (err) {
      toast.error("Error deleting role: " + err.message);
    }
  };

  const openEdit = (role) => {
    setSelectedRole(role);
    const permissions = role.permissions || {};
    setFormData({
      name: role.role_name,
      display_name: role.display_name,
      can_manage_users:
        permissions.users === "write" || permissions.users === "full",
      can_manage_shareholders:
        permissions.shareholders === "write" ||
        permissions.shareholders === "full",
      can_manage_transfers:
        permissions.transfers === "write" || permissions.transfers === "full",
      can_view_reports:
        permissions.snapshots === "read" ||
        permissions.snapshots === "write" ||
        permissions.snapshots === "full",
      can_manage_own_profile:
        permissions.profile === "write" || permissions.profile === "full",
    });
    setIsEditOpen(true);
  };

  const openDelete = (role) => {
    setSelectedRole(role);
    setIsDeleteOpen(true);
  };

  const getPermissionSummary = (permissions) => {
    const perms = permissions || {};
    const hasWrite = Object.values(perms).some(
      (p) => p === "write" || p === "full",
    );
    const hasRead = Object.values(perms).some(
      (p) => p === "read" || p === "write" || p === "full",
    );

    if (hasWrite) return "Can manage data";
    if (hasRead) return "Can view data";
    return "No access";
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 sm:px-6 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Roles</h3>
            <p className="text-sm text-muted-foreground">
              Manage user roles and permissions
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
              <TableHead className="font-semibold text-foreground">
                Role
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Access Level
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Type
              </TableHead>
              <TableHead className="font-semibold text-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles
              .filter((role) => role.role_name !== "superadmin")
              .map((role) => {
                const IconComponent = roleIcons[role.role_name] || Shield;
                const isSystemRole = false;

                return (
                  <TableRow
                    key={role.id}
                    className="hover:bg-muted/50 transition-colors border-b border-border"
                  >
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center space-x-2">
                        <span>{role.display_name}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                        {getPermissionSummary(role.permissions)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          isSystemRole
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        }
                      >
                        {isSystemRole ? "System" : "Custom"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(role)}
                          className="border-input hover:bg-accent text-foreground"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {!isSystemRole && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDelete(role)}
                            className="border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="p-4 space-y-4">
          {roles
            .filter((role) => role.role_name !== "superadmin")
            .map((role) => {
              const IconComponent = roleIcons[role.name] || Shield;
              const isSystemRole = false;

              return (
                <div
                  key={role.id}
                  className="bg-card rounded-lg p-4 border border-border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-foreground">
                          {role.display_name}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                          {getPermissionSummary(role.permissions)}
                        </Badge>
                        <Badge
                          className={
                            isSystemRole
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          }
                        >
                          {isSystemRole ? "System" : "Custom"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(role)}
                        className="border-input hover:bg-accent text-foreground"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {!isSystemRole && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDelete(role)}
                          className="border-red-200 bg-red-50 hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {roles.length === 0 && (
        <div className="px-4 sm:px-6 py-12 text-center">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No roles found.</p>
        </div>
      )}

      {/* Create Role Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card border border-border shadow-2xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Create New Role
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a custom role with specific permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Role Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    display_name: e.target.value,
                  })
                }
                className="bg-background border border-input text-foreground"
                placeholder="e.g., Shareholder, Manager, Analyst"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Permissions
              </Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_users}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_manage_users: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can manage users
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_shareholders}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_manage_shareholders: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can manage shareholders
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_transfers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_manage_transfers: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can manage transfers
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_view_reports}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_view_reports: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can view reports
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_own_profile}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_manage_own_profile: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can manage own profile
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-input hover:bg-accent text-foreground w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md w-full sm:w-auto"
              >
                Create Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border border-border shadow-2xl max-w-md sm:mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Edit Role
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update role details and permissions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="edit-name"
                className="text-sm font-medium text-foreground"
              >
                Role Name *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    display_name: e.target.value,
                  })
                }
                className="bg-background border border-input text-foreground"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Permissions
              </Label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_users}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_manage_users: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can manage users
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_shareholders}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_manage_shareholders: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can manage shareholders
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_transfers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_manage_transfers: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can manage transfers
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_view_reports}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_view_reports: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can view reports
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.can_manage_own_profile}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        can_manage_own_profile: e.target.checked,
                      })
                    }
                    className="rounded border-input bg-background"
                  />
                  <span className="text-sm text-foreground">
                    Can manage own profile
                  </span>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                className="border-input hover:bg-accent text-foreground w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md w-full sm:w-auto"
              >
                Update Role
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Role Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-card border border-border shadow-2xl sm:mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Delete Role
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete the role "
              {selectedRole?.display_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="border-input hover:bg-accent text-foreground w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
