import { EventCard } from "@/components/events/EventCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter } from "lucide-react";

// Mock data for demonstration
const mockEvents = [
  {
    id: "1",
    title: "Churrasco na Laje do Zé",
    date: "28/OUT",
    time: "Sábado, 14:00",
    location: "Vila Madalena",
    coverImage: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
    attendees: [
      { name: "João Silva", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=João" },
      { name: "Maria Santos", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria" },
      { name: "Pedro Costa", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro" },
      { name: "Ana Lima", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana" },
    ],
    attendeeCount: 12,
  },
  {
    id: "2",
    title: "Praia em Maresias - Final de Semana",
    date: "02/NOV",
    time: "Sexta, 08:00",
    location: "Maresias, SP",
    coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
    attendees: [
      { name: "Carlos Mendes", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos" },
      { name: "Julia Ferreira", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julia" },
      { name: "Bruno Alves", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bruno" },
    ],
    attendeeCount: 8,
  },
  {
    id: "3",
    title: "Rolê no Bar do João - Sexta à Noite",
    date: "03/NOV",
    time: "Sexta, 20:00",
    location: "Pinheiros",
    coverImage: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80",
    attendees: [
      { name: "Rafael Santos", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rafael" },
      { name: "Camila Souza", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Camila" },
    ],
    attendeeCount: 15,
  },
];

const Home = () => {
  return (
    <div className="min-h-screen bg-black">
      <div className="pb-20 pt-16 px-4 space-y-8 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="space-y-3">
          <h2 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Rolês</h2>
          <p className="text-sm text-white/70">Descubra, busque e filtre seus rolês com um visual moderno e fácil de ler.</p>
        </div>

        {/* Busca + Filtros */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
            <Input
              placeholder="Buscar rolês, lugares, datas..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
          >
            <Filter className="mr-2 h-4 w-4" /> Filtros
          </Button>
        </div>

        {/* Chips rápidas */}
        <div className="flex flex-wrap gap-2">
          <Badge className="border-white/20 bg-white/5 text-white hover:bg-white/10">Hoje</Badge>
          <Badge className="border-white/20 bg-white/5 text-white hover:bg-white/10">Este fim de semana</Badge>
          <Badge className="border-white/20 bg-white/5 text-white hover:bg-white/10">Gratuitos</Badge>
          <Badge className="border-white/20 bg-white/5 text-white hover:bg-white/10">Ao ar livre</Badge>
        </div>

        {/* Lista de eventos */}
        <div className="space-y-4">
          {mockEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-xl p-3 border border-white/10 bg-white/5 backdrop-blur-md"
            >
              <EventCard {...event} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
