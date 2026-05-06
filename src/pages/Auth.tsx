import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { posthog } from "@/lib/posthog";
import { firebaseAuth, RecaptchaVerifier, signInWithPhoneNumber } from "@/lib/firebase";
import type { ConfirmationResult } from "@/lib/firebase";
import { lovable } from "@/integrations/lovable";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    posthog.capture("google_signin_clicked");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: "Google sign-in failed", description: (result.error as Error)?.message || "Please try again.", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate("/", { replace: true });
    } catch (e: any) {
      toast({ title: "Google sign-in failed", description: e?.message || "Please try again.", variant: "destructive" });
      setLoading(false);
    }
  };

  const clearRecaptcha = () => {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // ignore stale widget cleanup errors
    }

    recaptchaRef.current = null;

    const container = document.getElementById("recaptcha-container");
    if (container) {
      container.innerHTML = "";
    }
  };

  useEffect(() => {
    // If already logged in via Firebase, skip to dashboard
    const unsub = firebaseAuth.onAuthStateChanged((user) => {
      if (user) navigate("/", { replace: true });
    });

    return () => {
      unsub();
      clearRecaptcha();
    };
  }, [navigate]);

  const setupRecaptcha = () => {
    if (!recaptchaRef.current) {
      const container = document.getElementById("recaptcha-container");
      if (container) {
        container.innerHTML = "";
      }

      recaptchaRef.current = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
        size: "invisible",
      });
    }

    return recaptchaRef.current;
  };

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }

    setLoading(true);
    posthog.capture("otp_send_clicked", { method: "firebase_phone" });

    try {
      const verifier = setupRecaptcha();
      const result = await signInWithPhoneNumber(firebaseAuth, cleanPhone, verifier!);
      confirmationRef.current = result;
      toast({ title: "OTP sent!", description: "Check your phone for the verification code." });
      setStep("otp");
    } catch (error: any) {
      console.error("Firebase OTP send error:", error);
      posthog.capture("error_occurred", { error_type: "otp_send_error", screen: "auth", error_code: error?.code || "unknown" });

      const description = error?.code === "auth/billing-not-enabled"
        ? "Firebase phone SMS is still disabled for this project. Please confirm billing is enabled on the exact guardian-c7b7e Firebase/Google Cloud project and wait a few minutes for it to propagate."
        : error?.message || "Please try again.";

      toast({ title: "Failed to send OTP", description, variant: "destructive" });
      clearRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit code.", variant: "destructive" });
      return;
    }

    if (!confirmationRef.current) {
      toast({ title: "Session expired", description: "Please resend OTP.", variant: "destructive" });
      setStep("phone");
      return;
    }

    setLoading(true);
    posthog.capture("otp_verify_clicked", { method: "firebase_phone" });

    try {
      const result = await confirmationRef.current.confirm(otp);
      const fbUser = result.user;

      posthog.identify(fbUser.phoneNumber || fbUser.uid, { phone: phone.trim() });
      posthog.capture("user_signed_in", { method: "firebase_phone" });

      // Store Firebase UID for app context to pick up
      localStorage.setItem("firebaseUid", fbUser.uid);
      localStorage.setItem("firebasePhone", fbUser.phoneNumber || phone.trim());

      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Firebase OTP verify error:", error);
      posthog.capture("error_occurred", { error_type: "otp_verify_error", screen: "auth", error_code: error?.code || "unknown" });
      toast({ title: "Verification failed", description: error?.message || "Invalid OTP. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div id="recaptcha-container" />
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Guardian</h1>
          <p className="text-muted-foreground text-sm text-center">Your personal medication &amp; health companion</p>
        </div>

        <div className="w-full bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-5">
          {step === "phone" ? (
            <>
              <h2 className="text-lg font-semibold text-foreground text-center">Sign In</h2>
              <p className="text-sm text-muted-foreground text-center">
                Enter your phone number to receive a verification code
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                    className="text-lg tracking-wide"
                  />
                </div>
              </div>
              <Button onClick={handleSendOtp} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
                {loading ? "Sending…" : "Send OTP"}
              </Button>
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-12 rounded-xl text-base font-semibold"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.17 3.58-8.86z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"/>
                  <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.29V6.62H1.29A11.98 11.98 0 0 0 0 12c0 1.94.46 3.78 1.29 5.38l3.98-3.09z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.18 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"/>
                </svg>
                Continue with Google
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground text-center">Verify OTP</h2>
              <p className="text-sm text-muted-foreground text-center">
                Enter the 6-digit code sent to <span className="font-medium text-foreground">{phone}</span>
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="otp" className="text-foreground">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    className="text-2xl tracking-[0.5em] text-center font-mono"
                    autoFocus
                  />
                </div>
              </div>
              <Button onClick={handleVerifyOtp} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
                {loading ? "Verifying…" : "Verify & Sign In"}
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep("phone"); setOtp(""); confirmationRef.current = null; clearRecaptcha(); }}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Change number
                </button>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center italic">Built with care for seniors</p>
      </div>
    </div>
  );
};

export default Auth;
