import { useState } from "react";
import { posthog } from "@/lib/posthog";
import { supabase } from "@/integrations/supabase/client";
import { Users, Phone, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { caregiverSchema, validateForm } from "@/lib/validation";

const RELATIONSHIPS = ["Son", "Daughter", "Spouse", "Sibling", "Friend", "Other"];

export const CaregiverView = () => {
  const { user, setUser, userRole } = useAppContext();
  const isCaregiver = userRole === "caregiver";
  const { toast } = useToast();
  const caregiver = user.caregiver;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [cgName, setCgName] = useState("");
  const [cgRelationship, setCgRelationship] = useState("");
  const [cgPhone, setCgPhone] = useState("");
  const [cgEmail, setCgEmail] = useState("");
  const [cgNote, setCgNote] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const openAdd = () => {
    setIsEditing(false);
    setCgName("");
    setCgRelationship("");
    setCgPhone("");
    setCgEmail("");
    setCgNote("");
    setErrors({});
    setDrawerOpen(true);
  };

  const openEdit = () => {
    if (!caregiver) return;
    setIsEditing(true);
    setCgName(caregiver.name);
    setCgRelationship(caregiver.relationship);
    setCgPhone(caregiver.phone);
    setCgEmail(caregiver.email || "");
    setCgNote(caregiver.note || "");
    setErrors({});
    setDrawerOpen(true);
  };

  const handleSave = () => {
    posthog.capture("add_caregiver_clicked");
    const validation = validateForm(caregiverSchema, { name: cgName, relationship: cgRelationship, phone: cgPhone, email: cgEmail, note: cgNote });
    if (!validation.success) {
      const errs: Record<string, boolean> = {};
      Object.keys((validation as { success: false; errors: Record<string, string> }).errors).forEach((k) => { errs[k] = true; });
      setErrors(errs);
      return;
    }

    const newCg = {
      id: caregiver?.id || `cg-${Date.now()}`,
      name: cgName.trim(),
      relationship: cgRelationship.toLowerCase(),
      phone: cgPhone.trim().replace(/^(\+91)?/, ""),
      email: cgEmail.trim() || undefined,
      note: cgNote.trim() || undefined,
    };
    setUser((prev) => ({ ...prev, caregiver: newCg }));
    setDrawerOpen(false);
    posthog.capture("caregiver_saved", { has_email: !!cgEmail.trim() });
    toast({ description: isEditing ? "Caregiver updated ✓" : "Caregiver added ✓", duration: 3000, className: "bg-[#E6F7F3] border-[#28BF9C] text-[#28BF9C]" });
  };

  const formatPhone = (p: string) => p.startsWith("+") ? p : `+91 ${p}`;

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!caregiver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-[#E6F7F3] flex items-center justify-center">
          <Users className="w-8 h-8 text-[#28BF9C]" />
        </div>
        <h2 className="text-lg font-bold text-[#1E293B]">No caregiver added yet</h2>
        <p className="text-sm text-[#64748B] text-center max-w-[280px]">
          Your caregiver will be notified if you miss medications
        </p>
        {!isCaregiver && (
          <Button
            className="bg-[#28BF9C] hover:bg-[#22a888] text-white rounded-xl h-[52px] w-[220px] font-bold text-base"
            onClick={openAdd}
          >
            + Add Caregiver
          </Button>
        )}

        {!isCaregiver && renderDrawer()}
      </div>
    );
  }

  // ── Filled state ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1E293B]">Caregiver</h1>

      <Card className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#E6F7F3] flex items-center justify-center flex-shrink-0">
              <Users className="w-7 h-7 text-[#28BF9C]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1E293B]">{caregiver.name}</h2>
              <span className="inline-block mt-1 text-sm font-medium px-3 py-0.5 rounded-full bg-[#E6F7F3] text-[#28BF9C] capitalize">
                {caregiver.relationship}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#64748B]">
              <Phone className="w-4 h-4" />
              <span className="text-sm">{formatPhone(caregiver.phone)}</span>
            </div>
            {caregiver.email && (
              <div className="flex items-center gap-2 text-[#64748B]">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{caregiver.email}</span>
              </div>
            )}
          </div>

          {!isCaregiver && (
            <button onClick={openEdit} className="text-primary text-base font-medium w-full text-center min-h-[48px] flex items-center justify-center">
              Edit Caregiver
            </button>
          )}
        </CardContent>
      </Card>

      <p className="text-[13px] text-muted-foreground text-center italic px-4">
        Seva will notify your caregiver if you miss 3 medication reminders in a row.
      </p>
      <p className="text-[13px] text-muted-foreground text-center italic px-4">
        Weekly adherence report will be sent to your caregiver every Monday.
      </p>

      {!isCaregiver && renderDrawer()}
    </div>
  );

  function renderDrawer() {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-white rounded-t-2xl max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl font-bold text-[#1E293B]">
              {isEditing ? "Edit Caregiver" : "Add Caregiver"}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {isEditing ? "Edit caregiver details" : "Add a new caregiver"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4 space-y-4">
            <div>
              <Label htmlFor="cg-name" className="text-[13px] text-[#64748B]">Full Name *</Label>
              <Input
                id="cg-name"
                name="cg-name"
                value={cgName}
                onChange={(e) => { setCgName(e.target.value); setErrors((prev) => ({ ...prev, name: false })); }}
                placeholder="e.g. Priya Kumar"
                className={`mt-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg ${errors.name ? "border-[#EF4444]" : ""}`}
              />
            </div>
            <div>
              <Label htmlFor="cg-relationship" className="text-[13px] text-[#64748B]">Relationship *</Label>
              <Select value={cgRelationship} onValueChange={(v) => { setCgRelationship(v); setErrors((prev) => ({ ...prev, relationship: false })); }}>
                <SelectTrigger id="cg-relationship" className={`mt-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg ${errors.relationship ? "border-[#EF4444]" : ""}`}>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cg-phone" className="text-[13px] text-[#64748B]">Phone Number *</Label>
              <div className="flex gap-2 mt-1">
                <span className="h-[52px] px-3 flex items-center bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-[#64748B] text-sm">+91</span>
                <Input
                  id="cg-phone"
                  name="cg-phone"
                  value={cgPhone}
                  onChange={(e) => { setCgPhone(e.target.value); setErrors((prev) => ({ ...prev, phone: false })); }}
                  placeholder="9876543210"
                  className={`flex-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg ${errors.phone ? "border-[#EF4444]" : ""}`}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="cg-email" className="text-[13px] text-[#64748B]">Email *</Label>
              <Input
                id="cg-email"
                name="cg-email"
                type="email"
                value={cgEmail}
                onChange={(e) => { setCgEmail(e.target.value); setErrors((prev) => ({ ...prev, email: false })); }}
                placeholder="email@example.com"
                className={`mt-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg ${errors.email ? "border-[#EF4444]" : ""}`}
              />
            </div>
            <div>
              <Label htmlFor="cg-note" className="text-[13px] text-[#64748B]">Note (optional)</Label>
              <Textarea
                id="cg-note"
                name="cg-note"
                value={cgNote}
                onChange={(e) => setCgNote(e.target.value)}
                placeholder="Any special notes..."
                rows={2}
                className="mt-1 bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" className="text-[#64748B]" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              <Button className="bg-[#28BF9C] hover:bg-[#22a888] text-white rounded-lg h-12 px-6 font-bold" onClick={handleSave}>
                {isEditing ? "Save Changes" : "Add Caregiver"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }
};
