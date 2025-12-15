import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ProfileQuickView from "@/components/profile/ProfileQuickView";
import { Users, RefreshCcw } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type MemberRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  instagram: string | null;
  birthdate: string | null;
  is_approved: boolean | null;
  region_label: string | null;
};

type SortMode = "name_asc" | "name_desc" | "birthday_upcoming";

export default function Members() {
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name_asc");
  const [hasMore, setHasMore] = useState(true);
  const [profileViewOpen, setProfileViewOpen] = useState(false);
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null);

  const pageSize = 50;
  const offsetRef = useRef(0);

  const loadMembers = async (reset = false) => {
    try {
      if (reset) {
        setMembers([]);
        offsetRef.current = 0;
        setHasMore(true);
      }
      if (!hasMore && !reset) return;
      setLoading(true);
      let q = supabase
        .from("profiles")
        .select("id,full_name,avatar_url,instagram,birthdate,is_approved,region_label")
        .eq("is_approved", true);

      // server-side name filter
      const term = query.trim();
      if (term.length > 0) {
        q = q.ilike("full_name", `%${term}%`);
      }

      // base ordering to keep pagination stable
      q = q.order("full_name", { ascending: true, nullsFirst: true });
      q = q.range(offsetRef.current, offsetRef.current + pageSize - 1);

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as MemberRow[];
      setMembers((prev) => reset ? rows : [...prev, ...rows]);
      offsetRef.current += rows.length;
      setHasMore(rows.length === pageSize);
    } catch (e: any) {
      toast({ title: "Erro ao carregar membros", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const channel = supabase
      .channel("profiles-members-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async () => {
        // Atualiza lista quando qualquer perfil mudar
        await loadMembers(true);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const sorted = useMemo(() => {
    const arr = [...members];
    if (sortMode === "name_asc") {
      arr.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    } else if (sortMode === "name_desc") {
      arr.sort((a, b) => (b.full_name ?? "").localeCompare(a.full_name ?? ""));
    } else if (sortMode === "birthday_upcoming") {
      const nextOccur = (bd: string | null) => {
        if (!bd) return Number.MAX_SAFE_INTEGER;
        const d = new Date(bd);
        if (Number.isNaN(d.getTime())) return Number.MAX_SAFE_INTEGER;
        const today = new Date();
        const thisYear = today.getFullYear();
        const next = new Date(thisYear, d.getMonth(), d.getDate());
        if (next < today) next.setFullYear(thisYear + 1);
        return next.getTime();
      };
      arr.sort((a, b) => nextOccur(a.birthdate) - nextOccur(b.birthdate));
    }
    return arr;
  }, [members, sortMode]);

  return (
    <div className="pb-20 pt-16 px-4 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between pt-4">
        <h2 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-sky-500 bg-clip-text text-transparent flex items-center gap-2">
          <Users className="h-8 w-8 text-sky-400" />
          Membros
        </h2>
        <Button
          type="button"
          size="icon"
          className="rounded-full h-10 w-10"
          onClick={() => loadMembers(true)}
          title="Atualizar"
          aria-label="Atualizar lista"
        >
          <RefreshCcw className="h-5 w-5" />
        </Button>
      </div>

      <Card className="p-3 border border-white/10 bg-white/5 backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome"
            aria-label="Buscar membros"
          />
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="bg-black/30 border-white/20 text-white hover:bg-white/10" aria-label="Ordenar">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name_asc">Nome (A–Z)</SelectItem>
              <SelectItem value="name_desc">Nome (Z–A)</SelectItem>
              <SelectItem value="birthday_upcoming">Aniversários próximos</SelectItem>
            </SelectContent>
          </Select>
          {hasMore && (
            <Button variant="outline" onClick={() => loadMembers(false)} disabled={loading}>
              {loading ? "Carregando..." : "Carregar mais"}
            </Button>
          )}
        </div>
      </Card>

      {sorted.length === 0 && !loading && (
        <div className="rounded-xl p-4 border border-white/10 bg-white/5 backdrop-blur-md">
          <div className="text-sm text-white/70">Nenhum membro encontrado.</div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((m) => (
          <button
            key={m.id}
            onClick={() => { setProfileViewUserId(m.id); setProfileViewOpen(true); }}
            className="text-left"
          >
            <Card className={cn("flex items-center gap-3 p-3 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors")}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={m.avatar_url || undefined} alt={m.full_name || undefined} />
                <AvatarFallback>{(m.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{m.full_name ?? "Nome não informado"}</div>
                <div className="text-xs text-white/60">
                  {(() => {
                    const parts: string[] = [];
                    if (m.instagram) parts.push(`@${m.instagram}`);
                    if (m.birthdate) {
                      const [y, mm, dd] = (m.birthdate || "").split("-");
                      if (y && mm && dd) parts.push(`${dd.padStart(2, "0")}/${mm.padStart(2, "0")}`);
                    }
                    if (m.region_label) parts.push(m.region_label);
                    const s = parts.join(" • ");
                    return s.length > 0 ? s : "Sem informações";
                  })()}
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>

      <ProfileQuickView userId={profileViewUserId} open={profileViewOpen} onOpenChange={setProfileViewOpen} />
    </div>
  );
}
