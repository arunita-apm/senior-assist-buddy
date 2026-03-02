import { useState } from "react";
import { ArrowLeft, Phone, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { profileSchema, validateForm } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface PatientProfileScreenProps {
  onBack: () => void;
}

export const PatientProfileScreen = ({ onBack }: PatientProfileScreenProps) => {
  const { user, setUser, getTodayStats, getCurrentStreak } = useAppContext();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    reminderSound: true,
    sevaNotifications: true,
    vibration: true,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editAge, setEditAge] = useState(String(user.age));
  const [editPhone, setEditPhone] = useState(user.phone);

  const stats = getTodayStats();
  const streak = getCurrentStreak();
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const handleSaveProfile = () => {
    const validation = validateForm(profileSchema, { name: editName, age: editAge, phone: editPhone });
    if (!validation.success) return;
    setUser((prev) => ({
      ...prev,
      name: editName.trim(),
      age: parseInt(editAge, 10) || prev.age,
      phone: editPhone.trim(),
    }));
    setEditOpen(false);
    toast({ description: "Profile updated ✓", duration: 3000, className: "bg-[#E6F7F3] border-[#28BF9C] text-[#28BF9C]" });
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Error signing out", variant: "destructive" });
    } else {
      navigate("/auth", { replace: true });
    }
  };

  const openEdit = () => {
    setEditName(user.name);
    setEditAge(String(user.age));
    setEditPhone(user.phone);
    setEditOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center px-4 py-4">
        <button onClick={onBack} className="p-2 -ml-2 text-foreground min-w-[48px] min-h-[48px] flex items-center justify-center">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-xl font-bold text-foreground -ml-8">My Profile</h1>
        <div className="w-8" />
      </div>

      <div className="px-4 pb-8 space-y-4">
        {/* Profile Card */}
        <Card className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#28BF9C] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">{initials}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-[22px] font-bold text-[#1E293B]">{user.name}</h2>
                <p className="text-[#64748B]">{user.age} years</p>
                {user.phone && (
                  <div className="flex items-center gap-1.5 mt-1 text-[#64748B]">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-sm">{user.phone}</span>
                  </div>
                )}
              </div>
              <button
                onClick={openEdit}
                className="self-start border border-[#28BF9C] text-[#28BF9C] rounded-lg h-10 px-4 text-sm font-medium hover:bg-[#E6F7F3] transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
          <CardContent className="p-5">
            <h3 className="font-bold text-[#1E293B] mb-3">This Week</h3>
            <div className="flex gap-2">
              <div className="flex-1 rounded-xl px-3 py-3 text-center bg-[#E6F7F3]">
                <p className="text-lg font-bold text-[#28BF9C]">{stats.taken}</p>
                <p className="text-xs text-[#28BF9C]">doses taken</p>
              </div>
              <div className="flex-1 rounded-xl px-3 py-3 text-center bg-[#E6F7F3]">
                <p className="text-lg font-bold text-[#28BF9C]">{stats.adherencePercent}%</p>
                <p className="text-xs text-[#28BF9C]">adherence</p>
              </div>
              <div className="flex-1 rounded-xl px-3 py-3 text-center bg-[#FFFBEB]">
                <p className="text-lg font-bold text-[#F59E0B]">{streak}</p>
                <p className="text-xs text-[#F59E0B]">day streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Card */}
        <Card className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0]">
          <CardContent className="p-0">
            <div className="px-5 pt-4 pb-2">
              <h3 className="font-bold text-[#1E293B]">Settings</h3>
            </div>
            <div className="divide-y divide-[#E2E8F0]">
              {([
                { key: "reminderSound" as const, label: "Reminder sound" },
                { key: "sevaNotifications" as const, label: "Seva notifications" },
                { key: "vibration" as const, label: "Vibration" },
              ]).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between px-5 py-4">
                  <span className="text-[#1E293B] font-medium">{label}</span>
                  <Switch
                    checked={settings[key]}
                    onCheckedChange={(checked) => setSettings((s) => ({ ...s, [key]: checked }))}
                    className="data-[state=checked]:bg-[#28BF9C] data-[state=unchecked]:bg-[#CBD5E1]"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full h-14 rounded-2xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold text-base"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll need to sign in again to access your medications and reminders.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut} className="bg-red-500 hover:bg-red-600">
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Footer */}
        <div className="text-center pt-4 pb-2 space-y-1">
          <p className="text-[13px] text-[#94A3B8] italic">Guardian v1.0</p>
          <p className="text-[13px] text-[#94A3B8] italic">Built with care for seniors</p>
        </div>
      </div>

      {/* Edit Profile Drawer */}
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <DrawerContent className="bg-white rounded-t-2xl">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-xl font-bold text-[#1E293B]">Edit Profile</DrawerTitle>
            <DrawerDescription className="sr-only">Edit your profile details</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">
            <div>
              <Label htmlFor="profile-name" className="text-[13px] text-[#64748B]">Name</Label>
              <Input
                id="profile-name"
                name="profile-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor="profile-age" className="text-[13px] text-[#64748B]">Age</Label>
              <Input
                id="profile-age"
                name="profile-age"
                type="number"
                value={editAge}
                onChange={(e) => setEditAge(e.target.value)}
                className="mt-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg"
              />
            </div>
            <div>
              <Label htmlFor="profile-phone" className="text-[13px] text-[#64748B]">Phone</Label>
              <Input
                id="profile-phone"
                name="profile-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="mt-1 h-[52px] bg-[#F8FAFC] border-[#E2E8F0] text-[#1E293B] rounded-lg"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" className="text-[#64748B]" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="bg-[#28BF9C] hover:bg-[#22a888] text-white rounded-lg h-12 px-6 font-bold" onClick={handleSaveProfile}>Save</Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
