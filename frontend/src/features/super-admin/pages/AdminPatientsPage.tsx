import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Filter, RotateCcw, Users, AlertTriangle, Building2, User, Check, HeartPulse } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchAdminPatients, type AdminPatient, type UserFilters } from "@/features/super-admin/services/adminService";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dateFormat";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { cn, maskPhoneNumber } from "@/lib/utils";

export function AdminPatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [total, setTotal] = useState(0);
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");

  // Add Patient form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [background, setBackground] = useState("");
  const [livingEnvironment, setLivingEnvironment] = useState("");
  const [livingCondition, setLivingCondition] = useState("");
  const [familyStructure, setFamilyStructure] = useState("");
  const [environmentType, setEnvironmentType] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [occupation, setOccupation] = useState("");
  const [socioeconomicStatus, setSocioeconomicStatus] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  const handleAddPatient = async () => {
    if (!name || !lastName || !phone || !gender || !dob) {
      toast.error("Please provide First Name, Last Name, Phone Number, Gender, and Date of Birth.");
      return;
    }

    try {
      await apiClient.post("/patients", {
        patient_type: "new",
        first_name: name,
        last_name: lastName || undefined,
        phone_number: phone || undefined,
        email: email || undefined,
        gender: gender || undefined,
        date_of_birth: dob || undefined,
        background: background || undefined,
        living_environment: livingEnvironment || undefined,
        living_condition: livingCondition || undefined,
        family_structure: familyStructure || undefined,
        environment_type: environmentType || undefined,
        education_level: educationLevel || undefined,
        occupation: occupation || undefined,
        socioeconomic_status: socioeconomicStatus || undefined,
        clinical_notes: clinicalNotes || undefined,
      });

      toast.success("Patient added successfully");
      setIsAddOpen(false);
      loadPatients();

      // Reset form
      setName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setGender("");
      setDob("");
      setBackground("");
      setLivingEnvironment("");
      setLivingCondition("");
      setFamilyStructure("");
      setEnvironmentType("");
      setEducationLevel("");
      setOccupation("");
      setSocioeconomicStatus("");
      setClinicalNotes("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to add patient");
    }
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
  } = useBulkSelection<AdminPatient>();

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: UserFilters = {
        page,
        page_size: pageSize,
        patient_type: "patient"
      };
      if (search.trim()) filters.search = search.trim();

      const res = await fetchAdminPatients(filters);
      setPatients(res.patients);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load patients.");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Handle Search Input (debounced slightly by natural typing, but we can just use enter/blur for simplicity or a manual filter button)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (page !== 1) navigate('/admin/patients');
    else loadPatients();
  };

  const handleReset = () => {
    setSearch("");
    if (page !== 1) navigate('/admin/patients');
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Patient Management  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <HeartPulse className="h-7 w-7 text-primary" />
            Patient Management
          </h1>
          <p className="text-muted-foreground mt-1">View and manage all patients across the platform.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isSelectionMode && (
            <>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> Add Patient
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Patient</DialogTitle>
                    <DialogDescription>
                      Enter the details of the new patient to add them to the system.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-5 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">First Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First Name" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+910987654321" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="background">Background (optional)</Label>
                      <Textarea id="background" value={background} onChange={(e) => setBackground(e.target.value)} placeholder="Brief background..." className="resize-y" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="livingEnvironment">Living Environment (optional)</Label>
                      <Textarea id="livingEnvironment" value={livingEnvironment} onChange={(e) => setLivingEnvironment(e.target.value)} placeholder="Living environment details..." className="resize-y" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="livingCondition">Living Condition (optional)</Label>
                        <Select value={livingCondition} onValueChange={setLivingCondition}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="With Family">With Family</SelectItem>
                            <SelectItem value="Alone">Alone</SelectItem>
                            <SelectItem value="Shared/Hostel">Shared/Hostel</SelectItem>
                            <SelectItem value="Homeless/Temporary">Homeless/Temporary</SelectItem>
                            <SelectItem value="Institutional/Foster">Institutional/Foster</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="familyStructure">Family Structure (optional)</Label>
                        <Select value={familyStructure} onValueChange={setFamilyStructure}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Nuclear">Nuclear</SelectItem>
                            <SelectItem value="Joint/Extended">Joint/Extended</SelectItem>
                            <SelectItem value="Single Parent">Single Parent</SelectItem>
                            <SelectItem value="Guardian/Foster">Guardian/Foster</SelectItem>
                            <SelectItem value="No Family">No Family</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="environmentType">Environment Type (optional)</Label>
                        <Select value={environmentType} onValueChange={setEnvironmentType}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Highly Supportive">Highly Supportive</SelectItem>
                            <SelectItem value="Moderately Supportive">Moderately Supportive</SelectItem>
                            <SelectItem value="Pressured">Pressured</SelectItem>
                            <SelectItem value="Conflict/Trauma">Conflict/Trauma</SelectItem>
                            <SelectItem value="Isolated">Isolated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="educationLevel">Education Level (optional)</Label>
                        <Select value={educationLevel} onValueChange={setEducationLevel}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Uneducated">Uneducated</SelectItem>
                            <SelectItem value="Primary">Primary</SelectItem>
                            <SelectItem value="Secondary">Secondary</SelectItem>
                            <SelectItem value="Higher Secondary">Higher Secondary</SelectItem>
                            <SelectItem value="Graduate">Graduate</SelectItem>
                            <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                            <SelectItem value="Doctorate">Doctorate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="occupation">Occupation (optional)</Label>
                        <Input id="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Student, Engineer" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="socioeconomicStatus">Socioeconomic Status (optional)</Label>
                        <Select value={socioeconomicStatus} onValueChange={setSocioeconomicStatus}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Upper Middle">Upper Middle</SelectItem>
                            <SelectItem value="Middle">Middle</SelectItem>
                            <SelectItem value="Lower Middle">Lower Middle</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="clinicalNotes">Clinical Notes (optional)</Label>
                      <Textarea id="clinicalNotes" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Any preliminary clinical notes..." className="resize-y" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddPatient}>Save Patient</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                type="button"
                variant="outline"
                onClick={toggleSelectionMode}
              >
                <Check className="h-4 w-4 mr-2" />
                Select
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="border-primary/10 bg-background/50 backdrop-blur-sm relative overflow-hidden pb-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
        {isSelectionMode ? (
          <div className="flex items-center justify-between p-4 bg-primary/10 border-b border-primary/20">
            <span className="text-base font-medium text-foreground">
              {selectedItems.size} patients selected
            </span>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={toggleSelectionMode}>
                Cancel
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="default">
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "All Patients", columns: [ { label: "Patient ID", key: "id" }, { label: "Name", key: (p: any) => [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id }, { label: "Contact Info", key: (p: any) => [p.phone_number, p.email].filter(Boolean).join(" | ") || "—" }, { label: "Gender", key: (p: any) => p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1).toLowerCase() : "—" }, { label: "Age", key: "age" } ] })}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [ { label: "Patient ID", key: "id" }, { label: "Name", key: (p: any) => [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id }, { label: "Contact Info", key: (p: any) => [p.phone_number, p.email].filter(Boolean).join(" | ") || "—" }, { label: "Gender", key: (p: any) => p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1).toLowerCase() : "—" }, { label: "Age", key: "age" } ] }, "Patients")}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <form onSubmit={handleSearchSubmit} className="flex w-full max-w-sm items-center space-x-2">
                <SearchInput placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} onClear={() => setSearch("")} />
              </form>
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
                          <p className="text-sm text-muted-foreground">Adjust filters for patients.</p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 text-xs">
                          <RotateCcw className="mr-2 h-3 w-3" /> Reset
                        </Button>
                      </div>
                      <div className="grid gap-3">
                        <Select defaultValue="all">
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Genders</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className="p-0">
          <Table className="max-md:block">
            <TableHeader className="max-md:hidden">
              <TableRow className="hover:bg-transparent">
                {isSelectionMode && (
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={patients.length > 0 && patients.every(p => isItemSelected(p.id))}
                      onCheckedChange={() => toggleAllOnPage(patients, patients.every(p => isItemSelected(p.id)))}
                    />
                  </TableHead>
                )}
                <TableHead>Patient Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Demographics</TableHead>
                <TableHead>Registered Under</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                    {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Name:</span>
                      <Skeleton className="h-8 w-32" />
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Contact:</span>
                      <div className="flex flex-col gap-1.5 max-md:items-end">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground">Demographics:</span><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground">Registered Under:</span><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground">Sessions:</span><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground">Registered:</span><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none max-md:mt-2"><span className="md:hidden font-semibold text-muted-foreground">Actions:</span><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-32 text-center text-destructive max-md:block max-md:py-8">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{error}</p>
                    <Button variant="outline" size="sm" onClick={loadPatients} className="mt-4 text-foreground">
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-48 text-center max-md:block max-md:py-8">
                    <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No patients found</p>
                    {search && (
                      <Button variant="link" onClick={handleReset} className="mt-2">
                        Clear search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow key={patient.id} className="max-md:block max-md:p-4 max-md:border-b max-md:relative">
                    {isSelectionMode && (
                      <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                        <Checkbox
                          checked={isItemSelected(patient.id)}
                          onCheckedChange={() => toggleItemSelection(patient)}
                        />
                      </TableCell>
                    )}
                    <TableCell className={cn("py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patient Name</span>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {patient.first_name ? patient.first_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 pr-2 max-md:text-right">
                          <p className="text-sm font-semibold truncate text-foreground">{patient.first_name} {patient.last_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact</span>
                      <div className="flex flex-col gap-0.5 max-md:items-end">
                        {patient.phone_number && (
                          <span className="text-sm font-medium text-foreground">
                            {maskPhoneNumber(patient.phone_number)}
                          </span>
                        )}
                        {patient.email && (
                          <span className="text-xs text-muted-foreground">
                            {patient.email}
                          </span>
                        )}
                        {!patient.phone_number && !patient.email && (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Demographics</span>
                      <div className="text-sm max-md:text-right">
                        {patient.gender ? <span className="capitalize">{patient.gender}</span> : <span className="text-muted-foreground">-</span>}
                        {patient.age ? <span className="text-muted-foreground ml-2">({patient.age} y/o)</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Registered Under</span>
                      <div className="flex items-center text-xs max-md:justify-end">
                        {patient.provider_name ? (
                          <>
                            <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground truncate max-w-[150px]" title={patient.provider_name}>{patient.provider_name}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-sm font-medium max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Sessions</span>
                      <div className="max-md:bg-primary/10 max-md:text-primary max-md:px-2 max-md:py-0.5 max-md:rounded-full max-md:font-bold">
                        {patient.total_sessions}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Registered</span>
                      {formatDate(patient.created_at)}
                    </TableCell>
                    <TableCell className="py-2 text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                      <InteractiveHoverButton
                        onClick={() => navigate(`/admin/patients/${patient.id}/details`)}
                        className="text-xs h-8 py-0 px-4"
                      >
                        Details
                      </InteractiveHoverButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

      </Card>

      {/* Pagination */}
      {totalPages >= 0 && !isLoading && !error && (
        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-foreground">{total}</span> patients
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => navigate(page > 2 ? `/admin/patients/page/${page - 1}` : `/admin/patients`)}
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
                      onClick={() => navigate(pageNum === 1 ? `/admin/patients` : `/admin/patients/page/${pageNum}`)}
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
                  onClick={() => navigate(`/admin/patients/page/${page + 1}`)}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}


    </div>
  );
}
