import { supabase } from "@/integrations/supabase/client";

export async function notifyCaregiver(userId: string, medName: string) {
  const { data: user } = await supabase
    .from("users")
    .select("name, caregiver_name, caregiver_email")
    .eq("id", userId)
    .single();

  if (!user?.caregiver_email) return;

  await supabase.functions.invoke("notify-caregiver", {
    body: {
      patientName: user.name,
      caregiverName: user.caregiver_name,
      caregiverEmail: user.caregiver_email,
      medName,
    },
  });

  await supabase.from("caregiver_notifications").insert({
    user_id: userId,
    message: `${user.name} missed ${medName} 3 times`,
    channel: "email",
    status: "sent",
  });
}
