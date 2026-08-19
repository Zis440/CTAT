
import { apiClient } from "@/services/apiClient";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

interface OTPState {
  confirmationResult: any | null;
  firebaseApp: any | null;
  firebaseAuth: any | null;
  isFirebaseConfigured: boolean;
}

const state: OTPState = {
  confirmationResult: null,
  firebaseApp: null,
  firebaseAuth: null,
  isFirebaseConfigured: false,
};

async function getFirebaseConfig(): Promise<{ configured: boolean; config: FirebaseConfig | null }> {
  try {
    const { data } = await apiClient.get("/otp/firebase-config");
    return data;
  } catch {
    return { configured: false, config: null };
  }
}

async function initFirebase(): Promise<boolean> {
  if (state.firebaseApp) return state.isFirebaseConfigured;

  const { configured, config } = await getFirebaseConfig();

  if (!configured || !config?.apiKey) {
    console.log("[OTP] Firebase not configured — running in dev mode.");
    state.isFirebaseConfigured = false;
    return false;
  }

  try {
    const { initializeApp } = await import("firebase/app");
    const { getAuth } = await import("firebase/auth");

    state.firebaseApp = initializeApp(config);
    state.firebaseAuth = getAuth(state.firebaseApp);
    state.isFirebaseConfigured = true;
    console.log("[OTP] Firebase initialized successfully.");
    return true;
  } catch (err) {
    console.warn("[OTP] Firebase initialization failed:", err);
    state.isFirebaseConfigured = false;
    return false;
  }
}

export async function sendOTP(
  phoneNumber: string,
  recaptchaContainerId: string = "recaptcha-container"
): Promise<boolean> {
  const firebaseReady = await initFirebase();

  let formattedPhone = phoneNumber.replace(/\s|-/g, "");
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = `+91${formattedPhone}`;
  }

  if (firebaseReady && state.firebaseAuth) {
    try {
      const { signInWithPhoneNumber, RecaptchaVerifier } = await import("firebase/auth");

      const recaptchaVerifier = new RecaptchaVerifier(
        state.firebaseAuth,
        recaptchaContainerId,
        { size: "invisible" }
      );

      state.confirmationResult = await signInWithPhoneNumber(
        state.firebaseAuth,
        formattedPhone,
        recaptchaVerifier
      );

      return true;
    } catch (err: any) {
      console.error("[OTP] Failed to send OTP:", err);
      throw new Error(err.message || "Failed to send OTP. Please try again.");
    }
  } else {

    console.log(`[OTP DEV MODE] Simulated OTP sent to ${formattedPhone}`);
    state.confirmationResult = { _devPhone: formattedPhone };
    return true;
  }
}

export async function verifyOTP(otpCode: string): Promise<string> {
  if (!state.confirmationResult) {
    throw new Error("No OTP request found. Please send OTP first.");
  }

  if (state.isFirebaseConfigured && state.confirmationResult.confirm) {
    try {
      const userCredential = await state.confirmationResult.confirm(otpCode);
      const idToken = await userCredential.user.getIdToken();
      return idToken;
    } catch (err: any) {
      if (err.code === "auth/invalid-verification-code") {
        throw new Error("Invalid OTP code. Please check and try again.");
      }
      throw new Error(err.message || "OTP verification failed.");
    }
  } else {

    if (otpCode.length === 6 && /^\d+$/.test(otpCode)) {
      const phone = state.confirmationResult._devPhone || "+910000000000";
      return `dev_verified:${phone}`;
    }
    throw new Error("Invalid OTP code. Must be 6 digits.");
  }
}

export async function verifyPhoneWithBackend(
  firebaseIdToken: string,
  phoneNumber: string
): Promise<{ verified: boolean; phone_number: string }> {
  try {
    const { data } = await apiClient.post("/otp/verify-phone", {
      firebase_id_token: firebaseIdToken,
      phone_number: phoneNumber,
    });
    return data;
  } catch (err: any) {
    const detail = err?.response?.data?.detail || "Phone verification failed.";
    throw new Error(detail);
  }
}

export async function isFirebaseConfigured(): Promise<boolean> {
  const { configured } = await getFirebaseConfig();
  return configured;
}
