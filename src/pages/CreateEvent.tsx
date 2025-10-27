import { useState } from "react";
import { ArrowLeft, Upload, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import LocationPickerLeaflet, { LatLng } from "../components/events/LocationPickerLeaflet";

const CreateEvent = () => {
  const navigate = useNavigate();
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  const [mapLocation, setMapLocation] = useState<LatLng | null>(null);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [minParticipants, setMinParticipants] = useState<number | "">("");
  const [maxParticipants, setMaxParticipants] = useState<number | "">("");
  const [eventStatus, setEventStatus] = useState<"confirmado" | "sugestao">("confirmado");
  const { toast } = useToast();

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
        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);
        const name = formData.get("name") as string | null;
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
      
        const payload = {
          name,
          description,
          date,
          time,
          location_name: locationName || null,
          location_lat: mapLocation?.lat ?? null,
          location_lng: mapLocation?.lng ?? null,
          has_limit: limitEnabled,
          min_participants: limitEnabled && typeof minParticipants === "number" ? minParticipants : null,
          max_participants: limitEnabled && typeof maxParticipants === "number" ? maxParticipants : null,
          cover_image: coverImage,
          status: eventStatus,
        };
      
        if (!supabase) {
          toast({ title: "Supabase não configurado", description: "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY." });
          return;
        }
      
        const { error } = await supabase.from("events").insert(payload);
        if (error) {
          toast({ title: "Erro ao salvar", description: error.message });
          return;
        }
      
        toast({ title: "Evento criado!", description: "Seu rolê foi publicado." });
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

        {/* Event Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-white">Nome do Rolê</Label>
          <Input
            id="name"
            name="name"
            placeholder="Ex: Churrasco na Laje do Zé"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
          />
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-white">Data</Label>
            <Input id="date" name="date" type="date" className="bg-white/10 border-white/20 text-white placeholder:text-white/60" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time" className="text-white">Horário</Label>
            <Input id="time" name="time" type="time" className="bg-white/10 border-white/20 text-white placeholder:text-white/60" />
          </div>
        </div>

        <Card className="bg-white/5 border-white/20">
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Detalhes do Rolê</h2>
              <span className="text-xs text-white/60">Defina status, limites e localização</span>
            </div>

            {/* Status do Rolê */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-white">Status do Rolê</Label>
              <Select value={eventStatus} onValueChange={(v) => setEventStatus(v as "confirmado" | "sugestao") }>
                <SelectTrigger id="status" className="bg-white/10 border-white/20 text-white hover:bg-white/10 focus:ring-2 focus:ring-emerald-500">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="sugestao">Sugestão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-px bg-white/10" />

            {/* Limite de pessoas */}
            <div className="space-y-2">
              <Label htmlFor="limit" className="text-white">Limite de pessoas</Label>
              <Select defaultValue="não" onValueChange={(v) => setLimitEnabled(v === "sim") }>
                <SelectTrigger id="limit" className="bg-white/10 border-white/20 text-white hover:bg-white/10 focus:ring-2 focus:ring-emerald-500">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="não">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
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

            {/* Local e mapa (mapa por último) */}
            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium text-white">Local</label>
              <input
                id="location"
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Digite o nome do local, bairro ou referência"
                className="rounded-md bg-white/10 border border-white/20 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {/* Instagram / Site */}
              <div className="space-y-2 mt-3">
                <Label htmlFor="instagram" className="text-white">Instagram / Site</Label>
                <Input
                  id="instagram"
                  name="instagram"
                  type="url"
                  placeholder="Cole o link do Instagram, site etc."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                />
              </div>

              <div className="mt-3">
                <LocationPickerLeaflet
                  value={mapLocation}
                  onChange={(coords, addr) => {
                    setMapLocation(coords);
                    if (addr && !locationName) setLocationName(addr);
                  }}
                  name="location_coords"
                />
              </div>
            </div>
          </div>
        </Card>

        <Button
          type="submit"
          variant="outline"
          className="w-full h-12 text-base font-semibold border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
        >
          Publicar Rolê!
        </Button>
      </form>
    </div>
  );
};

export default CreateEvent;
