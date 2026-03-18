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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const savedUserId = localStorage.getItem("userId");
    if (savedUserId) navigate("/", { replace: true });
  }, [navigate]);

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please enter email and password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    posthog.capture("signin_button_clicked", { method: "custom_email" });

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.trim().toLowerCase())
        .eq("password", password)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({ title: "Invalid email or password", description: "Please check your credentials and try again.", variant: "destructive" });
        return;
      }

      localStorage.setItem("userId", data.id);
      posthog.identify(data.id, { name: data.name, email: data.email });
      posthog.capture("user_signed_in", { method: "custom_email" });
      navigate("/", { replace: true });
    } catch (error: any) {
      posthog.capture("error_occurred", {
        error_type: "auth_error",
        screen: "auth",
        error_code: error?.code || "unknown",
      });
      toast({
        title: "Sign in failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email || !password) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    posthog.capture("signup_button_clicked", { method: "custom_email" });

    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        toast({ title: "Email already registered", description: "Please sign in instead.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: "patient",
        })
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem("userId", data.id);
      posthog.identify(data.id, { name: data.name, email: data.email });
      posthog.capture("user_signed_up", { method: "custom_email" });
      toast({ title: "Account created!", description: "Welcome to Guardian." });
      navigate("/", { replace: true });
    } catch (error: any) {
      posthog.capture("error_occurred", {
        error_type: "signup_error",
        screen: "auth",
        error_code: error?.code || "unknown",
      });
      toast({
        title: "Sign up failed",
        description: error?.message || "Please try again.",
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
          <p className="text-muted-foreground text-sm text-center">Your personal medication &amp; health companion</p>
        </div>

        <div className="w-full bg-card rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-lg font-semibold text-foreground text-center">
            {isSignUp ? "Create Account" : "Welcome"}
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            {isSignUp ? "Sign up to get started" : "Sign in to manage your medications and reminders"}
          </p>

          <div className="flex flex-col gap-3">
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-foreground">Name</Label>
                <Input id="name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoComplete="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} />
            </div>
          </div>

          <Button onClick={isSignUp ? handleSignUp : handleSignIn} disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
            {loading ? "Please wait…" : isSignUp ? "Sign Up" : "Sign In"}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-medium hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center italic">Built with care for seniors</p>
      </div>
    </div>
  );
};

export default Auth;
