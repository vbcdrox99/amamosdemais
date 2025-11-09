import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuthRole } from "@/hooks/useAuthRole";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import { formatPhoneBR, extractInstagramHandle, formatInstagramDisplay } from "@/lib/utils";

const Profile = () => {
  const { flags, profile, session, permissions } = useAuthRole() as any;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState<string>("");
  const [instagram, setInstagram] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rsvps, setRsvps] = useState<Array<{ event_id: number; status: "going" | "maybe" | "not-going"; checkin_confirmed: boolean | null; events?: { id: number; title: string | null; event_timestamp: string | null; location_text: string | null } | null }>>([]);
  const [loadingRsvps, setLoadingRsvps] = useState(false);

  useEffect(() => {
    if (!flags.isAuthenticated) return;
    setFullName(profile?.full_name ?? "");
    setInstagram(profile?.instagram ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [flags.isAuthenticated, profile?.full_name, profile?.instagram, profile?.avatar_url]);

  // Carregar RSVPs e check-ins do próprio usuário
  useEffect(() => {
    const loadRsvps = async () => {
      if (!session?.user?.id) return;
      try {
        setLoadingRsvps(true);
        const { data, error } = await supabase
          .from("event_rsvps")
          .select("event_id,status,checkin_confirmed,events:events(id,title,event_timestamp,location_text)")
          .eq("user_id", session.user.id)
          .order("event_id", { ascending: false });
        if (error) throw error;
        setRsvps((data as any[]) ?? []);
      } catch (e: any) {
        toast({ title: "Erro ao carregar seus rolês", description: e?.message ?? String(e), variant: "destructive" });
      } finally {
        setLoadingRsvps(false);
      }
    };
    loadRsvps();
  }, [session?.user?.id]);

  const checkins = useMemo(() => rsvps.filter((r) => !!r.checkin_confirmed), [rsvps]);
  const going = useMemo(() => rsvps.filter((r) => r.status === "going" && !r.checkin_confirmed), [rsvps]);
  const maybe = useMemo(() => rsvps.filter((r) => r.status === "maybe"), [rsvps]);
  const notGoing = useMemo(() => rsvps.filter((r) => r.status === "not-going"), [rsvps]);

  const handleAvatarChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result ?? null);
    };
    reader.onerror = () => {
      toast({ title: "Erro ao ler imagem", description: "Tente novamente.", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!session?.user?.id) {
      toast({ title: "Sessão inválida", description: "Entre novamente para editar seu perfil." });
      return;
    }
    setSaving(true);
    try {
      let avatarUrlToSave: string | undefined;
      let storageErrorMessage: string | null = null;

      if (avatarFile) {
        const ext = (avatarFile.name.split(".").pop() || "jpeg").toLowerCase();
        // O path é relativo ao bucket; não incluir o nome do bucket aqui
        const path = `${session.user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: false, contentType: avatarFile.type });
        if (uploadError) {
          storageErrorMessage = uploadError.message ?? String(uploadError);
        } else {
          const { data: publicData } = await supabase.storage.from("avatars").getPublicUrl(path);
          avatarUrlToSave = publicData.publicUrl;
        }
      }

      const updatePayload: any = { full_name: fullName };
      const igHandle = extractInstagramHandle(instagram);
      updatePayload.instagram = igHandle && igHandle.length > 0 ? igHandle : null;
      if (avatarUrlToSave) updatePayload.avatar_url = avatarUrlToSave;

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", session.user.id);
      if (error) throw error;

      if (avatarUrlToSave) {
        setAvatarUrl(avatarUrlToSave);
        setAvatarFile(null);
      }
      if (storageErrorMessage) {
        const hint = storageErrorMessage.toLowerCase().includes("row-level security")
          ? "Verifique as políticas de INSERT no bucket 'avatars' (storage.objects)."
          : storageErrorMessage;
        toast({ title: "Nome salvo, falha ao enviar foto", description: hint, variant: "destructive" });
      } else {
        toast({ title: "Perfil atualizado", description: "Suas alterações foram salvas." });
      }
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logout efetuado", description: "Você saiu da sua conta." });
    navigate("/auth");
  };

  if (!flags.isAuthenticated) {
    return (
      <div className="container max-w-xl mx-auto px-4 pt-20 pb-24">
        <Card className="bg-black/60 border-white/20">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Perfil</CardTitle>
            <CardDescription>Entre para ver e editar seu perfil.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">Entrar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-xl mx-auto px-4 pt-20 pb-24">
      <Card className="bg-black/60 border-white/20">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent">Meu Perfil</CardTitle>
          <CardDescription>Gerencie suas informações pessoais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Foto de perfil</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-1 ring-white/20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                ) : (
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt="Avatar" />
                )}
                <AvatarFallback className="text-sm">
                  {(fullName || formatPhoneBR(profile?.phone_number || "") || "?")?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 px-3 border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30"
                >
                  Alterar foto
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={formatPhoneBR(profile?.phone_number || "")} readOnly className="bg-white/5" />
          </div>
          <div className="space-y-2">
            <Label>Nome ou Apelido</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome ou apelido"
            />
          </div>
          <div className="space-y-2">
            <Label>Instagram</Label>
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              onBlur={() => {
                const h = extractInstagramHandle(instagram);
                setInstagram(h ? formatInstagramDisplay(h) : "");
              }}
              placeholder="@seuusuario"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="h-9 px-3 border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30">
              {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="outline" onClick={handleLogout} className="ml-auto">
          Sair
        </Button>
      </div>

      {/* Meus rolês: Check-ins e RSVPs */}
      <div className="pt-2">
        <div className="h-px bg-white/10 mb-4" />
        <Card className="bg-black/40 border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Meus Rolês</CardTitle>
            <CardDescription>Eventos em que você fez check-in ou marcou presença.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingRsvps && (
              <div className="text-sm text-muted-foreground">Carregando seus rolês...</div>
            )}
            {!loadingRsvps && rsvps.length === 0 && (
              <div className="text-sm text-muted-foreground">Você ainda não interagiu com nenhum rolê.</div>
            )}
            {!loadingRsvps && rsvps.length > 0 && (
              <>
                <div className="space-y-2">
                  <div className="text-xs text-white/70">Check-ins</div>
                  {checkins.length === 0 ? (
                    <div className="text-xs text-white/50">Nenhum check-in confirmado.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {checkins.map((r) => (
                        <Link key={`c-${r.event_id}`} to={`/evento/${r.events?.id ?? r.event_id}`} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span className="text-foreground">{r.events?.title ?? `Rolê ${r.event_id}`}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-white/70">Vou</div>
                  {going.length === 0 ? (
                    <div className="text-xs text-white/50">Nenhum rolê marcado como VOU.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {going.map((r) => (
                        <Link key={`g-${r.event_id}`} to={`/evento/${r.events?.id ?? r.event_id}`} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          <span className="text-foreground">{r.events?.title ?? `Rolê ${r.event_id}`}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-white/70">Talvez</div>
                  {maybe.length === 0 ? (
                    <div className="text-xs text-white/50">Nenhum rolê marcado como TALVEZ.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {maybe.map((r) => (
                        <Link key={`m-${r.event_id}`} to={`/evento/${r.events?.id ?? r.event_id}`} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                          <span className="text-foreground">{r.events?.title ?? `Rolê ${r.event_id}`}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-white/70">Não vou</div>
                  {notGoing.length === 0 ? (
                    <div className="text-xs text-white/50">Nenhum rolê marcado como NÃO VOU.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {notGoing.map((r) => (
                        <Link key={`n-${r.event_id}`} to={`/evento/${r.events?.id ?? r.event_id}`} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                          <span className="text-foreground">{r.events?.title ?? `Rolê ${r.event_id}`}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

          {permissions?.canAccessAdmin && (
            <div className="pt-4">
              <div className="h-px bg-white/10 mb-4" />
              <Card className="bg-black/40 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Seção Administrativa</CardTitle>
                  <CardDescription>Gerencie usuários e configurações do grupo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button onClick={() => navigate("/admin")} className="flex-1">Abrir Painel Admin</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;