import { EventCard } from "@/components/events/EventCard";
// Busca removida
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart3, Star } from "lucide-react";
import { useLocation } from "react-router-dom";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  event_timestamp: string | null;
  location_text: string | null;
};

type PollOption = { id: string; text: string; position: number; votes: number };
type Poll = { id: string; question: string; options: PollOption[]; totalVotes: number };

const Home = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [pollLoading, setPollLoading] = useState(false);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const location = useLocation();
  const orderedEvents = (() => {
    if (!pinnedId) return events;
    const idx = events.findIndex((e) => String(e.id) === String(pinnedId));
    if (idx <= 0) return events;
    const arr = [...events];
    const [target] = arr.splice(idx, 1);
    return [target, ...arr];
  })();

  useEffect(() => {
    // carrega ID fixado do storage
    try {
      const stored = localStorage.getItem("pinned_event_id");
      if (stored) setPinnedId(stored);
    } catch {}
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,cover_image_url,event_timestamp,location_text")
        // Não ordenar por data; prioriza criação mais recente como base
        .order("created_at", { ascending: false, nullsFirst: false });
      setLoading(false);
      if (error) {
        toast({ title: "Erro ao carregar eventos", description: error.message });
        return;
      }
      const list = [...(data ?? [])];
      // mantém fixado no topo entre reloads
      try {
        const pinned = localStorage.getItem("pinned_event_id");
        if (pinned) {
          const idx = list.findIndex((e: any) => String(e.id) === String(pinned));
          if (idx > 0) {
            const [target] = list.splice(idx, 1);
            list.unshift(target);
          }
        }
      } catch {}
      setEvents(list);
    };
    load();
  }, []);

  // Escuta BroadcastChannel para bumps imediatos
  useEffect(() => {
    // Protege navegadores sem suporte a BroadcastChannel (ex.: iOS Safari antigo)
    const hasBC = typeof window !== "undefined" && "BroadcastChannel" in window;
    if (hasBC) {
      const bc = new BroadcastChannel("home-bump");
      bc.onmessage = (ev: MessageEvent) => {
        const eid = String((ev.data || {}).eventId || "");
        if (!eid) return;
        setPinnedId(eid);
        try { localStorage.setItem("pinned_event_id", eid); } catch {}
        setEvents((prev) => {
          const idx = prev.findIndex((e) => String(e.id) === eid);
          if (idx === 0) return prev; // já no topo
          if (idx > 0) {
            const updated = [...prev];
            const [target] = updated.splice(idx, 1);
            return [target, ...updated];
          }
          return prev;
        });
        // se não estiver na lista ainda, busca e coloca no topo
        setTimeout(async () => {
          // usa leitura fresca do estado
          let exists = false;
          setEvents((prev) => {
            exists = prev.some((e) => String(e.id) === eid);
            return prev;
          });
          if (!exists) {
            const { data } = await supabase
              .from("events")
              .select("id,title,description,cover_image_url,event_timestamp,location_text")
              .eq("id", Number(eid))
              .maybeSingle();
            if (data) {
              setEvents((prev) => {
                const base = prev.filter((e) => String(e.id) !== String(data.id));
                return [data as EventRow, ...base];
              });
            }
          }
        }, 0);
      };
      return () => bc.close();
    } else {
      // Fallback: ao voltar ao foco/leitura, reler storage e forçar reordenação
      const onFocus = () => {
        try {
          const stored = localStorage.getItem("pinned_event_id");
          if (stored) setPinnedId(stored);
        } catch {}
      };
      window.addEventListener("focus", onFocus);
      const onVis = () => { if (!document.hidden) onFocus(); };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVis);
      };
    }
  }, []);

  // Ao voltar para '/', reforça leitura do fixado
  useEffect(() => {
    if (location.pathname === "/") {
      try {
        const stored = localStorage.getItem("pinned_event_id");
        if (stored) setPinnedId(stored);
      } catch {}
    }
  }, [location.pathname]);

  // Assinatura em tempo real: qualquer mudança em event_rsvps faz o rolê subir
  useEffect(() => {
    const channel = supabase
      .channel("home-rsvps-bump")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_rsvps" },
        (payload: any) => {
          const eid = String(payload?.new?.event_id ?? payload?.old?.event_id ?? "");
          if (!eid) return;
          // atualiza fixado para a última interação
          setPinnedId(eid);
          try { localStorage.setItem("pinned_event_id", eid); } catch {}
          setEvents((prev) => {
            const idx = prev.findIndex((e) => String(e.id) === eid);
            if (idx === 0) return prev; // já no topo
            if (idx > 0) {
              const updated = [...prev];
              const [target] = updated.splice(idx, 1);
              // garante que o fixado permanece no topo
              const reordered = [target, ...updated];
              return reordered;
            }
            return prev;
          });
          // se não estiver na lista ainda, busca e coloca no topo
          setTimeout(async () => {
            let exists = false;
            setEvents((prev) => { exists = prev.some((e) => String(e.id) === eid); return prev; });
            if (!exists) {
              const { data } = await supabase
                .from("events")
                .select("id,title,description,cover_image_url,event_timestamp,location_text")
                .eq("id", Number(eid))
                .maybeSingle();
              if (data) {
                setEvents((prev) => {
                  const base = prev.filter((e) => String(e.id) !== String(data.id));
                  return [data as EventRow, ...base];
                });
              }
            }
          }, 0);
        }
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sempre que pinnedId mudar, garanta que ele esteja no topo da lista
  useEffect(() => {
    if (!pinnedId) return;
    let exists = false;
    setEvents((prev) => {
      const idx = prev.findIndex((e) => String(e.id) === String(pinnedId));
      exists = idx >= 0;
      if (idx === 0) return prev;
      if (idx > 0) {
        const updated = [...prev];
        const [target] = updated.splice(idx, 1);
        return [target, ...updated];
      }
      return prev;
    });
    // Se não existir na lista, busca e coloca no topo
    if (!exists) {
      (async () => {
        const { data } = await supabase
          .from("events")
          .select("id,title,description,cover_image_url,event_timestamp,location_text")
          .eq("id", Number(pinnedId))
          .maybeSingle();
        if (data) {
          setEvents((prev) => {
            const base = prev.filter((e) => String(e.id) !== String(data.id));
            return [data as EventRow, ...base];
          });
        }
      })();
    }
  }, [pinnedId]);

  // Assina criação de novos rolês: novo evento fica fixado no topo
  useEffect(() => {
    const channel = supabase
      .channel("home-events-insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload: any) => {
          const ev = payload?.new;
          if (!ev?.id) return;
          const eid = String(ev.id);
          setPinnedId(eid);
          try { localStorage.setItem("pinned_event_id", eid); } catch {}
          setEvents((prev) => {
            // evita duplicado se já existir
            const exists = prev.some((e) => String(e.id) === eid);
            const base = exists ? prev.filter((e) => String(e.id) !== eid) : prev;
            return [ev as EventRow, ...base];
          });
        }
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Assina votos em enquetes: ao votar, o rolê vinculado à enquete sobe
  useEffect(() => {
    const channel = supabase
      .channel("home-poll-votes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "poll_votes" },
        async (payload: any) => {
          const pollId = payload?.new?.poll_id;
          if (!pollId) return;
          try {
            const { data: poll, error: pollErr } = await supabase
              .from("polls")
              .select("id, event_id")
              .eq("id", pollId)
              .maybeSingle();
            if (pollErr) return;
            const eid = String(poll?.event_id ?? "");
            if (!eid) return;
            setPinnedId(eid);
            try { localStorage.setItem("pinned_event_id", eid); } catch {}
            setEvents((prev) => {
              const idx = prev.findIndex((e) => String(e.id) === eid);
              if (idx === 0) return prev;
              if (idx > 0) {
                const updated = [...prev];
                const [target] = updated.splice(idx, 1);
                return [target, ...updated];
              }
              return prev;
            });
            // Se não estiver na lista, busca o rolê e coloca no topo
            setTimeout(async () => {
              let exists = false;
              setEvents((prev) => { exists = prev.some((e) => String(e.id) === eid); return prev; });
              if (!exists) {
                const { data: ev } = await supabase
                  .from("events")
                  .select("id,title,description,cover_image_url,event_timestamp,location_text")
                  .eq("id", Number(eid))
                  .maybeSingle();
                if (ev) {
                  setEvents((prev) => {
                    const base = prev.filter((e) => String(e.id) !== String(ev.id));
                    return [ev as EventRow, ...base];
                  });
                }
              }
            }, 0);
          } catch {}
        }
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Assina criação de memórias (comentários/fotos): ao publicar, o rolê associado sobe
  useEffect(() => {
    const channel = supabase
      .channel("home-memories-insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "memories" },
        async (payload: any) => {
          const eid = String(payload?.new?.event_id ?? "");
          if (!eid) return;
          setPinnedId(eid);
          try { localStorage.setItem("pinned_event_id", eid); } catch {}
          setEvents((prev) => {
            const idx = prev.findIndex((e) => String(e.id) === eid);
            if (idx === 0) return prev;
            if (idx > 0) {
              const updated = [...prev];
              const [target] = updated.splice(idx, 1);
              return [target, ...updated];
            }
            return prev;
          });
          // Se não estiver na lista, busca o rolê e coloca no topo
          setTimeout(async () => {
            let exists = false;
            setEvents((prev) => { exists = prev.some((e) => String(e.id) === eid); return prev; });
            if (!exists) {
              const { data: ev } = await supabase
                .from("events")
                .select("id,title,description,cover_image_url,event_timestamp,location_text")
                .eq("id", Number(eid))
                .maybeSingle();
              if (ev) {
                setEvents((prev) => {
                  const base = prev.filter((e) => String(e.id) !== String(ev.id));
                  return [ev as EventRow, ...base];
                });
              }
            }
          }, 0);
        }
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Ref para acompanhar transições de janela de check-in e fim de rolê
  const flagsRef = useRef<Record<string, { checkin: boolean; past: boolean }>>({});

  // Checagem periódica: quando entrar em check-in ou virar memória (acabou), sobe pro topo
  useEffect(() => {
    const tick = () => {
      setEvents((prev) => {
        const updated = [...prev];
        let bumped = false;
        for (let i = 0; i < updated.length; i++) {
          const row = updated[i];
          const ts = row.event_timestamp ? new Date(row.event_timestamp) : null;
          const now = Date.now();
          const diff = ts ? ts.getTime() - now : null;
          const checkin = diff !== null ? diff <= 48 * 60 * 60 * 1000 && diff >= 0 : false;
          const past = diff !== null ? diff < 0 : false;
          const prevFlags = flagsRef.current[row.id] || { checkin: false, past: false };
          const enteredCheckin = !prevFlags.checkin && checkin;
          const justFinished = !prevFlags.past && past;
          if (enteredCheckin || justFinished) {
            const [target] = updated.splice(i, 1);
            updated.unshift(target);
            bumped = true;
          }
          flagsRef.current[row.id] = { checkin, past };
        }
        // Garante que o fixado (manual) permanece no topo, mesmo após bumps automáticos
        if (pinnedId) {
          const idx = updated.findIndex((e) => String(e.id) === String(pinnedId));
          if (idx > 0) {
            const [target] = updated.splice(idx, 1);
            updated.unshift(target);
          }
        }
        // se o fixado não existe mais, limpa
        if (pinnedId && !updated.some((e) => String(e.id) === String(pinnedId))) {
          setPinnedId(null);
          try { localStorage.removeItem("pinned_event_id"); } catch {}
        }
        return updated;
      });
    };
    // primeira checagem imediata e depois a cada 30s
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [pinnedId]);

  // Carregar enquete vigente (última criada) para exibição na Home
  useEffect(() => {
    const loadPoll = async () => {
      setPollLoading(true);
      // Seleciona a última enquete criada
      const { data: pollRows, error: pollErr } = await supabase
        .from("polls")
        .select("id, question, created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      if (pollErr) {
        toast({ title: "Falha ao carregar enquete", description: pollErr.message });
        setPollLoading(false);
        return;
      }
      const selected = (pollRows ?? [])[0];
      if (!selected) {
        setPoll(null);
        setPollLoading(false);
        return;
      }
      const { data: optionRows, error: optErr } = await supabase
        .from("poll_options")
        .select("id, poll_id, text, position")
        .eq("poll_id", selected.id)
        .order("position", { ascending: true });
      if (optErr) {
        toast({ title: "Falha ao carregar opções", description: optErr.message });
        setPollLoading(false);
        return;
      }
      const { data: voteRows, error: voteErr } = await supabase
        .from("poll_votes")
        .select("option_id, poll_id");
      if (voteErr) {
        toast({ title: "Falha ao carregar votos", description: voteErr.message });
        setPollLoading(false);
        return;
      }
      const voteCountByOption = new Map<string, number>();
      (voteRows ?? []).forEach((v: any) => {
        voteCountByOption.set(v.option_id, (voteCountByOption.get(v.option_id) ?? 0) + 1);
      });
      const options: PollOption[] = (optionRows ?? []).map((o: any) => ({
        id: o.id,
        text: o.text,
        position: o.position,
        votes: voteCountByOption.get(o.id) ?? 0,
      }));
      const total = options.reduce((acc, cur) => acc + cur.votes, 0);
      setPoll({ id: selected.id, question: selected.question, options, totalVotes: total });
      setPollLoading(false);
    };
    loadPoll();
  }, []);

  // Seleciona uma capa para a memória: último rolê já finalizado com imagem
  const memoryCover = (() => {
    const past = events
      .filter((e) => {
        const ts = e.event_timestamp ? new Date(e.event_timestamp) : null;
        return ts ? ts.getTime() < Date.now() : false;
      })
      .sort((a, b) => {
        const ta = a.event_timestamp ? new Date(a.event_timestamp).getTime() : -Infinity;
        const tb = b.event_timestamp ? new Date(b.event_timestamp).getTime() : -Infinity;
        return tb - ta;
      });
    const found = past.find((e) => !!e.cover_image_url);
    return found?.cover_image_url ?? "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80";
  })();
  return (
    <div className="min-h-screen bg-black">
      <div className="pb-20 pt-16 px-4 space-y-8 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="space-y-3">
          <h2 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Rolês</h2>
        </div>

        {/* Busca removida */}

        {/* Chips rápidas removidas a pedido do usuário */}

        {/* Lista de eventos */}
        <div className="space-y-4">
          {loading && (
            <div className="text-white/70">Carregando eventos...</div>
          )}
          {!loading && orderedEvents.length === 0 && (
            <div className="text-white/70">Nenhum rolê encontrado. Crie o primeiro!</div>
          )}
          {!loading && orderedEvents.map((row) => {
            const ts = row.event_timestamp ? new Date(row.event_timestamp) : null;
            const dateStr = ts ? ts.toLocaleDateString("pt-BR") : "Sem data";
            const timeStr = ts ? ts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
            const isCheckinWindow = ts ? (ts.getTime() - Date.now() <= 48 * 60 * 60 * 1000 && ts.getTime() - Date.now() >= 0) : false;
            return (
              <div
                key={row.id}
                className={`rounded-xl p-3 border ${isCheckinWindow ? "border-emerald-500/60" : "border-white/10"} bg-white/5 backdrop-blur-md`}
              >
                <EventCard
                  id={row.id}
                  title={row.title}
                  date={dateStr}
                  time={timeStr}
                  location={row.location_text ?? ""}
                  coverImage={row.cover_image_url ?? "/placeholder.svg"}
                  attendees={[]}
                  attendeeCount={0}
                />
              </div>
            );
          })}
        </div>

        {/* Enquetes (por último, sem título; ícone identifica) */}
        <div className="space-y-3 pt-6">
          {pollLoading && <div className="text-white/70">Carregando enquete...</div>}
          {!pollLoading && !poll && (
            <div className="text-white/70">Nenhuma enquete vigente.</div>
          )}
          {!pollLoading && poll && (
            <Card className="p-4 bg-white/5 border-white/10">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{poll.question}</span>
              </div>
              <div className="space-y-2">
                {poll.options.map((option) => {
                  const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                  return (
                    <div key={option.id} className="relative overflow-hidden rounded-lg border-2 border-border p-3">
                      <div className="absolute inset-y-0 left-0 bg-primary/20" style={{ width: `${percentage}%` }} />
                      <div className="relative flex items-center justify-between">
                        <span className="text-foreground">{option.text}</span>
                        {poll.totalVotes > 0 && <span className="text-sm font-semibold text-primary">{percentage}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{poll.totalVotes} votos</div>
                <Button asChild variant="outline" size="sm"><Link to="/enquetes">Ver todas</Link></Button>
              </div>
            </Card>
          )}
        </div>

        {/* Memórias (por último, sem título; ícone identifica) */}
        <div className="space-y-3 pt-6">
          <Card className="p-4 bg-white/5 border-white/10">
            {/* Foto principal da memória */}
            <img
              src={memoryCover}
              alt="Foto do rolê"
              className="mb-3 w-full h-40 object-cover rounded-md"
            />
            <div className="mb-2 flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-400" />
              <span className="text-lg font-semibold text-foreground">Churrasco de domingo</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Fotos, comentários e quem participou. Exemplo de memória fixa.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "Ana",
                "Bruno",
                "Carol",
                "Diego",
                "Elaine",
              ].map((p, i) => (
                <span key={i} className="px-2 py-1 rounded bg-white/5 text-xs text-muted-foreground">{p}</span>
              ))}
            </div>
            <Button asChild variant="outline" size="sm"><Link to="/memorias">Ver memórias</Link></Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
