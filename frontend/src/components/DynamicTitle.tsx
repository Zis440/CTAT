import { Helmet } from "react-helmet-async";
import { useAuthStore } from "@/store/useAuthStore";

export function DynamicTitle({ title }: { title: string }) {
  const { user } = useAuthStore();

  let roleSuffix = "Psyichub";
  if (user?.role === "super_admin") roleSuffix = "Super Admin";
  if (user?.role === "clinic_admin") roleSuffix = "Clinic Admin";
  if (user?.role === "clinic_staff") roleSuffix = "Clinic Staff";
  if (user?.role === "individual_psychologist") roleSuffix = "Psyichub";

  return (
    <Helmet>
      <title>{title} | {roleSuffix}</title>
    </Helmet>
  );
}
