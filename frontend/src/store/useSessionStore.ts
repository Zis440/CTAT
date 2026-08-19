// ─── Session Store ──────────────────────────────────────────────────────────
// Zustand store for the active TAT assessment session.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface PatientInfo {
  id?: string;
  name: string;
  age?: number;
  effectiveAge?: number;
  gender?: string;
}

interface SessionState {
  /** Current active session ID */
  sessionId: string | null;
  /** Patient associated with this session */
  patientId: string | null;
  patientName: string | null;
  /** Full patient info set during intake */
  patient: PatientInfo | null;
  /** Active patient ID used during session (alias for patientId) */
  activePatientId: string | null;
  /** Test type being administered */
  testType: string | null;
  /** Which card set variant (e.g., "standard", "custom") */
  cardSet: string;
  /** Current card index in the assessment */
  currentCardIndex: number;
  /** Total number of cards in this assessment */
  totalCards: number;
  /** Selected TAT card IDs for this session */
  selectedCards: string[];

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Set patient info from intake form */
  setPatient: (patient: PatientInfo) => void;
  /** Set the test type being administered */
  setTestType: (testType: string) => void;
  /** Toggle a card selection on/off */
  toggleCard: (cardId: string) => void;
  /** Initialize a new session */
  startSession: (params: {
    sessionId: string;
    patientId: string;
    patientName: string;
    testType: string;
    cardSet?: string;
    totalCards?: number;
  }) => void;
  /** Move to the next card */
  nextCard: () => void;
  /** Move to a specific card */
  goToCard: (index: number) => void;
  /** Whether user wants manual psychologist validation for 100 Rs */
  requestPsychologistValidation: boolean;
  /** Toggle validation requirement */
  toggleValidation: () => void;
  /** Clear session state */
  clearSession: () => void;
  /** Alias for clearSession */
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      patientId: null,
      patientName: null,
      patient: null,
      activePatientId: null,
      testType: null,
      cardSet: "standard",
      currentCardIndex: 0,
      totalCards: 31,
      selectedCards: [],
      requestPsychologistValidation: false,

      setPatient: (patient) =>
        set(() => {
          return {
            patient,
            patientId: patient.id ?? null,
            patientName: patient.name,
            activePatientId: patient.id ?? null,
            selectedCards: [],
            currentCardIndex: 0,
            requestPsychologistValidation: false,
          };
        }),

      setTestType: (testType) => set({ testType }),

      toggleCard: (cardId) =>
        set((state) => {
          const isSelected = state.selectedCards.includes(cardId);
          return {
            selectedCards: isSelected
              ? state.selectedCards.filter((id) => id !== cardId)
              : [...state.selectedCards, cardId],
          };
        }),

      startSession: ({ sessionId, patientId, patientName, testType, cardSet, totalCards }) =>
        set({
          sessionId,
          patientId,
          patientName,
          activePatientId: patientId,
          testType,
          cardSet: cardSet ?? "standard",
          currentCardIndex: 0,
          totalCards: totalCards ?? 31,
          requestPsychologistValidation: false,
        }),

      nextCard: () =>
        set((state) => ({
          currentCardIndex: Math.min(state.currentCardIndex + 1, state.totalCards - 1),
        })),

      goToCard: (index) => set({ currentCardIndex: index }),

      toggleValidation: () => set((state) => ({ requestPsychologistValidation: !state.requestPsychologistValidation })),

      clearSession: () =>
        set({
          sessionId: null,
          patientId: null,
          patientName: null,
          patient: null,
          activePatientId: null,
          testType: null,
          cardSet: "standard",
          currentCardIndex: 0,
          totalCards: 31,
          selectedCards: [],
          requestPsychologistValidation: false,
        }),

      resetSession: () => get().clearSession(),
    }),
    {
      name: "tat-session-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
