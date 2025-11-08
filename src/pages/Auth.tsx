import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Mail, Lock, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success("Connexion réussie !");
      navigate("/dashboard");
      setIsLoading(false);
    }, 1500);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success("Compte créé avec succès ! Bienvenue 🎉");
      navigate("/dashboard");
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-primary p-12 flex-col justify-between text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        
        <div className="relative">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <MessageCircle className="w-10 h-10" />
            <span className="text-2xl font-bold">WhatsApp Bot Pro</span>
          </Link>
          
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Automatisez votre WhatsApp en quelques clics
            </h1>
            <p className="text-lg text-primary-foreground/90">
              Rejoignez des milliers d'utilisateurs qui gagnent du temps chaque jour avec notre bot intelligent.
            </p>
          </div>
        </div>

        <div className="relative space-y-4">
          <div className="flex items-center gap-3 p-4 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
            <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></div>
            <p className="text-sm">Plus de 10,000 status likés automatiquement aujourd'hui</p>
          </div>
          <div className="flex items-center gap-3 p-4 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
            <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></div>
            <p className="text-sm">3,847 view once sauvegardés ce mois-ci</p>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <MessageCircle className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold">WhatsApp Bot Pro</span>
            </Link>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Bon retour !</CardTitle>
                  <CardDescription>
                    Connectez-vous pour accéder à votre dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="votre@email.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Mot de passe</Label>
                        <a href="#" className="text-xs text-primary hover:underline">
                          Mot de passe oublié ?
                        </a>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Signup Form */}
            <TabsContent value="signup">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Créer un compte</CardTitle>
                  <CardDescription>
                    Commencez gratuitement, aucune carte requise
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nom complet</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Jean Dupont"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="votre@email.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      En créant un compte, vous acceptez nos{" "}
                      <a href="#" className="text-primary hover:underline">
                        Conditions d'utilisation
                      </a>{" "}
                      et notre{" "}
                      <a href="#" className="text-primary hover:underline">
                        Politique de confidentialité
                      </a>
                      .
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Création..." : "Créer mon compte"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Auth;