import { apiClient } from "@/services/apiClient";

interface QuestionData {
  [key: string]: any;
}

interface AssessmentStartResponse {
  id: string;
}

interface CompleteAssessmentData {
  patient_context: any;
  questionnaire_responses: Array<{ question_id: string; score: number }>;
  game_metrics: any[];
  story_assessments: any[];
  request_validation?: boolean;
}

interface InsightResponse {
  message: string;
  category: string;
  source?: string;
}

export const assessmentService = {
  getQuestions: async (): Promise<QuestionData> => {
    const response = await apiClient.get('/assessments/screening/level1/questions');
    return response.data;
  },
  startAssessment: async (core_patient_id?: string): Promise<AssessmentStartResponse> => {
    const url = core_patient_id
      ? `/assessments/screening/level1/start?core_patient_id=${core_patient_id}`
      : `/assessments/screening/level1/start`;
    const response = await apiClient.post(url);
    return response.data;
  },
  completeAssessment: async (assessmentId: string | null, data: CompleteAssessmentData): Promise<any> => {
    const response = await apiClient.post(`/assessments/screening/level1/${assessmentId}/complete`, data);
    return response.data;
  }
};

export const reportService = {
  getReport: async (assessmentId?: string): Promise<any> => {
    const response = await apiClient.get(`/assessments/screening/level1/report/${assessmentId}`);
    return response.data;
  },
  savePdf: async (assessmentId?: string, file?: File, core_patient_id?: string): Promise<any> => {
    const formData = new FormData();
    if (file) formData.append("file", file);

    const url = core_patient_id
      ? `/assessments/screening/level1/report/${assessmentId}/save-pdf?core_patient_id=${core_patient_id}`
      : `/assessments/screening/level1/report/${assessmentId}/save-pdf`;

    const response = await apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  openPdf: async (assessmentId: string) => {
    const response = await apiClient.post(`/assessments/screening/level1/report/${assessmentId}/open-pdf`, {}, {
      responseType: 'blob',
    });
    return response.data;
  },
  getPendingVerifications: async (): Promise<any[]> => {
    const response = await apiClient.get('/assessments/screening/level1/verification/pending');
    return response.data;
  },
  requestVerification: async (assessmentId: string): Promise<any> => {
    const response = await apiClient.post(`/assessments/screening/level1/${assessmentId}/request-verification`);
    return response.data;
  },
  verifyReport: async (assessmentId: string, data: { executive_summary?: string, ai_clinical_insight?: string, verification_notes: string }): Promise<any> => {
    const response = await apiClient.post(`/assessments/screening/level1/${assessmentId}/verify`, data);
    return response.data;
  }
};

export const insightService = {
  getInsight: async (context = 'general'): Promise<InsightResponse> => {
    const response = await apiClient.get(`/assessments/screening/level1/insight?context=${context}`);
    return response.data;
  }
};

export default apiClient;
