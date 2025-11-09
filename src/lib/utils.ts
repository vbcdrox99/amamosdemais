import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function normalizePhoneNumber(raw: string): string {
  // Remove tudo que não é dígito
  const digits = (raw || "").replace(/\D+/g, "");
  return digits;
}

export function phoneToEmailAlias(raw: string): string {
  const digits = normalizePhoneNumber(raw);
  return `${digits}@email.com`;
}

export function maskPhoneNumber(raw: string): string {
  const digits = normalizePhoneNumber(raw);
  if (!digits) return "(Sem telefone)";
  const first = digits.slice(0, 2);
  const last = digits.slice(-4);
  const middleLen = Math.max(digits.length - 6, 0);
  const middle = "*".repeat(middleLen);
  return `${first}${middle}${last}`;
}

export function formatPhoneBR(raw: string): string {
  const d = normalizePhoneNumber(raw);
  if (!d) return "(Sem telefone)";
  // Suporta 10 dígitos (fixo) e 11 dígitos (celular). Mantém quaisquer dígitos extras no final.
  if (d.length >= 11) {
    const ddd = d.slice(0, 2);
    const first = d.slice(2, 7);
    const last = d.slice(7, 11);
    const extra = d.slice(11);
    return `( ${ddd} ) ${first}-${last}${extra ? ` ${extra}` : ""}`.replace(/\s+/g, " ").replace("( ", "(").replace(" )", ")");
  } else if (d.length === 10) {
    const ddd = d.slice(0, 2);
    const first = d.slice(2, 6);
    const last = d.slice(6, 10);
    return `( ${ddd} ) ${first}-${last}`.replace(/\s+/g, " ").replace("( ", "(").replace(" )", ")");
  } else if (d.length >= 3) {
    // Formatação parcial para entradas curtas
    const ddd = d.slice(0, 2);
    const rest = d.slice(2);
    return `( ${ddd} ) ${rest}`.replace(/\s+/g, " ").replace("( ", "(").replace(" )", ")");
  }
  return d;
}

// Instagram helpers
export function extractInstagramHandle(raw: string): string | null {
  let s = (raw || "").trim();
  if (!s) return null;
  // Remover prefixos de URL comuns
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  s = s.replace(/^instagram\.com\//i, "");
  // Remover arrobas iniciais
  s = s.replace(/^@+/, "");
  // Pegar somente o primeiro segmento antes de /, ?, #
  s = s.split(/[\/?#]/)[0];
  s = s.trim();
  if (!s) return null;
  return s;
}

export function formatInstagramDisplay(handle: string | null | undefined): string {
  const h = (handle || "").trim();
  return h ? `@${h}` : "Não informado";
}

export function formatInstagramUrl(handle: string | null | undefined): string | null {
  const h = (handle || "").trim();
  return h ? `https://www.instagram.com/${h}` : null;
}
