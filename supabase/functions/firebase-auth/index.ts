import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache Firebase public keys with expiry
let cachedKeys: Record<string, CryptoKey> = {};
let cacheExpiry = 0;

async function getFirebasePublicKeys(): Promise<Record<string, CryptoKey>> {
  if (Date.now() < cacheExpiry && Object.keys(cachedKeys).length > 0) {
    return cachedKeys;
  }

  const resp = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );
  const cacheControl = resp.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1]) * 1000 : 3600000;
  cacheExpiry = Date.now() + maxAge;

  const certs: Record<string, string> = await resp.json();
  const keys: Record<string, CryptoKey> = {};

  for (const [kid, pem] of Object.entries(certs)) {
    const der = pemToDer(pem);
    keys[kid] = await crypto.subtle.importKey(
      "spki",
      der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }

  cachedKeys = keys;
  return keys;
}

function pemToDer(pem: string): ArrayBuffer {
  const lines = pem.split("\n").filter((l) => !l.startsWith("-----"));
  const b64 = lines.join("");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

async function verifyFirebaseToken(
  idToken: string,
  projectId: string
): Promise<{ uid: string; phone?: string; email?: string }> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const headerJson = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));

  // Verify claims
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error("Token expired");
  if (payload.iat > now + 5) throw new Error("Token issued in the future");
  if (payload.aud !== projectId) throw new Error("Invalid audience");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`)
    throw new Error("Invalid issuer");
  if (!payload.sub || typeof payload.sub !== "string")
    throw new Error("Invalid subject");

  // Verify signature
  const keys = await getFirebasePublicKeys();
  const key = keys[headerJson.kid];
  if (!key) throw new Error("Unknown signing key");

  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlDecode(parts[2]);

  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
  if (!valid) throw new Error("Invalid signature");

  return {
    uid: payload.sub,
    phone: payload.phone_number,
    email: payload.email,
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

    const projectId = Deno.env.get("FIREBASE_PROJECT_ID") || "guardian-c7b7e";

    // Verify the Firebase ID token
    const firebaseUser = await verifyFirebaseToken(firebase_token, projectId);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Try to find existing Supabase auth user by Firebase UID
    // We use a deterministic email based on Firebase UID
    const fakeEmail = `firebase-${firebaseUser.uid}@guardian.local`;

    let supabaseUserId: string;

    // Try to get existing user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === fakeEmail
    );

    if (existingUser) {
      supabaseUserId = existingUser.id;
    } else {
      // Create new Supabase auth user with the Firebase UID as the Supabase user ID
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          id: firebaseUser.uid,
          email: fakeEmail,
          email_confirm: true,
          password: crypto.randomUUID(), // random password, never used
          user_metadata: {
            firebase_uid: firebaseUser.uid,
            phone: firebaseUser.phone,
          },
        });

      if (createError) {
        // If user already exists with this ID (race condition), try to fetch
        if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
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

    // Generate a session for this user using signInWithPassword won't work
    // Instead, we generate a custom JWT
    // Use admin.generateLink to get a magic link, then extract the token
    // Actually, the simplest approach: use admin API to create a session directly

    // The Supabase admin SDK doesn't have a direct "create session" method,
    // so we sign in on behalf of the user using the admin API
    const { data: sessionData, error: signInError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: fakeEmail,
      });

    if (signInError || !sessionData) {
      throw signInError || new Error("Failed to generate session link");
    }

    // Extract the hashed_token and use it to verify OTP server-side
    const hashedToken = sessionData.properties?.hashed_token;
    if (!hashedToken) {
      throw new Error("No hashed token in response");
    }

    // Verify the OTP to get actual session tokens
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
