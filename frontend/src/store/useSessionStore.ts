
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

  sessionId: string | null;

  patientId: string | null;
  patientName: string | null;

  patient: PatientInfo | null;

  activePatientId: string | null;

  testType: string | null;

  cardSet: string;

  currentCardIndex: number;

  totalCards: number;

  selectedCards: string[];

  setPatient: (patient: PatientInfo) => void;

  setTestType: (testType: string) => void;

  toggleCard: (cardId: string) => void;

  startSession: (params: {
    sessionId: string;
    patientId: string;
    patientName: string;
    testType: string;
    cardSet?: string;
    totalCards?: number;
  }) => void;

  nextCard: () => void;

  goToCard: (index: number) => void;

  requestPsychologistValidation: boolean;

  toggleValidation: () => void;

  clearSession: () => void;

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
