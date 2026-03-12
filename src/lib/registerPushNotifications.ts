import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registers for FCM push notifications on native platforms
 * and saves the token to the users table.
 * No-ops silently when running in a browser.
 */
export async function registerPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== "granted") {
    console.warn("Push notification permission not granted");
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    console.log("FCM token received:", token.value);
    const { error } = await supabase
      .from("users")
      .update({ fcm_token: token.value })
      .eq("id", userId);

    if (error) {
      console.error("Failed to save FCM token:", error);
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("Push registration error:", err.error);
  });
}
