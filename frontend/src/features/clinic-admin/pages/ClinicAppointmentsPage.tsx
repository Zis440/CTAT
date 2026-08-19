import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  Filter,
  List,
  Plus,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  AlertTriangle,
  
  X,
  Trash2,
  Loader2,
  ChevronsUpDown,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
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
import { toast } from "sonner";
import { getClinicAppointments, createAppointment, deleteAppointment, type AppointmentAdmin } from "@/services/appointmentService";
import { getStaff } from "@/services/authService";
import { apiClient } from "@/services/apiClient";
import type { AuthUser } from "@/types/auth";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  scheduled: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  confirmed: "border-green-500/30 text-green-400 bg-green-500/10",
  completed: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  cancelled: "border-red-500/30 text-red-400 bg-red-500/10",
  no_show: "border-orange-500/30 text-orange-400 bg-orange-500/10",
  pending: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
};

function statusLabel(status: string) {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatApptDateTime(date: string, time: string) {
  try {
    if (!date) return "—";
    const dt = parseISO(`${date}T${time || "00:00"}`);
    return format(dt, "d MMM yyyy, h:mm a");
  } catch {
    return `${date} ${time || ""}`;
  }
}

// ── Calendar View ─────────────────────────────────────────────────────────────

interface CalendarViewProps {
  appointments: AppointmentAdmin[];
}

function CalendarView({ appointments }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const apptsByDate = useMemo(() => {
    const map = new Map<string, AppointmentAdmin[]>();
    for (const appt of appointments) {
      if (!appt.appointment_date) continue;
      const key = appt.appointment_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appt);
    }
    return map;
  }, [appointments]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days: Date[] = [];
    let cur = start;
    while (cur <= end) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  }, [currentMonth]);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedAppts = selectedDayKey ? (apptsByDate.get(selectedDayKey) ?? []) : [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 p-4 items-start">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-bold tracking-tight">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
          ))}
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const appts = apptsByDate.get(key) ?? [];
            const count = appts.length;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
            const isTodayDay = isToday(day);
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(-1)) ? null : day)}
                className={[
                  "relative flex flex-col items-center justify-start rounded-lg border p-1.5 min-h-[64px] transition-all duration-150 group",
                  isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
                  isSelected ? "border-primary bg-primary/10 shadow-sm shadow-primary/20" : isTodayDay ? "border-primary/40 bg-primary/5" : "border-border/40 hover:border-primary/30 hover:bg-muted/50",
                ].join(" ")}
              >
                <span className={["text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full", isTodayDay && !isSelected ? "bg-primary text-primary-foreground" : "", isSelected ? "text-primary font-bold" : ""].join(" ")}>
                  {format(day, "d")}
                </span>
                {count > 0 && isCurrentMonth && (() => {
                  const status = appts[0].status;
                  const color = status === "completed" || status === "confirmed" ? "bg-green-500 text-white" : status === "cancelled" || status === "no_show" ? "bg-red-500 text-white" : "bg-blue-500 text-white";
                  return (
                    <span className={`absolute bottom-1 right-1 text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm ${color}`}>{count}</span>
                  );
                })()}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Scheduled</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Completed/Confirmed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Cancelled/No-show</span>
        </div>
      </div>
      <div className="sticky top-4">
        <div className="border border-border/60 rounded-xl bg-card/60 backdrop-blur-sm p-4 min-h-[300px]">
          {selectedDay ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">{format(selectedDay, "EEEE, d MMMM yyyy")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedAppts.length === 0 ? "No appointments" : `${selectedAppts.length} appointment${selectedAppts.length > 1 ? "s" : ""}`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDay(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {selectedAppts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No appointments scheduled for this day.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                  {selectedAppts.map((appt) => (
                    <div key={appt.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-background/60 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">{appt.patient_name ?? "Unknown Patient"}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_STYLES[appt.status] ?? "border-border text-muted-foreground"}`}>
                            {statusLabel(appt.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{appt.start_time}{appt.duration_minutes ? ` · ${appt.duration_minutes} min` : ""}</span>
                          {appt.psychologist_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{appt.psychologist_name}</span>}
                        </div>
                        {appt.purpose && <p className="text-xs text-muted-foreground/80 truncate">{appt.purpose}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-center text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mb-3 opacity-20" />
              <h3 className="font-semibold text-foreground mb-1">Select a Day</h3>
              <p className="text-sm max-w-[250px]">Click on any day in the calendar to view its scheduled appointments.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

export function ClinicAppointmentsPage() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const navigate = useNavigate();
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;

  // Data
  const [appointments, setAppointments] = useState<AppointmentAdmin[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deletingAppointment, setDeletingAppointment] = useState<AppointmentAdmin | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State for Add
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");

  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");

  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients;
    const q = patientSearchQuery.trim().toLowerCase();
    return patients.filter((p) => {
      const name = `${p.first_name} ${p.last_name || ""}`.toLowerCase();
      const phone = p.phone_number?.toLowerCase() || "";
      const email = p.email?.toLowerCase() || "";
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [patients, patientSearchQuery]);

  const filteredStaffList = useMemo(() => {
    if (!staffSearchQuery.trim()) return staffList;
    const q = staffSearchQuery.trim().toLowerCase();
    return staffList.filter(s => {
      const name = `${s.first_name} ${s.last_name || ""}`.toLowerCase();
      const email = s.email?.toLowerCase() || "";
      return name.includes(q) || email.includes(q);
    });
  }, [staffList, staffSearchQuery]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "patient_name" | "duration" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    isItemSelected,
    exportSelectedToPDF,
    exportSelectedToExcel,
  } = useBulkSelection<AppointmentAdmin>();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        getClinicAppointments(),
        apiClient.get("/patients"),
        getStaff()
      ]);

      if (results[0].status === "fulfilled") {
        setAppointments(results[0].value);
      } else {
        setError(results[0].reason?.response?.data?.detail || "Failed to load appointments.");
      }

      if (results[1].status === "fulfilled") {
        setPatients(results[1].value.data);
      } else {
        toast.error("Failed to load patients for dropdown.");
      }

      if (results[2].status === "fulfilled") {
        setStaffList(results[2].value);
      } else {
        toast.error("Failed to load staff for dropdown.");
      }

    } catch (err: any) {
      setError(err?.response?.data?.detail || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side filter + paginate
  const filtered = useMemo(() => {
    let list = [...appointments];
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.patient_name?.toLowerCase().includes(q) ||
          a.psychologist_name?.toLowerCase().includes(q) ||
          a.purpose?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "patient_name") {
        const nameA = a.patient_name || "";
        const nameB = b.patient_name || "";
        cmp = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
      } else if (sortBy === "duration") {
        cmp = (a.duration_minutes || 0) - (b.duration_minutes || 0);
      } else if (sortBy === "status") {
        cmp = a.status.localeCompare(b.status);
      } else {
        // Default to date and time
        const dtA = `${a.appointment_date || ""}T${a.start_time || "00:00"}`;
        const dtB = `${b.appointment_date || ""}T${b.start_time || "00:00"}`;
        cmp = dtA.localeCompare(dtB);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [appointments, statusFilter, searchQuery, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleReset = () => {
    setStatusFilter("all");
    setSearchQuery("");
    setSortBy("date");
    setSortDir("desc");
    if (page !== 1) navigate("/clinic/appointments");
  };

  const handleSchedule = async () => {
    if (!selectedPatientId || !date || !time) {
      toast.error("Patient, Date and Time are required.");
      return;
    }
    try {
      await createAppointment({
        patient_id: selectedPatientId,
        psychologist_id: selectedStaffId === "none" ? undefined : selectedStaffId || undefined,
        appointment_date: date,
        start_time: time,
        duration_minutes: duration,
        purpose: reason,
        notes: notes
      });
      toast.success("Appointment scheduled.");
      setIsAddOpen(false);
      loadData();
      // reset form
      setSelectedPatientId("");
      setSelectedStaffId("");
      setDate("");
      setTime("");
      setDuration(60);
      setReason("");
      setNotes("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to schedule appointment");
    }
  };

  const handleDelete = async () => {
    if (!deletingAppointment) return;
    setIsDeleting(true);
    try {
      await deleteAppointment(deletingAppointment.id);
      toast.success("Appointment deleted successfully.");
      setDeletingAppointment(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to delete appointment.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Appointments  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-primary" />
            Appointments
          </h1>
          <p className="text-muted-foreground mt-1">Manage all clinic appointments.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Add Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  New Appointment
                </DialogTitle>
                <DialogDescription>Schedule a new appointment for a patient.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Patient *</Label>
                  <Popover open={isPatientDropdownOpen} onOpenChange={setIsPatientDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isPatientDropdownOpen} className="w-full justify-between bg-background/50 border-primary/15 h-10 font-normal">
                        {selectedPatientId 
                          ? `${patients.find(p => p.id === selectedPatientId)?.first_name} ${patients.find(p => p.id === selectedPatientId)?.last_name || ""}` 
                          : "Select a patient"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input 
                          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" 
                          placeholder="Search patient..." 
                          value={patientSearchQuery}
                          onChange={(e) => setPatientSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        {filteredPatients.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">No patients found.</div>
                        ) : (
                          filteredPatients.map((patient) => (
                            <div 
                              key={patient.id}
                              className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${selectedPatientId === patient.id ? 'bg-accent text-accent-foreground' : ''}`}
                              onClick={() => {
                                setSelectedPatientId(patient.id);
                                setIsPatientDropdownOpen(false);
                                setPatientSearchQuery("");
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 shrink-0 ${selectedPatientId === patient.id ? 'opacity-100' : 'opacity-0'}`} />
                              <div className="flex flex-1 justify-between items-center py-1 overflow-hidden">
                                <div className="flex flex-col items-start text-left min-w-0 pr-2">
                                  <span className="font-medium text-sm truncate w-full">{patient.first_name} {patient.last_name || ""}</span>
                                  <span className="text-xs text-muted-foreground mt-0.5 truncate w-full">
                                    {patient.phone_number || (patient as any).email || "No contact info"}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end text-right shrink-0 ml-2">
                                  <span className="text-xs font-mono text-primary/90 bg-primary/10 px-2 py-0.5 rounded font-medium" title="Patient ID">{patient.id}</span>
                                  {(patient.age || patient.gender) && (
                                    <span className="text-xs text-muted-foreground font-medium mt-1">
                                      {[patient.age ? `${patient.age}y` : null, patient.gender].filter(Boolean).join(" • ")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Assign Staff</Label>
                  <Popover open={isStaffDropdownOpen} onOpenChange={setIsStaffDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isStaffDropdownOpen} className="w-full justify-between bg-background/50 border-primary/15 h-10 font-normal">
                        {selectedStaffId !== "none" && selectedStaffId !== ""
                          ? `${staffList.find(s => s.id === selectedStaffId)?.first_name} ${staffList.find(s => s.id === selectedStaffId)?.last_name || ""}`
                          : "Self / Default"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input 
                          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50" 
                          placeholder="Search staff..." 
                          value={staffSearchQuery}
                          onChange={(e) => setStaffSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-1">
                        <div 
                          className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${selectedStaffId === "none" ? 'bg-accent text-accent-foreground' : ''}`}
                          onClick={() => {
                            setSelectedStaffId("none");
                            setIsStaffDropdownOpen(false);
                            setStaffSearchQuery("");
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${selectedStaffId === "none" ? 'opacity-100' : 'opacity-0'}`} />
                          <div className="flex flex-col items-start text-left py-1">
                            <span className="font-medium text-sm">Self / Default</span>
                          </div>
                        </div>
                        {filteredStaffList.length === 0 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">No staff found.</div>
                        ) : (
                          filteredStaffList.map((s) => (
                            <div 
                              key={s.id}
                              className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${selectedStaffId === s.id ? 'bg-accent text-accent-foreground' : ''}`}
                              onClick={() => {
                                setSelectedStaffId(s.id);
                                setIsStaffDropdownOpen(false);
                                setStaffSearchQuery("");
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${selectedStaffId === s.id ? 'opacity-100' : 'opacity-0'}`} />
                              <div className="flex flex-col items-start text-left py-1">
                                <span className="font-medium text-sm">{s.first_name} {s.last_name || ""}</span>
                                <span className="text-xs text-muted-foreground mt-0.5">{s.email || s.id}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Date *</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-background/50 border-primary/15 h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Time *</Label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-background/50 border-primary/15 h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Duration (min)</Label>
                    <Input type="number" min={15} max={480} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} className="bg-background/50 border-primary/15 h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Purpose</Label>
                    <SearchInput placeholder="E.g. Assessment, Follow-up" value={reason} onChange={(e) => setReason(e.target.value)} onClear={() => setReason("")} className="w-full sm:w-64" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." className="min-h-[80px] bg-background/50 border-primary/15 resize-none" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button onClick={handleSchedule} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {!isSelectionMode && (
            <Button type="button" variant="outline" onClick={toggleSelectionMode}>
              <Check className="h-4 w-4 mr-2" />
              Select
            </Button>
          )}
        </div>
      </div>

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        {/* Selection mode banner OR filters */}
        {isSelectionMode ? (
          <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
            <span className="text-base font-medium text-foreground">
              {selectedItems.size} appointments selected
            </span>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={toggleSelectionMode}>
                Cancel
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="default">Export</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      exportSelectedToPDF({
                        pdfHeader: "Appointments",
                        columns: [
                          { label: "Patient", key: "patient_name" },
                          { label: "Staff", key: "psychologist_name" },
                          { label: "Date", key: "appointment_date" },
                          { label: "Time", key: "start_time" },
                          { label: "Status", key: "status" },
                        ],
                      })
                    }
                  >
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      exportSelectedToExcel(
                        {
                          columns: [
                            { label: "Patient", key: "patient_name" },
                            { label: "Staff", key: "psychologist_name" },
                            { label: "Date", key: "appointment_date" },
                            { label: "Time", key: "start_time" },
                            { label: "Status", key: "status" },
                          ],
                        },
                        "Appointments"
                      )
                    }
                  >
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
              {/* Left Side: Search (if list) */}
              <div className="w-full xl:w-auto">
                {viewMode === "list" && (
                  <SearchInput placeholder="Search patient or staff..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onClear={() => setSearchQuery("")} className="w-full sm:w-64" />
                )}
              </div>

              {/* Right Side: View toggles & Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
                <div className="flex items-center gap-1 bg-primary/5 border border-primary/10 p-1 rounded-lg shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={viewMode === "list" ? "bg-primary/10 text-primary hover:bg-primary/20 shadow-none h-8" : "text-muted-foreground hover:text-primary h-8"}
                  >
                    <List className="mr-2 h-4 w-4" /> List View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("calendar")}
                    className={viewMode === "calendar" ? "bg-primary/10 text-primary hover:bg-primary/20 shadow-none h-8" : "text-muted-foreground hover:text-primary h-8"}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" /> Calendar View
                  </Button>
                </div>

                {viewMode === "list" && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="mr-2 h-4 w-4" /> Filter
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-72 p-4">
                        <div className="grid gap-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h4 className="font-medium leading-none">Filter &amp; Sort</h4>
                              <p className="text-sm text-muted-foreground">Adjust filters and sorting options.</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 text-muted-foreground hover:text-foreground -mt-1 -mr-1">
                              <RotateCcw className="mr-2 h-3 w-3" /> Reset
                            </Button>
                          </div>
                          <div className="grid gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                              <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full h-9">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Status</SelectItem>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="confirmed">Confirmed</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                  <SelectItem value="no_show">No Show</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort by</Label>
                              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                                <SelectTrigger className="w-full h-9">
                                  <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="patient_name">Patient Name</SelectItem>
                                  <SelectItem value="date">Date &amp; Time</SelectItem>
                                  <SelectItem value="duration">Duration</SelectItem>
                                  <SelectItem value="status">Status</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direction</Label>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={sortDir === "asc" ? "default" : "outline"}
                                  size="sm"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() => setSortDir("asc")}
                                >
                                  Ascending
                                </Button>
                                <Button
                                  type="button"
                                  variant={sortDir === "desc" ? "default" : "outline"}
                                  size="sm"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() => setSortDir("desc")}
                                >
                                  Descending
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
        )}

        <CardContent className="p-0">
          {viewMode === "list" ? (
            <>
              <Table className="max-md:block">
                <TableHeader className="max-md:hidden">
                  <TableRow className="hover:bg-transparent">
                    {isSelectionMode && (
                      <TableHead className="w-12 text-center">
                        <Checkbox
                          checked={
                            paginated.length > 0 &&
                            paginated.every((a) => isItemSelected(a.id))
                          }
                          onCheckedChange={() =>
                            toggleAllOnPage(
                              paginated,
                              paginated.every((a) => isItemSelected(a.id))
                            )
                          }
                        />
                      </TableHead>
                    )}
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="max-md:block">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                        {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patient Name</span><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Staff Name</span><Skeleton className="h-5 w-28" /></TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Purpose</span><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date &amp; Time</span><Skeleton className="h-5 w-36" /></TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Duration</span><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow className="max-md:block">
                      <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-40 text-center text-destructive max-md:block max-md:py-8">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>{error}</p>
                        <Button variant="outline" size="sm" onClick={loadData} className="mt-4 text-foreground">
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : paginated.length === 0 ? (
                    <TableRow className="max-md:block">
                      <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-48 text-center max-md:block max-md:py-8">
                        <CalendarIcon className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-lg font-medium text-muted-foreground">No appointments yet</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">Scheduled appointments will appear here.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((appt) => (
                      <TableRow key={appt.id} className="hover:bg-muted/30 max-md:block max-md:p-4 max-md:border-b max-md:relative">
                        {isSelectionMode && (
                          <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                            <Checkbox
                              checked={isItemSelected(appt.id)}
                              onCheckedChange={() => toggleItemSelection(appt)}
                            />
                          </TableCell>
                        )}
                        <TableCell className={cn("py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patient Name</span>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {(appt.patient_name ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 pr-2 max-md:text-right">
                              <p className="text-sm font-bold truncate text-foreground">{appt.patient_name ?? "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Staff Name</span>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{appt.psychologist_name ?? "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-sm text-muted-foreground max-w-[140px] max-md:max-w-none max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Purpose</span>
                          <span className="truncate block">{appt.purpose ?? "—"}</span>
                        </TableCell>
                        <TableCell className="py-2 text-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date &amp; Time</span>
                          {formatApptDateTime(appt.appointment_date, appt.start_time)}
                        </TableCell>
                        <TableCell className="py-2 text-sm text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Duration</span>
                          {appt.duration_minutes ? `${appt.duration_minutes} min` : "—"}
                        </TableCell>
                        <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_STYLES[appt.status] ?? "border-border text-muted-foreground"}`}
                          >
                            {statusLabel(appt.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                          <div className="flex items-center justify-end gap-2">
                            <InteractiveHoverButton
                              onClick={() => navigate(`/clinic/appointments/${appt.id}`)}
                              className="text-xs h-8 py-0 px-4"
                            >
                              Details
                            </InteractiveHoverButton>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                              onClick={() => setDeletingAppointment(appt)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          ) : isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-3">
              <div className="grid grid-cols-7 gap-1 w-full max-w-2xl mx-auto">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-destructive flex flex-col items-center gap-2">
              <AlertTriangle className="h-10 w-10 opacity-50" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={loadData} className="mt-2 text-foreground">
                Retry
              </Button>
            </div>
          ) : (
            <CalendarView appointments={appointments} />
          )}
        </CardContent>
      </Card>

      {/* Pagination footer */}
      {viewMode === "list" && totalPages >= 0 && (
        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            {isLoading ? (
              "Loading..."
            ) : filtered.length === 0 ? (
              <>Showing <span className="font-medium text-foreground">0</span> to <span className="font-medium text-foreground">0</span> of <span className="font-medium text-foreground">0</span> appointments</>
            ) : (
              <>
                Showing <span className="font-medium text-foreground">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}</span> to <span className="font-medium text-foreground">{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span> appointments
              </>
            )}
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    navigate(
                      page > 2 ? `/clinic/appointments/page/${page - 1}` : `/clinic/appointments`
                    )
                  }
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (
                  totalPages > 7 &&
                  (pageNum < page - 2 || pageNum > page + 2) &&
                  pageNum !== 1 &&
                  pageNum !== totalPages
                ) {
                  if (pageNum === page - 3 || pageNum === page + 3) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }
                  return null;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => navigate(pageNum === 1 ? `/clinic/appointments` : `/clinic/appointments/page/${pageNum}`)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => navigate(`/clinic/appointments/page/${page + 1}`)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAppointment} onOpenChange={(o) => !o && setDeletingAppointment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment for <strong>{deletingAppointment?.patient_name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
