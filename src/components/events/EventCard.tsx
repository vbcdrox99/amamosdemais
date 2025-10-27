import { Calendar, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

interface EventCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  coverImage: string;
  attendees: Array<{
    name: string;
    avatar?: string;
  }>;
  attendeeCount: number;
}

export const EventCard = ({
  id,
  title,
  date,
  time,
  location,
  coverImage,
  attendees,
  attendeeCount,
}: EventCardProps) => {
  return (
    <Link to={`/evento/${id}`}>
      <Card className="group overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
        <div className="relative h-48 overflow-hidden">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
          <div className="absolute top-3 right-3 px-3 py-2 rounded-lg bg-gradient-to-br from-emerald-600 to-sky-600 text-white shadow-md">
            <div className="text-xs opacity-80">Data</div>
            <div className="text-sm font-semibold">{date}</div>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <h3 className="text-lg font-bold text-foreground line-clamp-2">
            {title}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-400" />
              <span>{location}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2">
              {attendees.slice(0, 4).map((attendee, index) => (
                <Avatar key={index} className="h-8 w-8 border-2 border-card">
                  <AvatarImage src={attendee.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {attendee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm font-medium text-foreground">
              +{attendeeCount} confirmados
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
};
