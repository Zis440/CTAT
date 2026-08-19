import { useParams } from "react-router-dom";
import { SharedPatientDetails } from "@/components/patients/SharedPatientDetails";

export function AdminPatientDetailsPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return null;

  return (
    <SharedPatientDetails 
      patientId={id} 
      apiBasePath="/admin/patients" 
      backUrl="/admin/patients" 
      allowExport={true}
    />
  );
}
