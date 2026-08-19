export const getSessionNewRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/session/new';
  if (role === 'org_staff') return '/org-staff/session/new';
  if (role === 'clinic_admin') return '/clinic/session/new';
  if (role === 'clinic_staff') return '/clinic-staff/session/new';
  return '/session/new';
};

export const getSessionSetupRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/session/setup';
  if (role === 'org_staff') return '/org-staff/session/setup';
  if (role === 'clinic_admin') return '/clinic/session/setup';
  if (role === 'clinic_staff') return '/clinic-staff/session/setup';
  return '/session/setup';
};

export const getScreeningToolRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/session/screening-tool';
  if (role === 'org_staff') return '/org-staff/session/screening-tool';
  if (role === 'clinic_admin') return '/clinic/session/screening-tool';
  if (role === 'clinic_staff') return '/clinic-staff/session/screening-tool';
  return '/session/screening-tool';
};

export const getSessionActiveRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/session/active';
  if (role === 'org_staff') return '/org-staff/session/active';
  if (role === 'clinic_admin') return '/clinic/session/active';
  if (role === 'clinic_staff') return '/clinic-staff/session/active';
  return '/session/active';
};

export const getSessionResultRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/session/NI/report/synthesizing';
  if (role === 'org_staff') return '/org-staff/session/NI/report/synthesizing';
  if (role === 'clinic_admin') return '/clinic/session/NI/report/synthesizing';
  if (role === 'clinic_staff') return '/clinic-staff/session/NI/report/synthesizing';
  if (role === 'super_admin') return '/admin/session/NI/report/synthesizing';
  return '/session/NI/report/synthesizing';
};

export const getSessionHistoryRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/session-history';
  if (role === 'org_staff') return '/org-staff/session-history';
  if (role === 'clinic_admin') return '/clinic/session-history';
  if (role === 'clinic_staff') return '/clinic-staff/session-history';
  if (role === 'super_admin') return '/admin/session/history';
  return '/session/history';
};

export const getSessionDetailsRoute = (role: string | undefined, sessionId: string) => {
  if (role === 'org_admin') return `/org/session-history/${sessionId}/details`;
  if (role === 'org_staff') return `/org-staff/session-history/${sessionId}/details`;
  if (role === 'clinic_admin') return `/clinic/session-history/${sessionId}/details`;
  if (role === 'clinic_staff') return `/clinic-staff/session-history/${sessionId}/details`;
  if (role === 'super_admin') return `/admin/session-history/${sessionId}/details`;
  return `/session/history/${sessionId}/details`;
};

export const getDashboardRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/dashboard';
  if (role === 'org_staff') return '/org-staff/dashboard';
  if (role === 'clinic_admin') return '/clinic/dashboard';
  if (role === 'clinic_staff') return '/clinic-staff/dashboard';
  if (role === 'super_admin') return '/admin';
  return '/dashboard';
};

export const getWalletRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/wallet';
  if (role === 'org_staff') return '/org-staff/wallet';
  if (role === 'clinic_admin') return '/clinic/wallet';
  if (role === 'clinic_staff') return '/clinic-staff/wallet';
  return '/wallet';
};

export const getSupportRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/contact-support';
  if (role === 'org_staff') return '/org-staff/support';
  if (role === 'clinic_admin') return '/clinic/contact-support';
  if (role === 'clinic_staff') return '/clinic-staff/support';
  if (role === 'super_admin') return '/admin/support';
  return '/support';
};

export const getRechargeRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/recharge';
  if (role === 'org_staff') return '/org-staff/recharge';
  if (role === 'clinic_admin') return '/clinic/recharge';
  if (role === 'clinic_staff') return '/clinic-staff/recharge';
  return '/recharge';
};

export const getPatientsRoute = (role: string | undefined) => {
  if (role === 'org_admin') return '/org/candidates';
  if (role === 'org_staff') return '/org-staff/candidates';
  if (role === 'clinic_admin') return '/clinic/patients';
  if (role === 'clinic_staff') return '/clinic-staff/patients';
  return '/patients';
};

export const getPatientDetailsRoute = (role: string | undefined, patientId: string) => {
  if (role === 'org_admin') return `/org/candidates/${patientId}/details`;
  if (role === 'org_staff') return `/org-staff/candidates/${patientId}/details`;
  if (role === 'clinic_admin') return `/clinic/patients/${patientId}/details`;
  if (role === 'clinic_staff') return `/clinic-staff/patients/${patientId}/details`;
  return `/patients/${patientId}/details`;
};
