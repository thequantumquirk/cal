"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Users,
  Zap,
  Upload,
  FileText,
  ClipboardList,
  Download,
  ScrollText,
  Shield,
  Search,
  Activity,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    user,
    userRole,
    currentIssuer,
    availableIssuers,
    getLastIssuer,
  } = useAuth();

  // Get effective issuer ID
  const getEffectiveIssuerId = useCallback(() => {
    if (currentIssuer?.issuer_id) return currentIssuer.issuer_id;
    const lastIssuer = getLastIssuer?.();
    if (lastIssuer?.issuer_id) return lastIssuer.issuer_id;
    if (availableIssuers?.length > 0) return availableIssuers[0].issuer_id;
    return null;
  }, [currentIssuer, getLastIssuer, availableIssuers]);

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command) => {
    setOpen(false);
    command();
  }, []);

  const issuerId = getEffectiveIssuerId();

  // Action-focused commands
  const actions = [
    // 1. System Logs (superadmin only)
    {
      id: "system-logs",
      name: "System Logs",
      description: "View system audit logs and activity history",
      icon: Activity,
      keywords: ["system", "logs", "audit", "activity", "history", "admin", "tracking"],
      action: () => router.push("/logs"),
      requiresIssuer: false,
      superadminOnly: true,
    },
    // 2. Find Shareholder
    {
      id: "find-shareholder",
      name: "Find Shareholder",
      description: "Search by name, account number, or taxpayer ID",
      icon: Users,
      keywords: ["find", "search", "shareholder", "lookup", "account", "investor", "holder"],
      action: () => router.push(`/issuer/${issuerId}/shareholder`),
      requiresIssuer: true,
    },
    // 2. Process Transaction
    {
      id: "process-transaction",
      name: "Process Transaction",
      description: "Handle pending DWAC, transfers, and requests",
      icon: Zap,
      keywords: ["process", "transaction", "dwac", "transfer", "pending", "queue", "approve"],
      action: () => router.push(`/issuer/${issuerId}/transaction-processing`),
      requiresIssuer: true,
    },
    // 3. Import Spreadsheet
    {
      id: "import-spreadsheet",
      name: "Import Spreadsheet",
      description: "Upload Excel file to import issuer data",
      icon: Upload,
      keywords: ["import", "upload", "spreadsheet", "excel", "xlsx", "bulk", "data"],
      action: () => router.push("/issuers?import=true"),
      requiresIssuer: false,
      superadminOnly: true,
    },
    // 4. Generate Statement
    {
      id: "generate-statement",
      name: "Generate Statement",
      description: "Create shareholder statements and reports",
      icon: FileText,
      keywords: ["statement", "generate", "report", "pdf", "shareholder", "document"],
      action: () => router.push(`/issuer/${issuerId}/statements`),
      requiresIssuer: true,
    },
    // 5. View Pending Requests
    {
      id: "view-pending-requests",
      name: "View Pending Requests",
      description: "See broker transfer requests awaiting approval",
      icon: ClipboardList,
      keywords: ["pending", "requests", "broker", "approval", "waiting", "queue"],
      action: () => router.push(`/issuer/${issuerId}/transaction-processing?tab=pending`),
      requiresIssuer: true,
    },
    // 6. Export Records
    {
      id: "export-records",
      name: "Export Records",
      description: "Download recordkeeping data as CSV",
      icon: Download,
      keywords: ["export", "download", "csv", "records", "data", "spreadsheet"],
      action: () => router.push(`/issuer/${issuerId}/record-keeping`),
      requiresIssuer: true,
    },
    // 7. View Audit Logs
    {
      id: "view-audit-logs",
      name: "View Audit Logs",
      description: "Check system activity and changes",
      icon: ScrollText,
      keywords: ["audit", "logs", "activity", "history", "changes", "tracking"],
      action: () => router.push("/logs"),
      requiresIssuer: false,
    },
    // 9. Check Restrictions
    {
      id: "check-restrictions",
      name: "Check Restrictions",
      description: "View and manage stock restriction rules",
      icon: Shield,
      keywords: ["restrictions", "rules", "legend", "144", "lock", "restricted"],
      action: () => router.push(`/issuer/${issuerId}/restrictions`),
      requiresIssuer: true,
    },
  ];

  // Filter actions based on context
  const availableActions = actions.filter((action) => {
    // Check superadmin requirement
    if (action.superadminOnly && userRole !== "superadmin") {
      return false;
    }
    // Check issuer requirement
    if (action.requiresIssuer && !issuerId) {
      return false;
    }
    return true;
  });

  // Don't render if not logged in
  if (!user) return null;

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg border border-border/50 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Actions...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="What do you want to do?" />
        <CommandList>
          <CommandEmpty>No matching actions found.</CommandEmpty>

          <CommandGroup heading="Actions">
            {availableActions.map((action) => (
              <CommandItem
                key={action.id}
                onSelect={() => runCommand(action.action)}
                keywords={action.keywords}
                className="flex items-start gap-3 py-3"
              >
                <action.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{action.name}</span>
                  <span className="text-xs text-muted-foreground">{action.description}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export default CommandPalette;
