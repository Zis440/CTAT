// ─── Analysis Service ───────────────────────────────────────────────────────
// API calls for TAT sessions, card analysis, and PDF reports.

import { apiClient } from "@/services/apiClient";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PastSession {
  id: string;
  patient_name: string;
  patient_id?: string;
  test_type: string;
  status: "in_progress" | "completed" | "cancelled";
  card_count: number;
  cards_completed: number;
  created_at: string;
  completed_at?: string;
  timestamp?: string;
  pdf_filename?: string;
  cards_examined?: string[];
  psychologist_name?: string;
  account_type?: string;
  clinic_name?: string;
  validation_status?: string;
  user_id?: string;
}

export interface SessionDetails extends PastSession {
  cards: CardResult[];
  summary?: string;
  /** Report summary blob from the backend */
  report_summary?: any;
  /** Patient info block returned by the API */
  patient_info?: {
    patient_id?: string;
    name?: string;
    age?: number;
    gender?: string;
  };
  /** DB metadata block (Mongo/Postgres _id etc.) */
  _db_metadata?: {
    id?: string;
    [key: string]: any;
  };
  /** Core metadata block */
  _metadata?: {
    test_type?: string;
    [key: string]: any;
  };
  /** PDF filename path if report was generated */
  pdf_filename?: string;
}

export interface CardResult {
  card_number: number;
  card_label: string;
  narrative: string;
  themes: string[];
  scores: Record<string, number>;
  analysis?: string;
}

export interface AggregatedResults {
  total_cards: number;
  themes: Record<string, number>;
  average_scores: Record<string, number>;
  summary: string;
}

// ─── Session list ───────────────────────────────────────────────────────────

export async function fetchPastSessions(filters?: {
  status?: string;
  start_date?: string;
  end_date?: string;
  assessment_type?: string;
}): Promise<PastSession[]> {
  const { data } = await apiClient.get<PastSession[]>("/sessions", { params: filters });
  if (Array.isArray(data)) {
    data.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }
  return data;
}

export async function fetchSessionDetails(
  sessionId: string
): Promise<SessionDetails> {
  const { data } = await apiClient.get<SessionDetails>(
    `/sessions/${sessionId}`
  );
  
  if (data && data._db_metadata) {
    data.validation_status = data._db_metadata.validation_status;
    if (data.report_summary) {
      data.report_summary._db_metadata = data._db_metadata;
    }
  }
  
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/sessions/${sessionId}`);
}

export async function requestSessionValidation(sessionId: string): Promise<{status: string, message: string, new_balance: number}> {
  const { data } = await apiClient.post(`/sessions/${sessionId}/request-validation`);
  return data;
}

// ─── Card analysis ──────────────────────────────────────────────────────────

export async function submitCardStory(
  cardId: string,
  narrative: string,
  patientId: string,
  effectiveAge?: number,
  _audioBlob?: Blob
): Promise<CardResult> {
  const { data } = await apiClient.post<CardResult>(
    `/analysis/analyze`,
    { patientId, cardId, story: narrative, effectiveAge }
  );
  return data;
}

// ─── Results aggregation ────────────────────────────────────────────────────

const inFlightAggregations = new Map<string, Promise<any>>();

export async function aggregateCardResults(
  patientId: string,
  cardResults: Record<string, any>,
  assessmentName: string = "Assessment",
  requestPsychologistValidation: boolean = false
): Promise<any> {
  const cacheKey = `${patientId}-${Object.keys(cardResults).sort().join(',')}`;
  
  if (inFlightAggregations.has(cacheKey)) {
    return inFlightAggregations.get(cacheKey);
  }

  const promise = apiClient.post(
    `/analysis/aggregate`,
    { patientId, card_results: cardResults, assessment_name: assessmentName, request_psychologist_validation: requestPsychologistValidation }
  ).then((res: any) => res.data).finally(() => {
    inFlightAggregations.delete(cacheKey);
  });

  inFlightAggregations.set(cacheKey, promise);
  return promise;
}

// ─── PDF Reports ────────────────────────────────────────────────────────────

export async function generatePdfReport(
  patientId: string,
  cardResults: Record<string, any>,
  assessmentName: string = "Assessment",
  requestPsychologistValidation: boolean = false
): Promise<string> {
  const { data } = await apiClient.post(
    `/analysis/report`,
    { patientId, card_results: cardResults, assessment_name: assessmentName, request_psychologist_validation: requestPsychologistValidation },
    { responseType: 'blob' }
  );
  return URL.createObjectURL(data);
}

export async function openPdfReport(pdfName: string): Promise<void> {
  const newWindow = window.open('', '_blank');
  try {
    const { data } = await apiClient.post(`/reports/pdf/${pdfName}/open?t=${Date.now()}`, {}, {
      responseType: 'blob'
    });
    const fileUrl = URL.createObjectURL(data);
    if (newWindow) {
      newWindow.location.href = fileUrl;
    } else {
      window.location.href = fileUrl;
    }
  } catch (error) {
    if (newWindow) newWindow.close();
    throw error;
  }
}
