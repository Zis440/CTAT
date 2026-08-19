# Admin Subdomain Setup Guide

This document outlines the steps required to isolate the Super Admin functionality exclusively to the `admin.psyichub.com` subdomain.

## 1. DNS & Hosting Configuration

- **DNS Records**: Add an `A` record (if pointing to a server IP) or a `CNAME` record (if pointing to a PaaS provider like Vercel/Netlify) for the host `admin` pointing to your destination.
- **Hosting Dashboard**: Add the custom domain `admin.psyichub.com` to your frontend project settings so that the platform recognizes and routes the domain to your existing application, and provisions an SSL certificate.

## 2. Frontend Routing Strategy

Since the frontend is a React SPA built with Vite, the same bundle is served on both `psyichub.com` and `admin.psyichub.com`. We use the `window.location.hostname` to conditionally mount routes.

### Update `frontend/src/app/router/index.tsx`

Modify the `router` definition to check the domain:

```tsx
import { createBrowserRouter } from "react-router-dom";
// ... other imports

const hostname = window.location.hostname;
const isAdminDomain = hostname === 'admin.psyichub.com' || hostname === 'admin.localhost';

export const router = createBrowserRouter([
  ...publicRoutes,
  
  // Inject admin routes ONLY if on the admin domain
  ...(isAdminDomain ? superAdminRoutes : []),
  
  // Hide main app routes if on the admin domain
  ...(!isAdminDomain ? [
    ...clinicAdminRoutes,
    ...clinicStaffRoutes,
    ...orgAdminRoutes,
    ...orgStaffRoutes,
    ...individualRoutes,
  ] : []),
  
  ...sharedRoutes,
  
  // Catch-all 404 page
  { path: "*", element: <NotFoundPage /> },
]);
```

## 3. Backend CORS Requirements

To prevent the browser from blocking API calls made from the admin portal, the new subdomain must be authorized.

### Update Backend Configuration

Add `https://admin.psyichub.com` to your backend's CORS allowed origins. This is typically configured in `backend/.env` or directly where `CORSMiddleware` is initialized in `backend/app/main.py`.

## 4. Security Warning

- **Client-Side Limitations**: Conditionally rendering routes on the frontend is purely a UI restriction. It does not secure your APIs.
- **Backend Enforcement**: You **MUST** ensure that all Super Admin API endpoints in your FastAPI backend strictly validate the user's role (e.g., via JWT tokens) to prevent unauthorized access regardless of where the request originates.
