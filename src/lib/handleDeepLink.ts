import { Capacitor } from "@capacitor/core";
import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sets up a deep link listener for Capacitor native apps.
 * Handles the OAuth callback from com.guardian.seniorapp://login-callback
 * by extracting tokens from the URL fragment and setting the Supabase session.
 */
export function setupDeepLinkListener(): (() => void) | undefined {
  if (!Capacitor.isNativePlatform()) return undefined;

  const handle = App.addListener("appUrlOpen", async (event: URLOpenListenerEvent) => {
    const url = event.url;

    // Only handle our login callback scheme
    if (!url.startsWith("com.guardian.seniorapp://login-callback")) return;

    try {
      // Supabase appends tokens as a URL fragment (#access_token=...&refresh_token=...)
      const hashIndex = url.indexOf("#");
      if (hashIndex === -1) {
        console.error("Deep link missing hash fragment:", url);
        return;
      }

      const fragment = url.substring(hashIndex + 1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("Failed to set session from deep link:", error);
        } else {
          console.log("Session set successfully from deep link");
        }
      } else {
        console.error("Missing tokens in deep link callback");
      }
    } catch (err) {
      console.error("Error handling deep link:", err);
    }
  });

  return () => {
    handle.then((h) => h.remove());
  };
}
