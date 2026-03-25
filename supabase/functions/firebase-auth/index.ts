import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyFirebaseToken(
  idToken: string,
  apiKey: string
): Promise<{ uid: string; phone?: string; email?: string }> {
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error?.message || "Firebase token verification failed");
  }

  const data = await resp.json();
  const user = data.users?.[0];
  if (!user) throw new Error("No user found for this token");

  return {
    uid: user.localId,
    phone: user.phoneNumber,
    email: user.email,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firebase_token } = await req.json();
    if (!firebase_token) {
      return new Response(JSON.stringify({ error: "Missing firebase_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIREBASE_API_KEY") || "AIzaSyAX0Z-zi01Lt9Fek4Y9acOP7-8fQgrbEsw";

    // Verify the Firebase ID token via REST API
    const firebaseUser = await verifyFirebaseToken(firebase_token, apiKey);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const fakeEmail = `firebase-${firebaseUser.uid}@guardian.local`;
    let supabaseUserId: string;

    // Try to get existing user by ID first
    const { data: existingById } = await supabaseAdmin.auth.admin.getUserById(firebaseUser.uid);
    
    if (existingById?.user) {
      supabaseUserId = existingById.user.id;
    } else {
      // Create new Supabase auth user with Firebase UID as the ID
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          id: firebaseUser.uid,
          email: fakeEmail,
          email_confirm: true,
          password: crypto.randomUUID(),
          user_metadata: {
            firebase_uid: firebaseUser.uid,
            phone: firebaseUser.phone,
          },
        });

      if (createError) {
        if (createError.message?.includes("already") ) {
          const { data: retryUser } = await supabaseAdmin.auth.admin.getUserById(firebaseUser.uid);
          if (retryUser?.user) {
            supabaseUserId = retryUser.user.id;
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      } else {
        supabaseUserId = newUser.user.id;
      }
    }

    // Generate a magic link and verify OTP to get session tokens
    const { data: sessionData, error: signInError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: fakeEmail,
      });

    if (signInError || !sessionData) {
      throw signInError || new Error("Failed to generate session link");
    }

    const hashedToken = sessionData.properties?.hashed_token;
    if (!hashedToken) {
      throw new Error("No hashed token in response");
    }

    const { data: otpSession, error: otpError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: hashedToken,
      type: "magiclink",
    });

    if (otpError || !otpSession?.session) {
      throw otpError || new Error("Failed to create session");
    }

    return new Response(
      JSON.stringify({
        access_token: otpSession.session.access_token,
        refresh_token: otpSession.session.refresh_token,
        user_id: supabaseUserId!,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("firebase-auth error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
