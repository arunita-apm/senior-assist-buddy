import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { posthog } from "@/lib/posthog";
import { registerPushNotifications } from "@/lib/registerPushNotifications";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate("/", { replace: true });
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        posthog.capture("user_signed_up", { method: "google", is_new_user: _event === "SIGNED_IN" });
        registerPushNotifications(session.user.id);
        navigate("/", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    posthog.capture("signup_button_clicked", { method: "google" });
    setLoading(true);

    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) throw error;
    } catch (error: any) {
      posthog.capture("error_occurred", {
        error_type: "auth_error",
        screen: "auth",
        error_code: error?.code || "unknown",
      });
      toast({
        title: "Sign in failed",
        description: "Could not sign in with Google. Please try again.",
        variant: "destructive",
      });
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
          <p className="text-muted-foreground text-sm text-center">
            Your personal medication &amp; health companion
          </p>
        </div>

        <div className="w-full bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-lg font-semibold text-foreground text-center">Welcome</h2>
          <p className="text-sm text-muted-foreground text-center">
            Sign in to manage your medications and reminders
          </p>

          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-semibold gap-3"
            variant="outline"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? "Signing in…" : "Continue with Google"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center italic">
          Built with care for seniors
        </p>
      </div>
    </div>
  );
};

export default Auth;
