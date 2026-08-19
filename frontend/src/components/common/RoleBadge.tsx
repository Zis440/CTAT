import {
  User,
  Building2,
  Stethoscope,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type RoleType =
  | "individual_psychologist"
  | "clinic_admin"
  | "clinic_staff"
  | "super_admin"
  | string;

interface RoleBadgeProps {
  role: RoleType;
  className?: string;
  showIcon?: boolean;
  iconOnly?: boolean;
}

export function RoleBadge({ role, className, showIcon = true, iconOnly = false }: RoleBadgeProps) {
  let label = role;
  let IconComponent = HelpCircle;
  let colorClass = "bg-secondary text-secondary-foreground";

  switch (role) {
    case "individual_psychologist":
      label = "Psychologist";
      IconComponent = User;
      colorClass = "bg-blue-600 text-white hover:bg-blue-700 border-transparent";
      break;
    case "clinic_admin":
      label = "Clinic Admin";
      IconComponent = Building2;
      colorClass = "bg-purple-600 text-white hover:bg-purple-700 border-transparent";
      break;
    case "clinic_staff":
      label = "Clinic Staff";
      IconComponent = Stethoscope;
      colorClass = "bg-teal-600 text-white hover:bg-teal-700 border-transparent";
      break;
    case "org_admin":
      label = "Org Admin";
      IconComponent = Building2;
      colorClass = "bg-indigo-600 text-white hover:bg-indigo-700 border-transparent";
      break;
    case "org_staff":
      label = "Org Staff";
      IconComponent = User;
      colorClass = "bg-cyan-600 text-white hover:bg-cyan-700 border-transparent";
      break;
    case "super_admin":
      label = "Super Admin";
      IconComponent = ShieldAlert;
      colorClass = "bg-red-600 text-white hover:bg-red-700 border-transparent";
      break;
    default:
      label = role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase());
      break;
  }

  if (iconOnly) {
    return (
      <div className={`flex items-center justify-center rounded-md ${colorClass} ${className || ""}`}>
        <IconComponent className="h-4 w-4" />
      </div>
    );
  }

  return (
    <Badge className={`${colorClass} whitespace-nowrap rounded-md ${className || ""}`}>
      {showIcon && <IconComponent className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}
