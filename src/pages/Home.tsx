import { EventCard } from "@/components/events/EventCard";

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
    <div className="pb-20 pt-16 px-4 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-foreground pt-4">
        Próximos Rolês
      </h2>
      
      <div className="space-y-4">
        {mockEvents.map((event) => (
          <EventCard key={event.id} {...event} />
        ))}
      </div>
    </div>
  );
};

export default Home;
