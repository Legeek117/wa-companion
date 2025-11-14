import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

const Auth = () => {
  const { register, login, isRegistering, isLoggingIn } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    login({ email: loginEmail, password: loginPassword });
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setShowTermsModal(true);
      return;
    }
    register({ email: signupEmail, password: signupPassword });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-primary p-12 flex-col justify-between text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        
        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/icon-192x192.png"
                alt="AMDA logo"
                className="w-10 h-10 rounded-2xl object-contain shadow-md"
              />
              <span className="text-2xl font-bold">AMDA</span>
            </Link>
            <div className="[&_button]:text-primary-foreground [&_button]:hover:bg-primary-foreground/10 [&_svg]:text-primary-foreground">
              <ThemeToggle />
            </div>
          </div>
          
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
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12 bg-background relative">
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 md:top-8 md:right-8">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md px-4 sm:px-0">
          <div className="md:hidden mb-6 sm:mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src="/icon-192x192.png"
                alt="AMDA logo"
                className="w-8 h-8 rounded-2xl object-contain shadow-md"
              />
              <span className="text-xl sm:text-2xl font-bold">AMDA</span>
            </Link>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8">
              <TabsTrigger value="login" className="text-xs sm:text-sm">Connexion</TabsTrigger>
              <TabsTrigger value="signup" className="text-xs sm:text-sm">Inscription</TabsTrigger>
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
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
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
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                        >
                          {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoggingIn}>
                      {isLoggingIn ? "Connexion..." : "Se connecter"}
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
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
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
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
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
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="pl-10 pr-10"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                        >
                          {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="accept-terms"
                          checked={acceptedTerms}
                          onChange={(e) => setAcceptedTerms(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="accept-terms" className="text-xs text-muted-foreground cursor-pointer">
                          J'accepte les{" "}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-primary hover:underline"
                          >
                            Conditions d'utilisation
                          </button>{" "}
                          et la{" "}
                          <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="text-primary hover:underline"
                          >
                            Politique de confidentialité
                          </button>
                        </label>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isRegistering || !acceptedTerms}>
                      {isRegistering ? "Création..." : "Créer mon compte"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Terms and Privacy Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Conditions d'utilisation et Politique de confidentialité</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-6">
              <div>
                <h3 className="font-semibold mb-2">1. Conditions d'utilisation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  En utilisant AMDA, vous acceptez de respecter les conditions suivantes :
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Vous êtes responsable de l'utilisation de votre compte WhatsApp via notre service</li>
                  <li>Vous ne devez pas utiliser le service à des fins illégales ou frauduleuses</li>
                  <li>Vous ne devez pas partager vos identifiants de connexion avec des tiers</li>
                  <li>Nous nous réservons le droit de suspendre ou supprimer votre compte en cas de violation</li>
                  <li>Le service est fourni "tel quel" sans garantie expresse ou implicite</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">2. Politique de confidentialité</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Nous nous engageons à protéger votre vie privée :
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Vos données personnelles sont stockées de manière sécurisée</li>
                  <li>Nous ne partageons pas vos informations avec des tiers sans votre consentement</li>
                  <li>Les messages View Once et supprimés sont stockés uniquement pour votre usage personnel</li>
                  <li>Vous pouvez supprimer vos données à tout moment depuis votre compte</li>
                  <li>Nous utilisons des mesures de sécurité appropriées pour protéger vos données</li>
                  <li>Les sessions WhatsApp sont stockées de manière chiffrée</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">3. Responsabilité</h3>
                <p className="text-sm text-muted-foreground">
                  AMDA est un outil d'automatisation pour WhatsApp. Vous êtes seul responsable de l'utilisation 
                  que vous en faites et de respecter les conditions d'utilisation de WhatsApp. Nous ne sommes 
                  pas responsables des conséquences résultant d'une utilisation inappropriée du service.
                </p>
              </div>

              <div className="flex items-start gap-2 pt-4 border-t">
                <input
                  type="checkbox"
                  id="accept-terms-modal"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="accept-terms-modal" className="text-sm text-foreground cursor-pointer">
                  J'ai lu et j'accepte les conditions d'utilisation et la politique de confidentialité
                </label>
              </div>
            </CardContent>
            <div className="p-6 border-t flex gap-3 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowTermsModal(false)}
                className="flex-1"
              >
                Fermer
              </Button>
              <Button
                onClick={() => {
                  if (acceptedTerms) {
                    setShowTermsModal(false);
                  }
                }}
                disabled={!acceptedTerms}
                className="flex-1"
              >
                Accepter et continuer
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Auth;