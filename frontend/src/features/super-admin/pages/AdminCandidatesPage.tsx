import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { RotateCcw, Users, AlertTriangle, Building2, User, Check, Filter } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { cn, maskPhoneNumber } from "@/lib/utils";

export function AdminCandidatesPage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<AdminPatient[]>([]);
  const [total, setTotal] = useState(0);
  const { pageId } = useParams();
  const page = parseInt(pageId as string, 10) || 1;
  const pageSize = 30;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");

  // Add Candidate form state
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

  const handleAddCandidate = async () => {
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
        environment: livingEnvironment || undefined,
        living_condition: livingCondition || undefined,
        family_structure: familyStructure || undefined,
        environment_type: environmentType || undefined,
        education_level: educationLevel || undefined,
        occupation: occupation || undefined,
        socioeconomic_status: socioeconomicStatus || undefined,
        notes: clinicalNotes || undefined,
      });

      toast.success("Candidate added successfully");
      setIsAddOpen(false);
      loadCandidates();

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
      toast.error(err?.response?.data?.detail || "Failed to add candidate");
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

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: UserFilters = {
        page,
        page_size: pageSize,
        patient_type: "candidate"
      };
      if (search.trim()) filters.search = search.trim();

      const res = await fetchAdminPatients(filters);
      setCandidates(res.patients);
      setTotal(res.total);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to load candidates.");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (page !== 1) navigate('/admin/candidates');
    else loadCandidates();
  };

  const handleReset = () => {
    setSearch("");
    if (page !== 1) navigate('/admin/candidates');
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Candidate Management | PsyicHub - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Candidate Management
          </h1>
          <p className="text-muted-foreground mt-1">View and manage all candidates across the platform.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isSelectionMode && (
            <>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> Add Candidate
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Candidate</DialogTitle>
                    <DialogDescription>
                      Enter the details of the new candidate to add them to the system.
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
                    <Button onClick={handleAddCandidate}>Save Candidate</Button>
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
              {selectedItems.size} candidates selected
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
                  <DropdownMenuItem onClick={() => exportSelectedToPDF({ pdfHeader: "All Candidates", columns: [{ label: "Candidate ID", key: "id" }, { label: "Name", key: (p: any) => [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id }, { label: "Contact Info", key: (p: any) => [p.phone_number, p.email].filter(Boolean).join(" | ") || "—" }, { label: "Gender", key: (p: any) => p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1).toLowerCase() : "—" }, { label: "Age", key: "age" }] })}>
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportSelectedToExcel({ columns: [{ label: "Candidate ID", key: "id" }, { label: "Name", key: (p: any) => [p.first_name, p.last_name].filter(Boolean).join(" ") || p.id }, { label: "Contact Info", key: (p: any) => [p.phone_number, p.email].filter(Boolean).join(" | ") || "—" }, { label: "Gender", key: (p: any) => p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1).toLowerCase() : "—" }, { label: "Age", key: "age" }] }, "Candidates")}>
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
                          <p className="text-sm text-muted-foreground">Adjust filters for candidates.</p>
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
                      checked={candidates.length > 0 && candidates.every(p => isItemSelected(p.id))}
                      onCheckedChange={() => toggleAllOnPage(candidates, candidates.every(p => isItemSelected(p.id)))}
                    />
                  </TableHead>
                )}
                <TableHead>Candidate Name</TableHead>
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
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Demographics:</span>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Registered Under:</span>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Sessions:</span>
                      <Skeleton className="h-6 w-8 rounded-full max-md:ml-auto" />
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground">Registered:</span>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="max-md:flex max-md:justify-between max-md:p-1 max-md:border-none max-md:mt-2 text-right">
                      <span className="md:hidden font-semibold text-muted-foreground">Actions:</span>
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-32 text-center text-destructive max-md:block max-md:py-8">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{error}</p>
                    <Button variant="outline" size="sm" onClick={loadCandidates} className="mt-4 text-foreground">
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : candidates.length === 0 ? (
                <TableRow className="max-md:block">
                  <TableCell colSpan={isSelectionMode ? 8 : 7} className="h-48 text-center max-md:block max-md:py-8">
                    <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No candidates found</p>
                    {search && (
                      <Button variant="link" onClick={handleReset} className="mt-2">
                        Clear search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((candidate) => (
                  <TableRow key={candidate.id} className="max-md:block max-md:p-4 max-md:border-b max-md:relative">
                    {isSelectionMode && (
                      <TableCell className="text-center max-md:absolute max-md:top-4 max-md:left-4 max-md:p-0">
                        <Checkbox
                          checked={isItemSelected(candidate.id)}
                          onCheckedChange={() => toggleItemSelection(candidate)}
                        />
                      </TableCell>
                    )}
                    <TableCell className={cn("py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none", isSelectionMode && "max-md:pl-8")}>
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</span>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {candidate.first_name ? candidate.first_name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 pr-2 max-md:text-right">
                          <p className="text-sm font-semibold truncate text-foreground">{candidate.first_name} {candidate.last_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Contact</span>
                      <div className="flex flex-col gap-0.5 max-md:items-end">
                        {candidate.phone_number && (
                          <span className="text-sm font-medium text-foreground">
                            {maskPhoneNumber(candidate.phone_number)}
                          </span>
                        )}
                        {candidate.email && (
                          <span className="text-xs text-muted-foreground">
                            {candidate.email}
                          </span>
                        )}
                        {!candidate.phone_number && !candidate.email && (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Demographics</span>
                      <div className="text-sm max-md:text-right">
                        {candidate.gender ? <span className="capitalize">{candidate.gender}</span> : <span className="text-muted-foreground">-</span>}
                        {candidate.age ? <span className="text-muted-foreground ml-2">({candidate.age} y/o)</span> : null}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Registered Under</span>
                      <div className="flex items-center text-xs max-md:justify-end">
                        {candidate.provider_name ? (
                          <>
                            <Building2 className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span className="font-medium text-muted-foreground truncate max-w-[150px]" title={candidate.provider_name}>{candidate.provider_name}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-sm font-medium max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Sessions</span>
                      <div className="max-md:bg-primary/10 max-md:text-primary max-md:px-2 max-md:py-0.5 max-md:rounded-full max-md:font-bold">
                        {candidate.total_sessions}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Registered</span>
                      {formatDate(candidate.created_at)}
                    </TableCell>
                    <TableCell className="py-2 text-right max-md:flex max-md:justify-between max-md:items-center max-md:p-1 max-md:border-none max-md:mt-2">
                      <span className="md:hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actions</span>
                      <InteractiveHoverButton
                        onClick={() => navigate(`/admin/candidates/${candidate.id}/details`)}
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

      {totalPages >= 0 && !isLoading && !error && (
        <div className="pt-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            Showing <span className="font-medium text-foreground">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-foreground">{total}</span> candidates
          </p>
          <Pagination className="sm:justify-end sm:w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => navigate(page > 2 ? `/admin/candidates/page/${page - 1}` : `/admin/candidates`)}
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
                      onClick={() => navigate(pageNum === 1 ? `/admin/candidates` : `/admin/candidates/page/${pageNum}`)}
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
                  onClick={() => navigate(`/admin/candidates/page/${page + 1}`)}
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
