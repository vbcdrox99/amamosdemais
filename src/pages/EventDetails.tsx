import { useState } from "react";
import { ArrowLeft, MapPin, Clock, Calendar, ExternalLink, Share2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthRole } from "@/hooks/useAuthRole";

type RsvpStatus = "going" | "maybe" | "not-going" | null;

const EventDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { permissions, flags } = useAuthRole();
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  
  // Mock data
  const event = {
    title: "Churrasco na Laje do Zé",
    coverImage: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80",
    date: "Sábado, 28 de Outubro",
    time: "14:00",
    location: "Vila Madalena, São Paulo",
    description: "Bora pro churrasco mais top do ano! Vai ter muita carne, cerveja gelada, música boa e aquela resenha de qualidade. Cada um leva algo (coordenamos no chat). Não esquece o guaraná!",
    going: [
      { name: "João Silva", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=João" },
      { name: "Maria Santos", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria" },
      { name: "Pedro Costa", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro" },
      { name: "Ana Lima", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana" },
      { name: "Carlos Mendes", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos" },
      { name: "Julia Ferreira", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julia" },
      { name: "Bruno Alves", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bruno" },
      { name: "Rafael Santos", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael" },
      { name: "Camila Souza", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Camila" },
      { name: "Lucas Oliveira", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas" },
      { name: "Fernanda Costa", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fernanda" },
      { name: "Rodrigo Lima", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rodrigo" },
      { name: "Beatriz Souza", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Beatriz" },
    ],
    maybe: [
      { name: "Gabriel Martins", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gabriel" },
      { name: "Larissa Alves", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Larissa" },
      { name: "Thiago Ribeiro", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Thiago" },
      { name: "Amanda Silva", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda" },
      { name: "Felipe Santos", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felipe" },
    ],
  };

  const { toast } = useToast();

  const eventUrl = `${window.location.origin}/evento/${id ?? ""}`;
  const defaultInvite = `Bora pro rolê? ${event.title} — ${event.date} às ${event.time} em ${event.location}`;
  const [inviteMessage, setInviteMessage] = useState<string>(defaultInvite);

  const fullInvite = `${inviteMessage}\n\n${eventUrl}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(fullInvite);
      toast({ title: "Link copiado!", description: "Convite com informações foi copiado para a área de transferência." });
    } catch {
      toast({ title: "Não foi possível copiar", description: "Tente novamente mais tarde." });
    }
  };

  const handleOpenWhatsApp = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(fullInvite)}`;
    window.open(waUrl, "_blank");
    toast({ title: "Abrindo WhatsApp Web", description: "Seu convite será colado na conversa." });
  };

  return (
    <div className="min-h-screen pb-20 pt-14">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-16 left-4 z-10 bg-black/50 backdrop-blur-sm hover:bg-black/70"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="relative h-64 overflow-hidden">
        <img
          src={event.coverImage}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <h1 className="absolute bottom-4 left-4 right-4 text-2xl font-bold text-foreground">
          {event.title}
        </h1>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border bg-background">
          <TabsTrigger
            value="details"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Detalhes
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="px-4 space-y-6 pb-6">
          {/* When and Where */}
          <Card className="p-4 space-y-3 bg-card border-border">
            <h3 className="font-semibold text-foreground">Quando e Onde</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">{event.date}</div>
                  <div className="text-muted-foreground">{event.time}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-foreground">{event.location}</div>
                  <Button variant="link" className="h-auto p-0 text-primary">
                    Ver no mapa <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Descrição</h3>
            <p className="text-muted-foreground leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Invite / Share */}
          <Card className="p-4 bg-card border-border">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Gere um convite com link e informações do rolê.
              </div>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-10 border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
                  >
                    <Share2 className="h-4 w-4 mr-2" /> Convidar no WhatsApp
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Convite do rolê</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Textarea
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Digite a mensagem do convite"
                      className="min-h-[100px]"
                    />
                    <div className="text-xs text-muted-foreground">
                      Ao copiar, enviaremos o link junto com a mensagem acima.
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCopyInvite}
                    >
                      Copiar link
                    </Button>
                    <Button onClick={handleOpenWhatsApp}>
                      Abrir WhatsApp Web
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          {/* RSVP Buttons */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Você vai?</h3>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={rsvpStatus === "going" ? "rsvpActive" : "rsvp"}
                onClick={() => {
                  if (!permissions.canConfirmPresence) {
                    toast({
                      title: "Ação não permitida",
                      description: flags.isAuthenticated ? "Sua conta ainda não foi aprovada." : "Entre com sua conta e aguarde aprovação.",
                    });
                    return;
                  }
                  setRsvpStatus("going");
                }}
                className="h-12 font-semibold"
                disabled={!permissions.canConfirmPresence}
              >
                VOU
              </Button>
              <Button
                variant={rsvpStatus === "maybe" ? "rsvpActive" : "rsvp"}
                onClick={() => {
                  if (!permissions.canConfirmPresence) {
                    toast({
                      title: "Ação não permitida",
                      description: flags.isAuthenticated ? "Sua conta ainda não foi aprovada." : "Entre com sua conta e aguarde aprovação.",
                    });
                    return;
                  }
                  setRsvpStatus("maybe");
                }}
                className="h-12 font-semibold"
                disabled={!permissions.canConfirmPresence}
              >
                TALVEZ
              </Button>
              <Button
                variant={rsvpStatus === "not-going" ? "rsvpActive" : "rsvp"}
                onClick={() => {
                  if (!permissions.canConfirmPresence) {
                    toast({
                      title: "Ação não permitida",
                      description: flags.isAuthenticated ? "Sua conta ainda não foi aprovada." : "Entre com sua conta e aguarde aprovação.",
                    });
                    return;
                  }
                  setRsvpStatus("not-going");
                }}
                className="h-12 font-semibold"
                disabled={!permissions.canConfirmPresence}
              >
                NÃO VOU
              </Button>
            </div>
          </div>

          {/* Attendance Lists */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-3">
                Confirmados ({event.going.length})
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {event.going.map((person, index) => (
                  <div key={index} className="flex flex-col items-center gap-2 min-w-[64px]">
                    <Avatar className="h-16 w-16 border-2 border-primary">
                      <AvatarImage src={person.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {person.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-center text-muted-foreground line-clamp-2 w-full">
                      {person.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">
                Talvez ({event.maybe.length})
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {event.maybe.map((person, index) => (
                  <div key={index} className="flex flex-col items-center gap-2 min-w-[64px]">
                    <Avatar className="h-16 w-16 border-2 border-muted">
                      <AvatarImage src={person.avatar} />
                      <AvatarFallback className="bg-muted text-foreground">
                        {person.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-center text-muted-foreground line-clamp-2 w-full">
                      {person.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="px-4 space-y-4">
          <div className="text-center text-muted-foreground py-8">
            Chat do evento em breve...
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventDetails;
