import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Pencil,
  Trash2,
  Filter,
  List,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  AlertTriangle,
  X,
  Phone,
  ChevronsUpDown,
  Search
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
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
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { cn, maskPhoneNumber } from "@/lib/utils";

import { apiClient } from "@/services/apiClient";
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/services/appointmentService";
import type { Appointment, AppointmentCreate, AppointmentUpdate } from "@/services/appointmentService";
import { useBulkSelection } from "@/hooks/useBulkSelection";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  confirmed: "border-green-500/30 text-green-400 bg-green-500/10",
  completed: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  cancelled: "border-red-500/30 text-red-400 bg-red-500/10",
  no_show: "border-orange-500/30 text-orange-400 bg-orange-500/10",
  pending: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
};

function statusLabel(status: string) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatApptDateTime(date: string, time: string) {
  if (!date) return "—";
  try {
    const dt = parseISO(`${date}T${time || "00:00"}`);
    return format(dt, "d MMM yyyy, h:mm a");
  } catch {
    return `${date} ${time || ""}`;
  }
}

interface PatientRecord {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
}

interface CalendarViewProps {
  appointments: Appointment[];
  getPatientName: (id: string) => string;
}

function CalendarView({ appointments, getPatientName }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const apptsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
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
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
              {d}
            </div>
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
                  isSelected
                    ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                    : isTodayDay
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/40 hover:border-primary/30 hover:bg-muted/50",
                ].join(" ")}
              >
                <span
                  className={[
                    "text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full",
                    isTodayDay && !isSelected ? "bg-primary text-primary-foreground" : "",
                    isSelected ? "text-primary font-bold" : "",
                  ].join(" ")}
                >
                  {format(day, "d")}
                </span>
                {count > 0 && isCurrentMonth && (() => {
                  const status = appts[0].status;
                  const color =
                    status === "completed" || status === "confirmed"
                      ? "bg-green-500 text-white"
                      : status === "cancelled" || status === "no_show"
                        ? "bg-red-500 text-white"
                        : "bg-blue-500 text-white";

                  return (
                    <span className={`absolute bottom-1 right-1 text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 shadow-sm ${color}`}>
                      {count}
                    </span>
                  );
                })()}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Scheduled
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Completed/Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Cancelled/No-show
          </span>
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
                  {selectedAppts.map((appt) => {
                    const pName = getPatientName(appt.patient_id);
                    return (
                      <div key={appt.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-background/60 hover:bg-muted/40 transition-colors">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {(pName ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-sm text-foreground truncate">
                              {pName ?? "Unknown Patient"}
                            </span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_STYLES[appt.status] ?? "border-border text-muted-foreground"}`}>
                              {statusLabel(appt.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {appt.start_time}
                              {appt.duration_minutes ? ` · ${appt.duration_minutes} min` : ""}
                            </span>
                          </div>
                          {appt.purpose && (
                            <p className="text-xs text-muted-foreground/80 truncate">{appt.purpose}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
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

const PAGE_SIZE = 30;

export function AppointmentsPage() {
  const navigate = useNavigate();
  const { pageId } = useParams();
  const currentPage = parseInt(pageId as string, 10) || 1;
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "patient_name" | "duration" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<AppointmentCreate>({
    patient_id: "",
    appointment_date: "",
    start_time: "",
    duration_minutes: 60,
    purpose: "",
    notes: "",
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editForm, setEditForm] = useState<AppointmentUpdate>({});

  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null);

  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");

  const { data: rawAppointments = [], isLoading, error } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => getAppointments(),
  });

  const { data: patients = [] } = useQuery<PatientRecord[]>({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const { data } = await apiClient.get<PatientRecord[]>("/patients");
      return data;
    },
  });

  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients;
    const q = patientSearchQuery.trim().toLowerCase();
    return patients.filter((p) => {
      const name = `${p.first_name} ${p.last_name || ""}`.toLowerCase();
      const phone = p.phone_number?.toLowerCase() || "";
      const email = (p as any).email?.toLowerCase() || "";
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [patients, patientSearchQuery]);

  const createMutation = useMutation({
    mutationFn: (payload: AppointmentCreate) => createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment created successfully.");
      setIsCreateOpen(false);
      setForm({ patient_id: "", appointment_date: "", start_time: "", duration_minutes: 60, purpose: "", notes: "" });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to create appointment.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AppointmentUpdate }) => updateAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment updated.");
      setIsEditOpen(false);
      setEditingAppointment(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to update appointment.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment deleted.");
      setDeletingAppointment(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to delete appointment.");
    },
  });

  const getPatientName = useCallback((patientId: string) => {
    const p = patients.find((pt) => pt.id === patientId);
    if (!p) return patientId;
    return [p.first_name, p.last_name].filter(Boolean).join(" ") || patientId;
  }, [patients]);

  const getPatientPhone = (patientId: string) => {
    const p = patients.find((pt) => pt.id === patientId);
    return p?.phone_number || "-";
  };

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    isItemSelected,
    exportSelectedToPDF,
    exportSelectedToExcel,
  } = useBulkSelection<Appointment>();

  const filteredAppointments = useMemo(() => {
    let list = [...rawAppointments];

    if (filterStatus !== "all") {
      list = list.filter((a) => a.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((a) => {
        const pName = getPatientName(a.patient_id).toLowerCase();
        return pName.includes(q) || (a.purpose && a.purpose.toLowerCase().includes(q));
      });
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "patient_name") {
        const nameA = getPatientName(a.patient_id);
        const nameB = getPatientName(b.patient_id);
        cmp = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
      } else if (sortBy === "duration") {
        cmp = (a.duration_minutes || 0) - (b.duration_minutes || 0);
      } else if (sortBy === "status") {
        cmp = (a.status || "").localeCompare(b.status || "");
      } else {
        const dtA = `${a.appointment_date}T${a.start_time || "00:00"}`;
        const dtB = `${b.appointment_date}T${b.start_time || "00:00"}`;
        cmp = dtA.localeCompare(dtB);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [rawAppointments, filterStatus, searchQuery, sortBy, sortDir, getPatientName]);

  const totalItems = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleResetFilters = () => {
    setFilterStatus("all");
    setSearchQuery("");
    setSortBy("date");
    setSortDir("desc");
    if (currentPage !== 1) navigate("/appointments");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id || !form.appointment_date || !form.start_time) {
      toast.error("Please fill in patient, date, and time.");
      return;
    }
    createMutation.mutate(form);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAppointment) return;
    updateMutation.mutate({ id: editingAppointment.id, payload: editForm });
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Appointments | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <CalendarIcon className="h-7 w-7 text-primary" />
            Appointments
          </h1>
          <p className="text-muted-foreground mt-1">Manage your schedule and patient appointments.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                <DialogDescription>Schedule an appointment with a patient.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Patient *</Label>
                  <Popover open={isPatientDropdownOpen} onOpenChange={setIsPatientDropdownOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isPatientDropdownOpen} className="w-full justify-between bg-background/50 border-primary/15 h-10 font-normal">
                        {form.patient_id
                          ? `${patients.find(p => p.id === form.patient_id)?.first_name} ${patients.find(p => p.id === form.patient_id)?.last_name || ""}`
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
                              className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${form.patient_id === patient.id ? 'bg-accent text-accent-foreground' : ''}`}
                              onClick={() => {
                                setForm({ ...form, patient_id: patient.id });
                                setIsPatientDropdownOpen(false);
                                setPatientSearchQuery("");
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 shrink-0 ${form.patient_id === patient.id ? 'opacity-100' : 'opacity-0'}`} />
                              <div className="flex flex-1 justify-between items-center py-1 overflow-hidden">
                                <div className="flex flex-col items-start text-left min-w-0 pr-2">
                                  <span className="font-medium text-sm truncate w-full">{patient.first_name} {patient.last_name || ""}</span>
                                  <span className="text-xs text-muted-foreground mt-0.5 truncate w-full">
                                    {patient.phone_number || (patient as any).email || "No contact info"}
                                  </span>
                                </div>
                                <div className="flex flex-col items-end text-right shrink-0 ml-2">
                                  <span className="text-xs font-mono text-primary/90 bg-primary/10 px-2 py-0.5 rounded font-medium" title="Patient ID">{patient.id}</span>
                                  {(patient as any).age && (
                                    <span className="text-xs text-muted-foreground font-medium mt-1">
                                      {(patient as any).age}y
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Date *</Label>
                    <Input
                      type="date"
                      value={form.appointment_date}
                      onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                      className="bg-background/50 border-primary/15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Time *</Label>
                    <Input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="bg-background/50 border-primary/15"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Duration (min)</Label>
                    <Input
                      type="number"
                      min={15}
                      max={480}
                      value={form.duration_minutes}
                      onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })}
                      className="bg-background/50 border-primary/15"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Purpose</Label>
                    <Input
                      value={form.purpose || ""}
                      onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                      placeholder="e.g. Follow-up"
                      className="bg-background/50 border-primary/15"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Notes</Label>
                  <Textarea
                    value={form.notes || ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="min-h-[80px] bg-background/50 border-primary/15 resize-none"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create</>}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {!isSelectionMode && (
            <Button type="button" variant="outline" onClick={toggleSelectionMode}>
              <Check className="h-4 w-4 mr-2" /> Select
            </Button>
          )}
        </div>
      </div>

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />

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
                          { label: "Patient", key: (a) => getPatientName(a.patient_id) },
                          { label: "Date", key: "appointment_date" },
                          { label: "Time", key: "start_time" },
                          { label: "Purpose", key: "purpose" },
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
                            { label: "Patient", key: (a) => getPatientName(a.patient_id) },
                            { label: "Date", key: "appointment_date" },
                            { label: "Time", key: "start_time" },
                            { label: "Purpose", key: "purpose" },
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
              <div className="w-full xl:w-auto">
                {viewMode === "list" && (
                  <SearchInput placeholder="Search patient or purpose..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onClear={() => setSearchQuery("")} className="w-full sm:w-64" />
                )}
              </div>

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
                              <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-8 px-2 text-muted-foreground hover:text-foreground -mt-1 -mr-1">
                                <RotateCcw className="mr-2 h-3 w-3" /> Reset
                              </Button>
                            </div>
                          <div className="grid gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                              <Select value={filterStatus} onValueChange={setFilterStatus}>
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
            <Table className="max-md:block">
              <TableHeader className="max-md:hidden">
                <TableRow className="hover:bg-transparent">
                  {isSelectionMode && (
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={paginatedAppointments.length > 0 && paginatedAppointments.every((a) => isItemSelected(a.id))}
                        onCheckedChange={() => toggleAllOnPage(paginatedAppointments, paginatedAppointments.every((a) => isItemSelected(a.id)))}
                      />
                    </TableHead>
                  )}
                  <TableHead className="font-semibold">Patient Name</TableHead>
                  <TableHead className="font-semibold">Phone</TableHead>
                  <TableHead className="font-semibold">Purpose</TableHead>
                  <TableHead className="font-semibold">Date &amp; Time</TableHead>
                  <TableHead className="font-semibold">Duration</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                      {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Patient:</span>
                        <Skeleton className="h-5 w-32" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Phone:</span>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Purpose:</span>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Date:</span>
                        <Skeleton className="h-5 w-36" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Duration:</span>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Status:</span>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none max-md:mt-2">
                        <span className="md:hidden font-semibold text-muted-foreground">Actions:</span>
                        <Skeleton className="h-8 w-20" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-40 text-center text-destructive max-md:block max-md:py-8">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Error loading appointments</p>
                    </TableCell>
                  </TableRow>
                ) : paginatedAppointments.length === 0 ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-48 text-center max-md:block max-md:py-8">
                      <CalendarIcon className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-lg font-medium text-muted-foreground">No appointments found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAppointments.map((appt) => {
                    const pName = getPatientName(appt.patient_id);
                    return (
                      <TableRow key={appt.id} className="hover:bg-muted/30 group max-md:block max-md:p-4 max-md:border-b max-md:relative">
                        {isSelectionMode && (
                          <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                            <Checkbox checked={isItemSelected(appt.id)} onCheckedChange={() => toggleItemSelection(appt)} />
                          </TableCell>
                        )}
                        <TableCell className={cn("py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patient Name</span>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {(pName ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 pr-2">
                              <p className="text-sm font-bold truncate text-foreground">{pName}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Phone</span>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{maskPhoneNumber(getPatientPhone(appt.patient_id))}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-sm text-muted-foreground max-w-[140px] max-md:max-w-none max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Purpose</span>
                          <span className="truncate block max-md:text-right">{appt.purpose ?? "—"}</span>
                        </TableCell>
                        <TableCell className="py-2 text-sm max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date & Time</span>
                          <span className="max-md:text-right">{formatApptDateTime(appt.appointment_date, appt.start_time)}</span>
                        </TableCell>
                        <TableCell className="py-2 text-sm text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Duration</span>
                          {appt.duration_minutes ? `${appt.duration_minutes} min` : "—"}
                        </TableCell>
                        <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</span>
                          <Badge variant="outline" className={`text-xs ${STATUS_STYLES[appt.status] ?? "border-border text-muted-foreground"}`}>
                            {statusLabel(appt.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                          <div className="flex items-center justify-end gap-2">
                            <InteractiveHoverButton
                              onClick={() => navigate('/clinic-staff/appointments/' + appt.id)}
                              className="text-xs h-8 py-0 px-4"
                            >
                              Details
                            </InteractiveHoverButton>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/20 hover:bg-destructive/10"
                              onClick={() => setDeletingAppointment(appt)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          ) : (
            <CalendarView appointments={rawAppointments} getPatientName={getPatientName} />
          )}
        </CardContent>
      </Card>

      {viewMode === "list" && totalPages >= 0 && (
        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            {isLoading ? "Loading..." : filteredAppointments.length === 0 ? (
              <>Showing <span className="font-medium text-foreground">0</span> to <span className="font-medium text-foreground">0</span> of <span className="font-medium text-foreground">0</span> appointments</>
            ) : (
              <>Showing <span className="font-medium text-foreground">{Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredAppointments.length)}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * PAGE_SIZE, filteredAppointments.length)}</span> of <span className="font-medium text-foreground">{filteredAppointments.length}</span> appointments</>
            )}
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => navigate(currentPage > 2 ? `/appointments/page/${currentPage - 1}` : `/appointments`)}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (totalPages > 7 && (pageNum < currentPage - 2 || pageNum > currentPage + 2) && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                    return <PaginationItem key={pageNum}><PaginationEllipsis /></PaginationItem>;
                  }
                  return null;
                }
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink onClick={() => navigate(pageNum === 1 ? `/appointments` : `/appointments/page/${pageNum}`)} isActive={currentPage === pageNum} className="cursor-pointer">
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext onClick={() => navigate(`/appointments/page/${currentPage + 1}`)} className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Appointment
            </DialogTitle>
            <DialogDescription>Update the appointment details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Date</Label>
                <Input type="date" value={editForm.appointment_date || ""} onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })} className="bg-background/50 border-primary/15" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Time</Label>
                <Input type="time" value={editForm.start_time || ""} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} className="bg-background/50 border-primary/15" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Duration (min)</Label>
                <Input type="number" min={15} max={480} value={editForm.duration_minutes ?? ""} onChange={(e) => setEditForm({ ...editForm, duration_minutes: parseInt(e.target.value) || 60 })} className="bg-background/50 border-primary/15" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Status</Label>
                <Select value={editForm.status || ""} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="bg-background/50 border-primary/15"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Purpose</Label>
              <Input value={editForm.purpose || ""} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })} placeholder="e.g. Follow-up" className="bg-background/50 border-primary/15" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground/80 font-bold text-xs uppercase tracking-wider">Notes</Label>
              <Textarea value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Additional notes..." className="min-h-[80px] bg-background/50 border-primary/15 resize-none" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingAppointment} onOpenChange={(o) => !o && setDeletingAppointment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment for <strong>{deletingAppointment && getPatientName(deletingAppointment.patient_id)}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAppointment && deleteMutation.mutate(deletingAppointment.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
