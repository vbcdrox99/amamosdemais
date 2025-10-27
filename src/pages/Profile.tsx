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
    <div className="min-h-screen bg-black">
      <div className="pb-20 pt-16 px-4 space-y-6 max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <Avatar className="h-32 w-32 border-4 border-white/30">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-white/10 text-white text-4xl">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">
              {user.name}
            </h1>
            <p className="text-sm text-white/70 max-w-sm">{user.bio}</p>
          </div>
        </div>

        {/* Interest Tags */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Interesses</h2>
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest, index) => (
              <Badge
                key={index}
                className="text-sm px-4 py-2 border-white/20 bg-white/5 text-white hover:bg-white/10 cursor-pointer"
              >
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            className="flex-1 h-11 font-semibold border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
            variant="outline"
          >
            Editar Perfil
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-6">
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-white">23</div>
            <div className="text-sm text-white/70">Rolês</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-white">45</div>
            <div className="text-sm text-white/70">Amigos</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-white">12</div>
            <div className="text-sm text-white/70">Fotos</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
