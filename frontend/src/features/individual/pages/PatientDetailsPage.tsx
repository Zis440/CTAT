import { useParams } from "react-router-dom";
import { SharedPatientDetails } from "@/components/patients/SharedPatientDetails";

export function PatientDetailsPage() {
  const { patientId } = useParams<{ patientId: string }>();

  if (!patientId) return null;

  return (
    <SharedPatientDetails 
      patientId={patientId} 
      apiBasePath="/patients" 
      backUrl="/patients" 
    />
  );
}
