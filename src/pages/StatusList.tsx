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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Liste des Status</h1>
        <p className="text-muted-foreground">Tous les status disponibles (24h)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statuses.map((status) => (
          <Card key={status.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="aspect-square bg-muted flex items-center justify-center">
                <div className="text-center space-y-2">
                  {getTypeIcon(status.type)}
                  <p className="text-sm text-muted-foreground">Prévisualisation</p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={status.avatar} />
                    <AvatarFallback>{status.contact[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{status.contact}</p>
                    <p className="text-xs text-muted-foreground">{status.timestamp}</p>
                  </div>
                  {status.liked && (
                    <Badge variant="secondary" className="text-xs">
                      <Heart className="w-3 h-3 mr-1 fill-current" />
                      Liké
                    </Badge>
                  )}
                </div>
                {!status.liked && (
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleLike(status.contact)}
                  >
                    <Heart className="w-4 h-4 mr-2" />
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
