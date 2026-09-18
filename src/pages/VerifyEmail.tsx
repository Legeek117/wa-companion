import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MailCheck, Loader2, RefreshCw, LogIn } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

/**
 * Page affichée après l'inscription : invite à vérifier l'email reçu
 * et permet de renvoyer le mail de vérification.
 */
const VerifyEmail = () => {
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const [email, setEmail] = useState(stateEmail || "");
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error("Entrez l'email utilisé pour l'inscription");
      return;
    }
    setIsResending(true);
    try {
      const response = await api.auth.resendVerification(email.trim());
      if (response.success) {
        setResendSent(true);
        toast.success("Email de vérification renvoyé !");
      } else {
        toast.error(response.error?.message || "Impossible de renvoyer l'email");
      }
    } catch {
      toast.error("Erreur réseau. Réessayez dans un instant.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="border-border">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MailCheck className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Vérifiez votre adresse email</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Un email de vérification vient de vous être envoyé.
              Ouvrez-le et cliquez sur le lien pour activer votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="verify-email" className="text-sm font-medium">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  id="verify-email"
                  type="email"
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-input bg-background text-sm"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!stateEmail}
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleResend} disabled={isResending}>
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {resendSent ? "Renvoyer à nouveau" : "Renvoyer l'email"}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Vous n'avez rien reçu ? Vérifiez vos spams ou renvoyez l'email ci-dessus.
            </p>

            <div className="border-t pt-4">
              <Link to="/auth">
                <Button variant="outline" className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;