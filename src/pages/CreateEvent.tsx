import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Upload, Calendar as CalendarIcon, Clock as ClockIcon, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuthRole } from "@/hooks/useAuthRole";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const EVENT_COVER_BUCKET = "event-covers";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [eventName, setEventName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [minParticipants, setMinParticipants] = useState<number | "">("");
  const [maxParticipants, setMaxParticipants] = useState<number | "">("");
  // Removido: status do rolê não será mais usado na UI
  const { toast } = useToast();
  const { permissions, flags, profile } = useAuthRole();
  type VenueRow = { id: string; name: string; address_text: string | null; instagram_url: string | null; transit_line: string | null; transit_station: string | null };
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [newVenueDialogOpen, setNewVenueDialogOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newVenueAddress, setNewVenueAddress] = useState("");
  const [newVenueInstagram, setNewVenueInstagram] = useState("");
  const [newVenueTransitLine, setNewVenueTransitLine] = useState<string | null>("Não sei");
  const [newVenueTransitStation, setNewVenueTransitStation] = useState<string | null>(null);
  const [lineOpen, setLineOpen] = useState(false);
  const [stationOpen, setStationOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<string | null>(null);
  const selectedTimeStr = useMemo(() => (selectedHour && selectedMinute ? `${selectedHour}:${selectedMinute}` : ""), [selectedHour, selectedMinute]);
  const [extraKind, setExtraKind] = useState<"none" | "esquenta" | "after">("none");
  const [extraLocation, setExtraLocation] = useState<string>("");
  // Estação de metrô/trem próxima (São Paulo) - seleção em dois níveis
  const spTransit: Record<string, string[]> = {
    "Linha Amarela (4) • Metrô": [
      "Luz",
      "República",
      "Higienópolis–Mackenzie",
      "Paulista",
      "Oscar Freire",
      "Fradique Coutinho",
      "Faria Lima",
      "Pinheiros",
      "Butantã",
      "São Paulo–Morumbi",
      "Vila Sônia",
    ],
    "Linha Azul (1) • Metrô": [
      "Jabaquara",
      "Conceição",
      "São Judas",
      "Saúde",
      "Praça da Árvore",
      "Santa Cruz",
      "Ana Rosa",
      "Paraíso",
      "Liberdade",
      "São Joaquim",
      "Sé",
      "Tiradentes",
      "Armênia",
      "Portuguesa–Tietê",
      "Carandiru",
      "Santana",
      "Jardim São Paulo–Ayres",
      "Parada Inglesa",
      "Tucuruvi",
    ],
    "Linha Verde (2) • Metrô": [
      "Vila Prudente",
      "Tamanduateí",
      "Sacomã",
      "Alto do Ipiranga",
      "Santos–Imigrantes",
      "Chácara Klabin",
      "Ana Rosa",
      "Paraíso",
      "Brigadeiro",
      "Trianon–Masp",
      "Consolação",
      "Clínicas",
      "Sumaré",
      "Vila Madalena",
    ],
    "Linha Vermelha (3) • Metrô": [
      "Palmeiras–Barra Funda",
      "Marechal Deodoro",
      "Santa Cecília",
      "República",
      "Anhangabaú",
      "Sé",
      "Pedro II",
      "Brás",
      "Tatuapé",
      "Carrão",
      "Penha",
      "Vila Matilde",
      "Guilhermina–Esperança",
      "Patriarca",
      "Artur Alvim",
      "Corinthians–Itaquera",
    ],
    "Linha Lilás (5) • Metrô": [
      "Capão Redondo",
      "Campo Limpo",
      "Vila das Belezas",
      "Giovanni Gronchi",
      "Santo Amaro",
      "Largo Treze",
      "Adolfo Pinheiro",
      "Alto da Boa Vista",
      "Borba Gato",
      "Brooklin",
      "Campo Belo",
      "Eucaliptos",
      "Moema",
      "AACD–Servidor",
      "Hospital São Paulo",
      "Chácara Klabin",
    ],
    "Linha Prata (15) • Monotrilho": [
      "Vila Prudente",
      "Oratório",
      "São Lucas",
      "Camilo Haddad",
      "Vila Tolstói",
      "Vila União",
      "Jardim Planalto",
      "Sapopemba",
      "Fazenda da Juta",
      "São Mateus",
      "Jardim Colonial",
      "Iguatemi",
      "Jequiriçá",
      "Jardim Helena",
      "Paulo Freire",
    ],
    "Linha Esmeralda (9) • CPTM": [
      "Osasco",
      "Presidente Altino",
      "Ceasa",
      "Cidade Universitária",
      "Pinheiros",
      "Hebraica–Rebouças",
      "Cidade Jardim",
      "Vila Olímpia",
      "Berrini",
      "Morumbi",
      "Granja Julieta",
      "Socorro",
      "Santo Amaro",
      "Jurubatuba",
    ],
    "Linha Diamante (8) • CPTM": [
      "Júlio Prestes",
      "Palmeiras–Barra Funda",
      "Lapa",
      "Domingos de Moraes",
      "Imperatriz Leopoldina",
      "Osasco",
      "Comandante Sampaio",
      "Quitaúna",
      "Carapicuíba",
      "Barueri",
      "Jandira",
      "Itapevi",
    ],
    "Linha Coral (11) • CPTM": [
      "Luz",
      "Brás",
      "Tatuapé",
      "Itaquera",
      "Guaianases",
      "Ferraz de Vasconcelos",
      "Poá",
      "Suzano",
      "Mogi das Cruzes",
      "Estudantes",
    ],
    "Linha Safira (12) • CPTM": [
      "Brás",
      "Tatuapé",
      "Itaquera",
      "Jardim Romano",
      "Itaim Paulista",
      "Jardim Helena–Vila Mara",
      "São Miguel Paulista",
    ],
    "Linha Turquesa (10) • CPTM": [
      "Brás",
      "Mooca",
      "Ipiranga",
      "Tamanduateí",
      "Prefeito Saladino",
      "Utinga",
      "Capuava",
      "Mauá",
    ],
    "Linha Jade (13) • CPTM": [
      "Engenheiro Goulart",
      "Guarulhos–Cecap",
      "Aeroporto–Guarulhos",
    ],
  };
  const [selectedTransitLine, setSelectedTransitLine] = useState<string | null>(null);
  const [selectedTransitStation, setSelectedTransitStation] = useState<string | null>(null);

  useEffect(() => {
    const loadVenues = async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id,name,address_text,instagram_url,transit_line,transit_station")
        .order("name", { ascending: true });
      if (error) {
        // Apenas notifica, não bloqueia o fluxo
        toast({ title: "Falha ao carregar rolês salvos", description: error.message });
        return;
      }
      setVenues((data ?? []).map((v: { id: string; name: string; address_text: string | null; instagram_url: string | null; transit_line: string | null; transit_station: string | null }) => ({
        id: v.id,
        name: v.name,
        address_text: v.address_text ?? null,
        instagram_url: v.instagram_url ?? null,
        transit_line: v.transit_line ?? null,
        transit_station: v.transit_station ?? null,
      })));
    };
    loadVenues();
  }, [toast]);

  const filteredVenues = useMemo(() => {
    const q = eventName.trim().toLowerCase();
    if (!q) return [];
    return venues.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 5);
  }, [eventName, venues]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
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
        const requirements = formData.get("requirements") as string | null;
        const auxLinks = formData.get("aux_links") as string | null;
        const date = formData.get("date") as string | null;
        const time = formData.get("time") as string | null;

        // Validações obrigatórias
        if (!eventName || !eventName.trim()) {
          toast({ title: "Informe o nome do rolê", description: "O título é obrigatório." });
          return;
        }
        if (!locationName || !locationName.trim()) {
          toast({ title: "Informe o local do rolê", description: "O local é obrigatório." });
          return;
        }
        if (!date) {
          toast({ title: "Informe a data", description: "Data é obrigatória." });
          return;
        }
        if (!time) {
          toast({ title: "Informe o horário", description: "Horário é obrigatório." });
          return;
        }
        if (!coverFile) {
          toast({ title: "Foto de capa obrigatória", description: "Adicione uma imagem de capa para publicar o rolê." });
          return;
        }

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

        // Faz upload da capa no Storage e obtém URL pública
        let coverPublicUrl: string | null = null;
        try {
          const ext = (coverFile.name.split(".").pop() || "jpeg").toLowerCase();
          const owner = profile?.id ? String(profile.id) : "anon";
          const path = `${owner}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from(EVENT_COVER_BUCKET)
            .upload(path, coverFile, { upsert: false, contentType: coverFile.type });
          if (uploadError) throw uploadError;
          const { data: publicData } = await supabase.storage
            .from(EVENT_COVER_BUCKET)
            .getPublicUrl(path);
          coverPublicUrl = publicData.publicUrl;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          toast({ title: "Erro ao enviar capa", description: msg, variant: "destructive" });
          return;
        }

        // Mapeia para colunas reais da tabela public.events
        // Anexa informação de transporte (linha/estação) ao campo de localização para persistência sem alterar schema
        const transitSuffix =
          selectedTransitLine && selectedTransitStation
            ? ` • Próx. ${selectedTransitLine} — ${selectedTransitStation}`
            : "";
        const locationTextFinal = (locationName || "") + transitSuffix;
        const payload: Record<string, unknown> = {
          title: eventName,
          description,
          requirements: requirements || null,
          aux_links: auxLinks || null,
          cover_image_url: coverPublicUrl,
          event_timestamp: eventTimestamp,
          location_text: locationTextFinal || null,
          instagram_url: instagramUrl || null,
          venue_id: selectedVenueId || null,
          created_by: profile?.id ?? null,
          extra_kind: extraKind,
          extra_location: extraKind === "none" ? null : (extraLocation || null),
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
                  onClick={() => { setCoverImage(null); setCoverFile(null); }}
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

        {/* Nome e Local do Rolê com sugestões e campos acima */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Nome e Local do Rolê</Label>
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
                        setSelectedTransitLine(v.transit_line ?? null);
                        setSelectedTransitStation(v.transit_station ?? null);
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
                        setNewVenueName(eventName.trim());
                        setNewVenueAddress("");
                        setNewVenueInstagram("");
                        setShowNewVenue(false);
                        setNewVenueDialogOpen(true);
                      }}
                    >
                      Cadastrar novo Local com este nome
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
                setNewVenueName(eventName.trim());
                setNewVenueAddress("");
                setNewVenueInstagram("");
                setShowNewVenue(false);
                setNewVenueDialogOpen(true);
              }}
            >
              Cadastrar novo Local
            </Button>
          </div>
          
          {/* Popup para cadastrar novo rolê */}
          <Dialog open={newVenueDialogOpen} onOpenChange={setNewVenueDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar novo Local</DialogTitle>
                <DialogDescription>Salve o local para aplicar no formulário e continuar a criação.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-venue-name" className="text-white">Apenas o nome do Local</Label>
                  <Input
                    id="new-venue-name"
                    value={newVenueName}
                    onChange={(e) => setNewVenueName(e.target.value)}
                    placeholder="Ex: BLITZ HOUZ"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-venue-address" className="text-white">Endereço</Label>
                  <Input
                    id="new-venue-address"
                    value={newVenueAddress}
                    onChange={(e) => setNewVenueAddress(e.target.value)}
                    placeholder="Rua, número, bairro, cidade"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-venue-instagram" className="text-white">Instagram / Site</Label>
                  <Input
                    id="new-venue-instagram"
                    value={newVenueInstagram}
                    onChange={(e) => setNewVenueInstagram(e.target.value)}
                    placeholder="@perfil ou https://site.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Estação mais próxima (Metrô/CPTM)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-white/80">Linha</Label>
                      <Popover open={lineOpen} onOpenChange={setLineOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between bg-white/10 border-white/20 text-white hover:bg-white/10"
                          >
                            {newVenueTransitLine ?? "Não sei"}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[320px] max-h-[60vh] bg-popover text-popover-foreground" style={{ zIndex: 1400 }}>
                          <Command>
                            <CommandInput placeholder="Buscar linha..." />
                            <CommandList className="max-h-[50vh] overflow-y-auto">
                              <CommandEmpty>Nenhuma linha encontrada</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setNewVenueTransitLine("Não sei");
                                    setNewVenueTransitStation(null);
                                    setLineOpen(false);
                                  }}
                                >
                                  Não sei
                                </CommandItem>
                                {Object.keys(spTransit).map((ln) => (
                                  <CommandItem
                                    key={ln}
                                    onSelect={() => {
                                      setNewVenueTransitLine(ln);
                                      setNewVenueTransitStation(null);
                                      setLineOpen(false);
                                    }}
                                  >
                                    {ln}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white/80">Estação</Label>
                      <Popover open={stationOpen} onOpenChange={setStationOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!newVenueTransitLine || newVenueTransitLine === "Não sei"}
                            className="w-full justify-between bg-white/10 border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                          >
                            {newVenueTransitStation ?? (newVenueTransitLine && newVenueTransitLine !== "Não sei" ? "Selecione a estação" : "Não sei")}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-[320px] max-h-[60vh] bg-popover text-popover-foreground" style={{ zIndex: 1400 }}>
                          <Command>
                            <CommandInput placeholder="Buscar estação..." />
                            <CommandList className="max-h-[50vh] overflow-y-auto">
                              <CommandEmpty>Nenhuma estação encontrada</CommandEmpty>
                              <CommandGroup>
                                {(newVenueTransitLine && newVenueTransitLine !== "Não sei" ? spTransit[newVenueTransitLine] : []).map((st) => (
                                  <CommandItem
                                    key={st}
                                    onSelect={() => {
                                      setNewVenueTransitStation(st);
                                      setStationOpen(false);
                                    }}
                                  >
                                    {st}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="text-xs text-white/50">Essa informação será anexada ao campo de localização do rolê.</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    className="bg-black/80 text-white hover:bg-black border border-white/20"
                    onClick={() => setNewVenueDialogOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    type="button"
                    className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                    onClick={async () => {
                      if (!newVenueName.trim()) {
                        toast({ title: "Informe o nome do local", description: "Campo nome é obrigatório." });
                        return;
                      }
                      const { data, error } = await supabase
                        .from("venues")
                        .insert({
                          name: newVenueName.trim(),
                          address_text: newVenueAddress.trim() || null,
                          instagram_url: newVenueInstagram.trim() || null,
                          transit_line: newVenueTransitLine === "Não sei" ? null : (newVenueTransitLine ?? null),
                          transit_station: newVenueTransitLine === "Não sei" ? null : (newVenueTransitStation ?? null),
                          created_by: profile?.id ?? null,
                        })
                        .select("id,name,address_text,instagram_url,transit_line,transit_station")
                        .maybeSingle();
                      if (error) {
                        toast({ title: "Erro ao cadastrar Local", description: error.message });
                        return;
                      }
                      if (data) {
                        const d = data as VenueRow;
                        setVenues((prev) => [...prev, d]);
                        setSelectedVenueId(d.id);
                        setEventName(d.name);
                        setLocationName(d.address_text ?? "");
                        setInstagramUrl(d.instagram_url ?? "");
                        setSelectedTransitLine(d.transit_line ?? null);
                        setSelectedTransitStation(d.transit_station ?? null);
                        setNewVenueDialogOpen(false);
                        setShowNewVenue(false);
                        setNewVenueName("");
                        setNewVenueAddress("");
                        setNewVenueInstagram("");
                        setNewVenueTransitLine("Não sei");
                        setNewVenueTransitStation(null);
                        toast({ title: "Local cadastrado", description: "Dados aplicados ao formulário." });
                      }
                    }}
                  >
                    Salvar e aplicar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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

        {/* Requirements (optional) */}
        <div className="space-y-2">
          <Label htmlFor="requirements" className="text-white">Requisitos (opcional)</Label>
          <Textarea
            id="requirements"
            name="requirements"
            placeholder="Explique se precisa pagar algo, levar itens, vestir código de traje, documentos, etc."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px] resize-none"
          />
          <div className="text-xs text-white/50">Este campo é opcional e ajuda participantes a se prepararem.</div>
        </div>

        {/* Links auxiliares (opcional) */}
        <div className="space-y-2">
          <Label htmlFor="aux_links" className="text-white">Links auxiliares (opcional)</Label>
          <Textarea
            id="aux_links"
            name="aux_links"
            placeholder="Cole aqui links úteis (pagamento, regulamento, mapa, lista de transmissão, etc.). Uma por linha ou separados por vírgulas."
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60 min-h-[100px] resize-none"
          />
          <div className="text-xs text-white/50">Aceita múltiplos links; serão salvos como texto.</div>
        </div>

        <Card className="bg-white/5 border-white/20">
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Detalhes do Rolê</h2>
              <span className="text-xs text-white/60">Defina limites e localização</span>
            </div>

            <div className="h-px bg-white/10" />

            <div className="space-y-2">
              <Label className="text-white">Vai ter</Label>
              <ToggleGroup
                type="single"
                value={extraKind}
                onValueChange={(v) => {
                  if (v === "none" || v === "esquenta" || v === "after") {
                    setExtraKind(v);
                    if (v === "none") setExtraLocation("");
                  }
                }}
              >
                <ToggleGroupItem value="esquenta" className="bg-white/10 border-white/20 text-white hover:bg-white/10">Esquenta</ToggleGroupItem>
                <ToggleGroupItem value="after" className="bg-white/10 border-white/20 text-white hover:bg-white/10">After</ToggleGroupItem>
                <ToggleGroupItem value="none" className="bg-white/10 border-white/20 text-white hover:bg-white/10">Nenhum</ToggleGroupItem>
              </ToggleGroup>
              {(extraKind === "esquenta" || extraKind === "after") && (
                <Input
                  id="extra_location"
                  value={extraLocation}
                  onChange={(e) => setExtraLocation(e.target.value)}
                  placeholder={extraKind === "esquenta" ? "Onde será o esquenta?" : "Onde será o after?"}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              )}
            </div>

            {/* Data e Horário dentro de Detalhes do Rolê */}
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

            {/* Removido: Estação mais próxima — agora parte do popup 'Cadastrar novo Local' */}

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
