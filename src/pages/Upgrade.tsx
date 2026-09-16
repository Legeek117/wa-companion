import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Zap } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const Upgrade = () => {
  const { user, isPremium } = useAuth();
  const queryClient = useQueryClient();
  const [pendingPlan, setPendingPlan] = useState<'monthly' | 'yearly' | null>(null);

  const features = {
    free: [
      "Voir tous les status automatiquement",
      "Liker tous les status (1 emoji)",
      "1 status programmé/semaine",
      "3 view once/mois",
      "3 messages supprimés/mois",
      "Répondeur automatique basique",
    ],
    premium: [
      "Like sélectif par contact",
      "Emoji personnalisé par contact",
      "Status programmés illimités",
      "View once illimités + galerie",
      "Messages supprimés illimités",
      "Répondeur avancé avec filtrage",
      "Messages personnalisables",
      "Planification horaire",
      "Analytics complets",
      "Statistiques avancées",
      "Export de données",
      "Support prioritaire",
    ],
  };

  const checkoutMutation = useMutation({
    mutationFn: (plan: 'monthly' | 'yearly') => {
      setPendingPlan(plan);
      return api.subscription.createCheckout(plan);
    },
    onSuccess: (response) => {
      const checkoutUrl = response.data?.checkoutUrl as string | undefined;
      if (!checkoutUrl) {
        toast.error("Impossible de générer le lien de paiement. Réessayez.");
        setPendingPlan(null);
        return;
      }
      // `_system` opens the payment page in the system browser on mobile (Capacitor)
      window.open(checkoutUrl, '_system');
      toast.info("Paiement lancé. Revenez ici une fois le paiement effectué.");
    },
    onError: (error: unknown) => {
      setPendingPlan(null);
      const message =
        (error as any)?.message || 'Erreur lors du lancement du paiement';
      toast.error(message);
    },
    onSettled: () => setPendingPlan(null),
  });

  const checkSubscription = async () => {
    try {
      const status = await api.subscription.getStatus();
      if (status.success) {
        await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        toast.success("Statut vérifié avec succès");
      } else {
        toast.error(status.error?.message || 'Impossible de vérifier votre abonnement');
      }
    } catch {
      toast.error('Erreur réseau. Réessayez dans un instant.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center space-y-2 px-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Passez à Premium</h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
          Débloquez toutes les fonctionnalités avancées
        </p>
        {isPremium && (
          <Badge className="bg-premium">
            <Crown className="w-3 h-3 mr-1" />
            Vous êtes Premium
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 max-w-5xl mx-auto px-4 sm:px-0">
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">Actuel</Badge>
            <CardTitle className="text-2xl mt-2">Plan Gratuit</CardTitle>
            <CardDescription>Fonctionnalités de base</CardDescription>
            <div className="pt-4">
              <span className="text-4xl font-bold">0€</span>
              <span className="text-muted-foreground">/mois</span>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 sm:space-y-3">
              {features.free.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-premium text-premium-foreground px-3 py-1 text-sm font-medium">
            Recommandé
          </div>
          <CardHeader>
            <Badge className="w-fit bg-premium">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
            <CardTitle className="text-2xl mt-2">Plan Premium</CardTitle>
            <CardDescription>Toutes les fonctionnalités</CardDescription>
            <div className="pt-4 space-y-2">
              <div>
                <span className="text-4xl font-bold">1500f</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <div className="text-sm text-muted-foreground">
                ou <span className="font-semibold text-foreground">15000f/an</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  Économisez 17%
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="w-full bg-premium hover:bg-premium/90"
                size="lg"
                disabled={checkoutMutation.isPending || isPremium}
                onClick={() => checkoutMutation.mutate('monthly')}
              >
                <Crown className="w-5 h-5 mr-2" />
                {checkoutMutation.isPending && pendingPlan === 'monthly'
                  ? 'Chargement...'
                  : 'S\'abonner'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
                disabled={checkoutMutation.isPending || isPremium}
                onClick={() => checkoutMutation.mutate('yearly')}
              >
                1 an - Économisez
                {checkoutMutation.isPending && pendingPlan === 'yearly' && ' ...'}
              </Button>
            </div>

            <Button
              variant="secondary"
              className="w-full"
              disabled={checkoutMutation.isPending}
              onClick={checkSubscription}
            >
              <Zap className="w-4 h-4 mr-2" />
              J'ai payé - Vérifier mon abonnement
            </Button>

            <div className="text-xs text-muted-foreground text-center">
              Paiement par <span className="font-medium">Mobile Money</span>,{" "}
              <span className="font-medium">Wave</span> ou <span className="font-medium">carte</span>{" "}
              (MTN, Moov, Orange, TOGOCEL, CELTIIS, CORIS, BMO, Free...)
            </div>

            <ul className="space-y-2 sm:space-y-3">
              {features.premium.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 text-premium mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4" />
                Garantie 30 jours satisfait ou remboursé
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-lg sm:text-xl">Questions Fréquentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div>
            <h3 className="font-medium mb-1 text-sm sm:text-base">Puis-je annuler à tout moment ?</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Oui, vous pouvez annuler votre abonnement à tout moment sans frais.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1 text-sm sm:text-base">Comment fonctionne la garantie ?</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Si vous n'êtes pas satisfait dans les 30 premiers jours, nous vous remboursons intégralement.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1 text-sm sm:text-base">Quels moyens de paiement ?</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Mobile Money local (MTN, Moov, Orange, TOGOCEL, CELTIIS, CORIS, BMO, Free), Wave et cartes
              Visa/MasterCard ou Orañe. Le choix s'affiche sur la page sécurisée après avoir cliqué sur S'abonner.
              Grâce à votre compte {user?.email}, votre abonnement est activé automatiquement dès réception du paiement.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1 text-sm sm:text-base">Mes données sont-elles sécurisées ?</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Toutes vos données sont chiffrées et sécurisées. Nous ne partageons jamais vos informations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Upgrade;