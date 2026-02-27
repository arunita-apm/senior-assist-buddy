import { User, Phone, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/context/AppContext";

export const ProfileView = () => {
  const { user } = useAppContext();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <p className="text-muted-foreground">Age {user.age} • {user.phone}</p>
              <Badge variant="secondary" className="mt-1 capitalize">{user.role}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {user.caregiver && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Caregiver
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-lg font-semibold">{user.caregiver.name}</p>
              <p className="text-muted-foreground capitalize">{user.caregiver.relationship}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{user.caregiver.phone}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
