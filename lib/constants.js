import { Crown, Shield, Users, UserCheck } from "lucide-react";

export const roleColors = {
  superadmin:
    "bg-primary text-primary-foreground dark:bg-primary-foreground dark:text-primary shadow-md border-0",
  admin: "bg-primary text-primary-foreground dark:bg-primary-foreground dark:text-primary shadow-md",
  issuer_admin:
    "!bg-primary !text-primary-foreground dark:!bg-primary-foreground dark:!text-primary !shadow-md !font-semibold !border-0",
  transfer_team:
    "bg-secondary text-secondary-foreground dark:bg-secondary-foreground dark:text-secondary shadow-md",
  read_only: "bg-muted text-muted-foreground dark:bg-muted-foreground dark:text-muted shadow-md",
  shareholder:
    "bg-primary text-primary-foreground dark:bg-primary-foreground dark:text-primary shadow-md border-0",
  broker: "bg-accent text-accent-foreground dark:bg-accent-foreground dark:text-accent shadow-md",
  custom: "bg-accent text-accent-foreground dark:bg-accent-foreground dark:text-accent shadow-md",
};

export const roleLabels = {
  superadmin: "Super Admin",
  admin: "Admin",
  issuer_admin: "Issuer Admin",
  transfer_team: "Transfer Team",
  read_only: "Read Only",
  shareholder: "Shareholder",
};

export const roleIcons = {
  superadmin: Crown,
  admin: Shield,
  issuer_admin: UserCheck,
  transfer_team: Shield,
  read_only: Users,
  shareholder: Users,
};

// Helper function to get role display info
export const getRoleDisplay = (role) => {
  return {
    color: roleColors[role] || roleColors.read_only,
    label: roleLabels[role] || "Read Only",
    Icon: roleIcons[role] || Users,
  };
};
