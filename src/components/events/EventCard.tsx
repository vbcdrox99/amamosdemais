import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
// Supabase não é mais usado aqui; contagem vem da Home
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
  // Indicador de proximidade do dia ("É hoje" ou "É amanhã")
  dayTag?: string | null;
  // Admin pode excluir evento
  isAdmin?: boolean;
  // Callback após exclusão para remover da lista
  onDeleted?: () => void;
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
  dayTag = null,
  isAdmin = false,
  onDeleted,
}: EventCardProps) => {
  const isHot = attendeeCount >= 6;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { error } = await supabase.from("events").delete().eq("id", Number(id));
      if (error) throw error;
      toast({ title: "Rolê excluído", description: "O evento foi removido da lista." });
      setDeleteDialogOpen(false);
      onDeleted?.();
    } catch (err: unknown) {
      const msg = err instanceof Error && typeof err.message === "string" ? err.message : "Falha ao excluir rolê";
      toast({ title: "Erro", description: msg });
    }
  }

  return (
    <Link to={`/evento/${id}`}>
      <Card className={`group overflow-hidden rounded-2xl border ${isPast ? "border-zinc-700/60" : (isHot ? "border-amber-300/40 ring-1 ring-amber-400/50 shadow-[0_0_30px_rgba(250,204,21,0.25)]" : "border-white/10")} bg-gradient-to-br ${isPast ? "from-zinc-900/70 to-zinc-800/60" : "from-neutral-900/60 to-neutral-800/50"} backdrop-blur-sm ${!isPast ? (isHot ? "hover:shadow-[0_12px_44px_rgba(250,204,21,0.35)]" : "hover:shadow-[0_12px_40px_rgba(16,185,129,0.15)]") : ""} hover:border-white/20 ${!isPast ? "hover:ring-1 hover:ring-primary/30 hover:scale-[1.005]" : ""} transition-all duration-300 cursor-pointer`}>
        <div className="relative h-48 overflow-hidden">
          <img
            src={coverImage}
            alt={title}
            onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
            className={`w-full h-full object-cover transition-transform duration-300 ${isPast ? "grayscale opacity-80" : "group-hover:scale-105"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
          {isHot && !isPast && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 backdrop-blur-md ring-1 ring-amber-300/40 shadow-[0_0_12px_rgba(250,204,21,0.35)] text-amber-300 text-xs font-semibold">
              <Flame className="h-4 w-4" />
              <span>{attendeeCount}+ bombando</span>
            </div>
          )}
          {isPast && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-700/80 text-zinc-300 backdrop-blur-md ring-1 ring-white/10 text-xs font-semibold">
              Encerrado
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
          
          <div className="pt-3 mt-1 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-3">
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
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm font-medium ${isPast ? "text-muted-foreground" : "text-foreground"}`}>
                  +{attendeeCount} confirmados
                </span>
                {dayTag && !isPast && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-emerald-600/20 border border-emerald-500/40 text-emerald-300">
                    {dayTag}
                  </span>
                )}
              </div>
            </div>
            {(isPast || isAdmin) && (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                {isPast && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 w-full sm:w-auto"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/memorias?eventId=${id}`);
                    }}
                  >
                    Abrir memórias
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 w-full sm:w-auto"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteDialogOpen(true);
                      }}
                      aria-label="Excluir rolê"
                      title="Excluir rolê"
                    >
                      Excluir
                    </Button>
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <DialogContent
                        onPointerDownOutside={(ev) => ev.preventDefault()}
                        onInteractOutside={(ev) => ev.preventDefault()}
                      >
                        <DialogHeader>
                          <DialogTitle>Excluir rolê</DialogTitle>
                        </DialogHeader>
                        <div className="text-sm text-muted-foreground">
                          Tem certeza que deseja excluir o evento "{title}"? Esta ação é permanente e não pode ser desfeita.
                        </div>
                        <DialogFooter className="gap-2 sm:gap-2">
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteDialogOpen(false);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleDelete}
                          >
                            Excluir
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};
