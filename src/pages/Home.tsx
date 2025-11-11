import { EventCard } from "@/components/events/EventCard";
// Busca removida
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BarChart3, Star } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  event_timestamp: string | null;
  location_text: string | null;
};

type PollOption = { id: string; text: string; position: number; votes: number };
type Poll = { id: string; question: string; options: PollOption[]; totalVotes: number; createdAt: string; expiresAt?: string };

// Para ordenação por proximidade da data atual, usamos score = -|data - agora|
type FeedEventItem = { key: string; type: "event"; data: EventRow; score: number };
type FeedPollItem = { key: string; type: "poll"; data: Poll; score: number };
type FeedMemoryItem = { key: string; type: "memory"; data: { cover: string; eventId?: string }; score: number };
type FeedItem = FeedEventItem | FeedPollItem | FeedMemoryItem;

const Home = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [pollLoading, setPollLoading] = useState(false);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const location = useLocation();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [memoryBump, setMemoryBump] = useState<{ eventId: string; ts: number } | null>(null);
  const [memoryDialogId, setMemoryDialogId] = useState<string | null>(null);
  // Contagem de participantes (going/maybe) por evento para evitar fetch por card
  const [hotCounts, setHotCounts] = useState<Record<string, number>>({});
  // Bumps temporários por interação (duração limitada) para reforçar relevância
  const bumpsRef = useRef<Record<string, { rsvpUntil?: number; pollUntil?: number; memUntil?: number }>>({});
  const [pollBumpTs, setPollBumpTs] = useState<number | null>(null);
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

  // Carrega contagens de RSVPs (going/maybe) para os eventos exibidos
  useEffect(() => {
    const ids = events.map((e) => Number(e.id)).filter((n) => Number.isFinite(n));
    if (ids.length === 0) { setHotCounts({}); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("event_rsvps")
          .select("event_id,status")
          .in("event_id", ids)
          .in("status", ["going", "maybe"]);
        if (error) throw error;
        const map: Record<string, number> = {};
        (data ?? []).forEach((row: any) => {
          const key = String(row.event_id);
          map[key] = (map[key] ?? 0) + 1;
        });
        setHotCounts(map);
      } catch {
        // mantém contagens anteriores em caso de falha
      }
    })();
  }, [events]);

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
          // Atualiza contagem local: going/maybe
          const oldStatus = payload?.old?.status as string | undefined;
          const newStatus = payload?.new?.status as string | undefined;
          const wasHot = oldStatus === "going" || oldStatus === "maybe";
          const isHotNow = newStatus === "going" || newStatus === "maybe";
          setHotCounts((prev) => {
            const next = { ...prev };
            const cur = next[eid] ?? 0;
            if (payload?.old && payload?.new) {
              // UPDATE
              if (wasHot && !isHotNow) next[eid] = Math.max(0, cur - 1);
              if (!wasHot && isHotNow) next[eid] = cur + 1;
            } else if (payload?.new && !payload?.old) {
              // INSERT
              if (isHotNow) next[eid] = cur + 1;
            } else if (payload?.old && !payload?.new) {
              // DELETE
              if (wasHot) next[eid] = Math.max(0, cur - 1);
            }
            return next;
          });
          // marca bump temporário (5 min)
          const now = Date.now();
          bumpsRef.current[eid] = {
            ...bumpsRef.current[eid],
            rsvpUntil: Math.max(bumpsRef.current[eid]?.rsvpUntil ?? 0, now + 5 * 60 * 1000),
          };
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

  // Assina atualizações de eventos (ex.: capa atualizada) para refletir imediatamente na Home
  useEffect(() => {
    const channel = supabase
      .channel("home-events-update")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events" },
        (payload: any) => {
          const ev = payload?.new;
          if (!ev?.id) return;
          setEvents((prev) => {
            const idx = prev.findIndex((e) => String(e.id) === String(ev.id));
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = ev as EventRow;
              return next;
            }
            return prev;
          });
        }
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Assina votos em enquetes: ao votar, atualiza a enquete afetada
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
            const { data: optionRows } = await supabase
              .from("poll_options")
              .select("id, poll_id, text, position")
              .eq("poll_id", pollId)
              .order("position", { ascending: true });
            const { data: voteRows } = await supabase
              .from("poll_votes")
              .select("option_id, poll_id")
              .eq("poll_id", pollId);
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
            setPolls((prev) => {
              const idx = prev.findIndex((p) => p.id === pollId);
              if (idx < 0) return prev;
              const next = [...prev];
              const old = next[idx];
              next[idx] = { ...old, options, totalVotes: total };
              return next;
            });
            setPollBumpTs(Date.now());
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
          // marca bump temporário (5 min)
          const now = Date.now();
          bumpsRef.current[eid] = {
            ...bumpsRef.current[eid],
            memUntil: Math.max(bumpsRef.current[eid]?.memUntil ?? 0, now + 5 * 60 * 1000),
          };
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
          // Sinaliza bump de memória para reforçar a posição do card de memórias na esteira
          setMemoryBump({ eventId: eid, ts: Date.now() });
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

  // Carregar todas enquetes não expiradas para exibição na Home
  useEffect(() => {
    const loadPolls = async () => {
      setPollLoading(true);
      const nowIso = new Date().toISOString();
      const { data: pollRows, error: pollErr } = await supabase
        .from("polls")
        .select("id, question, created_at, expires_at")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false });
      if (pollErr) {
        toast({ title: "Falha ao carregar enquetes", description: pollErr.message });
        setPollLoading(false);
        return;
      }
      const ids = (pollRows ?? []).map((p: any) => p.id);
      if (ids.length === 0) {
        setPolls([]);
        setPollLoading(false);
        return;
      }
      const { data: optionRows, error: optErr } = await supabase
        .from("poll_options")
        .select("id, poll_id, text, position")
        .in("poll_id", ids)
        .order("position", { ascending: true });
      if (optErr) {
        toast({ title: "Falha ao carregar opções", description: optErr.message });
        setPollLoading(false);
        return;
      }
      const { data: voteRows, error: voteErr } = await supabase
        .from("poll_votes")
        .select("option_id, poll_id")
        .in("poll_id", ids);
      if (voteErr) {
        toast({ title: "Falha ao carregar votos", description: voteErr.message });
        setPollLoading(false);
        return;
      }
      const voteCountByOption = new Map<string, number>();
      (voteRows ?? []).forEach((v: any) => {
        voteCountByOption.set(v.option_id, (voteCountByOption.get(v.option_id) ?? 0) + 1);
      });
      const optionsByPoll = new Map<string, PollOption[]>();
      (optionRows ?? []).forEach((o: any) => {
        const list = optionsByPoll.get(o.poll_id) ?? [];
        list.push({ id: o.id, text: o.text, position: o.position, votes: voteCountByOption.get(o.id) ?? 0 });
        optionsByPoll.set(o.poll_id, list);
      });
      const finalPolls: Poll[] = (pollRows ?? []).map((p: any) => {
        const opts = (optionsByPoll.get(p.id) ?? []).sort((a, b) => a.position - b.position);
        const total = opts.reduce((acc, cur) => acc + cur.votes, 0);
        return { id: p.id, question: p.question, options: opts, totalVotes: total, createdAt: p.created_at, expiresAt: p.expires_at };
      });
      setPolls(finalPolls);
      setPollLoading(false);
    };
    loadPolls();
  }, []);

  // Monta esteira unificada por proximidade da data atual (eventos, enquete, memória)
  useEffect(() => {
    const items: FeedItem[] = [];
    const now = Date.now();

    // Eventos: ordenação pela proximidade de event_timestamp em relação a agora
    for (const row of events) {
      const ts = row.event_timestamp ? new Date(row.event_timestamp).getTime() : Infinity;
      const diffAbs = Math.abs(ts - now);
      const score = -diffAbs; // mais perto de agora => score maior (menos negativo)
      items.push({ key: `event-${row.id}`, type: "event", data: row, score });
    }

    // Enquetes: usa createdAt para ordenação por proximidade
    for (const p of polls) {
      const pts = p.createdAt ? new Date(p.createdAt).getTime() : Infinity;
      const pdiff = Math.abs(pts - now);
      const pscore = -pdiff;
      items.push({ key: `poll-${p.id}`, type: "poll", data: p, score: pscore });
    }

    // Memória: usa capa e data do último rolê finalizado com capa ou do evento sinalizado em memoryBump
    let memoryCover: string | null = null;
    let memoryEventId: string | undefined = undefined;
    let memoryTs: number | null = null;
    if (memoryBump) {
      const ev = events.find((e) => String(e.id) === String(memoryBump.eventId));
      memoryCover = ev?.cover_image_url ?? null;
      memoryTs = ev?.event_timestamp ? new Date(ev.event_timestamp).getTime() : null;
      memoryEventId = ev ? String(ev.id) : undefined;
    }
    if (!memoryCover) {
      const past = [...events]
        .filter((e) => {
          const ts = e.event_timestamp ? new Date(e.event_timestamp).getTime() : null;
          return ts !== null ? ts < now : false;
        })
        .sort((a, b) => {
          const ta = a.event_timestamp ? new Date(a.event_timestamp).getTime() : -Infinity;
          const tb = b.event_timestamp ? new Date(b.event_timestamp).getTime() : -Infinity;
          return tb - ta;
        });
      const found = past.find((e) => !!e.cover_image_url);
      memoryCover = found?.cover_image_url ?? null;
      memoryTs = found?.event_timestamp ? new Date(found.event_timestamp).getTime() : null;
      memoryEventId = found ? String(found.id) : undefined;
    }
    if (memoryCover) {
      const mts = memoryTs ?? Infinity;
      const mdiff = Math.abs(mts - now);
      const mscore = -mdiff;
      items.push({ key: `memory-${memoryEventId ?? memoryBump?.eventId ?? "latest"}`, type: "memory", data: { cover: memoryCover, eventId: memoryEventId }, score: mscore });
    }

    // Ordena por score desc (score = -distância => mais próximo fica primeiro)
    items.sort((a, b) => b.score - a.score);
    setFeed(items);
  }, [events, polls, pinnedId, memoryBump]);

  // Esteira unificada por relevância é construída em efeitos acima
  return (
    <div className="min-h-screen bg-black">
      <div className="pb-20 pt-16 px-4 space-y-8 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-3xl font-extrabold leading-tight bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Rolês</h2>
        </div>

        {/* Esteira unificada: Eventos, Memórias e Enquetes ordenados pela proximidade da data */}
        <div className="space-y-4">
          {loading && (<div className="text-white/70">Carregando conteúdo...</div>)}
          {!loading && feed.length === 0 && (
            <div className="text-white/70">Nada por aqui ainda. Crie um rolê ou uma enquete!</div>
          )}
          {!loading && feed.map((item) => {
            if (item.type === "event") {
              const row = item.data as EventRow;
              const ts = row.event_timestamp ? new Date(row.event_timestamp) : null;
              const dateStr = ts ? ts.toLocaleDateString("pt-BR") : "Sem data";
              const timeStr = ts ? ts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
              const isCheckinWindow = ts ? (ts.getTime() - Date.now() <= 48 * 60 * 60 * 1000 && ts.getTime() - Date.now() >= 0) : false;
              const isPast = ts ? ts.getTime() < Date.now() : false;
              return (
                <div key={item.key} className={`rounded-xl p-3 border ${isCheckinWindow ? "border-emerald-500/60" : "border-white/10"} bg-white/5 backdrop-blur-md`}>
                  <EventCard
                    id={row.id}
                    title={row.title}
                    date={dateStr}
                    time={timeStr}
                    location={row.location_text ?? ""}
                    coverImage={(row.cover_image_url && row.cover_image_url.trim().length > 0) ? row.cover_image_url : "/placeholder.svg"}
                    attendees={[]}
                    attendeeCount={hotCounts[String(row.id)] ?? 0}
                    isPast={isPast}
                  />
                </div>
              );
            }
            if (item.type === "poll") {
              const p = item.data as Poll;
              const total = p.totalVotes;
              return (
                <div
                  key={item.key}
                  className="rounded-xl p-4 border border-white/10 bg-white/5 backdrop-blur-md cursor-pointer"
                  onClick={() => navigate("/enquetes")}
                  role="button"
                  aria-label="Abrir área de enquetes"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-5 w-5 text-sky-400" aria-label="Enquete" />
                    <div className="text-lg font-semibold text-white">{p.question}</div>
                  </div>
                  {p.expiresAt && (
                    <div className="text-xs text-white/60 mb-2">
                      {(() => {
                        const ms = new Date(p.expiresAt!).getTime() - Date.now();
                        if (ms <= 0) return "expirada";
                        const minutes = Math.floor(ms / 60000);
                        if (minutes < 60) return `expira em ${minutes} min`;
                        const hours = Math.floor(minutes / 60);
                        const days = Math.floor(hours / 24);
                        if (days >= 1) {
                          const remHours = hours - days * 24;
                          return remHours > 0 ? `expira em ${days}d ${remHours}h` : `expira em ${days}d`;
                        }
                        const remMin = minutes - hours * 60;
                        return remMin > 0 ? `expira em ${hours}h ${remMin}m` : `expira em ${hours}h`;
                      })()}
                    </div>
                  )}
                  <div className="space-y-3">
                    {p.options.map((o) => {
                      const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
                      return (
                        <div key={o.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm text-white/90">{o.text}</div>
                            <div className="text-xs text-white/60">{pct}% ({o.votes})</div>
                          </div>
                          <div className="h-2 rounded bg-white/10 overflow-hidden">
                            <div className="h-full bg-sky-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            if (item.type === "memory") {
              const data = item.data as { cover: string; eventId?: string };
              const cover = data.cover;
              return null;
            }
            return null;
          })}
          {/* Popup de Memórias aberto diretamente na Home */}
          <Dialog open={!!memoryDialogId} onOpenChange={(open) => setMemoryDialogId(open ? memoryDialogId : null)}>
            {(() => {
              const ev = events.find((e) => String(e.id) === String(memoryDialogId));
              if (!ev) return null;
              const ts = ev.event_timestamp ? new Date(ev.event_timestamp) : null;
              const dateStr = ts ? ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
              const timeStr = ts ? ts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
              return (
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{ev.title}</DialogTitle>
                    <DialogDescription>
                      {dateStr} {timeStr && `• ${timeStr}`}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Foto de capa do rolê */}
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                      <img
                        src={ev.cover_image_url ?? "/placeholder.svg"}
                        alt={ev.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                    </div>
                    {/* Informações básicas do rolê (sempre visíveis) */}
                    <div className="space-y-1">
                      {ev.description && (
                        <p className="text-sm text-foreground/90">{ev.description}</p>
                      )}
                      {ev.location_text && (
                        <p className="text-sm text-muted-foreground">Local: {ev.location_text}</p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              );
            })()}
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Home;
