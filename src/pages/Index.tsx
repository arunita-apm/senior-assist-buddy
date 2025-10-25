import { useState } from "react";
import { Calendar, Clock, Pill, Bell, Activity, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardView } from "@/components/DashboardView";
import { MedicationView } from "@/components/MedicationView";
import { AppointmentView } from "@/components/AppointmentView";
import { ActivityView } from "@/components/ActivityView";
import { CaregiverView } from "@/components/CaregiverView";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <Pill className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">MediCare</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">Your Health Companion</p>
              </div>
            </div>
            <Bell className="w-8 h-8 text-primary cursor-pointer hover:scale-110 transition-transform" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8 h-auto p-2 bg-card/60 backdrop-blur-sm">
            <TabsTrigger 
              value="dashboard" 
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Activity className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-medium">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="medications"
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Pill className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-medium">Medications</span>
            </TabsTrigger>
            <TabsTrigger 
              value="appointments"
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-medium">Appointments</span>
            </TabsTrigger>
            <TabsTrigger 
              value="activity"
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Clock className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-medium">Activity</span>
            </TabsTrigger>
            <TabsTrigger 
              value="caregivers"
              className="flex flex-col gap-2 py-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-medium">Caregivers</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <DashboardView />
          </TabsContent>

          <TabsContent value="medications">
            <MedicationView />
          </TabsContent>

          <TabsContent value="appointments">
            <AppointmentView />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityView />
          </TabsContent>

          <TabsContent value="caregivers">
            <CaregiverView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
