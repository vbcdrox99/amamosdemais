import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Upload, Calendar as CalendarIcon, Clock as ClockIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuthRole } from "@/hooks/useAuthRole";
import { supabase } from "@/integrations/supabase/client";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [minParticipants, setMinParticipants] = useState<number | "">("");
  const [maxParticipants, setMaxParticipants] = useState<number | "">("");
  // Removido: status do rolê não será mais usado na UI
  const { toast } = useToast();
  const { permissions, flags, profile } = useAuthRole();
  const [venues, setVenues] = useState<Array<{ id: string; name: string; address_text: string | null; instagram_url: string | null }>>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueAddress, setNewVenueAddress] = useState("");
  const [newVenueInstagram, setNewVenueInstagram] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<string | null>(null);
  const selectedTimeStr = useMemo(() => (selectedHour && selectedMinute ? `${selectedHour}:${selectedMinute}` : ""), [selectedHour, selectedMinute]);

  useEffect(() => {
    const loadVenues = async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id,name,address_text,instagram_url")
        .order("name", { ascending: true });
      if (error) {
        // Apenas notifica, não bloqueia o fluxo
        toast({ title: "Falha ao carregar rolês salvos", description: error.message });
        return;
      }
      setVenues(data ?? []);
    };
    loadVenues();
  }, []);

  const filteredVenues = useMemo(() => {
    const q = eventName.trim().toLowerCase();
    if (!q) return [];
    return venues.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 5);
  }, [eventName, venues]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-20 pt-14">
      <div className="sticky top-14 z-10 bg-black border-b border-white/20 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Criar Novo Rolê</h1>
        <div className="w-10" />
      </div>

      <form className="px-4 py-6 space-y-6 max-w-2xl mx-auto" onSubmit={async (e) => {
        e.preventDefault();
        if (!permissions.canCreateEvents) {
          toast({ title: "Ação não permitida", description: flags.isAuthenticated ? "Sua conta ainda não foi aprovada." : "Entre com sua conta e aguarde aprovação." });
          return;
        }
        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);
        const description = formData.get("description") as string | null;
        const date = formData.get("date") as string | null;
        const time = formData.get("time") as string | null;
      
        if (limitEnabled) {
          const min = typeof minParticipants === "number" ? minParticipants : undefined;
          const max = typeof maxParticipants === "number" ? maxParticipants : undefined;
          if (!min || !max) {
            toast({ title: "Defina mínimo e máximo", description: "Quando limite é Sim, ambos devem ser preenchidos." });
            return;
          }
          if (min <= 0 || max <= 0 || min > max) {
            toast({ title: "Valores inválidos", description: "Mínimo deve ser ≥1 e ≤ Máximo." });
            return;
          }
        }
      
        // Converte data e hora para timestamptz
        let eventTimestamp: string | null = null;
        if (date && time) {
          const iso = new Date(`${date}T${time}:00`).toISOString();
          eventTimestamp = iso;
        }

        // Validação simples
        if (!eventName) {
          toast({ title: "Informe o nome do rolê", description: "O título é obrigatório." });
          return;
        }

        // Mapeia para colunas reais da tabela public.events
        const payload: Record<string, any> = {
          title: eventName,
          description,
          cover_image_url: coverImage ?? null,
          event_timestamp: eventTimestamp,
          location_text: locationName || null,
          instagram_url: instagramUrl || null,
          venue_id: selectedVenueId || null,
          created_by: profile?.id ?? null,
        };

        const { error } = await supabase.from("events").insert(payload);
        if (error) {
          toast({ title: "Erro ao salvar", description: error.message });
          return;
        }

        toast({ title: "Evento criado", description: "Seu rolê foi salvo e aparecerá na Home." });
        navigate("/");
      }}>
        {/* Cover Image */}
        <div className="space-y-2">
          <Label htmlFor="cover" className="text-white">Foto de Capa</Label>
          <Card className="relative h-48 overflow-hidden bg-white/5 border-white/20 border-dashed">
            {coverImage ? (
              <>
                <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute bottom-3 right-3 border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
                  onClick={() => setCoverImage(null)}
                >
                  Remover
                </Button>
              </>
            ) : (
              <label
                htmlFor="cover"
                className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-white/10 transition-colors"
              >
                <Upload className="h-8 w-8 text-white/70 mb-2" />
                <span className="text-sm text-white/70">Clique para adicionar uma foto</span>
              </label>
            )}
            <input id="cover" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </Card>
        </div>

        {/* Nome do Rolê com sugestões e campos acima */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Nome do Rolê</Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="Ex: BLITZ HOUZ, Churrasco na Laje do Zé"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                value={eventName}
                onChange={(e) => {
                  const val = e.target.value;
                  setEventName(val);
                  if (selectedVenueId) {
                    const sel = venues.find((v) => v.id === selectedVenueId);
                    if (sel && val.trim() !== (sel.name ?? "")) {
                      setSelectedVenueId(null);
                    }
                  }
                }}
              />
              {filteredVenues.length > 0 && !selectedVenueId && eventName.trim().length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-white/20 bg-black/90 backdrop-blur-sm">
                  {filteredVenues.map((v) => (
                    <button
                      type="button"
                      key={v.id}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10"
                      onClick={() => {
                        setSelectedVenueId(v.id);
                        setEventName(v.name);
                        setLocationName(v.address_text ?? "");
                        setInstagramUrl(v.instagram_url ?? "");
                        setShowNewVenue(false);
                      }}
                    >
                      {v.name}
                    </button>
                  ))}
                  <div className="h-px bg-white/10" />
                  <div className="px-3 py-2">
                    <button
                      type="button"
                      className="w-full text-left text-xs text-white/80 hover:bg-white/10 px-2 py-2 rounded"
                      onClick={() => {
                        setShowNewVenue(true);
                        setNewVenueName(eventName.trim());
                      }}
                    >
                      Cadastrar novo rolê com este nome
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Card somente leitura com informações do rolê selecionado */}
          {selectedVenueId && (() => {
            const v = venues.find((vv) => vv.id === selectedVenueId);
            if (!v) return null;
            return (
              <div className="mt-3 rounded-md border border-white/20 bg-black/70 p-3 text-sm">
                <div className="text-white/90 font-medium">Rolê selecionado</div>
                <div className="mt-1 text-white/80">Nome: {v.name}</div>
                {v.address_text && (
                  <div className="mt-1 text-white/80">Endereço: {v.address_text}</div>
                )}
                {v.instagram_url && (
                  <div className="mt-1 text-white/80">
                    Instagram / Site: {v.instagram_url.startsWith("http") ? (
                      <a href={v.instagram_url} target="_blank" rel="noreferrer" className="underline">{v.instagram_url}</a>
                    ) : (
                      v.instagram_url
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          {/* Botão fixo abaixo do Nome para cadastrar novo rolê */}
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-3 border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
              onClick={() => {
                setShowNewVenue(true);
                setNewVenueName(eventName.trim());
              }}
            >
              Cadastrar novo rolê
            </Button>
          </div>
          {showNewVenue && (
            <div className="mt-2 space-y-2">
              <Input id="inline-new-venue-name-below" value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" placeholder="Nome do rolê" />
              <Input id="inline-new-venue-address-below" value={newVenueAddress} onChange={(e) => setNewVenueAddress(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" placeholder="Endereço" />
              <Input id="inline-new-venue-instagram-below" value={newVenueInstagram} onChange={(e) => setNewVenueInstagram(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/60" placeholder="Instagram / Site" />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={async () => {
                    if (!newVenueName.trim()) {
                      toast({ title: "Informe o nome do rolê", description: "Campo nome é obrigatório." });
                      return;
                    }
                    const { data, error } = await supabase
                      .from("venues")
                      .insert({ name: newVenueName.trim(), address_text: newVenueAddress.trim() || null, instagram_url: newVenueInstagram.trim() || null, created_by: profile?.id ?? null })
                      .select("id,name,address_text,instagram_url")
                      .maybeSingle();
                    if (error) {
                      toast({ title: "Erro ao cadastrar rolê", description: error.message });
                      return;
                    }
                    if (data) {
                      setVenues((prev) => [...prev, data]);
                      setSelectedVenueId(data.id);
                      setEventName(data.name);
                      setLocationName(data.address_text ?? "");
                      setInstagramUrl(data.instagram_url ?? "");
                      setShowNewVenue(false);
                      setNewVenueName("");
                      setNewVenueAddress("");
                      setNewVenueInstagram("");
                      toast({ title: "Rolê cadastrado", description: "Dados aplicados ao formulário." });
                    }
                  }}
                >
                  Salvar novo rolê
                </Button>
                <Button type="button" variant="ghost" className="text-white/80" onClick={() => setShowNewVenue(false)}>Cancelar</Button>
              </div>
            </div>
          )}
          {/* Campos de Endereço/Site serão definidos ao selecionar uma sugestão ou ao cadastrar um novo rolê via painel inline acima. */}
          {/* Formulário inline de novo rolê agora aparece dentro do painel de sugestões acima. */}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-white">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Conte mais sobre o rolê..."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[120px] resize-none"
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-white">Data</Label>
            {/* Input oculto para enviar a data em yyyy-MM-dd via FormData */}
            <input type="hidden" name="date" value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""} />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start bg-white/10 border-white/20 text-white hover:bg-white/10"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-auto max-w-[calc(100vw-2rem)] p-0 bg-black/90 border-white/20">
                <Calendar
                  mode="single"
                  selected={selectedDate ?? undefined}
                  onSelect={(date) => setSelectedDate(date ?? null)}
                  locale={ptBR}
                  className="text-white"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="time" className="text-white">Horário</Label>
            {/* Input oculto para enviar o horário em HH:mm via FormData */}
            <input type="hidden" name="time" value={selectedTimeStr} />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start bg-white/10 border-white/20 text-white hover:bg-white/10"
                >
                  <ClockIcon className="mr-2 h-4 w-4" />
                  {selectedTimeStr ? selectedTimeStr : "Selecione o horário"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full sm:w-[260px] max-w-[calc(100vw-2rem)] bg-black/90 border-white/20">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/80">Hora</Label>
                    <Select value={selectedHour ?? undefined} onValueChange={(v) => setSelectedHour(v)}>
                      <SelectTrigger className="mt-1 w-full bg-white/10 border-white/20 text-white hover:bg-white/10">
                        <SelectValue placeholder="HH" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, i) => {
                          const hh = String(i).padStart(2, "0");
                          return (
                            <SelectItem key={hh} value={hh}>{hh}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white/80">Minuto</Label>
                    <Select value={selectedMinute ?? undefined} onValueChange={(v) => setSelectedMinute(v)}>
                      <SelectTrigger className="mt-1 w-full bg-white/10 border-white/20 text-white hover:bg-white/10">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 15, 30, 45].map((i) => {
                          const mm = String(i).padStart(2, "0");
                          return (
                            <SelectItem key={mm} value={mm}>{mm}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Card className="bg-white/5 border-white/20">
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Detalhes do Rolê</h2>
              <span className="text-xs text-white/60">Defina limites e localização</span>
            </div>

            <div className="h-px bg-white/10" />

            {/* Limite de pessoas */}
            <div className="space-y-2">
              <Label htmlFor="limit" className="text-white">Qual máximo de pessoas podem ir?</Label>
              <Select defaultValue="Sem limite" onValueChange={(v) => setLimitEnabled(v === "Com limite") }>
                <SelectTrigger id="limit" className="bg-white/10 border-white/20 text-white hover:bg-white/10 focus:ring-2 focus:ring-emerald-500">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sem limite">Sem limite</SelectItem>
                  <SelectItem value="Com limite">Com limite</SelectItem>
                </SelectContent>
              </Select>
              {limitEnabled && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="min_participants" className="text-white">Mínimo</Label>
                    <Input
                      id="min_participants"
                      type="number"
                      min={1}
                      value={minParticipants}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMinParticipants(v === "" ? "" : Number(v));
                      }}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_participants" className="text-white">Máximo</Label>
                    <Input
                      id="max_participants"
                      type="number"
                      min={1}
                      value={maxParticipants}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMaxParticipants(v === "" ? "" : Number(v));
                      }}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>
            </div>
          )}
        </div>

            <div className="h-px bg-white/10" />

            {/* Campos de Local/Instagram removidos desta seção para evitar redundância */}
          </div>
        </Card>

        {!permissions.canCreateEvents && (
          <div className="text-xs text-white/70 -mt-2">
            Para criar rolês, faça login e aguarde aprovação do ADMIN.
          </div>
        )}

        <Button
          type="submit"
          variant="outline"
          className="w-full h-12 text-base font-semibold border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
          disabled={!permissions.canCreateEvents}
        >
          Publicar Rolê!
        </Button>
      </form>
    </div>
  );
};

export default CreateEvent;
