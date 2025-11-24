import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Clock, Calendar, Share2, Copy, Flame, Pencil } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import ProfileQuickView from "@/components/profile/ProfileQuickView";
import { useAuthRole } from "@/hooks/useAuthRole";
import { supabase } from "@/lib/supabase";
import { formatPhoneBR } from "@/lib/utils";

const EVENT_COVER_BUCKET = "event-covers";

type RsvpStatus = "going" | "maybe" | "not-going" | null;

const EventDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { permissions, flags } = useAuthRole();
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [checkinConfirmed, setCheckinConfirmed] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const { toast } = useToast();

  type EventRow = {
    id: string;
    title: string;
    description: string | null;
    requirements?: string | null;
    aux_links?: string | null;
    cover_image_url: string | null;
    event_timestamp: string | null;
    location_text: string | null;
    created_by?: string | null;
    extra_kind?: string | null;
    extra_location?: string | null;
  };

  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [sameDayEvents, setSameDayEvents] = useState<EventRow[]>([]);
  const [loadingSameDay, setLoadingSameDay] = useState(false);
  // Participantes (RSVPs)
  const [participants, setParticipants] = useState<Array<{
    user_id: string;
    status: Exclude<RsvpStatus, null>;
    full_name: string | null;
    avatar_url: string | null;
    phone_number: string | null;
    arrival_time?: string | null;
  }>>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [profileViewOpen, setProfileViewOpen] = useState(false);
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null);

  const loadParticipants = async () => {
    if (!id) return;
    try {
      setParticipantsLoading(true);
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("user_id,status,arrival_time,profiles:profiles(id,full_name,avatar_url,phone_number,instagram)")
        .eq("event_id", Number(id));
      if (error) throw error;
      const mapped = (data ?? []).map((row: any) => ({
        user_id: row.user_id as string,
        status: row.status as Exclude<RsvpStatus, null>,
        full_name: row.profiles?.full_name ?? null,
        avatar_url: row.profiles?.avatar_url ?? null,
        phone_number: row.profiles?.phone_number ?? null,
        arrival_time: row.arrival_time ?? null,
      }));
      setParticipants(mapped);
    } catch (e: any) {
      toast({ title: "Erro ao carregar participantes", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setParticipantsLoading(false);
    }
  };

  useEffect(() => {
    loadParticipants();
    // Recarrega quando o RSVP ou o check-in do usuário muda
  }, [id, rsvpStatus, checkinConfirmed]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,requirements,aux_links,cover_image_url,event_timestamp,location_text,created_by,extra_kind,extra_location")
        .eq("id", Number(id))
        .maybeSingle();
      setLoading(false);
      if (error) {
        toast({ title: "Erro ao carregar evento", description: error.message, variant: "destructive" });
        return;
      }
      if (!data) {
        toast({ title: "Evento não encontrado", description: "Esse rolê pode ter sido removido." });
        setEvent(null);
        return;
      }
      setEvent(data as EventRow);
    };
    load();
  }, [id]);

  // Carrega RSVP do usuário para este evento
  const { profile } = useAuthRole() as any;
  useEffect(() => {
    const loadRsvp = async () => {
      if (!profile?.id || !id) return;
      const { data, error } = await supabase
        .from("event_rsvps")
        .select("status,checkin_confirmed")
        .eq("event_id", Number(id))
        .eq("user_id", profile.id)
        .maybeSingle();
      if (!error && data) {
        setRsvpStatus((data as any).status as RsvpStatus);
        setCheckinConfirmed(!!(data as any).checkin_confirmed);
      }
    };
    loadRsvp();
  }, [profile?.id, id]);

  const handleUpdateRsvp = async (status: RsvpStatus) => {
    if (!permissions.canConfirmPresence) {
      // Mesmo sem aprovação, considerar tentativa como interação para priorizar o rolê
      try {
        const eid = String(id ?? "");
        if (eid) {
          localStorage.setItem("pinned_event_id", eid);
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("home-bump");
            bc.postMessage({ eventId: eid });
            bc.close();
          }
        }
      } catch {}
      toast({
        title: "Ação não permitida",
        description: flags.isAuthenticated ? "Sua conta ainda não foi aprovada." : "Entre com sua conta e aguarde aprovação.",
      });
      return;
    }
    if (!profile?.id || !id) return;
    try {
      setRsvpLoading(true);
      const payload: any = { event_id: Number(id), user_id: profile.id, status };
      const { error } = await supabase.from("event_rsvps").upsert(payload, { onConflict: "event_id,user_id" });
      setRsvpLoading(false);
      if (error) {
        toast({ title: "Erro ao salvar presença", description: error.message, variant: "destructive" });
        return;
      }
      setRsvpStatus(status);
      // Marca este rolê como fixado para reordenar na Home e notifica via BroadcastChannel
      try {
        const eid = String(id);
        localStorage.setItem("pinned_event_id", eid);
        const bc = new BroadcastChannel("home-bump");
        bc.postMessage({ eventId: eid });
        bc.close();
      } catch {}
      toast({ title: "Presença atualizada" });
      // Atualiza a lista de participantes após mudança de RSVP
      loadParticipants();
    } catch (e: any) {
      setRsvpLoading(false);
      toast({ title: "Erro inesperado", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  const dateStr = useMemo(() => {
    if (!event?.event_timestamp) return "Sem data";
    try {
      const d = new Date(event.event_timestamp);
      const raw = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
      const weekdaysMap: Record<string, string> = {
        "domingo": "Domingo",
        "segunda-feira": "Segunda-Feira",
        "terça-feira": "Terça-Feira",
        "quarta-feira": "Quarta-Feira",
        "quinta-feira": "Quinta-Feira",
        "sexta-feira": "Sexta-Feira",
        "sábado": "Sábado",
      };
      const monthsMap: Record<string, string> = {
        "janeiro": "Janeiro",
        "fevereiro": "Fevereiro",
        "março": "Março",
        "abril": "Abril",
        "maio": "Maio",
        "junho": "Junho",
        "julho": "Julho",
        "agosto": "Agosto",
        "setembro": "Setembro",
        "outubro": "Outubro",
        "novembro": "Novembro",
        "dezembro": "Dezembro",
      };
      let out = raw;
      Object.entries(weekdaysMap).forEach(([k, v]) => { out = out.replace(k, v); });
      Object.entries(monthsMap).forEach(([k, v]) => { out = out.replace(k, v); });
      return out;
    } catch {
      return "Sem data";
    }
  }, [event?.event_timestamp]);

  const timeStr = useMemo(() => {
    if (!event?.event_timestamp) return "";
    try {
      const d = new Date(event.event_timestamp);
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }, [event?.event_timestamp]);

  // Links auxiliares (parse de múltiplos formatos: linhas e vírgulas)
  const auxLinks = useMemo(() => {
    const raw = (event?.aux_links || "").trim();
    if (!raw) return [] as string[];
    return raw
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [event?.aux_links]);

  // Definir janela de check-in ANTES de qualquer uso
  const isCheckinWindow = useMemo(() => {
    if (!event?.event_timestamp) return false;
    const now = new Date();
    const eventDate = new Date(event.event_timestamp);
    const diffMs = eventDate.getTime() - now.getTime();
    return diffMs > 0 && diffMs <= 48 * 60 * 60 * 1000; // até 48h antes
  }, [event?.event_timestamp]);

  // Evento já passou? Usado para desabilitar RSVP
  const isPast = useMemo(() => {
    if (!event?.event_timestamp) return false;
    try {
      const d = new Date(event.event_timestamp);
      return d.getTime() < Date.now();
    } catch {
      return false;
    }
  }, [event?.event_timestamp]);

  // Janela de edição de horários de chegada: até o fim do DIA do evento
  const isArrivalEditable = useMemo(() => {
    if (!event?.event_timestamp) return false;
    try {
      const d = new Date(event.event_timestamp);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      return Date.now() <= endOfDay.getTime();
    } catch {
      return false;
    }
  }, [event?.event_timestamp]);

  const eventUrl = `${window.location.origin}/evento/${id ?? ""}`;
  const [inviteMessage, setInviteMessage] = useState<string>("");
  // Templates de convite para modos Normal vs Check-in
  const buildNormalInvite = (ev: EventRow | null) => {
    if (!ev) return "";
    const when = `${dateStr}${timeStr ? ` às ${timeStr}` : ""}`;
    const where = ev.location_text ?? "local a definir";
    const desc = (ev.description || "").trim();
    const base = `${ev.title} — ${when} em ${where}`.trim();
    const extras = (() => {
      const kind = (ev.extra_kind || "none").toLowerCase();
      const loc = (ev.extra_location || "").trim();
      if ((kind === "after" || kind === "esquenta") && loc) {
        const label = kind === "after" ? "After" : "Esquenta";
        return `\n\nO ${label} vai ser ${loc}`;
      }
      return "";
    })();
    const withDesc = desc ? `${base}\n\n${desc}` : base;
    return `${withDesc}${extras}`;
  };
  const buildCheckinInvite = (ev: EventRow | null) => {
    if (!ev) return "";
    const when = `${dateStr}${timeStr ? ` às ${timeStr}` : ""}`;
    const where = ev.location_text ?? "local a definir";
    const desc = (ev.description || "").trim();
    const base = `Check-in aberto! ${ev.title} — ${when} em ${where}. Faça seu check-in ao chegar 👊`.trim();
    const extras = (() => {
      const kind = (ev.extra_kind || "none").toLowerCase();
      const loc = (ev.extra_location || "").trim();
      if ((kind === "after" || kind === "esquenta") && loc) {
        const label = kind === "after" ? "After" : "Esquenta";
        return `\n\nO ${label} vai ser ${loc}`;
      }
      return "";
    })();
    const withDesc = desc ? `${base}\n\n${desc}` : base;
    return `${withDesc}${extras}`;
  };
  useEffect(() => {
    if (!event) return;
    const defaultInvite = isCheckinWindow ? buildCheckinInvite(event) : buildNormalInvite(event);
    setInviteMessage(defaultInvite);
  }, [event, dateStr, timeStr, isCheckinWindow]);
  const fullInvite = `${inviteMessage}\n\nConfirme sua presença aqui 👉\n${eventUrl}`;

  // Deriva grupos de horários (inclui o horário fixado do evento primeiro)
  const fixedTimeLabel = timeStr || "";
  const arrivalGroups = useMemo(() => {
    const groups = new Map<string, typeof participants>();
    if (fixedTimeLabel) groups.set(fixedTimeLabel, []);
    for (const p of participants) {
      const label = (p.arrival_time || "").trim();
      if (!label) continue;
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(p);
    }
    return groups;
  }, [participants, fixedTimeLabel]);

  const [addHour, setAddHour] = useState<string | null>(null);
  const [addMinute, setAddMinute] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const canChooseArrival = flags.isAuthenticated && isArrivalEditable && rsvpStatus !== "not-going";

  const isCreator = useMemo(() => {
    try {
      return !!event?.created_by && !!profile?.id && event!.created_by === profile!.id;
    } catch {
      return false;
    }
  }, [event?.created_by, profile?.id]);

  const myRsvp = useMemo(() => {
    if (!profile?.id) return null;
    return participants.find((p) => p.user_id === profile.id) ?? null;
  }, [participants, profile?.id]);

  const setArrivalTime = async (label: string | null) => {
    try {
      if (!profile?.id || !id) return;
      const payload: Record<string, any> = {
        event_id: Number(id),
        user_id: profile.id,
        arrival_time: label,
      };
      if (rsvpStatus) payload.status = rsvpStatus;
      const { error } = await supabase
        .from("event_rsvps")
        .upsert(payload, { onConflict: "event_id,user_id" });
      if (error) throw error;
      await loadParticipants();
      toast({ title: "Horário marcado", description: label ? `Você chegará às ${label}.` : "Horário removido." });
    } catch (e: any) {
      toast({ title: "Erro ao marcar horário", description: e?.message ?? String(e), variant: "destructive" });
    }
  };

  // Regra: criador do evento automaticamente fica como VOU e com horário fixado
  useEffect(() => {
    const applyCreatorDefaults = async () => {
      if (!isCreator || !fixedTimeLabel || !profile?.id || !id) return;
      const needsStatus = rsvpStatus !== "going";
      const needsArrival = (myRsvp?.arrival_time || "") !== fixedTimeLabel;
      if (!needsStatus && !needsArrival) return;
      try {
        const { error } = await supabase
          .from("event_rsvps")
          .upsert({
            event_id: Number(id),
            user_id: profile.id,
            status: "going",
            arrival_time: fixedTimeLabel,
          }, { onConflict: "event_id,user_id" });
        if (error) throw error;
        setRsvpStatus("going");
        await loadParticipants();
      } catch {}
    };
    applyCreatorDefaults();
  }, [isCreator, fixedTimeLabel, rsvpStatus, myRsvp?.arrival_time, profile?.id, id]);

  // Assina mudanças em tempo real para atualizar os grupos de horários
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`event_rsvps:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_rsvps', filter: `event_id=eq.${Number(id)}` },
        () => {
          // Atualiza participantes quando houver alterações
          loadParticipants();
        }
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [id]);

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(fullInvite);
      toast({ title: "Link copiado!", description: "Convite com informações foi copiado para a área de transferência." });
      // Interação: prioriza este rolê na Home
      try {
        const eid = String(id ?? "");
        if (eid) {
          localStorage.setItem("pinned_event_id", eid);
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("home-bump");
            bc.postMessage({ eventId: eid });
            bc.close();
          }
        }
      } catch {}
    } catch {
      toast({ title: "Não foi possível copiar", description: "Tente novamente mais tarde." });
    }
  };

  const handleOpenWhatsApp = () => {
    // Escolhe esquema de abertura: mobile vs web
    const text = encodeURIComponent(fullInvite);
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
    const waUrl = isMobile ? `whatsapp://send?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
    toast({ title: isMobile ? "Abrindo WhatsApp" : "Abrindo WhatsApp Web", description: "Seu convite será colado na conversa." });
  };

  const handleCopyAddress = async () => {
    const addr = event?.location_text?.trim();
    if (!addr) {
      toast({ title: "Endereço não disponível", description: "Esse rolê ainda não tem endereço definido." });
      return;
    }
    try {
      await navigator.clipboard.writeText(addr);
      toast({ title: "Endereço copiado!", description: "O endereço foi copiado para a área de transferência." });
      // Interação: prioriza este rolê na Home
      try {
        const eid = String(id ?? "");
        if (eid) {
          localStorage.setItem("pinned_event_id", eid);
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("home-bump");
            bc.postMessage({ eventId: eid });
            bc.close();
          }
        }
      } catch {}
    } catch {
      toast({ title: "Não foi possível copiar", description: "Tente novamente mais tarde." });
    }
  };

  // Edição de data/horário
  const isAdmin = !!permissions?.canAccessAdmin;
  const canEditTimeOnly = isCreator && !isAdmin;
  const canEditDateTime = isAdmin;
  const [editOpen, setEditOpen] = useState(false);
  const [newDate, setNewDate] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");
  const [savingEvent, setSavingEvent] = useState(false);

  // Foto do evento (criador e admin podem editar/adicionar)
  const canEditCover = isCreator || isAdmin;
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [savingCover, setSavingCover] = useState(false);

  const canEditDescription = isCreator || isAdmin;
  const [descEditOpen, setDescEditOpen] = useState(false);
  const [newDescription, setNewDescription] = useState<string>("");
  const [savingDescription, setSavingDescription] = useState(false);

  const handleChooseCover = (file: File) => {
    setCoverFile(file);
    try {
      const reader = new FileReader();
      reader.onload = () => setCoverPreviewUrl((reader.result as string) ?? null);
      reader.onerror = () => {
        setCoverPreviewUrl(null);
        toast({ title: "Erro ao ler imagem", description: "Tente novamente.", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    } catch {}
  };

  const handleSaveCover = async () => {
    if (!id) return;
    if (!coverFile) {
      toast({ title: "Selecione uma imagem", description: "Escolha um arquivo para enviar." });
      return;
    }
    setSavingCover(true);
    try {
      const ext = (coverFile.name.split(".").pop() || "jpeg").toLowerCase();
      const path = `${id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(EVENT_COVER_BUCKET)
        .upload(path, coverFile, { upsert: false, contentType: coverFile.type });
      if (uploadError) throw uploadError;

      const { data: publicData } = await supabase.storage
        .from(EVENT_COVER_BUCKET)
        .getPublicUrl(path);
      const publicUrl = publicData.publicUrl;

      const { error } = await supabase
        .from("events")
        .update({ cover_image_url: publicUrl })
        .eq("id", Number(id));
      if (error) throw error;

      setEvent((prev) => (prev ? { ...prev, cover_image_url: publicUrl } : prev));
      setCoverDialogOpen(false);
      setCoverFile(null);
      setCoverPreviewUrl(null);
      toast({ title: "Foto atualizada", description: "A capa do evento foi atualizada." });
    } catch (e: any) {
      toast({ title: "Erro ao salvar foto", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSavingCover(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!id) return;
    try {
      setSavingDescription(true);
      const { error } = await supabase
        .from("events")
        .update({ description: (newDescription || null) })
        .eq("id", Number(id));
      if (error) throw error;
      setEvent((prev) => (prev ? { ...prev, description: (newDescription || null) } : prev));
      setDescEditOpen(false);
      toast({ title: "Descrição atualizada" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSavingDescription(false);
    }
  };

  useEffect(() => {
    if (event?.event_timestamp) {
      const d = new Date(event.event_timestamp);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      setNewDate(`${yyyy}-${mm}-${dd}`);
      setNewTime(`${hh}:${min}`);
    }
  }, [event?.event_timestamp]);

  const handleSaveEventDateTime = async () => {
    if (!id || !event) return;
    try {
      setSavingEvent(true);
      const base = event.event_timestamp ? new Date(event.event_timestamp) : new Date();
      let year = base.getFullYear();
      let month = base.getMonth(); // 0-based
      let day = base.getDate();
      if (canEditDateTime && newDate) {
        const [y, m, d] = newDate.split("-").map((s) => parseInt(s, 10));
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          year = y;
          month = m - 1;
          day = d;
        }
      }
      let hours = base.getHours();
      let minutes = base.getMinutes();
      if (newTime) {
        const [h, mi] = newTime.split(":").map((s) => parseInt(s, 10));
        if (!isNaN(h) && !isNaN(mi)) {
          hours = h;
          minutes = mi;
        }
      }
      const updated = new Date(year, month, day, hours, minutes, 0, 0);
      const iso = updated.toISOString();
      const { error } = await supabase
        .from("events")
        .update({ event_timestamp: iso })
        .eq("id", Number(id));
      if (error) throw error;
      setEvent((prev) => (prev ? { ...prev, event_timestamp: iso } : prev));
      toast({ title: "Rolê atualizado", description: canEditDateTime ? "Data e horário atualizados." : "Horário atualizado." });
      setEditOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSavingEvent(false);
    }
  };

  // Garantir que ao navegar para um novo rolê a página vá ao topo
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  

  const confirmCheckin = async () => {
    if (!profile?.id || !id || !event?.event_timestamp) return;
    try {
      // Marca check-in no evento atual
      const nowIso = new Date().toISOString();
      const { error: upErr } = await supabase
        .from("event_rsvps")
        .upsert({
          event_id: Number(id),
          user_id: profile.id,
          status: "going",
          checkin_confirmed: true,
          checkin_at: nowIso,
        }, { onConflict: "event_id,user_id" });
      if (upErr) throw upErr;

      // Remove compromissos 'VOU' no mesmo dia (mantendo apenas este)
      const d = new Date(event.event_timestamp);
      const start = new Date(d); start.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      const { data: dayEvents, error: dayErr } = await supabase
        .from("events")
        .select("id,event_timestamp")
        .gte("event_timestamp", start.toISOString())
        .lt("event_timestamp", end.toISOString())
        .neq("id", Number(id));
      if (dayErr) throw dayErr;
      const otherIds = (dayEvents ?? []).map((e: any) => e.id);
      if (otherIds.length > 0) {
        const { error: updErr } = await supabase
          .from("event_rsvps")
          .update({ status: "not-going" })
          .in("event_id", otherIds)
          .eq("user_id", profile.id)
          .eq("status", "going");
        if (updErr) throw updErr;
      }

      setCheckinConfirmed(true);
      setRsvpStatus("going");
      // Marca este rolê como fixado para reordenar na Home e notifica via BroadcastChannel
      try {
        const eid = String(id);
        localStorage.setItem("pinned_event_id", eid);
        const bc = new BroadcastChannel("home-bump");
        bc.postMessage({ eventId: eid });
        bc.close();
      } catch {}
      toast({ title: "Check-in confirmado", description: "Compromissos no mesmo dia foram ajustados automaticamente." });
      setCheckinDialogOpen(false);
      // Navega para a Home para refletir imediatamente na lista
      try { navigate("/"); } catch {}
      // Atualiza a lista de participantes após confirmar check-in
      loadParticipants();
    } catch (e: any) {
      toast({ title: "Falha no check-in", description: e?.message ?? String(e), variant: "destructive" });
    }
  };
  useEffect(() => {
    const fetchSameDay = async () => {
      if (!event?.event_timestamp || !event?.id) {
        setSameDayEvents([]);
        return;
      }
      try {
        setLoadingSameDay(true);
        const d = new Date(event.event_timestamp);
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
          .from("events")
          .select("id,title,description,cover_image_url,event_timestamp,location_text")
          .gte("event_timestamp", start.toISOString())
          .lt("event_timestamp", end.toISOString())
          .neq("id", Number(event.id))
          .limit(8);
        if (error) throw error;
        setSameDayEvents((data as EventRow[]) ?? []);
      } catch (e: any) {
        console.error("Erro ao carregar rolês do mesmo dia:", e?.message ?? e);
      } finally {
        setLoadingSameDay(false);
      }
    };
    fetchSameDay();
  }, [event?.event_timestamp, event?.id]);

  // Estados visíveis para evitar tela preta
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white/90">Carregando rolê...</div>
      </div>
    );
  }
  if (!loading && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-3">
          <div className="text-white text-xl font-semibold">Evento não encontrado</div>
          <Link to="/" className="inline-block rounded-md px-4 py-2 bg-white/10 text-white hover:bg-white/20">Voltar para Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 pt-14 ${isCheckinWindow ? "border-2 border-emerald-500/60 rounded-xl" : ""} ${(() => { const hotCount = participants.filter(p => p.status === "going" || p.status === "maybe").length; return hotCount >= 6 ? "ring-2 ring-amber-400/50 rounded-xl shadow-[0_0_40px_rgba(250,204,21,0.28)]" : ""; })()}`}> 
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-16 left-4 z-10 bg-black/50 backdrop-blur-sm hover:bg-black/70"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>

      <div className="relative h-64 overflow-hidden">
        <img
          src={event?.cover_image_url ?? "/placeholder.svg"}
          alt={event?.title ?? "Rolê"}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        {canEditCover && (
          <Dialog open={coverDialogOpen} onOpenChange={setCoverDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-3 right-3 bg-black/50 border-white/30 text-white hover:bg-black/70"
              >
                {event?.cover_image_url ? "Editar foto" : "Adicionar foto"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{event?.cover_image_url ? "Editar foto do evento" : "Adicionar foto do evento"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {coverPreviewUrl ? (
                  <img src={coverPreviewUrl} alt="Prévia" className="w-full h-40 object-cover rounded-md" />
                ) : (
                  <img src={event?.cover_image_url ?? "/placeholder.svg"} alt="Atual" className="w-full h-40 object-cover rounded-md" />
                )}
                <div className="space-y-2">
                  <Label>Imagem</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleChooseCover(f);
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCoverDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveCover} disabled={savingCover || !coverFile}>
                  {savingCover ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {(() => {
          const hotCount = participants.filter(p => p.status === "going" || p.status === "maybe").length;
          if (hotCount >= 6) {
            return (
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 backdrop-blur-md ring-1 ring-amber-300/40 shadow-[0_0_12px_rgba(250,204,21,0.35)] text-amber-300 text-xs font-semibold">
                <Flame className="h-4 w-4" />
                <span>{hotCount}+ bombando</span>
              </div>
            );
          }
          return null;
        })()}
        <h1 className="absolute bottom-4 left-4 right-4 text-2xl font-bold text-foreground">
          {event?.title ?? "Rolê"}
        </h1>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border bg-background">
          <TabsTrigger
            value="details"
            className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Detalhes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="px-4 space-y-6 pb-6">
          {/* When and Where */}
          <Card className={`p-4 space-y-3 bg-card ${isCheckinWindow ? "border-emerald-500/60" : "border-border"}`}>
            <h3 className="font-semibold text-foreground">Quando e Onde</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-foreground capitalize">{dateStr}</div>
                  <div className="text-muted-foreground">{timeStr}</div>
                </div>
                {(canEditTimeOnly || canEditDateTime) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setEditOpen(true)}
                  >
                    {canEditDateTime ? "Editar data e horário" : "Editar horário"}
                  </Button>
                )}
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 flex items-center justify-between gap-2">
                  <div className="font-medium text-foreground flex-1">{event?.location_text ?? "Local a definir"}</div>
                  <Button
                    variant="link"
                    size="icon"
                    className="h-6 w-6 p-0 text-primary"
                    onClick={handleCopyAddress}
                    aria-label="Copiar endereço"
                    title="Copiar endereço"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            {(canEditTimeOnly || canEditDateTime) && (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{canEditDateTime ? "Editar data e horário" : "Editar horário"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    {canEditDateTime && (
                      <div className="space-y-2">
                        <Label>Data</Label>
                        <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Horário</Label>
                      <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
                    </div>
                    {canEditTimeOnly && (
                      <p className="text-xs text-muted-foreground">Apenas o criador do rolê pode alterar o horário. A data permanece a mesma.</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveEventDateTime} disabled={savingEvent}>
                      {savingEvent ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </Card>

          

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Descrição</h3>
              {canEditDescription && (
                <Button
                  variant="link"
                  size="icon"
                  className="h-6 w-6 p-0 text-primary"
                  onClick={() => { setDescEditOpen(true); setNewDescription(event?.description ?? ""); }}
                  aria-label="Editar descrição"
                  title="Editar descrição"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {event?.description ?? "Sem descrição."}
            </p>
            {canEditDescription && (
              <Dialog open={descEditOpen} onOpenChange={setDescEditOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar descrição</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={6} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDescEditOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveDescription} disabled={savingDescription}>
                      {savingDescription ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Requisitos (opcional) */}
          {event?.requirements && event.requirements.trim() && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Requisitos</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {event.requirements}
              </p>
            </div>
          )}

          {/* Links auxiliares (opcional) */}
          {auxLinks.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Links auxiliares</h3>
              <div className="flex flex-col gap-2">
                {auxLinks.map((link, idx) => {
                  const href = /^https?:\/\//i.test(link) ? link : `https://${link}`;
                  const maxLen = 60;
                  const display = link.length > maxLen ? `${link.slice(0, maxLen - 3)}...` : link;
                  return (
                    <a
                      key={`aux-${idx}`}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline break-all"
                      title={link}
                    >
                      {display}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          

          {/* RSVP / Check-in */}
          {isCheckinWindow ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Check-in</h3>
              <Card className="p-3 bg-card border-emerald-500/40">
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      if (!permissions.canConfirmPresence || checkinConfirmed) return;
                      setCheckinDialogOpen(true);
                    }}
                    disabled={!permissions.canConfirmPresence || checkinConfirmed}
                    className="h-10"
                  >
                    {checkinConfirmed ? "Check-in confirmado" : "Confirmar"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={!permissions.canConfirmPresence}
                    onClick={async () => {
                      try {
                        if (!profile?.id || !id) return;
                        const { error } = await supabase
                          .from("event_rsvps")
                          .upsert({
                            event_id: Number(id),
                            user_id: profile.id,
                            status: "not-going",
                            checkin_confirmed: false,
                            checkin_at: null,
                          }, { onConflict: "event_id,user_id" });
                        if (error) throw error;
                        setCheckinConfirmed(false);
                        setCheckinDialogOpen(false);
                        setRsvpStatus("not-going");
                        toast({ title: "Presença atualizada", description: "Você marcou que não vai." });
                        loadParticipants();
                      } catch (e: any) {
                        toast({ title: "Erro ao atualizar presença", description: e?.message ?? String(e), variant: "destructive" });
                      }
                    }}
                  >
                    Não vou
                  </Button>
                </div>
                {/* Modal de confirmação central */}
                <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirmar check-in</DialogTitle>
                    </DialogHeader>
                    <div className="text-sm text-muted-foreground">
                      Dentro de 48h do rolê, confirme presença para garantir sua vaga.
                      Ao confirmar, compromissos marcados como "VOU" no mesmo dia serão removidos automaticamente, mantendo apenas este.
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setCheckinDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={async () => {
                          await confirmCheckin();
                          setCheckinDialogOpen(false);
                        }}
                        disabled={!permissions.canConfirmPresence || checkinConfirmed}
                      >
                        Confirmar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </Card>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Você vai?</h3>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={rsvpStatus === "going" ? "rsvpActive" : "rsvp"}
                  onClick={() => handleUpdateRsvp("going")}
                  className="h-12 font-semibold"
                  disabled={!permissions.canConfirmPresence || isPast}
                >
                  VOU
                </Button>
                <Button
                  variant={rsvpStatus === "maybe" ? "rsvpActive" : "rsvp"}
                  onClick={() => handleUpdateRsvp("maybe")}
                  className="h-12 font-semibold"
                  disabled={!permissions.canConfirmPresence || isPast}
                >
                  TALVEZ
                </Button>
                <Button
                  variant={rsvpStatus === "not-going" ? "rsvpActive" : "rsvp"}
                  onClick={() => handleUpdateRsvp("not-going")}
                  className="h-12 font-semibold"
                  disabled={!permissions.canConfirmPresence || isPast}
                >
                  NÃO VOU
                </Button>
              </div>
            </div>
          )}

          {/* Chegarei às — agora abaixo de “Você vai?” */}
          <Card className="p-4 space-y-3 bg-card border-border" role="region" aria-label="Seleção de horários de chegada">
            <h3 className="font-semibold text-foreground">Chegarei às:</h3>
            {rsvpStatus === "not-going" && (
              <p className="text-xs text-white/60">Você marcou NÃO VOU; votação de horários está bloqueada.</p>
            )}
            <div className="flex flex-wrap gap-3" role="group" aria-label="Horários disponíveis">
              {fixedTimeLabel && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/20"
                  onClick={() => setArrivalTime(fixedTimeLabel)}
                  disabled={!canChooseArrival}
                  aria-label={`Marcar chegada às ${fixedTimeLabel} (horário fixado)`}
                >
                  <span className="font-medium">{fixedTimeLabel}</span>
                  <div className="flex -space-x-2" aria-hidden="true">
                    {(arrivalGroups.get(fixedTimeLabel) ?? []).slice(0, 4).map((p) => {
                      const name = p.full_name || formatPhoneBR(p.phone_number || "");
                      const initials = (name || "?").slice(0, 2).toUpperCase();
                      return (
                        <Avatar key={`fx-${p.user_id}`} className="h-6 w-6 ring-[2px] ring-emerald-400/50">
                          {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={name} /> : <AvatarImage src={undefined} alt={name} />}
                          <AvatarFallback className="text-[10px] bg-white/10 text-foreground">{initials}</AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                </button>
              )}

              {Array.from(arrivalGroups.entries())
                .filter(([label]) => label !== fixedTimeLabel)
                .map(([label, users]) => (
                  <button
                    key={`slot-${label}`}
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/20"
                    onClick={() => setArrivalTime(label)}
                    disabled={!canChooseArrival}
                    aria-label={`Marcar chegada às ${label}`}
                  >
                    <span className="font-medium">{label}</span>
                    <div className="flex -space-x-2" aria-hidden="true">
                      {users.slice(0, 4).map((p) => {
                        const name = p.full_name || formatPhoneBR(p.phone_number || "");
                        const initials = (name || "?").slice(0, 2).toUpperCase();
                        return (
                          <Avatar key={`${label}-${p.user_id}`} className="h-6 w-6 ring-[2px] ring-amber-400/50">
                            {p.avatar_url ? <AvatarImage src={p.avatar_url} alt={name} /> : <AvatarImage src={undefined} alt={name} />}
                            <AvatarFallback className="text-[10px] bg-white/10 text-foreground">{initials}</AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                  </button>
                ))}

              {/* Adicionar novo horário (incrementos de 30 min) */}
              <Popover open={addOpen} onOpenChange={setAddOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-3" aria-label="Adicionar novo horário de chegada" disabled={!canChooseArrival}>+ Adicionar horário</Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] bg-black/90 border-white/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-white/80">Hora</Label>
                      <Select value={addHour ?? undefined} onValueChange={(v) => setAddHour(v)}>
                        <SelectTrigger className="mt-1 w-full bg-white/10 border-white/20 text-white hover:bg-white/10">
                          <SelectValue placeholder="HH" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, i) => {
                            const hh = String(i).padStart(2, "0");
                            return <SelectItem key={hh} value={hh}>{hh}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white/80">Minuto</Label>
                      <Select value={addMinute ?? undefined} onValueChange={(v) => setAddMinute(v)}>
                        <SelectTrigger className="mt-1 w-full bg-white/10 border-white/20 text-white hover:bg-white/10">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 30].map((i) => {
                            const mm = String(i).padStart(2, "0");
                            return <SelectItem key={mm} value={mm}>{mm}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancelar</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const label = addHour && addMinute ? `${addHour}:${addMinute}` : "";
                        if (!label) return;
                        await setArrivalTime(label);
                        setAddOpen(false);
                        setAddHour(null);
                        setAddMinute(null);
                      }}
                      disabled={!canChooseArrival}
                    >
                      Salvar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Remover meu horário */}
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70"
                onClick={() => setArrivalTime(null)}
                disabled={!canChooseArrival}
                aria-label="Remover meu horário de chegada"
              >
                Remover meu horário
              </Button>
            {!isArrivalEditable && (
                <p className="mt-2 text-xs text-white/60">Edição de horário bloqueada. O evento já virou memória.</p>
              )}
            </div>
          </Card>

          {/* Participantes */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Participantes</h3>
            {participantsLoading && (
              <div className="text-sm text-muted-foreground">Carregando participantes...</div>
            )}
            {!participantsLoading && participants.length === 0 && (
              <div className="text-center text-muted-foreground py-6">Ainda ninguém confirmou presença.</div>
            )}
            {!participantsLoading && participants.length > 0 && (
              <div className="flex flex-wrap gap-4">
                {participants.map((p) => {
                  const name = p.full_name || formatPhoneBR(p.phone_number || "");
                  const initials = (name || "?").slice(0, 2).toUpperCase();
                  const ringClass =
                    p.status === "going"
                      ? "ring-[3px] ring-emerald-400/60"
                      : p.status === "maybe"
                      ? "ring-[3px] ring-amber-400/60"
                      : "ring-[3px] ring-rose-400/60";
                  const canViewProfile = !!permissions?.canEditOwnProfile;
                  return (
                    <button
                      key={`${p.user_id}-${p.status}`}
                      className="flex items-center gap-2"
                      type="button"
                      onClick={() => {
                        if (!canViewProfile) return;
                        setProfileViewUserId(p.user_id);
                        setProfileViewOpen(true);
                      }}
                      disabled={!canViewProfile}
                    >
                      <Avatar className={`h-10 w-10 ${ringClass}`}>
                        {p.avatar_url ? (
                          <AvatarImage src={p.avatar_url} alt={name} />
                        ) : (
                          <AvatarImage src={undefined} alt={name} />
                        )}
                        <AvatarFallback className="text-xs bg-white/10 text-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs text-muted-foreground">{name}</div>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="text-xs text-muted-foreground">Verde: VOU • Amarelo: TALVEZ • Vermelho: NÃO VOU</div>
          </div>

          {/* Suggested same-day events */}
          {loadingSameDay && (
            <div className="text-xs text-muted-foreground">Carregando sugestões do mesmo dia...</div>
          )}
          {sameDayEvents.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="font-semibold text-foreground">ROLÊS SUGERIDOS PARA O MESMO DIA</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sameDayEvents.map((ev) => {
                  const ts = ev.event_timestamp ? new Date(ev.event_timestamp) : null;
                  const tStr = ts ? ts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <Link to={`/evento/${ev.id}`} key={ev.id}>
                      <Card className="flex items-center gap-3 p-2 hover:border-primary/50 transition-colors">
                        <img
                          src={ev.cover_image_url ?? "/placeholder.svg"}
                          onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                          alt={ev.title}
                          className="h-16 w-24 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground line-clamp-2">{ev.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {tStr} {ev.location_text ? `• ${ev.location_text}` : ""}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {!loadingSameDay && sameDayEvents.length === 0 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="text-xs text-muted-foreground">Ainda não tem outros rolês nessa mesma data.</div>
              <Link to="/criar">
                <Button variant="outline" size="sm" className="h-8 px-3">Criar</Button>
              </Link>
            </div>
          )}

          {/* Invite / Share - último elemento (apenas botão) */}
          <div className="flex items-center justify-start">
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
                >
                  <Share2 className="h-4 w-4 mr-2" /> Convidar no WhatsApp
                </Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                  <DialogTitle>Convite do rolê {isCheckinWindow ? "(Check-in)" : "(Normal)"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Digite a mensagem do convite"
                  className="min-h-[100px]"
                />
                <div className="text-xs text-muted-foreground">
                    A mensagem muda conforme o modo do evento. O link (olink) permanece o mesmo.
                </div>
              </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopyInvite}
                  >
                    Copiar link
                  </Button>
                  <Button onClick={handleOpenWhatsApp}>
                    Enviar no WhatsApp
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>
        {/* Modal de perfil */}
        <ProfileQuickView userId={profileViewUserId} open={profileViewOpen} onOpenChange={setProfileViewOpen} />
      </Tabs>
    </div>
  );
};

export default EventDetails;
