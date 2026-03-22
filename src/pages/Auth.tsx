import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { posthog } from "@/lib/posthog";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });
  }, [navigate]);

  const handleSendOtp = async () => {
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 10) {
      toast({ title: "Invalid phone", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }

    setLoading(true);
    posthog.capture("otp_send_clicked", { method: "phone_otp" });

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: cleanPhone });
      if (error) throw error;

      toast({ title: "OTP sent!", description: "Check your phone for the verification code." });
      setStep("otp");
    } catch (error: any) {
      posthog.capture("error_occurred", { error_type: "otp_send_error", screen: "auth", error_code: error?.code || "unknown" });
      toast({ title: "Failed to send OTP", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit code.", variant: "destructive" });
      return;
    }

    setLoading(true);
    posthog.capture("otp_verify_clicked", { method: "phone_otp" });

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: otp,
        type: "sms",
      });
      if (error) throw error;

      if (data.session) {
        posthog.identify(data.session.user.id, { phone: phone.trim() });
        posthog.capture("user_signed_in", { method: "phone_otp" });
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      posthog.capture("error_occurred", { error_type: "otp_verify_error", screen: "auth", error_code: error?.code || "unknown" });
      toast({ title: "Verification failed", description: error?.message || "Invalid OTP. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
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
                  onClick={() => { setStep("phone"); setOtp(""); }}
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
