import { useEffect, useState, useMemo } from "react";
import { formatDate } from "@/lib/dateFormat";
import { cn, maskPhoneNumber } from "@/lib/utils";
import { apiClient } from "@/services/apiClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Filter, RotateCcw, ClipboardPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useBulkSelection } from "@/hooks/useBulkSelection";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PatientRecord {
  id: string;
  patient_type: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  age?: number | null;
  gender?: string | null;
  total_sessions: number;
  last_session_date?: string | null;
  created_at?: string | null;
}

export function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pageId } = useParams();
  const currentPage = parseInt(pageId as string, 10) || 1;
  const ITEMS_PER_PAGE = 30;

  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");

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

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleItemSelection,
    toggleAllOnPage,
    exportSelectedToPDF,
    exportSelectedToExcel,
    isItemSelected,
  } = useBulkSelection<PatientRecord>();

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get<PatientRecord[]>("/patients");
      setPatients(data);
    } catch (err) {
      console.error("Failed to fetch patients", err);
      toast.error("Failed to load patients.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

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
      const detail = err?.response?.data?.detail;
      const message = Array.isArray(detail) ? detail[0]?.msg : (detail || "Failed to add patient");
      toast.error(message);
    }
  };

  const filteredPatients = useMemo(() => {
    let result = patients;

    if (filterGender !== "all") {
      result = result.filter(p => {
        if (filterGender === "male") return p.gender?.toLowerCase() === "male";
        if (filterGender === "female") return p.gender?.toLowerCase() === "female";
        if (filterGender === "other") return p.gender && !["male", "female"].includes(p.gender.toLowerCase());
        return true;
      });
    }

    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      result = result.filter((p) => {
        const name = [p.first_name, p.last_name].join(" ").toLowerCase();
        const email = (p.email || "").toLowerCase();
        return name.includes(lowerSearch) || email.includes(lowerSearch);
      });
    }

    return result;
  }, [patients, search, filterGender]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / ITEMS_PER_PAGE));
  const currentPatients = filteredPatients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 1) navigate('/patients');
  };

  const handleReset = () => {
    setSearch("");
    setFilterGender("all");
    if (currentPage !== 1) navigate('/patients');
  };

  return (
    <div className="w-full relative min-h-full isolate">
      <Helmet>
        <title>Patients | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Patients
            </h1>
            <p className="text-muted-foreground mt-1">View and manage all patient records.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={() => navigate("/session/new")} variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
              <ClipboardPlus className="mr-2 h-4 w-4" /> Start New Intake
            </Button>
            {!isSelectionMode && (
              <>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                      <ClipboardPlus className="mr-2 h-4 w-4" /> Add Patient
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
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "Patients Directory", columns: [{ label: "Patient ID", key: "id" }, { label: "Name", key: (p: any) => [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id }, { label: "Contact Info", key: (p: any) => [p.phone_number, p.email].filter(Boolean).join(" | ") || "—" }, { label: "Gender", key: (p: any) => p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1).toLowerCase() : "—" }, { label: "Age", key: "age" }] })}>
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [{ label: "Patient ID", key: "id" }, { label: "Name", key: (p: any) => [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id }, { label: "Contact Info", key: (p: any) => [p.phone_number, p.email].filter(Boolean).join(" | ") || "—" }, { label: "Gender", key: (p: any) => p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1).toLowerCase() : "—" }, { label: "Age", key: "age" }] }, "Patients")}>
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
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h4 className="font-medium leading-none">Filter Options</h4>
                            <p className="text-sm text-muted-foreground">Adjust filters for patients.</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 text-muted-foreground hover:text-foreground -mt-1 -mr-1">
                            <RotateCcw className="mr-2 h-3 w-3" /> Reset
                          </Button>
                        </div>
                        <div className="grid gap-3">
                          <Select value={filterGender} onValueChange={setFilterGender}>
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
                        checked={currentPatients.every(item => isItemSelected(item.id)) && currentPatients.length > 0}
                        onCheckedChange={() => toggleAllOnPage(currentPatients, currentPatients.every(item => isItemSelected(item.id)))}
                      />
                    </TableHead>
                  )}
                  <TableHead className="font-semibold">Patient Name</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Demographics</TableHead>
                  <TableHead className="font-semibold">Sessions</TableHead>
                  <TableHead className="font-semibold">Registered</TableHead>
                  <TableHead className="w-[80px] text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                      {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Patient:</span>
                        <Skeleton className="h-10 w-32" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Contact:</span>
                        <Skeleton className="h-10 w-32" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Demographics:</span>
                        <div className="text-right"><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-16 ml-auto" /></div>
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Sessions:</span>
                        <Skeleton className="h-5 w-8 rounded-full" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground">Registered:</span>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none max-md:mt-2">
                        <span className="md:hidden font-semibold text-muted-foreground">Actions:</span>
                        <Skeleton className="h-8 w-24 rounded-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : currentPatients.length === 0 ? (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 7 : 6} className="h-48 text-center max-md:block max-md:py-8">
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
                  currentPatients.map((patient) => {
                    const displayName = [patient.first_name, patient.last_name].filter(Boolean).join(" ") || patient.id;
                    return (
                      <TableRow key={patient.id} className="max-md:block max-md:p-4 max-md:border-b max-md:relative">
                        {isSelectionMode && (
                          <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                            <Checkbox
                              checked={selectedItems.has(patient.id)}
                              onCheckedChange={() => toggleItemSelection(patient)}
                            />
                          </TableCell>
                        )}
                        <TableCell className={cn("py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Patient Name</span>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 pr-2">
                              <p className="text-sm font-semibold truncate text-foreground">{displayName}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact</span>
                          <div className="flex flex-col gap-0.5 max-md:items-end">
                            <span className="text-sm font-medium text-foreground">
                              {patient.phone_number ? maskPhoneNumber(patient.phone_number) : <span className="text-muted-foreground/50">-</span>}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {patient.email || <span className="text-muted-foreground/50">-</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Demographics</span>
                          <div className="text-sm max-md:text-right">
                            {patient.gender && patient.gender !== "Not specified" ? <span className="capitalize">{patient.gender}</span> : <span className="text-muted-foreground">-</span>}
                            {patient.age ? <span className="text-muted-foreground ml-2">({patient.age} y/o)</span> : null}
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
                          {patient.created_at ? formatDate(patient.created_at) : "—"}
                        </TableCell>
                        <TableCell className="py-2 text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                          <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                          <InteractiveHoverButton
                            onClick={() => navigate(`/patients/${patient.id}/details`)}
                            className="text-xs h-8 py-0 px-4"
                          >
                            Details
                          </InteractiveHoverButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {totalPages >= 0 && !isLoading && (
          <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
              Showing <span className="font-medium text-foreground">{filteredPatients.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredPatients.length)}</span> of <span className="font-medium text-foreground">{filteredPatients.length}</span> patients
            </p>
            <Pagination className="sm:justify-end sm:w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => navigate(currentPage > 2 ? `/patients/page/${currentPage - 1}` : `/patients`)}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) return null;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        isActive={currentPage === pageNum}
                        onClick={() => navigate(pageNum === 1 ? `/patients` : `/patients/page/${pageNum}`)}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => navigate(`/patients/page/${currentPage + 1}`)}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
