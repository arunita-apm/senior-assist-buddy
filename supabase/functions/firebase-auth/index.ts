import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

/**
 * Generate a deterministic UUID v5 from a Firebase UID string.
 * Uses a fixed namespace UUID so the same Firebase UID always maps
 * to the same Supabase UUID.
 */
async function firebaseUidToUuid(firebaseUid: string): Promise<string> {
  // SHA-1 of namespace + name (UUID v5 approach simplified)
  const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // DNS namespace UUID
  const namespaceBytes = uuidToBytes(NAMESPACE);
  const nameBytes = new TextEncoder().encode(firebaseUid);

  const combined = new Uint8Array(namespaceBytes.length + nameBytes.length);
  combined.set(namespaceBytes);
  combined.set(nameBytes, namespaceBytes.length);

  const hashBuffer = await crypto.subtle.digest("SHA-1", combined);
  const hashArray = new Uint8Array(hashBuffer);

  // Set version 5
  hashArray[6] = (hashArray[6] & 0x0f) | 0x50;
  // Set variant
  hashArray[8] = (hashArray[8] & 0x3f) | 0x80;

  return bytesToUuid(hashArray);
}

function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i].toString(16).padStart(2, "0"));
  }
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
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

    const apiKey =
      Deno.env.get("FIREBASE_API_KEY") ||
      "AIzaSyAX0Z-zi01Lt9Fek4Y9acOP7-8fQgrbEsw";

    // Verify the Firebase ID token via REST API
    const firebaseUser = await verifyFirebaseToken(firebase_token, apiKey);
    console.log("Firebase user verified:", firebaseUser.uid, firebaseUser.phone);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate deterministic UUID from Firebase UID
    const supabaseUuid = await firebaseUidToUuid(firebaseUser.uid);
    const fakeEmail = `firebase-${firebaseUser.uid}@guardian.local`;
    console.log("Mapped Firebase UID to UUID:", supabaseUuid);

    // Try to find existing user by the deterministic UUID
    const { data: existingById, error: getError } =
      await supabaseAdmin.auth.admin.getUserById(supabaseUuid);

    let supabaseUserId: string;

    if (existingById?.user) {
      supabaseUserId = existingById.user.id;
      console.log("Found existing Supabase user:", supabaseUserId);
    } else {
      console.log("Creating new Supabase user with UUID:", supabaseUuid);
      // Create new Supabase auth user with deterministic UUID
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          id: supabaseUuid,
          email: fakeEmail,
          email_confirm: true,
          password: crypto.randomUUID(),
          user_metadata: {
            firebase_uid: firebaseUser.uid,
            phone: firebaseUser.phone,
          },
        });

      if (createError) {
        console.error("Create user error:", createError.message);
        // If user already exists (race condition), try to get again
        const { data: retryUser } =
          await supabaseAdmin.auth.admin.getUserById(supabaseUuid);
        if (retryUser?.user) {
          supabaseUserId = retryUser.user.id;
        } else {
          throw createError;
        }
      } else {
        supabaseUserId = newUser.user.id;
        console.log("Created new Supabase user:", supabaseUserId);
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

    const { data: otpSession, error: otpError } =
      await supabaseAdmin.auth.verifyOtp({
        token_hash: hashedToken,
        type: "magiclink",
      });

    if (otpError || !otpSession?.session) {
      throw otpError || new Error("Failed to create session");
    }

    console.log("Session created for user:", supabaseUserId);

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
