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
      <Card className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all animate-slide-up cursor-pointer">
        <div className="relative h-48 overflow-hidden">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">OUT</div>
              <div className="text-xl font-bold text-foreground">28</div>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          <h3 className="text-lg font-bold text-foreground line-clamp-2">
            {title}
          </h3>
          
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
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
