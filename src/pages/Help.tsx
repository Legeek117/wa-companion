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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Aide & Support</h1>
        <p className="text-muted-foreground">Trouvez de l'aide et contactez notre équipe</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <BookOpen className="w-10 h-10 text-primary mb-2" />
            <CardTitle>Documentation</CardTitle>
            <CardDescription>Guides complets et tutoriels</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Consulter les docs
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <Video className="w-10 h-10 text-primary mb-2" />
            <CardTitle>Tutoriels Vidéo</CardTitle>
            <CardDescription>Apprenez visuellement</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Voir les vidéos
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <MessageSquare className="w-10 h-10 text-primary mb-2" />
            <CardTitle>Chat en Direct</CardTitle>
            <CardDescription>Support immédiat</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              Démarrer le chat
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Questions Fréquentes
          </CardTitle>
          <CardDescription>Réponses aux questions les plus courantes</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Créer un Ticket Support</CardTitle>
          <CardDescription>Notre équipe vous répondra sous 24h</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Sujet</Label>
              <Input id="subject" placeholder="Quel est votre problème ?" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Décrivez votre problème en détail..."
                rows={6}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Envoyer le ticket
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;
