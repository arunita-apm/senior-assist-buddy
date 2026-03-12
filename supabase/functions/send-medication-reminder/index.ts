import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Google OAuth2 JWT for FCM V1 ---
async function getAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const unsignedToken = `${encode(header)}.${encode(payload)}`;

  // Import the RSA private key
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sig}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to get access token: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date and time
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Calculate time window: current time to +1 minute
    const pad = (n: number) => String(n).padStart(2, "0");
    const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
    const oneMinLater = new Date(now.getTime() + 60_000);
    const endTime = `${pad(oneMinLater.getHours())}:${pad(oneMinLater.getMinutes())}:00`;

    console.log(`Checking reminders for ${today} between ${currentTime} and ${endTime}`);

    // Query pending reminders within the next minute
    const { data: reminders, error: remErr } = await supabase
      .from("reminders")
      .select("id, medication_id, user_id, scheduled_time")
      .eq("scheduled_date", today)
      .eq("status", "pending")
      .gte("scheduled_time", currentTime)
      .lt("scheduled_time", endTime);

    if (remErr) {
      console.error("Error querying reminders:", remErr);
      throw remErr;
    }

    if (!reminders || reminders.length === 0) {
      console.log("No pending reminders in this window.");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${reminders.length} reminder(s) to process.`);

    // Get Firebase service account and access token
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
    const serviceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);

    let sentCount = 0;

    for (const reminder of reminders) {
      // Get medication info
      const { data: med } = await supabase
        .from("medications")
        .select("name, dosage")
        .eq("id", reminder.medication_id)
        .single();

      // Get user's FCM token
      const { data: user } = await supabase
        .from("users")
        .select("fcm_token")
        .eq("id", reminder.user_id)
        .single();

      if (!user?.fcm_token) {
        console.log(`No FCM token for user ${reminder.user_id}, skipping.`);
        continue;
      }

      const medName = med?.name ?? "your medication";
      const dosage = med?.dosage ? ` (${med.dosage})` : "";

      // Send FCM V1 push notification
      const fcmRes = await fetch(
        "https://fcm.googleapis.com/v1/projects/guardian-c7b7e/messages:send",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: user.fcm_token,
              notification: {
                title: "Time for your medication 💊",
                body: `${medName}${dosage}`,
              },
              android: {
                priority: "HIGH",
                notification: {
                  channel_id: "guardian_reminders",
                  sound: "guardian_reminder",
                },
              },
            },
          }),
        }
      );

      if (fcmRes.ok) {
        sentCount++;
        console.log(`Notification sent for reminder ${reminder.id}`);
      } else {
        const errText = await fcmRes.text();
        console.error(`FCM error for reminder ${reminder.id}:`, errText);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, total: reminders.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-medication-reminder error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
