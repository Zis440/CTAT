import { createBrowserRouter } from "react-router-dom";

import { publicRoutes } from "./publicRoutes";
import { superAdminRoutes } from "./superAdminRoutes";
import { clinicAdminRoutes } from "./clinicAdminRoutes";
import { clinicStaffRoutes } from "./clinicStaffRoutes";
import { orgAdminRoutes } from "./orgAdminRoutes";
import { orgStaffRoutes } from "./orgStaffRoutes";
import { individualRoutes } from "./individualRoutes";
import { sharedRoutes } from "./sharedRoutes";
import { NotFoundPage } from "@/features/error/NotFoundPage";

export const router = createBrowserRouter([
  ...publicRoutes,
  ...superAdminRoutes,
  ...clinicAdminRoutes,
  ...clinicStaffRoutes,
  ...orgAdminRoutes,
  ...orgStaffRoutes,
  ...individualRoutes,
  ...sharedRoutes,

  // Catch-all 404 page
  { path: "*", element: <NotFoundPage /> },
]);
