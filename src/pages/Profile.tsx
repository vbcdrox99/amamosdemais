import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuthRole } from "@/hooks/useAuthRole";
import { supabase } from "@/lib/supabase";
import { signOut } from "@/lib/auth";
import { formatPhoneBR } from "@/lib/utils";

const Profile = () => {
  const { flags, profile, session, permissions } = useAuthRole() as any;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!flags.isAuthenticated) return;
    setFullName(profile?.full_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [flags.isAuthenticated, profile?.full_name, profile?.avatar_url]);

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
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="h-9 px-3 border-white/30 text-white hover:bg-white/10 bg-gradient-to-r from-emerald-600/30 to-sky-600/30">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="ml-auto">
              Sair
            </Button>
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