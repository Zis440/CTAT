import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Lock, Brain, Heart, Activity, ClipboardList, Zap, GraduationCap, Baby, Edit2, ClipboardPlus } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TEST_REGISTRY } from "@/features/assessment/registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  heart: Heart,
  activity: Activity,
  "clipboard-list": ClipboardList,
  zap: Zap,
  "graduation-cap": GraduationCap,
  baby: Baby,
};

interface Assessment {
  id: string | number;
  name: string;
  category: string;
  clinicPrice: number | "";
  psychologistPrice: number | "";
  orgPrice: number | "";
  isComingSoon?: boolean;
}

export function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const response = await apiClient.get("/assessments");
        if (response.data && response.data.length > 0) {
          setAssessments(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch assessments from DB:", error);
        toast.error("Failed to load assessments from the database.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssessments();
  }, []);

  const handleEditClick = (assessment: Assessment) => {
    setEditingAssessment({ ...assessment });
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingAssessment) return;

    try {

      setAssessments((prev) =>
        prev.map((a) => (a.id === editingAssessment.id ? editingAssessment : a))
      );
      setIsEditModalOpen(false);

      await apiClient.put(`/assessments/${editingAssessment.id}`, {
        name: editingAssessment.name,
        category: editingAssessment.category,
        isComingSoon: editingAssessment.isComingSoon,
        clinicPrice: editingAssessment.clinicPrice,
        psychologistPrice: editingAssessment.psychologistPrice,
        orgPrice: editingAssessment.orgPrice,
      });

      toast.success(`${editingAssessment.name} updated successfully.`);
    } catch (error) {
      console.error("Failed to update assessment price:", error);
      toast.error("Failed to update price. Please try again.");
    }
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Helmet>
        <title>Assessments  | CoreTAT - Psychological Intelligence</title>
      </Helmet>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <ClipboardPlus className="h-8 w-8 text-primary" />
            Assessments
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage available psychological assessments, their categories, statuses, and pricing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
        {assessments.map((test) => {

          const registryTest = TEST_REGISTRY.find(
            (t) => t.name.toLowerCase() === test.name.toLowerCase() || t.shortName.toLowerCase() === test.name.toLowerCase()
          );

          const Icon = registryTest?.icon ? (ICON_MAP[registryTest.icon] || Brain) : Brain;
          const description = registryTest?.description || "Assessment configuration from database.";
          const ageGroup = registryTest?.ageGroup || null;

          return (
            <Card
              key={test.id}
              className={`relative overflow-visible flex flex-col transition-all ${test.isComingSoon
                  ? "opacity-60 grayscale cursor-not-allowed"
                  : "border-primary/20 bg-background/50 backdrop-blur-sm hover:border-primary/50"
                }`}
            >

              {test.isComingSoon && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2.5 right-3 z-10 gap-1 text-xs shadow-sm"
                >
                  <Lock className="h-3 w-3" />
                  Coming Soon
                </Badge>
              )}

              <CardContent className="pt-6 pb-4 flex flex-col flex-1 gap-3 text-center">

                <div className="mx-auto h-12 w-12 rounded-xl flex items-center justify-center bg-muted/50">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>

                <div>
                  <h3 className={`font-semibold text-lg ${test.isComingSoon ? "text-muted-foreground" : ""}`}>
                    {test.name}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-snug mt-1 line-clamp-2 px-2">
                    {description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                  {test.category && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {test.category}
                    </Badge>
                  )}
                  {ageGroup && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {ageGroup}
                    </Badge>
                  )}
                </div>

                <div className="flex-1" />

                <div className="w-full pt-4 mt-2 border-t border-border/50 text-left">
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex justify-between items-center px-3 py-2 rounded-md bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">Clinic Price</span>
                      <span className="text-sm font-bold">
                        {test.clinicPrice != null && test.clinicPrice !== "" ? `₹${test.clinicPrice}` : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2 rounded-md bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">Psychologist Price</span>
                      <span className="text-sm font-bold">
                        {test.psychologistPrice != null && test.psychologistPrice !== "" ? `₹${test.psychologistPrice}` : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2 rounded-md bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">Organization Price</span>
                      <span className="text-sm font-bold">
                        {test.orgPrice != null && test.orgPrice !== "" ? `₹${test.orgPrice}` : "-"}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full shadow-sm px-4 h-8 text-xs font-medium bg-background hover:bg-muted"
                      onClick={() => handleEditClick(test)}
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                      Edit Assessment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Assessment: {editingAssessment?.name}</DialogTitle>
            <DialogDescription>
              Update the configuration and pricing for this assessment.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid gap-2">
              <Label htmlFor="name">Assessment Name</Label>
              <Input
                id="name"
                value={editingAssessment?.name ?? ""}
                onChange={(e) =>
                  setEditingAssessment((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={editingAssessment?.category ?? ""}
                onChange={(e) =>
                  setEditingAssessment((prev) =>
                    prev ? { ...prev, category: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <Label>Coming Soon</Label>
                <div className="text-[12px] text-muted-foreground">
                  Hide pricing and disable purchases
                </div>
              </div>
              <Switch
                checked={editingAssessment?.isComingSoon ?? false}
                onCheckedChange={(checked) =>
                  setEditingAssessment((prev) =>
                    prev ? { ...prev, isComingSoon: checked } : null
                  )
                }
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="clinicPrice">Clinic Price (₹)</Label>
                <Input
                  id="clinicPrice"
                  type="number"
                  value={editingAssessment?.clinicPrice ?? ""}
                  onChange={(e) =>
                    setEditingAssessment((prev) =>
                      prev ? { ...prev, clinicPrice: Number(e.target.value) } : null
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="psychologistPrice">Psychologist Price (₹)</Label>
                <Input
                  id="psychologistPrice"
                  type="number"
                  value={editingAssessment?.psychologistPrice ?? ""}
                  onChange={(e) =>
                    setEditingAssessment((prev) =>
                      prev ? { ...prev, psychologistPrice: Number(e.target.value) } : null
                    )
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="orgPrice">Organization Price (₹)</Label>
                <Input
                  id="orgPrice"
                  type="number"
                  value={editingAssessment?.orgPrice ?? ""}
                  onChange={(e) =>
                    setEditingAssessment((prev) =>
                      prev ? { ...prev, orgPrice: Number(e.target.value) } : null
                    )
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
