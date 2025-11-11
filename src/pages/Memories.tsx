import { useEffect, useMemo, useState, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthRole } from "@/hooks/useAuthRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Star, Share2, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type EventRow = {
  id: string;
  title: string;
  cover_image_url: string | null;
  event_timestamp: string | null;
  description?: string | null;
  location_text?: string | null;
};

const Memories = () => {
  const { profile } = useAuthRole() as any;
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkins, setCheckins] = useState<Record<string, boolean>>({});
  const [commentByEvent, setCommentByEvent] = useState<Record<string, string>>({});
  const [fileByEvent, setFileByEvent] = useState<Record<string, File | null>>({});
  const [ratingByEvent, setRatingByEvent] = useState<Record<string, number>>({});
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [sampleExpanded, setSampleExpanded] = useState(false);
  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [eventDialogId, setEventDialogId] = useState<string | null>(null);
  const [shareDialogEventId, setShareDialogEventId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("id,title,cover_image_url,event_timestamp,description,location_text")
        .order("event_timestamp", { ascending: false, nullsFirst: false });
      setLoading(false);
      if (error) {
        toast({ title: "Erro ao carregar memórias", description: error.message, variant: "destructive" });
        return;
      }
      const now = Date.now();
      const past = (data ?? []).filter((e: any) => !!e.event_timestamp && new Date(e.event_timestamp).getTime() < now);
      const pastEvents = past as EventRow[];
      setEvents(pastEvents);
      // Se veio um eventId na URL, abre automaticamente o diálogo correspondente
      const initialEventId = searchParams.get("eventId");
      if (initialEventId && pastEvents.some((e) => String(e.id) === String(initialEventId))) {
        setEventDialogId(String(initialEventId));
      }
    };
    load();
  }, [searchParams]);

  // Carrega check-ins confirmados do usuário para os eventos listados
  useEffect(() => {
    const fetchCheckins = async () => {
      if (!profile?.id || events.length === 0) return;
      const ids = events.map((e) => e.id);
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("event_id,checkin_confirmed")
        .eq("user_id", profile.id)
        .in("event_id", ids);
      if (!error && data) {
        const map: Record<string, boolean> = {};
        for (const row of data as any[]) {
          map[String(row.event_id)] = !!row.checkin_confirmed;
        }
        setCheckins(map);
      }
    };
    fetchCheckins();
  }, [profile?.id, events.map((e) => e.id).join(",")]);

  const pastCount = events.length;
  const sampleOnly = useMemo(() => pastCount === 0, [pastCount]);

  // Conteúdo falso para demonstrar como ficaria um álbum real
  const samplePhotos: string[] = [
    "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=1200&q=80",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200&q=80",
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1200&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80",
  ];
  const sampleComments: Array<{ name: string; avatar: string; text: string; time: string }> = [
    {
      name: "João Silva",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
      text: "O melhor churras do ano! A picanha ficou no ponto.",
      time: "29/08/2024 22:15",
    },
    {
      name: "Maria Souza",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
      text: "A vista da laje estava incrível, e a playlist também!",
      time: "29/08/2024 22:20",
    },
    {
      name: "Pedro Henrique",
      avatar: "https://images.unsplash.com/photo-1507003216426-6246f1648b39?w=200&q=80",
      text: "Vale repetir! Quem ficou com a última linguiça?",
      time: "29/08/2024 22:31",
    },
    {
      name: "Ana Paula",
      avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&q=80",
      text: "As fotos ficaram lindas. Já subi algumas aqui.",
      time: "29/08/2024 22:42",
    },
  ];
  const sampleParticipants = [
    "João Silva",
    "Maria Souza",
    "Pedro Henrique",
    "Ana Paula",
    "Carlos Lima",
    "Fernanda Rocha",
  ];
  const sampleRatingAvg = 4.6;
  const sampleRatingCount = 32;

  const handlePublish = (eventId: string) => {
    const confirmed = !!checkins[eventId];
    if (!confirmed) {
      toast({ title: "Check-in necessário", description: "Somente quem confirmou presença pode publicar memórias." });
      return;
    }
    toast({ title: "Em breve", description: "Upload de fotos e comentários será habilitado." });
  };

  const handleRate = (eventId: string, stars: number) => {
    const confirmed = !!checkins[eventId];
    if (!confirmed) {
      toast({ title: "Check-in necessário", description: "A avaliação é liberada para quem confirmou presença." });
      return;
    }
    setRatingByEvent((prev) => ({ ...prev, [eventId]: stars }));
    toast({ title: "Obrigado pela avaliação!", description: `Você marcou ${stars} estrela${stars>1?"s":""}. Em breve salvaremos.` });
  };

  return (
    <div className="pb-20 pt-16 px-4 max-w-2xl mx-auto">
      <h2 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent pt-4 pb-4">
        Memórias
      </h2>

      {loading && <div className="text-sm text-muted-foreground">Carregando memórias...</div>}

      {!loading && sampleOnly && (
        <div className="space-y-4">
          <Card className="overflow-hidden bg-card border-border">
            <div className="relative aspect-video" onClick={() => setSampleDialogOpen(true)} role="button" aria-label="Abrir detalhes do rolê">
              <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80" alt="Churrasco na Laje" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-3 right-3 px-3 py-2 rounded-lg bg-gradient-to-br from-emerald-600 to-sky-600 text-white shadow-md">
                <div className="text-xs opacity-80">Data</div>
                <div className="text-sm font-semibold">28/08/2024</div>
              </div>
              <h3 className="absolute bottom-3 left-3 right-3 text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">
                Churrasco na Laje
              </h3>
            </div>
            <div className="p-3 space-y-4">
              {/* Nota do rolê (média) */}
              <div className="space-y-2">
                <h4 className="font-semibold">Nota do rolê</h4>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-5 w-5 ${s <= Math.floor(sampleRatingAvg) ? "text-yellow-400" : "text-muted-foreground"}`} fill={s <= Math.floor(sampleRatingAvg) ? "currentColor" : "none"} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">Média: {sampleRatingAvg.toFixed(1).replace('.', ',')} de 5 • {sampleRatingCount} avaliações</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded bg-white/5">Participantes: {sampleParticipants.length}</span>
                <span className="px-2 py-1 rounded bg-white/5">Fotos: {samplePhotos.length}</span>
                <span className="px-2 py-1 rounded bg-white/5">Comentários: {sampleComments.length}</span>
              </div>


              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setSampleDialogOpen(true)}>
                  Ver mais
                </Button>
              </div>

              {sampleExpanded && (
                <div className="space-y-4">
                  {/* Botão Fechar flutuante (fixo na tela) */}
                  <div className="fixed bottom-4 right-4 z-50">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shadow-lg"
                      onClick={() => setSampleExpanded(false)}
                    >
                      Fechar
                    </Button>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Galeria</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {samplePhotos.map((src, i) => (
                        <div key={i} className="relative aspect-square overflow-hidden rounded">
                          <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Comentários</h4>
                    <div className="space-y-3">
                      {sampleComments.map((c, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 shrink-0">
                            <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground">{c.name}</div>
                            <div className="text-xs text-muted-foreground mb-1">{c.time}</div>
                            <div className="text-sm text-foreground/90">{c.text}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Quem participou</h4>
                    <div className="flex flex-wrap gap-2">
                      {sampleParticipants.map((p, i) => (
                        <span key={i} className="px-2 py-1 rounded bg-white/5 text-xs text-muted-foreground">{p}</span>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Prévia ilustrativa: nesta seção, quem confirmou presença poderia publicar fotos e comentários.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Popup com informações completas do exemplo */}
          <Dialog open={sampleDialogOpen} onOpenChange={setSampleDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Churrasco na Laje</DialogTitle>
                <DialogDescription>28/08/2024 — Exemplo realista</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Nota do rolê</h4>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-5 w-5 ${s <= Math.floor(sampleRatingAvg) ? "text-yellow-400" : "text-muted-foreground"}`} fill={s <= Math.floor(sampleRatingAvg) ? "currentColor" : "none"} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">Média: {sampleRatingAvg.toFixed(1).replace('.', ',')} de 5 • {sampleRatingCount} avaliações</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Galeria</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {samplePhotos.map((src, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded">
                        <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Comentários</h4>
                  <div className="space-y-3">
                    {sampleComments.map((c, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 shrink-0">
                          <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{c.name}</div>
                          <div className="text-xs text-muted-foreground mb-1">{c.time}</div>
                          <div className="text-sm text-foreground/90">{c.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Quem participou</h4>
                  <div className="flex flex-wrap gap-2">
                    {sampleParticipants.map((p, i) => (
                      <span key={i} className="px-2 py-1 rounded bg-white/5 text-xs text-muted-foreground">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {!loading && !sampleOnly && (
        <div className="space-y-3">
          {events.map((ev) => {
            const ts = ev.event_timestamp ? new Date(ev.event_timestamp) : null;
            const dateStr = ts ? ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
            const timeStr = ts ? ts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
            const canPublish = !!checkins[ev.id];
            return (
              <Fragment key={ev.id}>
              <Card className="overflow-hidden bg-card border-border">
                <div className="relative aspect-video" onClick={() => setEventDialogId(ev.id)} role="button" aria-label={`Abrir detalhes de ${ev.title}`}>
                  <img src={ev.cover_image_url ?? "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80"} alt={ev.title} onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-3 right-3 px-3 py-2 rounded-lg bg-gradient-to-br from-emerald-600 to-sky-600 text-white shadow-md">
                    <div className="text-xs opacity-80">Data</div>
                    <div className="text-sm font-semibold">{dateStr}</div>
                  </div>
                  <h3 className="absolute bottom-3 left-3 right-3 text-2xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">
                    {ev.title}
                  </h3>
                </div>
                <div className="p-3 space-y-4">
                  {/* Resumo colapsado */}
                  <div className="space-y-2">
                    <h4 className="font-semibold">Nota do rolê</h4>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className="h-5 w-5 text-muted-foreground" fill="none" />
                      ))}
                      <span className="text-xs text-muted-foreground ml-2">Média: em breve</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-1 rounded bg-white/5">Participantes: —</span>
                    <span className="px-2 py-1 rounded bg-white/5">Fotos: —</span>
                    <span className="px-2 py-1 rounded bg-white/5">Comentários: —</span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShareDialogEventId(ev.id)}
                      className="inline-flex items-center gap-2"
                      aria-label="Compartilhar Memória"
                    >
                      <Share2 className="h-4 w-4" /> Compartilhar Memória
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setEventDialogId(ev.id)}>
                      Ver mais
                    </Button>
                  </div>

                  {/* Diálogo de Compartilhar (fora do modal de detalhes) */}
                  <Dialog open={shareDialogEventId === ev.id} onOpenChange={(open) => setShareDialogEventId(open ? ev.id : null)}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Compartilhar Memória</DialogTitle>
                        <DialogDescription>
                          Texto de convite para compartilhar fotos, comentários e ver a memória.
                        </DialogDescription>
                      </DialogHeader>
                      {(() => {
                        const memUrl = `${window.location.origin}/memorias?eventId=${ev.id}`;
                        const shareText = `Memória do rolê: ${ev.title} — ${dateStr}${timeStr ? ` • ${timeStr}` : ""}\n\nEntre para compartilhar suas fotos, comentários e ver a memória:\n${memUrl}`;
                        const handleCopy = async () => {
                          try {
                            await navigator.clipboard.writeText(shareText);
                            toast({ title: "Texto copiado!", description: "Convite com link da memória copiado." });
                          } catch (e: any) {
                            toast({ title: "Falha ao copiar", description: e?.message ?? String(e), variant: "destructive" });
                          }
                        };
                        const handleOpenWhatsApp = () => {
                          try {
                            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                            const text = encodeURIComponent(shareText);
                            const waUrl = isMobile ? `whatsapp://send?text=${text}` : `https://wa.me/?text=${text}`;
                            window.open(waUrl, "_blank");
                            toast({ title: isMobile ? "Abrindo WhatsApp" : "Abrindo WhatsApp Web", description: "Seu convite será colado na conversa." });
                          } catch (e: any) {
                            toast({ title: "Falha ao abrir WhatsApp", description: e?.message ?? String(e), variant: "destructive" });
                          }
                        };
                        return (
                          <div className="space-y-3">
                            <div className="rounded-md bg-white/5 border border-white/10 p-3">
                              <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{shareText}</pre>
                            </div>
                            <DialogFooter className="gap-2">
                              <Button variant="outline" onClick={handleCopy} className="inline-flex items-center gap-2">
                                <Copy className="h-4 w-4" /> Copiar texto
                              </Button>
                              <Button onClick={handleOpenWhatsApp}>Abrir WhatsApp Web</Button>
                            </DialogFooter>
                          </div>
                        );
                      })()}
                    </DialogContent>
                  </Dialog>

                  {/* Detalhes ao expandir */}
                  {expandedEvents[ev.id] && (
                    <div className="space-y-4">
                      {/* Botão Fechar flutuante (fixo na tela) */}
                      <div className="fixed bottom-4 right-4 z-50">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shadow-lg"
                          onClick={() => setExpandedEvents((prev) => ({ ...prev, [ev.id]: false }))}
                        >
                          Fechar
                        </Button>
                      </div>

                      {/* Avaliação do usuário */}
                      <div className="space-y-2">
                        <Label>Sua nota</Label>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map((s) => (
                            <button
                              key={s}
                              className="p-1"
                              disabled={!canPublish}
                              onClick={() => handleRate(ev.id, s)}
                              aria-label={`Dar ${s} estrela${s>1?"s":""}`}
                            >
                              <Star className={`h-6 w-6 ${s <= (ratingByEvent[ev.id] ?? 0) ? "text-yellow-400" : "text-muted-foreground"}`} fill={s <= (ratingByEvent[ev.id] ?? 0) ? "currentColor" : "none"} />
                            </button>
                          ))}
                        </div>
                        {!canPublish && (
                          <p className="text-xs text-muted-foreground">Avaliação liberada para quem confirmou presença.</p>
                        )}
                      </div>

                      {/* Comentário e foto */}
                      <div className="space-y-2">
                        <Label>Comentário</Label>
                        <Textarea
                          placeholder={canPublish ? "Conte como foi esse rolê..." : "Disponível após check-in confirmado"}
                          value={commentByEvent[ev.id] ?? ""}
                          onChange={(e) => setCommentByEvent((prev) => ({ ...prev, [ev.id]: e.target.value }))}
                          disabled={!canPublish}
                          className="bg-white/5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Foto</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          disabled={!canPublish}
                          onChange={(e) => setFileByEvent((prev) => ({ ...prev, [ev.id]: e.target.files?.[0] ?? null }))}
                          className="bg-white/5"
                        />
                      </div>
                      <Button onClick={() => handlePublish(ev.id)} disabled={!canPublish}>Publicar</Button>
                      {!canPublish && (
                        <p className="text-xs text-muted-foreground">Somente quem confirmou check-in poderá publicar memórias.</p>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Popup com informações completas do evento real */}
              <Dialog open={eventDialogId === ev.id} onOpenChange={(open) => setEventDialogId(open ? ev.id : null)}>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{ev.title}</DialogTitle>
                    <DialogDescription>{dateStr} {timeStr && `• ${timeStr}`}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Foto de capa do rolê */}
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                      <img
                        src={ev.cover_image_url ?? "/placeholder.svg"}
                        onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
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
                    {/* Nota e avaliação */}
                    <div className="space-y-2">
                      <h4 className="font-semibold">Nota do rolê</h4>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map((s) => (
                          <button
                            key={s}
                            className="p-1"
                            disabled={!canPublish}
                            onClick={() => handleRate(ev.id, s)}
                            aria-label={`Dar ${s} estrela${s>1?"s":""}`}
                          >
                            <Star className={`h-6 w-6 ${s <= (ratingByEvent[ev.id] ?? 0) ? "text-yellow-400" : "text-muted-foreground"}`} fill={s <= (ratingByEvent[ev.id] ?? 0) ? "currentColor" : "none"} />
                          </button>
                        ))}
                      </div>
                      {!canPublish && (
                        <p className="text-xs text-muted-foreground">Avaliação liberada para quem confirmou presença.</p>
                      )}
                    </div>

                    {/* Comentários e fotos */}
                    <div className="space-y-2">
                      <Label>Comentário</Label>
                      <Textarea
                        placeholder={canPublish ? "Conte como foi esse rolê..." : "Disponível após check-in confirmado"}
                        value={commentByEvent[ev.id] ?? ""}
                        onChange={(e) => setCommentByEvent((prev) => ({ ...prev, [ev.id]: e.target.value }))}
                        disabled={!canPublish}
                        className="bg-white/5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Foto</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={!canPublish}
                        onChange={(e) => setFileByEvent((prev) => ({ ...prev, [ev.id]: e.target.files?.[0] ?? null }))}
                        className="bg-white/5"
                      />
                    </div>
                <Button onClick={() => handlePublish(ev.id)} disabled={!canPublish}>Publicar</Button>
                {!canPublish && (
                  <p className="text-xs text-muted-foreground">Somente quem confirmou check-in poderá publicar memórias.</p>
                )}

                {/* Compartilhar Memória: botão dentro do modal de detalhes (abre o diálogo acima) */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShareDialogEventId(ev.id)}
                    className="inline-flex items-center gap-2"
                    aria-label="Compartilhar Memória"
                  >
                    <Share2 className="h-4 w-4" /> Compartilhar Memória
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Memories;
