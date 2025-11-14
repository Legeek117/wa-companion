import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Heart, Eye, Trash2, Calendar, MessageSquare, Sparkles, ChevronDown, Twitter, Linkedin, Github } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  const features = [
    {
      icon: Heart,
      title: "Restez actif, sans effort",
      subtitle: "Soyez toujours présent pour vos contacts.",
      description: "Configurez l'auto-like pour vos contacts favoris (Premium) ou pour tout le monde (Gratuit). Programmez vos propres statuts à l'avance et laissez AMDA maintenir votre présence sociale.",
      benefits: [
        "Auto-Like sélectif par contact ou groupe",
        "Programmation de statuts (texte, image, vidéo)",
        "Répondeur automatique intelligent"
      ]
    },
    {
      icon: Eye,
      title: "Capturez l'éphémère, pour toujours.",
      subtitle: "Ne manquez plus rien",
      description: "AMDA sauvegarde automatiquement et en silence tous les messages 'View Once' et les messages supprimés par vos contacts. Accédez à votre archive privée depuis votre dashboard sécurisé.",
      benefits: [
        "Sauvegarde des 'View Once' (images et vidéos)",
        "Récupération des messages texte supprimés",
        "Galerie média privée et sécurisée"
      ]
    },
    {
      icon: MessageSquare,
      title: "Commencez en moins de 30 secondes.",
      subtitle: "Simple & Sécurisé",
      description: "Pas d'installation compliquée. Créez votre compte, scannez un QR code (comme sur WhatsApp Web) et votre assistant AMDA est instantanément actif et prêt à travailler pour vous.",
      benefits: [
        "Connexion sécurisée via QR Code",
        "Pas besoin de laisser votre téléphone allumé",
        "Dashboard web accessible partout"
      ]
    }
  ];

  const faqs = [
    {
      question: "Est-ce que mon téléphone doit rester connecté ?",
      answer: "Non ! Une fois connecté via QR code, AMDA fonctionne de manière indépendante. Vous n'avez pas besoin de garder votre téléphone allumé ou connecté."
    },
    {
      question: "Puis-je utiliser le bot sur plusieurs numéros ?",
      answer: "Oui, avec le plan Premium, vous pouvez connecter plusieurs numéros WhatsApp et gérer tous vos comptes depuis un seul dashboard."
    },
    {
      question: "Comment fonctionne le paiement Premium ?",
      answer: "Le paiement Premium est mensuel à 3000f/mois. Vous pouvez annuler à tout moment, et vous gardez l'accès jusqu'à la fin de votre période payée."
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "Absolument ! Toutes vos données sont chiffrées et stockées de manière sécurisée. Nous ne partageons jamais vos informations avec des tiers."
    },
    {
      question: "Puis-je essayer Premium gratuitement ?",
      answer: "Oui ! Nous offrons une garantie satisfait ou remboursé de 30 jours. Si vous n'êtes pas satisfait, nous vous remboursons intégralement."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-2xl z-50">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src="/icon-192x192.png"
              alt="AMDA logo"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl object-contain shadow-md"
            />
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              AMDA
            </span>
          </div>
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
            <a href="#fonctionnalites" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Tarifs
            </a>
            <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              FAQ
            </a>
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Se connecter</Link>
            </Button>
            <Button size="sm" className="rounded-full shadow-md text-xs sm:text-sm" asChild>
              <Link to="/auth">Commencer</Link>
            </Button>
          </nav>
          <div className="lg:hidden flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 sm:px-3" asChild>
              <Link to="/auth">Connexion</Link>
            </Button>
            <Button size="sm" className="rounded-full shadow-md text-xs sm:text-sm px-3 sm:px-4" asChild>
              <Link to="/auth">Commencer</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-8 sm:py-12 md:py-16 lg:py-20 xl:py-32 overflow-hidden bg-gradient-primary">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="container mx-auto px-4 sm:px-6 md:px-8 relative">
          <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8 md:gap-10 lg:gap-12">
            <div className="flex-1 max-w-3xl w-full text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2 sm:gap-3 mb-4 sm:mb-6">
                <img
                  src="/icon-192x192.png"
                  alt="AMDA logo"
                  className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl sm:rounded-2xl object-contain shadow-md"
                />
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">AMDA</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight">
                Prêt à transformer votre expérience WhatsApp ?
              </h1>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-4 sm:mb-6 md:mb-8 max-w-2xl mx-auto lg:mx-0">
                Rejoignez des milliers d'utilisateurs qui optimisent déjà leurs communications avec AMDA.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Button size="lg" variant="secondary" className="rounded-full shadow-lg text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto" asChild>
                  <Link to="/auth">
                    Créer mon compte gratuit
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex-1 w-full max-w-2xl mt-6 lg:mt-0">
              <div className="rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border-2 sm:border-4 border-white/20">
                <img 
                  src="/dashboard-whatsapp.png" 
                  alt="Dashboard AMDA - Connexion WhatsApp" 
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-8 sm:py-12 md:py-16 lg:py-20 xl:py-32">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="space-y-12 sm:space-y-16 md:space-y-20 lg:space-y-24 xl:space-y-32">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-6 sm:gap-8 md:gap-10 lg:gap-12 items-center`}
              >
                <div className="flex-1 space-y-3 sm:space-y-4 md:space-y-6 w-full text-center lg:text-left">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs sm:text-sm">
                    {feature.subtitle}
                  </Badge>
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight">
                    {feature.title}
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    {feature.description}
                  </p>
                  <ul className="space-y-2 sm:space-y-3 text-left max-w-xl mx-auto lg:mx-0">
                    {feature.benefits.map((benefit, bIndex) => (
                      <li key={bIndex} className="flex items-start gap-2 sm:gap-3">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        </div>
                        <span className="text-xs sm:text-sm md:text-base text-foreground flex-1">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full max-w-2xl">
                  <div className="aspect-video rounded-xl sm:rounded-2xl md:rounded-3xl bg-muted/50 border border-border/50 shadow-glass overflow-hidden">
                    {index === 0 ? (
                      <img 
                        src="/dashboard-status.png" 
                        alt="Dashboard - Gestion des Status" 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : index === 1 ? (
                      <img 
                        src="/dashboard-viewonce.png" 
                        alt="Dashboard - View Once Capturés" 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <img 
                        src="/dashboard-whatsapp.png" 
                        alt="Dashboard - Connexion WhatsApp" 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="py-8 sm:py-12 md:py-16 lg:py-20 xl:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 px-4">
              Des plans AMDA adaptés à vos besoins
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Commencez gratuitement et passez à la vitesse supérieure avec nos fonctionnalités Premium.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Plan Gratuit */}
            <Card className="border-border/50 hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 px-4 sm:px-6">
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">Plan Gratuit</h3>
                  <div className="flex items-baseline gap-2 mb-2 sm:mb-3">
                    <span className="text-4xl sm:text-5xl font-bold text-primary">0f</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/mois</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Idéal pour découvrir nos services.</p>
                </div>
                
                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm flex-1">Auto-Like de Statuts (Global)</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm flex-1">3 Captures View Once / mois</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm flex-1">3 Captures Messages Supprimés / mois</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm flex-1">Répondeur Basique</span>
                  </li>
                </ul>
                
                <Button variant="outline" className="w-full rounded-full text-xs sm:text-sm" size="lg" asChild>
                  <Link to="/auth">Commencer Gratuitement</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan Premium */}
            <Card className="border-primary/50 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-premium"></div>
              <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-md rounded-full px-3 sm:px-4 text-xs">
                Le plus populaire
              </Badge>
              <CardContent className="pt-10 sm:pt-12 pb-6 sm:pb-8 px-4 sm:px-6">
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">Plan Premium</h3>
                  <div className="flex items-baseline gap-2 mb-2 sm:mb-3">
                    <span className="text-4xl sm:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent">3000f</span>
                    <span className="text-sm sm:text-base text-muted-foreground">/mois</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pour une automatisation complète.</p>
                </div>
                
                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium flex-1">Tout du plan Gratuit, plus :</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm flex-1">Auto-Like Sélectif (par contact)</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm flex-1">Captures View Once (illimitées)</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm flex-1">Captures Messages (illimitées)</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm flex-1">Répondeur Personnalisé</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm flex-1">Programmation de Statuts</span>
                  </li>
                </ul>
                
                <Button className="w-full rounded-full bg-gradient-primary hover:opacity-90 shadow-md text-xs sm:text-sm" size="lg" asChild>
                  <Link to="/auth">Essayer Premium</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-8 sm:py-12 md:py-16 lg:py-20 xl:py-32">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 px-4">
              Questions Fréquentes
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Trouvez des réponses rapides à vos interrogations courantes.
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-2 sm:space-y-3 md:space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border border-border/50 rounded-lg sm:rounded-xl md:rounded-2xl px-3 sm:px-4 md:px-6 bg-card"
                >
                  <AccordionTrigger className="text-left font-semibold hover:no-underline py-3 sm:py-4 md:py-5 text-xs sm:text-sm md:text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm md:text-base text-muted-foreground pb-3 sm:pb-4 md:pb-5 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 xl:py-32 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="container mx-auto px-4 sm:px-6 md:px-8 text-center relative">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 sm:mb-4 md:mb-6 px-4">
              AMDA. Votre Assistant WhatsApp Intelligent.
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-4 sm:mb-6 md:mb-8 max-w-2xl mx-auto px-4">
              Récupérez les messages supprimés, sauvegardez les 'view once' et gérez vos statuts automatiquement. Le tout depuis un seul dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button size="lg" variant="secondary" className="rounded-full shadow-lg text-xs sm:text-sm md:text-base px-5 sm:px-6 md:px-8 w-full sm:w-auto" asChild>
                <Link to="/auth">Commencer Gratuitement</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full border-white text-white hover:bg-white/10 text-xs sm:text-sm md:text-base px-5 sm:px-6 md:px-8 w-full sm:w-auto" onClick={() => document.getElementById('fonctionnalites')?.scrollIntoView({ behavior: 'smooth' })}>
                Voir les fonctionnalités
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 md:py-12 border-t border-border/50 bg-card">
        <div className="container mx-auto px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-12 mb-4 sm:mb-6 md:mb-8">
            {/* Brand */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-3 sm:mb-4">
                <img
                  src="/icon-192x192.png"
                  alt="AMDA logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl object-contain shadow-md"
                />
                <span className="text-lg sm:text-xl font-bold text-primary">AMDA</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto sm:mx-0">
                Votre assistant WhatsApp intelligent pour automatiser vos tâches et ne rien manquer.
              </p>
            </div>

            {/* Navigation */}
            <div className="text-center sm:text-left">
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Navigation</h4>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <li>
                  <a href="#fonctionnalites" className="text-muted-foreground hover:text-primary transition-colors">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#tarifs" className="text-muted-foreground hover:text-primary transition-colors">
                    Tarifs
                  </a>
                </li>
                <li>
                  <a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="text-center sm:text-left">
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Légal</h4>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Politique de confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Conditions d'utilisation
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-4 sm:pt-6 md:pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              © 2025 AMDA. Tous droits réservés.
            </p>
            <div className="flex items-center gap-3 sm:gap-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors" aria-label="GitHub">
                <Github className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
