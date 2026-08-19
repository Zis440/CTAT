/**
 * Firebase Phone OTP Verification Utility
 * =========================================
 * Handles phone number verification using Firebase Auth.
 * 
 * In production (Firebase configured):
 *   - Uses Firebase Client SDK for signInWithPhoneNumber
 *   - Sends real SMS OTP via Firebase
 *   - Returns a Firebase ID token on successful verification
 * 
 * In dev mode (Firebase not configured):
 *   - Simulates OTP flow
 *   - Returns a dev token that the backend accepts in dev mode
 * 
 * Setup:
 *   1. npm install firebase
 *   2. Set Firebase config in backend .env (FIREBASE_WEB_API_KEY, etc.)
 *   3. The config is fetched from GET /api/otp/firebase-config
 */

import { apiClient } from "@/services/apiClient";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Firebase Config ──────────────────────────────────────────────────────────

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

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send OTP to a phone number.
 * 
 * @param phoneNumber - Phone number with country code (e.g., "+919876543210")
 * @param recaptchaContainerId - DOM element ID for invisible reCAPTCHA
 * @returns true if OTP was sent successfully
 */
export async function sendOTP(
  phoneNumber: string,
  recaptchaContainerId: string = "recaptcha-container"
): Promise<boolean> {
  const firebaseReady = await initFirebase();

  // Ensure phone has country code
  let formattedPhone = phoneNumber.replace(/\s|-/g, "");
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = `+91${formattedPhone}`;
  }

  if (firebaseReady && state.firebaseAuth) {
    try {
      const { signInWithPhoneNumber, RecaptchaVerifier } = await import("firebase/auth");

      // Setup invisible reCAPTCHA
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
    // DEV MODE: Simulate OTP send
    console.log(`[OTP DEV MODE] Simulated OTP sent to ${formattedPhone}`);
    state.confirmationResult = { _devPhone: formattedPhone };
    return true;
  }
}

/**
 * Verify the OTP code entered by the user.
 * 
 * @param otpCode - 6-digit OTP code
 * @returns Firebase ID token (or dev token) that should be sent to backend
 */
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
    // DEV MODE: Accept any 6-digit code
    if (otpCode.length === 6 && /^\d+$/.test(otpCode)) {
      const phone = state.confirmationResult._devPhone || "+910000000000";
      return `dev_verified:${phone}`;
    }
    throw new Error("Invalid OTP code. Must be 6 digits.");
  }
}

/**
 * Verify phone via the backend endpoint (cross-check).
 * 
 * @param firebaseIdToken - Token from verifyOTP()
 * @param phoneNumber - Phone number for cross-checking
 * @returns Verified phone number from the backend
 */
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

/**
 * Check if Firebase is configured (for UI conditional rendering).
 */
export async function isFirebaseConfigured(): Promise<boolean> {
  const { configured } = await getFirebaseConfig();
  return configured;
}
