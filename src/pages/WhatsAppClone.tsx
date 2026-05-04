import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Search, 
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Video, 
  Smile, 
  Paperclip,
  Check,
  CheckCheck,
  MessageSquare,
  Shield
} from "lucide-react";
import { Loading } from "@/components/Loading";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const WhatsAppClone = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { useUserContacts, useUserMessages, useSendMessage, useUsers, adminToken } = useAdmin();
  const { data: users } = useUsers();
  const { data: contacts, isLoading: loadingContacts } = useUserContacts(userId || "");
  const { data: messages, isLoading: loadingMessages } = useUserMessages(userId || "", selectedContact?.contact_id || "");
  const sendMessage = useSendMessage(userId || "");

  if (!adminToken) return <Navigate to="/admin/auth" replace />;

  const user = (users as any[])?.find((u: any) => u.id === userId);
  const contactsList = (contacts as any[]) || [];
  const messagesList = (messages as any[]) || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedContact) return;

    sendMessage.mutate({
      to: selectedContact.contact_id,
      message: messageText,
    });
    setMessageText("");
  };

  const filteredContacts = contactsList.filter((c: any) => 
    c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_id?.includes(searchQuery)
  );

  if (loadingContacts) return <Loading />;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background border rounded-xl overflow-hidden shadow-glass m-4 animate-fade-in">
      {/* Sidebar: Contacts List */}
      <div className="w-80 flex flex-col border-r bg-muted/20">
        <div className="p-4 bg-muted/30 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email}`} />
              <AvatarFallback>{user?.email?.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-bold truncate max-w-[120px]">{user?.email}</span>
              <Badge variant="outline" className="text-[10px] h-4 py-0 w-fit">ADMIN VIEW</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher ou démarrer une discussion" 
              className="pl-9 bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {filteredContacts?.map((contact: any) => (
              <button
                key={contact.contact_id}
                onClick={() => setSelectedContact(contact)}
                className={cn(
                  "flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors text-left border-b border-primary/5",
                  selectedContact?.contact_id === contact.contact_id && "bg-primary/10 hover:bg-primary/15"
                )}
              >
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.contact_id}`} />
                  <AvatarFallback>{contact.contact_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-semibold text-sm truncate">{contact.contact_name}</h3>
                    <span className="text-[10px] text-muted-foreground">
                      {contact.last_seen_at ? format(new Date(contact.last_seen_at), 'HH:mm') : ''}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.contact_id.split('@')[0]}
                  </p>
                </div>
              </button>
            ))}
            {filteredContacts?.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Aucun contact trouvé
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main: Chat Window */}
      <div className="flex-1 flex flex-col bg-chat-pattern bg-repeat">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-3 bg-muted/30 border-b flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedContact.contact_id}`} />
                  <AvatarFallback>{selectedContact.contact_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm">{selectedContact.contact_name}</h3>
                  <p className="text-[10px] text-green-500 font-medium uppercase tracking-wider">En ligne</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon"><Video className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon"><Phone className="h-5 w-5" /></Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <Button variant="ghost" size="icon"><Search className="h-5 w-5" /></Button>
                <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-[#efeae2] dark:bg-muted/5">
              <div className="flex flex-col gap-2">
                  <div className="flex justify-center mb-4">
                    <Badge variant="outline" className="bg-white/80 dark:bg-muted/50 border-none text-[11px] px-3 py-1 shadow-sm">
                      AUJOURD'HUI
                    </Badge>
                  </div>

                  {messagesList.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "max-w-[70%] rounded-lg p-2.5 text-sm shadow-sm relative animate-scale-in",
                        msg.from_me 
                          ? "bg-[#d9fdd3] dark:bg-primary/20 self-end rounded-tr-none" 
                          : "bg-white dark:bg-muted self-start rounded-tl-none"
                      )}
                    >
                      <p className="pr-12">{msg.content}</p>
                      <div className="absolute bottom-1 right-2 flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(msg.timestamp), 'HH:mm')}
                        </span>
                        {msg.from_me && <CheckCheck className="w-3 h-3 text-blue-500" />}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                  
                  {messagesList.length === 0 && !loadingMessages && (
                  <div className="flex flex-col items-center justify-center h-full mt-20 text-muted-foreground opacity-60">
                    <MessageSquare className="w-16 h-16 mb-4 stroke-1" />
                    <p>Aucun message dans cette discussion</p>
                    <p className="text-xs">Les messages apparaîtront au fur et à mesure qu'ils sont échangés.</p>
                  </div>
                )}
                {loadingMessages && (
                  <div className="flex justify-center p-8">
                    <Loading showLogo={false} size="sm" />
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 bg-muted/30 border-t backdrop-blur-md">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Smile className="h-6 w-6" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Paperclip className="h-6 w-6" />
                </Button>
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Tapez un message"
                  className="flex-1 bg-background border-none focus-visible:ring-1 focus-visible:ring-primary/20 h-11"
                />
                <Button 
                  type="submit" 
                  disabled={!messageText.trim() || sendMessage.isPending}
                  size="icon"
                  className={cn(
                    "rounded-full h-11 w-11 transition-all",
                    messageText.trim() ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-muted/5 text-center p-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <img src="/icon-192x192.png" alt="AMDA" className="w-16 h-16 opacity-50 grayscale" />
            </div>
            <h2 className="text-2xl font-light text-muted-foreground mb-2">AMDA Admin View</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Sélectionnez un contact pour voir la discussion et envoyer des messages au nom de l'utilisateur.
            </p>
            <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground pb-4">
              <Shield className="w-3 h-3" />
              Connexion sécurisée de bout en bout
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppClone;
