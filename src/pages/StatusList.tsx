import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Image, Video, FileText } from "lucide-react";
import { toast } from "sonner";

const StatusList = () => {
  // Mock data
  const statuses = [
    {
      id: 1,
      contact: "Sarah Martin",
      avatar: "/placeholder.svg",
      type: "image",
      timestamp: "Il y a 2h",
      liked: true,
    },
    {
      id: 2,
      contact: "John Doe",
      avatar: "/placeholder.svg",
      type: "video",
      timestamp: "Il y a 3h",
      liked: false,
    },
    {
      id: 3,
      contact: "Marie Dupont",
      avatar: "/placeholder.svg",
      type: "text",
      timestamp: "Il y a 5h",
      liked: true,
    },
  ];

  const handleLike = (contactName: string) => {
    toast.success(`Status de ${contactName} liké !`);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "text":
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Liste des Status</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Tous les status disponibles (24h)</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {statuses.map((status) => (
          <Card key={status.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="aspect-square bg-muted flex items-center justify-center">
                <div className="text-center space-y-2">
                  {getTypeIcon(status.type)}
                  <p className="text-sm text-muted-foreground">Prévisualisation</p>
                </div>
              </div>
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                    <AvatarImage src={status.avatar} />
                    <AvatarFallback className="text-xs">{status.contact[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{status.contact}</p>
                    <p className="text-xs text-muted-foreground">{status.timestamp}</p>
                  </div>
                  {status.liked && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      <Heart className="w-3 h-3 mr-1 fill-current" />
                      Liké
                    </Badge>
                  )}
                </div>
                {!status.liked && (
                  <Button
                    className="w-full text-xs sm:text-sm"
                    size="sm"
                    onClick={() => handleLike(status.contact)}
                  >
                    <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Liker maintenant
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StatusList;
