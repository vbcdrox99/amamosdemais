import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatPhoneBR, extractInstagramHandle, formatInstagramDisplay, formatInstagramUrl, normalizePhoneNumber } from "@/lib/utils";
import { Instagram, Phone } from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  instagram: string | null;
};

interface ProfileQuickViewProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileQuickView({ userId, open, onOpenChange }: ProfileQuickViewProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProfileRow | null>(null);
  const [rsvps, setRsvps] = useState<Array<{ event_id: number; status: "going" | "maybe" | "not-going"; checkin_confirmed: boolean | null; events?: { id: number; title: string | null } | null }>>([]);

  useEffect(() => {
    const load = async () => {
      if (!open || !userId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone_number, instagram")
        .eq("id", userId)
        .maybeSingle();
      setLoading(false);
      if (error) return;
      setData(data as ProfileRow);
    };
    load();
  }, [open, userId]);

  // Carregar RSVPs/check-ins deste usuário
  useEffect(() => {
    const loadRsvps = async () => {
      if (!open || !userId) return;
      try {
        const { data, error } = await supabase
          .from("event_rsvps")
          .select("event_id,status,checkin_confirmed,events:events(id,title)")
          .eq("user_id", userId)
          .order("event_id", { ascending: false })
          .limit(20);
        if (error) return;
        setRsvps((data as any[]) ?? []);
      } catch {}
    };
    loadRsvps();
  }, [open, userId]);

  const name = (data?.full_name ?? formatPhoneBR(data?.phone_number || "")) || "Usuário";
  const initials = (name || "?").slice(0, 2).toUpperCase();
  const igHandle = extractInstagramHandle(data?.instagram || "");
  const igUrl = formatInstagramUrl(igHandle);
  const waNumber = normalizePhoneNumber(data?.phone_number || "");
  const waUrl = waNumber ? `https://wa.me/${waNumber}` : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Perfil</DialogTitle>
          <DialogDescription>Informações públicas do usuário</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 ring-1 ring-white/20">
              {data?.avatar_url ? (
                <AvatarImage src={data.avatar_url} alt={name} />
              ) : (
                <AvatarImage src={undefined} alt={name} />
              )}
              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-semibold text-white">{name}</div>
              {data?.phone_number && (
                <div className="text-xs text-white/70 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                  {waUrl ? (
                    <a href={waUrl} target="_blank" rel="noreferrer" className="hover:underline">
                      {formatPhoneBR(data.phone_number)}
                    </a>
                  ) : (
                    <span>{formatPhoneBR(data.phone_number)}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="h-px bg-white/10" />
          <div className="space-y-1">
            <div className="text-xs text-white/70">Instagram</div>
            {igHandle ? (
              igUrl ? (
                <div className="flex items-center gap-1">
                  <Instagram className="h-4 w-4 text-sky-400" aria-hidden="true" />
                  <a href={igUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-400 hover:underline">{formatInstagramDisplay(igHandle)}</a>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-sm text-white">
                  <Instagram className="h-4 w-4 text-white/80" aria-hidden="true" />
                  <span>{formatInstagramDisplay(igHandle)}</span>
                </div>
              )
            ) : (
              <div className="text-sm text-white/50">Não informado</div>
            )}
          </div>
          <div className="h-px bg-white/10" />
          <div className="space-y-2">
            <div className="text-xs text-white/70">Rolês deste usuário</div>
            {rsvps.length === 0 ? (
              <div className="text-xs text-white/50">Sem interações ainda.</div>
            ) : (
              <div className="space-y-2">
                {/* Check-ins */}
                {rsvps.some((r) => !!r.checkin_confirmed) && (
                  <div className="space-y-1">
                    <div className="text-[11px] text-white/60">Check-ins</div>
                    <div className="flex flex-wrap gap-2">
                      {rsvps.filter((r) => !!r.checkin_confirmed).map((r) => (
                        <Link key={`c-${r.event_id}`} to={`/evento/${r.events?.id ?? r.event_id}`} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="text-foreground">{r.events?.title ?? `Rolê ${r.event_id}`}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {/* Vou */}
                {rsvps.some((r) => r.status === "going" && !r.checkin_confirmed) && (
                  <div className="space-y-1">
                    <div className="text-[11px] text-white/60">Vou</div>
                    <div className="flex flex-wrap gap-2">
                      {rsvps.filter((r) => r.status === "going" && !r.checkin_confirmed).map((r) => (
                        <Link key={`g-${r.event_id}`} to={`/evento/${r.events?.id ?? r.event_id}`} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          <span className="text-foreground">{r.events?.title ?? `Rolê ${r.event_id}`}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {/* Talvez */}
                {rsvps.some((r) => r.status === "maybe") && (
                  <div className="space-y-1">
                    <div className="text-[11px] text-white/60">Talvez</div>
                    <div className="flex flex-wrap gap-2">
                      {rsvps.filter((r) => r.status === "maybe").map((r) => (
                        <Link key={`m-${r.event_id}`} to={`/evento/${r.events?.id ?? r.event_id}`} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                          <span className="text-foreground">{r.events?.title ?? `Rolê ${r.event_id}`}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {/* Não vou */}
                {rsvps.some((r) => r.status === "not-going") && (
                  <div className="space-y-1">
                    <div className="text-[11px] text-white/60">Não vou</div>
                    <div className="flex flex-wrap gap-2">
                      {rsvps.filter((r) => r.status === "not-going").map((r) => (
                        <Link key={`n-${r.event_id}`} to={`/evento/${r.events?.id ?? r.event_id}`} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                          <span className="text-foreground">{r.events?.title ?? `Rolê ${r.event_id}`}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}