import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const Profile = () => {
  const user = {
    name: "Juliana Silva",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Juliana",
    bio: "Amo fazer novos amigos e conhecer lugares incríveis! 🌟",
    interests: ["#praia", "#cinema", "#trilha", "#barzinho", "#música", "#viagem"],
  };

  return (
    <div className="min-h-screen pb-20 pt-16">
      <div className="px-4 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-32 w-32 border-4 border-primary">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="text-muted-foreground max-w-sm">{user.bio}</p>
          </div>
        </div>

        {/* Interest Tags */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Interesses</h2>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-sm px-4 py-2 bg-secondary hover:bg-secondary/80 cursor-pointer"
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button className="flex-1 h-11 font-semibold">
            Editar Perfil
          </Button>
          <Button variant="outline" size="icon" className="h-11 w-11">
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-6">
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-primary">23</div>
            <div className="text-sm text-muted-foreground">Rolês</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-primary">45</div>
            <div className="text-sm text-muted-foreground">Amigos</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-primary">12</div>
            <div className="text-sm text-muted-foreground">Fotos</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
