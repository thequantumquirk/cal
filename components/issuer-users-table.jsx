"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit,
  Search,
  Users,
  Shield,
  Key,
  Clock,
  AlertTriangle,
  Crown,
  UserCheck,
  Plus,
} from "lucide-react";
import { toUSDate } from "@/lib/dateUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { roleLabels, roleColors, roleIcons } from "@/lib/constants";

export default function IssuerUsersTable({
  users,
  invitedUsers,
  currentUserId,
  currentUserRole,
  issuerId,
  currentIssuer,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("");
  const itemsPerPage = 10;
  const router = useRouter();

  // Get available roles (admin can manage admin, transfer_team, read_only)
  const availableRoles = [
    { value: "admin", label: "Admin" },
    { value: "transfer_team", label: "Transfer Team" },
    { value: "read_only", label: "Read Only" },
  ];

  // Filter users based on search term
  const filteredUsers = users.filter((user) =>
    user.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Filter invited users based on search term
  const filteredInvitedUsers = invitedUsers.filter(
    (invitedUser) =>
      invitedUser.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invitedUser.name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Paginate users
  const totalUsers = filteredUsers.length + filteredInvitedUsers.length;
  const totalPages = Math.ceil(totalUsers / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;

  // Combine and paginate
  const combinedUsers = [
    ...filteredUsers.map((u) => ({ type: "active", ...u })),
    ...filteredInvitedUsers.map((u) => ({ type: "invited", ...u })),
  ];
  const paginatedUsers = combinedUsers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setNewRole(user.roles?.name || "");
    setEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    const supabase = createClient();

    try {
      // Get the role ID for the new role
      const { data: roleData, error: roleError } = await supabase
        .from("roles_new")
        .select("id")
        .eq("role_name", newRole)
        .single();

      if (roleError) throw roleError;

      // Update the user's role in the issuer_users table
      const { error: updateError } = await supabase
        .from("issuer_users_new")
        .update({ role_id: roleData.id })
        .eq("user_id", selectedUser.user_id)
        .eq("issuer_id", issuerId);

      if (updateError) throw updateError;

      router.refresh();
      setEditDialogOpen(false);
      setSelectedUser(null);
      setNewRole("");
    } catch (error) {
      console.error("Error updating user role:", error);
      setErrorMessage("Error updating user role: " + error.message);
      setErrorDialogOpen(true);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserRole) return;

    const supabase = createClient();

    try {
      // Get the role ID for the selected role
      const { data: roleData, error: roleError } = await supabase
        .from("roles_new")
        .select("id")
        .eq("name", newUserRole)
        .single();

      if (roleError) throw roleError;

      // Add to invited_users table
      const { error: inviteError } = await supabase
        .from("invited_users_new")
        .insert({
          email: newUserEmail,
          name: newUserName || newUserEmail.split("@")[0],
          issuer_id: issuerId,
          role_id: roleData.id,
          invited_at: new Date().toISOString(),
        });

      if (inviteError) throw inviteError;

      // Reset form and close dialog
      setNewUserEmail("");
      setNewUserName("");
      setNewUserRole("");
      setAddUserDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error inviting user:", error);
      setErrorMessage("Error inviting user: " + error.message);
      setErrorDialogOpen(true);
    }
  };

  const getRoleBadge = (roleName) => {
    const roleConfig = {
      superadmin: {
        label: "Super Admin",
        icon: Crown,
        className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      },
      admin: {
        label: "Admin",
        icon: Shield,
        className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      },
      transfer_team: {
        label: "Transfer Team",
        icon: UserCheck,
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      },
      read_only: {
        label: "Read Only",
        icon: Users,
        className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      },
    };

    const config = roleConfig[roleName] || roleConfig.read_only;
    const Icon = config.icon;

    return (
      <div
        className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold ${config.className}`}
      >
        <Icon className="h-3 w-3 mr-1.5" />
        {config.label}
      </div>
    );
  };

  const canEditUser = (user) => {
    // Can't edit yourself
    if (user.user_id === currentUserId) return false;

    // Admins can edit other users in their issuer (but not superadmins)
    if (currentUserRole === "admin") {
      return user.roles?.name !== "superadmin";
    }

    // Superadmins can edit anyone
    return currentUserRole === "superadmin";
  };

  return (
    <div className="space-y-6">
      {/* Search and Add Button */}
      {/* Search and Add Button */}
      <div className="flex justify-between items-center">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-background border-input focus:border-primary focus:ring-primary/20 text-foreground"
          />
        </div>
        <Button
          onClick={() => setAddUserDialogOpen(true)}
          className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto table-scrollbar">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                <TableHead className="font-semibold text-foreground">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Email
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Name
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Role
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Joined
                </TableHead>
                <TableHead className="font-semibold text-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((item, index) => (
                <TableRow
                  key={`${item.type}-${item.user_id || item.email}-${index}`}
                  className="hover:bg-muted/50 transition-colors border-b border-border"
                >
                  <TableCell>
                    {item.type === "active" ? (
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600 dark:text-yellow-400">
                        <Clock className="h-4 w-4 mr-2" />
                        Invited
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="font-medium text-foreground">
                    {item.type === "active" ? item.users?.email : item.email}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {item.type === "active"
                      ? item.users?.email?.split("@")[0] || "-"
                      : item.name || "-"}
                  </TableCell>

                  <TableCell>
                    {item.type === "active"
                      ? getRoleBadge(item.roles?.name)
                      : getRoleBadge(item.roles?.name)}
                  </TableCell>

                  <TableCell className="text-muted-foreground">
                    {item.type === "active"
                      ? toUSDate(item.users?.created_at)
                      : toUSDate(item.invited_at)}
                  </TableCell>

                  <TableCell>
                    <div className="flex space-x-2">
                      {item.type === "active" && canEditUser(item) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRole(item)}
                          className="border-input hover:bg-accent text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {paginatedUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No users found matching your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + itemsPerPage, totalUsers)} of {totalUsers}{" "}
            results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-input hover:bg-accent text-foreground"
            >
              Previous
            </Button>
            <span className="flex items-center px-3 py-2 text-sm text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="border-input hover:bg-accent text-foreground"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Role Dialog */}
      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogContent className="bg-card border border-border shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-foreground">
                  Edit User Role
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Change the role for {selectedUser?.users?.email}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="w-full bg-background border border-input text-foreground">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="border-input bg-background hover:bg-accent text-foreground w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateRole}
              disabled={!newRole || newRole === selectedUser?.roles?.name}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <AlertDialogContent className="bg-card border border-border shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-bold text-foreground">
                  Error
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {errorMessage}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogAction
              onClick={() => setErrorDialogOpen(false)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border border-border shadow-2xl">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Invite User
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Invite a new user to{" "}
                  {currentIssuer?.display_name || currentIssuer?.name}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="mt-1 bg-background border border-input text-foreground"
              />
            </div>

            <div>
              <Label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Name (Optional)
              </Label>
              <Input
                id="name"
                placeholder="User's full name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="mt-1 bg-background border border-input text-foreground"
              />
            </div>

            <div>
              <Label
                htmlFor="role"
                className="text-sm font-medium text-foreground"
              >
                Role *
              </Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger className="mt-1 bg-background border border-input text-foreground">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAddUserDialogOpen(false);
                setNewUserEmail("");
                setNewUserName("");
                setNewUserRole("");
              }}
              className="border-input hover:bg-accent text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={!newUserEmail || !newUserRole}
              className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
