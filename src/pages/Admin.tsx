import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthRole } from "@/hooks/useAuthRole";
import { formatPhoneBR } from "@/lib/utils";
import ProfileQuickView from "@/components/profile/ProfileQuickView";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Admin = () => {
  const { toast } = useToast();
  const { permissions } = useAuthRole();
  const [profiles, setProfiles] = useState<Array<{ id: string; email: string | null; phone_number: string | null; full_name: string | null; is_approved: boolean; is_admin?: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [profileViewOpen, setProfileViewOpen] = useState(false);
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null);
  const [venues, setVenues] = useState<Array<{ id: string; name: string; address_text: string | null; instagram_url: string | null }>>([]);
  const [venueQuery, setVenueQuery] = useState("");
  const [editVenueOpen, setEditVenueOpen] = useState(false);
  const [editVenueId, setEditVenueId] = useState<string | null>(null);
  const [editVenueName, setEditVenueName] = useState("");
  const [editVenueAddress, setEditVenueAddress] = useState("");
  const [editVenueInstagram, setEditVenueInstagram] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,phone_number,full_name,is_approved,is_admin")
        .order("phone_number", { ascending: true, nullsFirst: true })
        .order("full_name", { ascending: true, nullsFirst: true });
      setLoading(false);
      if (error) {
        toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
        return;
      }
      setProfiles(data ?? []);
    };
    load();
  }, [toast]);

  useEffect(() => {
    const loadVenues = async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id,name,address_text,instagram_url")
        .order("name", { ascending: true });
      if (error) {
        toast({ title: "Erro ao carregar Locais", description: error.message, variant: "destructive" });
        return;
      }
      setVenues(data ?? []);
    };
    loadVenues();
  }, [toast]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p => (((p.full_name ?? "") + (p.phone_number ?? "")).toLowerCase().includes(q)));
  }, [profiles, query]);

  const filteredVenues = useMemo(() => {
    const q = venueQuery.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter(v => (v.name.toLowerCase().includes(q) || (v.address_text ?? "").toLowerCase().includes(q)));
  }, [venues, venueQuery]);

  const approved = filtered.filter(p => p.is_approved);
  const pending = filtered.filter(p => !p.is_approved);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("id", userId);
    if (error) {
      toast({ title: "Erro ao aprovar usuário", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Usuário aprovado", description: "Agora ele pode acessar o app." });
    // reload
    const { data } = await supabase
      .from("profiles")
      .select("id,email,phone_number,full_name,is_approved")
      .order("phone_number", { ascending: true, nullsFirst: true })
      .order("full_name", { ascending: true, nullsFirst: true });
    setProfiles(data ?? []);
  };

  const reloadProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,phone_number,full_name,is_approved,is_admin")
      .not("phone_number", "is", null)
      .order("phone_number", { ascending: true, nullsFirst: true })
      .order("full_name", { ascending: true, nullsFirst: true });
    setProfiles(data ?? []);
  };

  const reloadVenues = async () => {
    const { data } = await supabase
      .from("venues")
      .select("id,name,address_text,instagram_url")
      .order("name", { ascending: true });
    setVenues(data ?? []);
  };

  const deleteUserCascade = async (userId: string) => {
    // Sanitiza perfil para esconder em consultas e remover dados pessoais
    try {
      await supabase
        .from("profiles")
        .update({
          is_approved: false,
          is_admin: false,
          full_name: null,
          avatar_url: null,
          instagram: null,
          birthdate: null,
          phone_number: null,
        })
        .eq("id", userId);
    } catch (_e) { String(_e); }
    // Remove dependências antes de excluir perfil para evitar erros de FK
    try { await supabase.from("event_rsvps").delete().eq("user_id", userId); } catch (_e) { String(_e); }
    try { await supabase.from("poll_votes").delete().eq("user_id", userId); } catch (_e) { String(_e); }
    try { await supabase.from("event_memories").delete().eq("user_id", userId); } catch (_e) { String(_e); }
    try { await supabase.from("event_ratings").delete().eq("user_id", userId); } catch (_e) { String(_e); }
    try { await supabase.from("birthday_congrats").delete().or(`from_user_id.eq.${userId},birthday_user_id.eq.${userId}`); } catch (_e) { String(_e); }
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) throw error;
  };

  const handleDeleteMember = async (userId: string) => {
    try {
      await deleteUserCascade(userId);
      const deleted = profiles.find((p) => p.id === userId);
      const name = (deleted?.full_name ?? "").trim() || formatPhoneBR(deleted?.phone_number || "");
      toast({ title: "Usuário apagado", description: name ? `${name}` : "Dados apagados e acesso desativado." });
      setProfiles((prev) => prev.filter((p) => p.id !== userId));
      await reloadProfiles();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Falha ao excluir", description: msg, variant: "destructive" });
    }
  };

  const handleMakeAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_admin: true }).eq("id", userId);
      if (error) {
        toast({ title: "Erro ao tornar admin", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Admin atribuído", description: "Este usuário agora é administrador." });
      await reloadProfiles();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Falha ao atribuir admin", description: msg, variant: "destructive" });
    }
  };

  const handleRejectPending = async (userId: string) => {
    try {
      await deleteUserCascade(userId);
      const deleted = profiles.find((p) => p.id === userId);
      const name = (deleted?.full_name ?? "").trim() || formatPhoneBR(deleted?.phone_number || "");
      toast({ title: "Usuário apagado", description: name ? `${name}` : "Usuário removido da lista. Pode se cadastrar novamente." });
      await reloadProfiles();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Erro ao rejeitar cadastro", description: msg, variant: "destructive" });
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_admin: false }).eq("id", userId);
      if (error) {
        toast({ title: "Erro ao remover admin", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Admin removido", description: "Este usuário não é mais administrador." });
      await reloadProfiles();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Falha ao remover admin", description: msg, variant: "destructive" });
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("admin-profiles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async () => {
        await reloadProfiles();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!permissions?.canAccessAdmin) {
    return (
      <div className="min-h-screen pt-24 pb-20 px-4">
        <h2 className="text-2xl font-bold mb-4 text-foreground">Painel Administrativo</h2>
        <p className="text-sm text-muted-foreground">Acesso restrito. Entre com uma conta admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Painel Administrativo</h2>
      <Tabs defaultValue="users" className="mt-2">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="venues">Locais cadastrados</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="pt-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
              <Input
                placeholder="Buscar por nome ou telefone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full"
              />
              <Button variant="outline" onClick={() => setQuery("")} className="w-full sm:w-auto">Limpar</Button>
            </div>
            {loading && <div className="text-sm text-muted-foreground">Carregando usuários...</div>}
            {!loading && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
            )}
            {!loading && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-foreground">Usuários autenticados ({approved.length})</h4>
                  {approved.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum aprovado.</div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {approved.map((u) => (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-md border border-border p-3">
                          <button
                            type="button"
                            className="text-left flex-1 min-w-0"
                            onClick={() => {
                              setProfileViewUserId(u.id);
                              setProfileViewOpen(true);
                            }}
                          >
                            {u.full_name ? (
                              <>
                                <div className="text-base font-semibold text-foreground truncate">{u.full_name}</div>
                                <div className="text-xs text-muted-foreground">{formatPhoneBR(u.phone_number || "")}</div>
                              </>
                            ) : (
                              <div className="text-sm font-semibold text-foreground">{formatPhoneBR(u.phone_number || "")}</div>
                            )}
                          </button>
                          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-2 w-full sm:w-auto">
                            {permissions?.canManageAdmins && u.is_admin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto text-xs sm:text-sm"
                                onClick={() => {
                                  const ok = window.confirm("Remover privilégios de admin deste usuário?");
                                  if (ok) handleRemoveAdmin(u.id);
                                }}
                              >
                                Remover admin
                              </Button>
                            )}
                            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm" onClick={() => handleMakeAdmin(u.id)}>Tornar admin</Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full sm:w-auto text-xs sm:text-sm"
                              onClick={() => {
                                const ok = window.confirm("Excluir este membro? Isso apaga dados pessoais e desativa o acesso.");
                                if (ok) handleDeleteMember(u.id);
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Usuários a espera ({pending.length})</h4>
                  {pending.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum pendente.</div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {pending.map((u) => (
                        <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-md border border-border p-3">
                          <button
                            type="button"
                            className="text-left flex-1 min-w-0"
                            onClick={() => {
                              setProfileViewUserId(u.id);
                              setProfileViewOpen(true);
                            }}
                          >
                            {u.full_name ? (
                              <>
                                <div className="text-base font-semibold text-foreground truncate">{u.full_name}</div>
                                <div className="text-xs text-muted-foreground">{formatPhoneBR(u.phone_number || "")}</div>
                              </>
                            ) : (
                              <div className="text-sm font-semibold text-foreground">{formatPhoneBR(u.phone_number || "")}</div>
                            )}
                          </button>
                          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-2 w-full sm:w-auto">
                            <Button size="sm" className="w-full sm:w-auto text-xs sm:text-sm" onClick={() => handleApprove(u.id)}>Aprovar</Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full sm:w-auto text-xs sm:text-sm"
                              onClick={() => {
                                const ok = window.confirm("Não aprovar e excluir este cadastro? Os dados serão apagados.");
                                if (ok) handleRejectPending(u.id);
                              }}
                            >
                              Não aprovar
                            </Button>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm" onClick={() => handleMakeAdmin(u.id)}>Tornar admin</Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full sm:w-auto text-xs sm:text-sm"
                              onClick={() => {
                                const ok = window.confirm("Excluir este membro? Isso apaga dados pessoais e desativa o acesso.");
                                if (ok) handleDeleteMember(u.id);
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="venues" className="pt-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
              <Input
                placeholder="Buscar por nome ou endereço"
                value={venueQuery}
                onChange={(e) => setVenueQuery(e.target.value)}
                className="w-full"
              />
              <Button variant="outline" onClick={() => setVenueQuery("")} className="w-full sm:w-auto">Limpar</Button>
            </div>
            {filteredVenues.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum Local encontrado.</div>
            ) : (
              <div className="space-y-2">
                {filteredVenues.map((v) => (
                  <div key={v.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-md border border-border p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-foreground truncate">{v.name}</div>
                      {v.address_text && <div className="text-xs text-muted-foreground truncate">{v.address_text}</div>}
                      {v.instagram_url && <div className="text-xs text-muted-foreground truncate">{v.instagram_url}</div>}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto text-xs sm:text-sm"
                        onClick={() => {
                          setEditVenueId(v.id);
                          setEditVenueName(v.name);
                          setEditVenueAddress(v.address_text ?? "");
                          setEditVenueInstagram(v.instagram_url ?? "");
                          setEditVenueOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto text-xs sm:text-sm"
                        onClick={async () => {
                          const ok = window.confirm("Excluir este Local?");
                          if (!ok) return;
                          const { error } = await supabase.from("venues").delete().eq("id", v.id);
                          if (error) {
                            toast({ title: "Erro ao excluir Local", description: error.message, variant: "destructive" });
                            return;
                          }
                          toast({ title: "Local excluído", description: "Removido com sucesso." });
                          await reloadVenues();
                        }}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground mt-3">Nota: ações de edição/banimento podem ser adicionadas depois.</p>
      <ProfileQuickView userId={profileViewUserId} open={profileViewOpen} onOpenChange={setProfileViewOpen} />
      <Dialog open={editVenueOpen} onOpenChange={setEditVenueOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Local</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-venue-name">Nome</Label>
              <Input id="edit-venue-name" value={editVenueName} onChange={(e) => setEditVenueName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-venue-address">Endereço</Label>
              <Input id="edit-venue-address" value={editVenueAddress} onChange={(e) => setEditVenueAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-venue-instagram">Instagram / Site</Label>
              <Input id="edit-venue-instagram" value={editVenueInstagram} onChange={(e) => setEditVenueInstagram(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setEditVenueOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="w-full"
                onClick={async () => {
                  if (!editVenueId) return;
                  const { error } = await supabase
                    .from("venues")
                    .update({
                      name: editVenueName.trim(),
                      address_text: editVenueAddress.trim() || null,
                      instagram_url: editVenueInstagram.trim() || null,
                    })
                    .eq("id", editVenueId);
                  if (error) {
                    toast({ title: "Erro ao salvar Local", description: error.message, variant: "destructive" });
                    return;
                  }
                  toast({ title: "Local atualizado", description: "Alterações salvas." });
                  setEditVenueOpen(false);
                  setEditVenueId(null);
                  setEditVenueName("");
                  setEditVenueAddress("");
                  setEditVenueInstagram("");
                  await reloadVenues();
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
