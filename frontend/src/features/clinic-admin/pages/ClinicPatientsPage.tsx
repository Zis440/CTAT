import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Search, Plus, Filter, RotateCcw, Users, HeartPulse, Check, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, maskPhoneNumber } from "@/lib/utils";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
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
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import { formatDate } from "@/lib/dateFormat";
import { useAuthStore } from "@/store/useAuthStore";

export function ClinicPatientsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const navigate = useNavigate();
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;

  const user = useAuthStore(s => s.user);
  const isOrg = user?.role?.startsWith("org_");

  const getBasePath = () => {
    if (user?.role === "org_admin") return "/org";
    if (user?.role === "org_staff") return "/org-staff";
    if (user?.role === "clinic_staff") return "/clinic-staff";
    return "/clinic";
  };
  const basePath = getBasePath();

  // API Data state
  const [patientList, setPatientList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");

  const {
    isSelectionMode,
    selectedItems,
    toggleSelectionMode,
    toggleAllOnPage,
    toggleItemSelection,
    isItemSelected,
    exportSelectedToPDF,
    exportSelectedToExcel,
  } = useBulkSelection<any>();

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const { data } = await apiClient.get("/patients");
      setPatientList(data);
    } catch (err) {
      toast.error("Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleAddPatient = async () => {
    if (!name) {
      toast.error("Please provide at least a First Name.");
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

  const handleRemovePatient = async (id: string) => {
    try {
      await apiClient.delete(`/patients/${id}`);
      toast.success("Patient removed successfully");
      loadPatients();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to remove patient");
    }
  };


  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>${isOrg ? "Candidates" : "Patients"}  | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <HeartPulse className="h-8 w-8 text-primary" />
            {isOrg ? "Candidates" : "Patients"}
          </h1>
          <p className="text-muted-foreground mt-1">Manage and track your {isOrg ? "organization's candidates" : "clinic's patients"}.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isSelectionMode && (
            <>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> Add {isOrg ? "Candidate" : "Patient"}
                  </Button>
                </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New {isOrg ? "Candidate" : "Patient"}</DialogTitle>
              <DialogDescription>
                Enter the details of the new {isOrg ? "candidate" : "patient"} to add them to the system.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
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
                <Input id="background" value={background} onChange={(e) => setBackground(e.target.value)} placeholder="Brief background..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="livingEnvironment">Living Environment (optional)</Label>
                <Input id="livingEnvironment" value={livingEnvironment} onChange={(e) => setLivingEnvironment(e.target.value)} placeholder="Living environment details..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="livingCondition">Living Condition (optional)</Label>
                  <Select value={livingCondition} onValueChange={setLivingCondition}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urban">Urban</SelectItem>
                      <SelectItem value="suburban">Suburban</SelectItem>
                      <SelectItem value="rural">Rural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="familyStructure">Family Structure (optional)</Label>
                  <Select value={familyStructure} onValueChange={setFamilyStructure}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuclear">Nuclear</SelectItem>
                      <SelectItem value="joint">Joint</SelectItem>
                      <SelectItem value="extended">Extended</SelectItem>
                      <SelectItem value="single_parent">Single Parent</SelectItem>
                      <SelectItem value="living_alone">Living Alone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="environmentType">Environment Type (optional)</Label>
                  <Select value={environmentType} onValueChange={setEnvironmentType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supportive">Supportive</SelectItem>
                      <SelectItem value="stressful">Stressful</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="conflict_ridden">Conflict-ridden</SelectItem>
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
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="higher_secondary">Higher Secondary</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                      <SelectItem value="postgraduate">Postgraduate</SelectItem>
                      <SelectItem value="doctorate">Doctorate</SelectItem>
                      <SelectItem value="uneducated">Uneducated</SelectItem>
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
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="middle">Middle</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clinicalNotes">Clinical Notes (optional)</Label>
                <Input id="clinicalNotes" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Any preliminary clinical notes..." />
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddPatient}>Save {isOrg ? "Candidate" : "Patient"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
              <Button type="button" variant="outline" onClick={toggleSelectionMode}>
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
              {selectedItems.size} {isOrg ? "candidates" : "patients"} selected
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
                  <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "Patients", columns: [ { label: "Patient ID", key: "id" }, { label: "Name", key: (p: any) => [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id }, { label: "Contact Info", key: (p: any) => [p.phone_number, p.email].filter(Boolean).join(" | ") || "—" }, { label: "Gender", key: (p: any) => p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1).toLowerCase() : "—" }, { label: "Age", key: "age" } ] })}>
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
            <div className="flex w-full max-w-sm items-center space-x-2">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder={`Search ${isOrg ? "candidates" : "patients"}...`}
                  className="pl-8 bg-background/50" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
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
                        <p className="text-sm text-muted-foreground">Adjust filters for {isOrg ? "organization candidates" : "clinic patients"}.</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSearchQuery("");
                        setGenderFilter("all");
                      }} className="h-8 px-2 text-muted-foreground hover:text-foreground -mt-1 -mr-1">
                        <RotateCcw className="mr-2 h-3 w-3" /> Reset
                      </Button>
                    </div>
                    <div className="grid gap-3">
                      <Select value={genderFilter} onValueChange={setGenderFilter}>
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Genders</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input type="date" className="w-full h-9" />
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
                      checked={patientList.length > 0 && patientList.every(item => isItemSelected(item.id))}
                      onCheckedChange={(checked) => toggleAllOnPage(patientList, checked as boolean)}
                    />
                  </TableHead>
                )}
                <TableHead>Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Age</TableHead>

                <TableHead>Registration Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="max-md:block">
              {(() => {
                if (isLoading) {
                  return Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="max-md:block max-md:p-4 max-md:border-b">
                      {isSelectionMode && <TableCell className="max-md:block max-md:mb-2 max-md:p-0"><Skeleton className="h-4 w-4" /></TableCell>}
                      <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</span>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                          <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                        <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact Info</span>
                        <div className="flex flex-col gap-1.5 max-md:items-end">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Gender</span><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Age</span><Skeleton className="h-5 w-8" /></TableCell>

                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Reg Date</span><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ));
                }
                const filtered = patientList.filter(patient => {
                const matchesSearch = !searchQuery.trim() || 
                  `${patient.first_name || ""} ${patient.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (patient.phone_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (patient.email || "").toLowerCase().includes(searchQuery.toLowerCase());
                
                const matchesGender = genderFilter === "all" || (patient.gender && patient.gender.toLowerCase() === genderFilter.toLowerCase());
                
                return matchesSearch && matchesGender;
              });
              
              if (filtered.length === 0) {
                return (
                  <TableRow className="max-md:block">
                    <TableCell colSpan={isSelectionMode ? 7 : 6} className="h-48 text-center max-md:block max-md:py-8">
                      <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-lg font-medium text-muted-foreground">No {isOrg ? "candidates" : "patients"} yet</p>
                      <p className="text-sm text-muted-foreground/60 mt-1">Registered {isOrg ? "candidates" : "patients"} will appear here.</p>
                    </TableCell>
                  </TableRow>
                );
              }
              
              return filtered.map((patient) => {
                const displayName = [patient.first_name, patient.last_name].filter(Boolean).join(" ") || patient.id;
                return (
                  <TableRow key={patient.id} className="max-md:block max-md:p-4 max-md:border-b max-md:relative">
                    {isSelectionMode && (
                      <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                        <Checkbox
                          checked={isItemSelected(patient.id)}
                          onCheckedChange={() => toggleItemSelection(patient)}
                        />
                      </TableCell>
                    )}
                    <TableCell className={cn("py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</span>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {([patient.first_name, patient.last_name].filter(Boolean).join(" ") || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 pr-2 max-md:text-right">
                          <p className="text-sm font-bold truncate text-foreground">{displayName}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{patient.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact Info</span>
                      <div className="flex flex-col gap-0.5 max-md:items-end">
                        <span className="text-sm font-medium text-foreground">{patient.phone_number ? maskPhoneNumber(patient.phone_number) : "—"}</span>
                        <span className="text-xs text-muted-foreground">{patient.email || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Gender</span>{patient.gender ? <span className="capitalize">{patient.gender}</span> : "-"}</TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Age</span>{patient.age || "-"}</TableCell>

                    <TableCell className="max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none"><span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Reg Date</span>{patient.created_at ? formatDate(patient.created_at) : "-"}</TableCell>
                    <TableCell className="text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                      <div className="flex items-center justify-end gap-2">
                        <InteractiveHoverButton
                          onClick={() => navigate(`/clinic/patients/${patient.id}/details`)}
                          className="text-xs h-8 py-0 px-4"
                        >
                          Details
                        </InteractiveHoverButton>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5"
                          onClick={() => handleRemovePatient(patient.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              });
              })()}
            </TableBody>
          </Table>

        </CardContent>
      </Card>

      <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
          {(() => {
            if (isLoading) return "Loading...";
            const filtered = patientList.filter(p => {
              const matchesSearch = !searchQuery.trim() || 
                `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.id.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesGender = genderFilter === "all" || (p.gender && p.gender.toLowerCase() === genderFilter.toLowerCase());
              return matchesSearch && matchesGender;
            });
            if (filtered.length === 0) return <>Showing <span className="font-medium text-foreground">0</span> to <span className="font-medium text-foreground">0</span> of <span className="font-medium text-foreground">0</span> {isOrg ? "candidates" : "patients"}</>;
            return (
              <>
                Showing <span className="font-medium text-foreground">{Math.min((page - 1) * 3 + 1, filtered.length)}</span> to <span className="font-medium text-foreground">{Math.min(page * 3, filtered.length)}</span> of <span className="font-medium text-foreground">{filtered.length}</span> {isOrg ? "candidates" : "patients"}
              </>
            );
          })()}
        </p>
        {(() => {
            const filtered = patientList.filter(p => {
              const matchesSearch = !searchQuery.trim() || 
                `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.id.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesGender = genderFilter === "all" || (p.gender && p.gender.toLowerCase() === genderFilter.toLowerCase());
              return matchesSearch && matchesGender;
            });
            const calcTotalPages = Math.max(1, Math.ceil(filtered.length / 3));
            return (
              <Pagination className="sm:justify-end sm:w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => navigate(page > 2 ? `${basePath}/${isOrg ? "candidates" : "patients"}/page/${page - 1}` : `${basePath}/${isOrg ? "candidates" : "patients"}`)}
                      className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: calcTotalPages }, (_, i) => i + 1).map((pageNum) => {
                    if (calcTotalPages > 7 && (pageNum < page - 2 || pageNum > page + 2) && pageNum !== 1 && pageNum !== calcTotalPages) {
                      if (pageNum === page - 3 || pageNum === page + 3) return <PaginationItem key={pageNum}><PaginationEllipsis /></PaginationItem>;
                      return null;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink onClick={() => navigate(pageNum === 1 ? `${basePath}/${isOrg ? "candidates" : "patients"}` : `${basePath}/${isOrg ? "candidates" : "patients"}/page/${pageNum}`)} isActive={page === pageNum} className="cursor-pointer">
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => navigate(`${basePath}/${isOrg ? "candidates" : "patients"}/page/${page + 1}`)}
                      className={page >= calcTotalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            );
        })()}
      </div>
    </div>
  );
}

