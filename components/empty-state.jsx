import {
  Users,
  ArrowRightLeft,
  Calendar,
  Search,
  UserPlus,
  Building,
  Bell,
  Activity,
  BookOpen,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"

const emptyStates = {
  shareholders: {
    icon: Users,
    title: "No Shareholders Found",
    description: "Get started by adding your first shareholder to the system.",
    actionText: "Add Shareholder",
  },
  transfers: {
    icon: ArrowRightLeft,
    title: "No Transfers Found",
    description: "No share transfers have been recorded yet. Create your first transfer.",
    actionText: "New Transfer",
  },
  search: {
    icon: Search,
    title: "No Results Found",
    description: "Try adjusting your search criteria or date range.",
    actionText: "Clear Filters",
  },
  snapshots: {
    icon: Calendar,
    title: "No Historical Data",
    description: "No snapshots available for the selected date range.",
    actionText: "View All Data",
  },
  users: {
    icon: Users,
    title: "No Users Found",
    description: "No users have been added to the system yet. Invite your first user to get started.",
    actionText: "Add User",
  },
  issuers: {
    icon: Building,
    title: "No Issuers Found",
    description: "No issuers have been created yet. Create your first issuer to get started.",
    actionText: "Create First Issuer",
  },
  notifications: {
    icon: Bell,
    title: "All Caught Up!",
    description: "You have no new notifications. We'll notify you when something important happens.",
    actionText: null,
  },
  "audit-logs": {
    icon: Activity,
    title: "No Audit Logs",
    description: "No activity has been recorded yet. Actions will appear here as they occur.",
    actionText: null,
  },
  "transfer-journal": {
    icon: BookOpen,
    title: "No Journal Records",
    description: "No transfer journal records found. Records will appear as transactions are processed.",
    actionText: "New Record",
  },
}

const sizeClasses = {
  sm: {
    container: "py-8",
    icon: "w-14 h-14",
    iconInner: "h-7 w-7",
    title: "text-base",
    desc: "text-sm",
    maxWidth: "max-w-xs"
  },
  md: {
    container: "py-12",
    icon: "w-20 h-20",
    iconInner: "h-10 w-10",
    title: "text-xl",
    desc: "text-sm",
    maxWidth: "max-w-md"
  },
  lg: {
    container: "py-16",
    icon: "w-24 h-24",
    iconInner: "h-12 w-12",
    title: "text-2xl",
    desc: "text-base",
    maxWidth: "max-w-lg"
  }
}

export default function EmptyState({
  // Custom props (take precedence over type)
  icon: CustomIcon,
  title: customTitle,
  description: customDescription,
  actionText: customActionText,
  actionIcon: CustomActionIcon,
  onAction,

  // Legacy type support
  type,

  // Control visibility
  showAction = true,

  // Secondary action (e.g., "Clear Filters")
  secondaryActionText,
  secondaryOnAction,

  // Size variant
  size = "md"
}) {
  // Merge custom props with type defaults
  const config = type ? emptyStates[type] : {}
  const Icon = CustomIcon || config.icon || Search
  const title = customTitle || config.title || "No Data Found"
  const description = customDescription || config.description || "No data available."
  const actionText = customActionText || config.actionText
  const ActionIcon = CustomActionIcon || Plus

  const sizes = sizeClasses[size]

  return (
    <div className={`px-8 ${sizes.container} text-center`}>
      {/* Icon container */}
      <div className={`${sizes.icon} mx-auto bg-muted rounded-full flex items-center justify-center mb-6`}>
        <Icon className={`${sizes.iconInner} text-muted-foreground`} />
      </div>

      {/* Title */}
      <h3 className={`${sizes.title} font-semibold text-foreground mb-3`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`text-muted-foreground mb-6 ${sizes.maxWidth} mx-auto ${sizes.desc}`}>
        {description}
      </p>

      {/* Action buttons */}
      {(showAction && onAction && actionText) || (secondaryActionText && secondaryOnAction) ? (
        <div className="flex items-center justify-center gap-3">
          {showAction && onAction && actionText && (
            <Button
              onClick={onAction}
              className="bg-wealth-gradient !text-black font-semibold border-0"
            >
              <ActionIcon className="h-4 w-4 mr-2" />
              {actionText}
            </Button>
          )}

          {secondaryActionText && secondaryOnAction && (
            <Button variant="outline" onClick={secondaryOnAction}>
              {secondaryActionText}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
