import { Plus, Pill, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const medications = [
  {
    id: 1,
    name: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    times: ["8:00 AM"],
    instructions: "Take with water, with or without food",
  },
  {
    id: 2,
    name: "Metformin",
    dosage: "500mg",
    frequency: "Twice daily",
    times: ["8:00 AM", "8:00 PM"],
    instructions: "Take with meals to reduce stomach upset",
  },
  {
    id: 3,
    name: "Atorvastatin",
    dosage: "20mg",
    frequency: "Once daily",
    times: ["8:00 PM"],
    instructions: "Take at bedtime",
  },
];

export const MedicationView = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">My Medications</h2>
        <Button size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Add Medication
        </Button>
      </div>

      <div className="grid gap-6">
        {medications.map((med) => (
          <Card key={med.id} className="overflow-hidden hover:shadow-lg transition-all">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary-glow/10 border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl mb-2">{med.name}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        {med.dosage}
                      </Badge>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {med.frequency}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Schedule
                </h4>
                <div className="flex flex-wrap gap-2">
                  {med.times.map((time, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium text-lg"
                    >
                      {time}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2">Instructions</h4>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {med.instructions}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="lg" className="flex-1">
                  Edit
                </Button>
                <Button variant="outline" size="lg" className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
