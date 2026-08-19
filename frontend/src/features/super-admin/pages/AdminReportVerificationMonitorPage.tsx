import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, AlertTriangle, RefreshCw, User, Search, Filter, RotateCcw } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useNavigate } from "react-router-dom";

import { getAdminVerificationMonitor } from "@/services/psychologistVerificationService";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export function AdminReportVerificationMonitorPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: queue, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-psychologist-verification-monitor"],
    queryFn: getAdminVerificationMonitor,
    refetchInterval: 10_000,
  });

  const filteredQueue = queue?.filter(req => 
    req.request_id.toLowerCase().includes(search.toLowerCase()) ||
    (req.psychologist_name && req.psychologist_name.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Helmet>
          <title>Verification Monitor | Admin</title>
        </Helmet>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              Report Verification Monitor
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Live monitoring of the assessment verification queue and SLA assignment loop.
            </p>
          </div>
        </div>

        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Card className="max-w-md w-full border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <div className="text-center">
              <p className="font-bold text-text">Failed to load monitor</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Verification Monitor | Admin</title>
      </Helmet>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Report Verification Monitor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live monitoring of the assessment verification queue and SLA assignment loop.
          </p>
        </div>
      </div>

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
            {/* Search */}
            <div className="flex w-full max-w-sm items-center space-x-2">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <SearchInput placeholder="Search by ID or psychologist..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} className="w-full sm:w-64" />
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto overflow-y-hidden pb-1 md:pb-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" /> Filter
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-4">
                  <div className="grid gap-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none">Filter Options</h4>
                        <p className="text-sm text-muted-foreground">Adjust filters for verification requests.</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearch("")}
                        className="h-8 px-2 text-xs"
                      >
                        <RotateCcw className="mr-2 h-3 w-3" /> Reset
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Request ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Psychologist</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Assigned At</TableHead>
              <TableHead>Completed At</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQueue?.map((req) => (
              <TableRow key={req.request_id} className="hover:bg-muted/50">
                <TableCell className="font-medium text-xs font-mono">
                  {req.request_id.split("-")[0]}...
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === "VERIFIED" ? "default" : req.status === "ASSIGNED" ? "secondary" : "outline"}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {req.psychologist_name ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 rounded-full border border-primary/20 bg-primary/5">
                        <AvatarFallback className="bg-transparent text-primary text-xs font-semibold">
                          {req.psychologist_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm leading-none">{req.psychologist_name}</span>
                        <span className="text-xs text-muted-foreground mt-1">{req.psychologist_email}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full border border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                      <span className="text-sm text-muted-foreground italic">Unassigned</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>{req.assignment_attempts || 0}</TableCell>
                <TableCell>{req.assigned_at ? new Date(req.assigned_at).toLocaleString() : "-"}</TableCell>
                <TableCell>{req.completed_at ? new Date(req.completed_at).toLocaleString() : "-"}</TableCell>
                <TableCell>
                  <InteractiveHoverButton
                    onClick={() => navigate(`/admin/report-verification-monitor/${req.request_id}`)}
                    className="text-xs h-8 py-0 px-4"
                  >
                    Details
                  </InteractiveHoverButton>
                </TableCell>
              </TableRow>
            ))}
            {(!filteredQueue || filteredQueue.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <ShieldCheck className="h-10 w-10 mb-3 text-muted-foreground/30" />
                    <p className="font-medium text-foreground">No Requests Found</p>
                    <p className="text-xs text-muted-foreground mt-1">The verification queue is currently empty.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
