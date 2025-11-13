import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StatusSchedule = () => {
  const navigate = useNavigate();

  // Feature is DISABLED - Show message instead
  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="h-5 w-5" />
            Fonctionnalité en Cours de Développement
          </CardTitle>
          <CardDescription className="text-yellow-600 dark:text-yellow-300">
            La programmation de statuts WhatsApp sera bientôt disponible
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Cette fonctionnalité est actuellement en cours de développement. 
            Nous travaillons activement pour vous offrir la possibilité de programmer vos statuts WhatsApp.
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Elle sera disponible très prochainement. Merci de votre patience !
          </p>
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/40"
          >
            Retour au Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatusSchedule;
