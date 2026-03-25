import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { firebaseAuth } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const bridgeFirebaseToSupabase = async (fbUser: import("firebase/auth").User) => {
  // Check if we already have a valid Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.expires_at && session.expires_at * 1000 > Date.now() + 60000) {
    return; // Session still valid
  }

  const idToken = await fbUser.getIdToken(true);
  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firebase-auth`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firebase_token: idToken }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    console.error("Firebase→Supabase bridge failed:", err);
    return;
  }

  const { access_token, refresh_token, user_id } = await resp.json();
  await supabase.auth.setSession({ access_token, refresh_token });
  // Store the Supabase UUID (mapped from Firebase UID) for use in AppContext
  localStorage.setItem("supabaseUserId", user_id);
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const unsub = firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          await bridgeFirebaseToSupabase(user);
        } catch (e) {
          console.error("Supabase bridge error:", e);
        }
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
      setChecking(false);
    });
    return unsub;
  }, []);

  if (checking) return null;
  if (!authenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
