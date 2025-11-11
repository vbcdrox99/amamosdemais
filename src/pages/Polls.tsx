import { useEffect, useMemo, useState } from "react";
import { Plus, Share2, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthRole } from "@/hooks/useAuthRole";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ProfileQuickView from "@/components/profile/ProfileQuickView";

interface PollOption {
  id: string;
  text: string;
  votes: number;
  position: number;
}

interface ProfileInfo {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  createdBy?: ProfileInfo;
  voters?: ProfileInfo[];
  expiresAt?: string;
  extraInfo?: string;
}

const Polls = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>(["", "", ""]);
  const [newDuration, setNewDuration] = useState<string>("24h");
  const { permissions, flags } = useAuthRole();
  const { toast } = useToast();
  const [profileViewOpen, setProfileViewOpen] = useState(false);
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null);
  const [shareDialogPollId, setShareDialogPollId] = useState<string | null>(null);
  const [infoDialogPollId, setInfoDialogPollId] = useState<string | null>(null);
  const [newExtraInfo, setNewExtraInfo] = useState<string>("");
  const isAdmin = !!permissions?.canAccessAdmin;

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id ?? null;
      setUserId(uid);
      await fetchPolls(uid);
    };
    init();
  }, []);

  async function fetchPolls(currentUserId: string | null) {
    setLoading(true);
    const { data: pollRows, error: pollErr } = await supabase
      .from("polls")
      .select("id, question, created_at, created_by, expires_at, extra_info")
      .gt("expires_at", new Date().toISOString());
    if (pollErr) {
      toast({ title: "Falha ao carregar enquetes", description: pollErr.message });
      setLoading(false);
      return;
    }
    const ids = (pollRows ?? []).map((p) => p.id);
    const creatorIds = Array.from(new Set((pollRows ?? []).map((p) => p.created_by).filter(Boolean)));
    if (ids.length === 0) {
      setPolls([]);
      setVotedPolls(new Set());
      setLoading(false);
      return;
    }
    const { data: optionRows, error: optErr } = await supabase
      .from("poll_options")
      .select("id, poll_id, text, position")
      .in("poll_id", ids)
      .order("position", { ascending: true });
    if (optErr) {
      toast({ title: "Falha ao carregar opções", description: optErr.message });
      setLoading(false);
      return;
    }
    const { data: voteRows, error: voteErr } = await supabase
      .from("poll_votes")
      .select("option_id, poll_id, user_id, profiles(id, avatar_url, display_name, full_name)");
    if (voteErr) {
      toast({ title: "Falha ao carregar votos", description: voteErr.message });
      setLoading(false);
      return;
    }

    const voteCountByOption = new Map<string, number>();
    const votedPollIds = new Set<string>();
    const votersByPoll = new Map<string, ProfileInfo[]>();
    (voteRows ?? []).forEach((v) => {
      voteCountByOption.set(v.option_id, (voteCountByOption.get(v.option_id) ?? 0) + 1);
      if (currentUserId && v.user_id === currentUserId) {
        votedPollIds.add(v.poll_id);
      }
      const pi: ProfileInfo | null = v.profiles
        ? {
            id: (v.profiles as any).id,
            display_name: (v.profiles as any).display_name ?? null,
            full_name: (v.profiles as any).full_name ?? null,
            avatar_url: (v.profiles as any).avatar_url ?? null,
          }
        : null;
      if (pi) {
        const list = votersByPoll.get(v.poll_id) ?? [];
        // evitar duplicados
        if (!list.find((x) => x.id === pi.id)) list.push(pi);
        votersByPoll.set(v.poll_id, list);
      }
    });

    const optionsByPoll = new Map<string, PollOption[]>();
    (optionRows ?? []).forEach((o) => {
      const list = optionsByPoll.get(o.poll_id) ?? [];
      list.push({ id: o.id, text: o.text, position: o.position, votes: voteCountByOption.get(o.id) ?? 0 });
      optionsByPoll.set(o.poll_id, list);
    });

    // Buscar perfis de criadores
    const creatorsMap = new Map<string, ProfileInfo>();
    if (creatorIds.length > 0) {
      const { data: creatorsRows, error: creatorsErr } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, avatar_url")
        .in("id", creatorIds as string[]);
      if (!creatorsErr) {
        (creatorsRows ?? []).forEach((p) => {
          creatorsMap.set(p.id, {
            id: p.id,
            display_name: p.display_name ?? null,
            full_name: p.full_name ?? null,
            avatar_url: p.avatar_url ?? null,
          });
        });
      }
    }

    const finalPolls: Poll[] = (pollRows ?? []).map((p) => {
      const opts = (optionsByPoll.get(p.id) ?? []).sort((a, b) => a.position - b.position);
      const total = opts.reduce((acc, cur) => acc + cur.votes, 0);
      return {
        id: p.id,
        question: p.question,
        options: opts,
        totalVotes: total,
        createdBy: p.created_by ? creatorsMap.get(p.created_by) ?? undefined : undefined,
        voters: votersByPoll.get(p.id) ?? [],
        expiresAt: (p as any).expires_at,
        extraInfo: (p as any).extra_info ?? undefined,
      };
    });

    // Mantém ordem natural; reordenação só ocorre após votos
    setPolls(finalPolls);
    setVotedPolls(votedPollIds);
    setLoading(false);
  }

  async function handleVote(pollId: string, optionId: string) {
    if (!flags.isAuthenticated || !userId) {
      toast({ title: "Entre para votar", description: "Faça login para participar das enquetes." });
      return;
    }
    const { error } = await supabase.from("poll_votes").insert({ poll_id: pollId, option_id: optionId, user_id: userId });
    if (error) {
      // Unique violation means already voted
      if (error.code === "23505") {
        toast({ title: "Você já votou", description: "Cada pessoa tem 1 voto por enquete." });
      } else {
        toast({ title: "Falha ao votar", description: error.message });
      }
      return;
    }
    setVotedPolls((prev) => new Set(prev).add(pollId));
    // Bump otimista: incrementa votos localmente e move a enquete para o topo
    setPolls((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== pollId) return p;
        const newOptions = p.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o));
        const newTotal = p.totalVotes + 1;
        return { ...p, options: newOptions, totalVotes: newTotal };
      });
      const idx = updated.findIndex((p) => p.id === pollId);
      if (idx <= 0) return updated;
      const [target] = updated.splice(idx, 1);
      return [target, ...updated];
    });
    // Sincroniza dados completos (inclui avatares dos novos votantes)
    await fetchPolls(userId);
    // Bump pós-sincronização para manter a enquete votada no topo
    setPolls((prev) => {
      const idx = prev.findIndex((p) => p.id === pollId);
      if (idx <= 0) return prev;
      const [target] = prev.splice(idx, 1);
      return [target, ...prev];
    });
  }

  async function handleCreatePoll() {
    if (!flags.isAuthenticated || !userId) {
      toast({ title: "Entre para criar enquetes", description: "Faça login para criar enquetes." });
      return;
    }
    if (!permissions.canCreatePolls) {
      toast({ title: "Sem permissão", description: "Sua conta precisa de aprovação para criar enquetes." });
      return;
    }
    const question = newQuestion.trim();
    const optionTexts = newOptions.map((t) => t.trim()).filter((t) => t.length > 0);
    if (!question || optionTexts.length < 2) {
      toast({ title: "Complete a enquete", description: "Informe a pergunta e pelo menos 2 opções." });
      return;
    }
    // Calcula expires_at com base na duração escolhida
    const nowMs = Date.now();
    const durMs = ((): number => {
      switch (newDuration) {
        case "24h": return 24 * 60 * 60 * 1000;
        case "3d": return 3 * 24 * 60 * 60 * 1000;
        case "7d": return 7 * 24 * 60 * 60 * 1000;
        case "15d": return 15 * 24 * 60 * 60 * 1000;
        default: return 24 * 60 * 60 * 1000;
      }
    })();
    const expiresAt = new Date(nowMs + durMs).toISOString();
    const { data: insertedPoll, error: pollErr } = await supabase
      .from("polls")
      .insert({ question, created_by: userId, expires_at: expiresAt, extra_info: newExtraInfo ? newExtraInfo : null })
      .select("id")
      .single();
    if (pollErr || !insertedPoll?.id) {
      toast({ title: "Falha ao criar enquete", description: pollErr?.message ?? "Erro desconhecido" });
      return;
    }
    const pollId = insertedPoll.id as string;
    const payload = optionTexts.map((text, idx) => ({ poll_id: pollId, text, position: idx }));
    const { error: optErr } = await supabase.from("poll_options").insert(payload);
    if (optErr) {
      toast({ title: "Falha ao criar opções", description: optErr.message });
      return;
    }
    setCreateOpen(false);
    setNewQuestion("");
    setNewOptions(["", "", ""]);
    setNewDuration("24h");
    setNewExtraInfo("");
    await fetchPolls(userId);
    toast({ title: "Enquete criada", description: "Sua enquete foi publicada!" });
  }

  async function handleDeletePoll(pollId: string) {
    if (!flags.isAuthenticated || !userId) {
      toast({ title: "Entre para excluir", description: "Faça login para gerenciar enquetes." });
      return;
    }
    const target = polls.find((p) => p.id === pollId);
    const isCreator = target?.createdBy?.id === userId;
    if (!isAdmin && !isCreator) {
      toast({ title: "Sem permissão", description: "Apenas o criador ou um ADMIN pode excluir esta enquete." });
      return;
    }
    const ok = window.confirm("Tem certeza que deseja excluir esta enquete? Esta ação é permanente.");
    if (!ok) return;
    try {
      const { error: votesErr } = await supabase.from("poll_votes").delete().eq("poll_id", pollId);
      if (votesErr) throw votesErr;
      const { error: optsErr } = await supabase.from("poll_options").delete().eq("poll_id", pollId);
      if (optsErr) throw optsErr;
      const { error: pollErr } = await supabase.from("polls").delete().eq("id", pollId);
      if (pollErr) throw pollErr;
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
      setVotedPolls((prev) => {
        const next = new Set(prev);
        next.delete(pollId);
        return next;
      });
      toast({ title: "Enquete excluída", description: "Ela foi removida com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e?.message ?? String(e), variant: "destructive" });
    }
  }

  function updateOptionValue(index: number, value: string) {
    setNewOptions((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addOption() {
    setNewOptions((prev) => (prev.length < 6 ? [...prev, ""] : prev));
  }

  function removeOption(index: number) {
    setNewOptions((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="pb-20 pt-16 px-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-4">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Enquetes</h2>
        <Button
          size="icon"
          className="rounded-full h-12 w-12"
          disabled={!permissions.canCreatePolls}
          title={!permissions.canCreatePolls ? (flags.isAuthenticated ? "Sua conta ainda não foi aprovada." : "Entre e aguarde aprovação para criar enquetes.") : undefined}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="rounded-xl p-4 border border-white/10 bg-white/5 backdrop-blur-md">
            <div className="text-sm text-white/70">Carregando enquetes...</div>
          </div>
        )}
        {!loading && polls.length === 0 && (
          <div className="rounded-xl p-4 border border-white/10 bg-white/5 backdrop-blur-md">
            <div className="text-sm text-white/70">Nenhuma enquete ainda. Crie a primeira!</div>
          </div>
        )}
        {!loading && polls.map((poll) => {
          const hasVoted = votedPolls.has(poll.id);
          return (
            <div key={poll.id} className="rounded-xl p-4 space-y-4 border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{poll.question}</h3>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => setShareDialogPollId(poll.id)}
                    title="Compartilhar"
                    aria-label="Abrir opções de compartilhamento da enquete"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  {(isAdmin || (poll.createdBy?.id === userId)) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => handleDeletePoll(poll.id)}
                      title="Excluir enquete"
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
              {/* Diálogo de Compartilhar Enquete */}
              <Dialog open={shareDialogPollId === poll.id} onOpenChange={(open) => setShareDialogPollId(open ? poll.id : null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Compartilhar Enquete</DialogTitle>
                    <DialogDescription>
                      Envie o convite para votar nesta enquete.
                    </DialogDescription>
                  </DialogHeader>
                  {(() => {
                    const origin = window.location.origin;
                    const extra = (poll.extraInfo ?? "").trim();
                    const shareText = extra
                      ? `Bora votar? Enquete: ${poll.question}\n\nMais informações: ${extra}\n\nVote aqui: ${origin}/enquetes`
                      : `Bora votar? Enquete: ${poll.question}\n\nVote aqui: ${origin}/enquetes`;
                    const handleCopy = async () => {
                      try {
                        await navigator.clipboard.writeText(shareText);
                        toast({ title: "Texto copiado!", description: "Convite para votar copiado." });
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
              {poll.expiresAt && (
                <div className="text-xs text-white/60">
                  {(() => {
                    const ms = new Date(poll.expiresAt!).getTime() - Date.now();
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
              {poll.createdBy && (
                <div className="text-sm text-muted-foreground">
                  <button
                    type="button"
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (!permissions.canEditOwnProfile) return;
                      setProfileViewUserId(poll.createdBy?.id || null);
                      setProfileViewOpen(true);
                    }}
                    disabled={!permissions.canEditOwnProfile}
                  >
                  <Avatar className="h-6 w-6">
                    {poll.createdBy.avatar_url ? (
                      <AvatarImage src={poll.createdBy.avatar_url} alt={poll.createdBy.display_name ?? poll.createdBy.full_name ?? "Criador"} />
                    ) : (
                      <AvatarFallback>{((poll.createdBy.display_name ?? poll.createdBy.full_name ?? "?").slice(0, 1)).toUpperCase()}</AvatarFallback>
                    )}
                  </Avatar>
                  <span>
                    Criado por {poll.createdBy.display_name ?? poll.createdBy.full_name ?? "desconhecido"}
                  </span>
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {poll.options.map((option) => {
                  const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                  return (
                    <button
                      key={option.id}
                      onClick={() => !hasVoted && handleVote(poll.id, option.id)}
                      disabled={hasVoted}
                      className="w-full text-left disabled:cursor-default"
                    >
                      <div className="relative overflow-hidden rounded-lg border-2 border-white/10 hover:border-sky-400/50 transition-colors p-3">
                        {hasVoted && (
                          <div className="absolute inset-y-0 left-0 bg-sky-500/25" style={{ width: `${percentage}%` }} />
                        )}
                        <div className="relative flex items-center justify-between">
                          <span className="font-medium text-foreground">{option.text}</span>
                          {hasVoted && (
                            <span className="text-sm font-semibold text-sky-400">{percentage}%</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-white/70">{poll.totalVotes} votos</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => setInfoDialogPollId(poll.id)}
                    title="Mais informações"
                  >
                    Mais informações
                  </Button>
                </div>
                {poll.voters && poll.voters.length > 0 && (
                  <div className="flex -space-x-2">
                    {poll.voters.slice(0, 8).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          if (!permissions.canEditOwnProfile) return;
                          setProfileViewUserId(u.id);
                          setProfileViewOpen(true);
                        }}
                        disabled={!permissions.canEditOwnProfile}
                      >
                      <Avatar className="h-6 w-6 ring-2 ring-background">
                        {u.avatar_url ? (
                          <AvatarImage src={u.avatar_url} alt={u.display_name ?? u.full_name ?? "Votante"} />
                        ) : (
                          <AvatarFallback>{((u.display_name ?? u.full_name ?? "?").slice(0, 1)).toUpperCase()}</AvatarFallback>
                        )}
                      </Avatar>
                      </button>
                    ))}
                    {poll.voters.length > 8 && (
                      <div className="h-6 w-6 rounded-full bg-muted text-xs flex items-center justify-center ring-2 ring-background">
                        +{poll.voters.length - 8}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Diálogo de Mais Informações da Enquete */}
              <Dialog open={infoDialogPollId === poll.id} onOpenChange={(open) => setInfoDialogPollId(open ? poll.id : null)}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Mais informações</DialogTitle>
                    <DialogDescription>
                      Detalhes e participantes desta enquete.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="text-sm text-foreground">
                      <span className="font-semibold">Pergunta:</span> {poll.question}
                    </div>
                    {poll.extraInfo && (
                      <div className="rounded-md bg-white/5 border border-white/10 p-3">
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap">{poll.extraInfo}</div>
                      </div>
                    )}
                    {poll.expiresAt && (
                      <div className="text-xs text-white/70">
                        {(() => {
                          const ms = new Date(poll.expiresAt!).getTime() - Date.now();
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
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Opções</div>
                      <ul className="space-y-1">
                        {poll.options.map((o) => (
                          <li key={o.id} className="flex items-center justify-between text-sm">
                            <span>{o.text}</span>
                            <span className="text-white/70">{o.votes} voto{o.votes!==1?"s":""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {poll.voters && poll.voters.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold">Participantes</div>
                        <div className="flex flex-wrap gap-2">
                          {poll.voters.map((u) => (
                            <div key={u.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Avatar className="h-6 w-6">
                                {u.avatar_url ? (
                                  <AvatarImage src={u.avatar_url} alt={u.display_name ?? u.full_name ?? "Votante"} />
                                ) : (
                                  <AvatarFallback>{((u.display_name ?? u.full_name ?? "?").slice(0, 1)).toUpperCase()}</AvatarFallback>
                                )}
                              </Avatar>
                              <span>{u.display_name ?? u.full_name ?? "desconhecido"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar enquete</DialogTitle>
            <DialogDescription>Brincadeiras e opiniões — mínimo 2 opções.</DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              title="Fechar"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="poll-question">Pergunta</Label>
              <Input
                id="poll-question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Ex: Qual é o melhor sabor de pizza?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="poll-extra-info">Mais informações sobre a enquete (opcional)</Label>
              <textarea
                id="poll-extra-info"
                value={newExtraInfo}
                onChange={(e) => setNewExtraInfo(e.target.value)}
                placeholder="Use este espaço para dar contexto, regras ou observações."
                className="w-full rounded-md border border-white/10 bg-white/5 p-2 text-sm outline-none"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Opções</Label>
              {newOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOptionValue(idx, e.target.value)}
                    placeholder={`Opção ${idx + 1}`}
                  />
                  {newOptions.length > 2 && (
                    <Button type="button" variant="outline" onClick={() => removeOption(idx)} title="Remover opção">
                      Remover
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={addOption} disabled={newOptions.length >= 6}>
                  Adicionar opção
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração da enquete</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={newDuration === "24h" ? "default" : "outline"} onClick={() => setNewDuration("24h")}>24h</Button>
                <Button type="button" variant={newDuration === "3d" ? "default" : "outline"} onClick={() => setNewDuration("3d")}>3 dias</Button>
                <Button type="button" variant={newDuration === "7d" ? "default" : "outline"} onClick={() => setNewDuration("7d")}>7 dias</Button>
                <Button type="button" variant={newDuration === "15d" ? "default" : "outline"} onClick={() => setNewDuration("15d")}>15 dias</Button>
              </div>
              <div className="text-xs text-white/70">Assim que a duração acabar, a enquete será excluída automaticamente.</div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleCreatePoll} disabled={!permissions.canCreatePolls}>
              Publicar enquete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de perfil */}
      <ProfileQuickView userId={profileViewUserId} open={profileViewOpen} onOpenChange={setProfileViewOpen} />
    </div>
  );
};

export default Polls;
