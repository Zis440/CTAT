import React from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore } from "@/store/useUIStore";
import { NotificationBell } from "@/features/notifications/components/NotificationBell";
import { getSessionHistoryRoute } from "@/lib/routeUtils";

function pathToLabel(segment: string, userRole?: string): string {
  const isOrgAccount = userRole === "org_admin" || userRole === "org_staff";
  const targetLabel = isOrgAccount ? "Candidate" : "Patient";
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    session: "Sessions",
    new: `New ${targetLabel}`,
    setup: "Card Setup",
    active: "Active Session",
    history: "History",
    patients: `${targetLabel}s`,
    appointments: "Appointments",
    wallet: "Wallet",
    recharge: "Recharge",
    pricing: "Pricing",
    settings: "Settings",
    staff: "Staff",
    admin: "Admin",
    users: "User Management",
    "verification-queue": "RCI Verification Queue",
    "password-resets": "Password Resets",
    analytics: "Analytics",
    "verify-docs": "Verification",
    "generated-links": "Generated Links",
    "anonymous-links": "Generated Links",
    "report-verification-monitor": "Report Verification Monitor",
    "support-requests": "Support Requests",
    "contact-support": "Contact Support",
    "staff-settings": "Staff Settings",
    "session-history": "Session History",
    "screening-tool": "Employee Mental Health & Wellbeing",
    transactions: "Transactions",
    details: "Details",
    result: "Result",
  };
  return map[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

function isIdSegment(seg: string): boolean {
  const lowerSeg = seg.toLowerCase();
  return lowerSeg.startsWith("pat_") || lowerSeg.startsWith("appt_") || lowerSeg.startsWith("usr_") || lowerSeg.startsWith("session_") || lowerSeg.startsWith("vrq_") || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(seg) || /^\d+$/.test(seg);
}

interface BreadcrumbEntry {
  label: string;
  path: string;
  isUnclickable?: boolean;
}

function buildBreadcrumbs(pathname: string, userRole?: string): BreadcrumbEntry[] {
  const isOrgAccount = userRole === "org_admin" || userRole === "org_staff";
  const targetLabel = isOrgAccount ? "Candidate" : "Patient";
  const segments = pathname.split("/").filter(Boolean);

  if (["clinic", "clinic-staff", "org", "org-staff"].includes(segments[0])) {
    const crumbs: BreadcrumbEntry[] = [
      { label: "Dashboard", path: `/${segments[0]}/dashboard` },
    ];
    if (segments.length > 1 && segments[1] !== "dashboard") {

      if (segments.includes("session") && (segments.includes("report") || segments.includes("result") || (segments.includes("history") && segments.length > 2))) {
        return [
          { label: "Dashboard", path: `/${segments[0]}/dashboard` },
          { label: "Session History", path: `/${segments[0]}/session-history` }
        ];
      }

      let currentPath = `/${segments[0]}`;
      for (let i = 1; i < segments.length; i++) {
        const seg = segments[i];
        currentPath += `/${seg}`;
        if (isIdSegment(seg)) {
          if (i === segments.length - 1) {
            crumbs.push({ label: "Details", path: currentPath });
          } else {
            crumbs.push({ label: seg, path: currentPath, isUnclickable: true });
          }
          continue;
        }

        if (seg === "session") {
          crumbs.push({ label: "Assessment", path: currentPath, isUnclickable: true });
        } else if (seg === "new" && segments[i - 1] === "session") {
          crumbs.push({ label: "Choose Assessment", path: currentPath });
        } else {
          crumbs.push({ label: pathToLabel(seg), path: currentPath });
        }
      }
    }
    return crumbs;
  }

  if (segments[0] === "admin") {
    const crumbs: BreadcrumbEntry[] = [
      { label: "Admin", path: "/admin" },
    ];
    let currentPath = "/admin";
    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      currentPath += `/${seg}`;
      if (isIdSegment(seg)) {
        crumbs.push({ label: seg.toUpperCase(), path: currentPath });
      } else {
        crumbs.push({
          label: pathToLabel(seg),
          path: currentPath
        });
      }
    }
    return crumbs;
  }

  if (segments[0] === "wallet") {
    const crumbs: BreadcrumbEntry[] = [
      { label: "Wallet", path: "/wallet" },
    ];
    if (segments.length > 1) {
      crumbs.push({
        label: pathToLabel(segments[1]),
        path: `/${segments.join("/")}`,
      });
    }
    return crumbs;
  }

  if (segments[0] === "session") {

    if (segments.includes("report") || segments.includes("result") || (segments.includes("history") && segments.length > 2)) {
      return [
        { label: "Dashboard", path: "/dashboard" },
        { label: "Assessment", path: "/session", isUnclickable: true },
        { label: "Session History", path: getSessionHistoryRoute(userRole) }
      ];
    }

    const crumbs: BreadcrumbEntry[] = [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Assessment", path: "/session", isUnclickable: true },
    ];
    const sub = segments[1];

    if (sub === "new" && segments[2] === "intake") {
      crumbs.push({ label: "Choose Assessment", path: "/session/new" });
      crumbs.push({ label: `${targetLabel} Intake`, path: "/session/new/intake" });
      return crumbs;
    }

    const sessionLabels: Record<string, string> = {
      history: "Session History",
      new: "Choose Assessment",
      setup: "Card Setup",
      active: "Active Session",
    };
    if (sub) {
      crumbs.push({
        label: sessionLabels[sub] ?? pathToLabel(sub, userRole),
        path: `/${segments.join("/")}`,
      });
    }
    return crumbs;
  }

  if (segments[0] === "patients") {
    const crumbs: BreadcrumbEntry[] = [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Patients", path: "/patients" },
    ];
    if (segments.length > 1) {
      if (segments.length > 2 && segments[2] === "details") {
        crumbs.push({
          label: `${pathToLabel(segments[1], userRole)} - Details`,
          path: `/${segments.join("/")}`,
        });
      } else {
        crumbs.push({
          label: pathToLabel(segments[1], userRole),
          path: `/${segments.join("/")}`,
        });
      }
    }
    return crumbs;
  }

  const crumbs: BreadcrumbEntry[] = [
    { label: "Dashboard", path: "/dashboard" },
  ];
  let currentPath = "";
  segments.forEach((seg) => {
    currentPath += `/${seg}`;
    if (seg === "dashboard") return;
    crumbs.push({ label: pathToLabel(seg, userRole), path: currentPath });
  });

  return crumbs;
}

export function AppTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { topbarBackOverride } = useUIStore();

  const breadcrumbs = buildBreadcrumbs(location.pathname, user?.role);

  return (
    <header className="h-[72px] border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center px-4 gap-3 sticky top-0 z-40">

      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <Breadcrumb className="flex-1 min-w-0">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {i === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage className="font-semibold truncate">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : crumb.isUnclickable ? (
                  <span className="truncate text-muted-foreground/80 font-medium">
                    {crumb.label}
                  </span>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path} className="truncate hover:text-foreground">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 flex items-center justify-end gap-2">
        <NotificationBell />

        <button
          onClick={() => {
            if (topbarBackOverride) {
              topbarBackOverride();
            } else {
              navigate(-1);
            }
          }}
          className="p-1.5 rounded-md flex items-center justify-center transition-colors text-primary hover:bg-primary/10 cursor-pointer"
          aria-label="Go Backward"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate(1)}
          className="p-1.5 rounded-md flex items-center justify-center transition-colors text-primary hover:bg-primary/10 cursor-pointer"
          aria-label="Go Forward"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
