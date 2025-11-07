import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthRole } from "@/hooks/useAuthRole";
import { formatPhoneBR } from "@/lib/utils";

const Admin = () => {
  const { toast } = useToast();
  const { permissions } = useAuthRole() as any;
  const [profiles, setProfiles] = useState<Array<{ id: string; email: string | null; phone_number: string | null; full_name: string | null; is_approved: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,phone_number,full_name,is_approved")
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
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(p => (((p.full_name ?? "") + (p.phone_number ?? "")).toLowerCase().includes(q)));
  }, [profiles, query]);

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
      <p className="text-sm text-muted-foreground mb-4">Gerencie e visualize todos os usuários.</p>

      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <Input placeholder="Buscar por nome ou telefone" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button variant="outline" onClick={() => setQuery("")}>Limpar</Button>
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
                    <div key={u.id} className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{formatPhoneBR(u.phone_number || "")}</div>
                        {u.full_name && (
                          <div className="text-xs text-muted-foreground">{u.full_name}</div>
                        )}
                      </div>
                      <div className="flex gap-2" />
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
                    <div key={u.id} className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{formatPhoneBR(u.phone_number || "")}</div>
                        {u.full_name && (
                          <div className="text-xs text-muted-foreground">{u.full_name}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleApprove(u.id)}>Aprovar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <p className="text-xs text-muted-foreground mt-3">Nota: ações de edição/banimento podem ser adicionadas depois.</p>
    </div>
  );
};

export default Admin;