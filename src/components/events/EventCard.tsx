import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
// Supabase não é mais usado aqui; contagem vem da Home

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
  // Indica se o evento já passou, para estilizar a data
  isPast?: boolean;
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
  isPast = false,
}: EventCardProps) => {
  const isHot = attendeeCount >= 6;
  const navigate = useNavigate();

  return (
    <Link to={`/evento/${id}`}>
      <Card className={`group overflow-hidden rounded-2xl border ${isHot ? "border-amber-300/40 ring-1 ring-amber-400/50 shadow-[0_0_30px_rgba(250,204,21,0.25)]" : "border-white/10"} bg-gradient-to-br from-neutral-900/60 to-neutral-800/50 backdrop-blur-sm ${isHot ? "hover:shadow-[0_12px_44px_rgba(250,204,21,0.35)]" : "hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)]"} hover:border-white/20 hover:ring-1 hover:ring-primary/30 transition-all duration-300 hover:scale-[1.005] cursor-pointer`}>
        <div className="relative h-48 overflow-hidden">
          <img
            src={coverImage}
            alt={title}
            onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
          {isHot && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 backdrop-blur-md ring-1 ring-amber-300/40 shadow-[0_0_12px_rgba(250,204,21,0.35)] text-amber-300 text-xs font-semibold">
              <Flame className="h-4 w-4" />
              <span>{attendeeCount}+ bombando</span>
            </div>
          )}
          <div
            className={`absolute top-3 right-3 px-3 py-2 rounded-lg text-white shadow-md backdrop-blur-sm ring-1 ring-white/10 ${
              isPast
                ? "bg-gradient-to-br from-zinc-700 to-gray-800"
                : "bg-gradient-to-br from-emerald-600 to-sky-600"
            }`}
          >
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
          
          <div className="flex items-center gap-3 pt-3 mt-1 border-t border-white/10">
            <div className="flex -space-x-2">
              {attendees.slice(0, 4).map((attendee, index) => (
                <Avatar key={index} className="h-8 w-8 border-2 border-card shadow-sm">
                  <AvatarImage src={attendee.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {attendee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                +{attendeeCount} confirmados
              </span>
              {isPast && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/memorias?eventId=${id}`);
                  }}
                >
                  Abrir memórias
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};
