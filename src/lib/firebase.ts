import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAX0Z-zi01Lt9Fek4Y9acOP7-8fQgrbEsw",
  authDomain: "guardian-c7b7e.firebaseapp.com",
  projectId: "guardian-c7b7e",
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

export { RecaptchaVerifier, signInWithPhoneNumber };
export type { ConfirmationResult };
