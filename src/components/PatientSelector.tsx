import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PatientLink {
  patient_id: string;
  patient_name: string | null;
}

interface PatientSelectorProps {
  patients: PatientLink[];
  onSelect: (patientId: string) => void;
}

export const PatientSelector = ({ patients, onSelect }: PatientSelectorProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Users className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Select Patient</h1>
          <p className="text-muted-foreground text-sm text-center">
            You are linked as a caregiver to multiple patients. Choose who to view.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {patients.map((p) => (
            <Card
              key={p.patient_id}
              className={`cursor-pointer transition-all border-2 ${
                selected === p.patient_id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
              onClick={() => setSelected(p.patient_id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-accent-foreground">
                    {(p.patient_name || "P").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {p.patient_name || "Patient"}
                  </h3>
                  <p className="text-sm text-muted-foreground">Tap to select</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          className="w-full h-12 rounded-xl text-base font-semibold"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
