import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Shield, Heart, MessageCircle, Eye, Trash2, Bot } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const features = [
    {
      icon: Heart,
      title: "Auto-Like des Status",
      description: "Likez automatiquement tous les status avec l'emoji de votre choix",
      free: true,
      premium: "Personnalisation par contact"
    },
    {
      icon: Eye,
      title: "View Once Capturés",
      description: "Sauvegardez les photos et vidéos éphémères avant qu'elles disparaissent",
      free: "3 captures/mois",
      premium: "Illimité"
    },
    {
      icon: Trash2,
      title: "Messages Supprimés",
      description: "Récupérez les messages supprimés par vos contacts",
      free: "3 messages/mois",
      premium: "Illimité + Analytics"
    },
    {
      icon: Bot,
      title: "Répondeur Automatique",
      description: "Répondez automatiquement quand vous êtes absent",
      free: "Messages prédéfinis",
      premium: "Personnalisation + Filtrage"
    }
  ];

  const pricingPlans = [
    {
      name: "Gratuit",
      price: "0€",
      period: "toujours",
      description: "Pour découvrir les fonctionnalités de base",
      features: [
        "Auto-like tous les status",
        "3 View Once / mois",
        "3 Messages supprimés / mois",
        "1 Status programmé / semaine",
        "Répondeur automatique basique",
        "Support communautaire"
      ],
      cta: "Commencer Gratuitement",
      variant: "outline" as const
    },
    {
      name: "Premium",
      price: "7,99€",
      period: "par mois",
      description: "Pour débloquer toute la puissance du bot",
      features: [
        "Tout du plan Gratuit",
        "View Once illimités",
        "Messages supprimés illimités",
        "Status programmés illimités",
        "Like sélectif par contact",
        "Répondeur avec filtrage",
        "Analytics détaillés",
        "Support prioritaire",
        "Backup automatique"
      ],
      cta: "Essayer Premium",
      variant: "default" as const,
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              WhatsApp Bot Pro
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/auth">Connexion</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Commencer</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
        <div className="container mx-auto px-4 text-center relative">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            Nouvelle Version 2.0
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Automatisez votre
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              WhatsApp comme un Pro
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Gérez vos status, récupérez les contenus éphémères et répondez automatiquement.
            Le bot WhatsApp le plus complet du marché.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="group">
              <Link to="/auth">
                Commencer Gratuitement
                <Zap className="ml-2 w-4 h-4 group-hover:scale-110 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">
                Voir le Dashboard
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            ✨ Aucune carte bancaire requise • 📱 Gratuit pour toujours
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Des fonctionnalités puissantes
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour automatiser et optimiser votre WhatsApp
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="bg-accent/50">Gratuit</Badge>
                      <span className="text-muted-foreground">{typeof feature.free === 'string' ? feature.free : 'Inclus'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-premium text-premium-foreground">Premium</Badge>
                      <span className="text-muted-foreground">{feature.premium}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Tarifs simples et transparents
            </h2>
            <p className="text-xl text-muted-foreground">
              Commencez gratuitement, passez à Premium quand vous êtes prêt
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.popular ? 'border-premium shadow-premium scale-105' : 'border-border'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-premium text-premium-foreground shadow-lg">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Plus Populaire
                    </Badge>
                  </div>
                )}
                <CardContent className="pt-8 pb-8">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground ml-2">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={plan.variant} 
                    className={`w-full ${plan.popular ? 'bg-gradient-premium hover:opacity-90' : ''}`}
                    asChild
                  >
                    <Link to="/auth">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            🔒 Paiement sécurisé par Stripe • 💰 Annulation à tout moment • 🎁 Garantie 30 jours
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="container mx-auto px-4 text-center relative">
          <Shield className="w-16 h-16 mx-auto mb-6 text-primary-foreground" />
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
            Prêt à automatiser votre WhatsApp ?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Rejoignez des milliers d'utilisateurs qui gagnent du temps chaque jour
          </p>
          <Button size="lg" variant="secondary" asChild className="shadow-lg">
            <Link to="/auth">
              Commencer Maintenant
              <Zap className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-primary" />
              <span className="font-semibold">WhatsApp Bot Pro</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Conditions</a>
              <a href="#" className="hover:text-foreground transition-colors">Confidentialité</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 WhatsApp Bot Pro. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;