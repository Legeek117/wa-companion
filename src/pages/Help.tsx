import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageSquare, Send, BookOpen, Video, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const Help = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Ticket créé ! Nous vous répondrons sous 24h.");
  };

  const faqs = [
    {
      question: "Comment connecter mon WhatsApp au bot ?",
      answer: "Allez dans Paramètres > WhatsApp et scannez le QR Code avec votre application WhatsApp.",
    },
    {
      question: "Le bot fonctionne-t-il 24/7 ?",
      answer: "Oui, une fois configuré, le bot fonctionne en continu et automatiquement.",
    },
    {
      question: "Puis-je utiliser le bot sur plusieurs appareils ?",
      answer: "Non, WhatsApp Web ne permet qu'une seule connexion active à la fois.",
    },
    {
      question: "Comment changer mon plan ?",
      answer: "Rendez-vous dans Paramètres > Abonnement pour passer à Premium ou annuler.",
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer: "Oui, toutes vos données sont chiffrées et stockées de manière sécurisée.",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Aide & Support</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Trouvez de l'aide et contactez notre équipe</p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="pb-3 sm:pb-4">
            <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-2" />
            <CardTitle className="text-base sm:text-lg">Documentation</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Guides complets et tutoriels</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full text-xs sm:text-sm">
              Consulter les docs
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="pb-3 sm:pb-4">
            <Video className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-2" />
            <CardTitle className="text-base sm:text-lg">Tutoriels Vidéo</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Apprenez visuellement</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full text-xs sm:text-sm">
              Voir les vidéos
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="pb-3 sm:pb-4">
            <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-primary mb-2" />
            <CardTitle className="text-base sm:text-lg">Chat en Direct</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Support immédiat</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full text-xs sm:text-sm">
              Démarrer le chat
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            Questions Fréquentes
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Réponses aux questions les plus courantes</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-b">
                <AccordionTrigger className="text-sm sm:text-base py-3 sm:py-4">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-3 sm:pb-4">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Créer un Ticket Support</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Notre équipe vous répondra sous 24h</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm">Sujet</Label>
              <Input id="subject" placeholder="Quel est votre problème ?" required className="text-sm" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm">Message</Label>
              <Textarea
                id="message"
                placeholder="Décrivez votre problème en détail..."
                rows={5}
                className="text-sm sm:min-h-[140px]"
                required
              />
            </div>

            <Button type="submit" className="w-full text-xs sm:text-sm">
              <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Envoyer le ticket
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;
