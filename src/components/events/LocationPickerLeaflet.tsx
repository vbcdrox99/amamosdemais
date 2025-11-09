import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Ajuste de ícones padrão do Leaflet (corrige ícones quebrados em bundlers)
// Usando os assets do CDN para garantir que os ícones apareçam corretamente
const DefaultIcon = new L.Icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon as any;

export type LatLng = { lat: number; lng: number };

type Props = {
  value?: LatLng | null;
  name?: string;
  onChange?: (coords: LatLng | null, address?: string) => void;
  className?: string;
};

// Componente para capturar cliques no mapa e atualizar posição do marcador
function ClickHandler({ onClick }: { onClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Função utilitária para geocodificar com Nominatim (OpenStreetMap)
async function geocodeByQuery(query: string): Promise<{ display_name: string; lat: string; lon: string }[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  const res = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "pt-BR",
      // Identifique o app conforme política de uso da Nominatim
      "User-Agent": "caps-app/1.0 (contato@example.com)",
    },
  });
  if (!res.ok) return [];
  return (await res.json()) as any;
}

// Reverse geocoding para obter o nome do local dado lat/lng
async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  const res = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "pt-BR",
      "User-Agent": "caps-app/1.0 (contato@example.com)",
    },
  });
  if (!res.ok) return undefined;
  const data = await res.json();
  return data?.display_name as string | undefined;
}

export function LocationPickerLeaflet({ value, onChange, name = "location", className }: Props) {
  const [coords, setCoords] = useState<LatLng | null>(value ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const center = useMemo<LatLng>(() => coords ?? { lat: -23.55052, lng: -46.633308 }, [coords]); // SP como default

  useEffect(() => {
    setCoords(value ?? null);
  }, [value]);

  async function handleSearch() {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const r = await geocodeByQuery(query.trim());
    setResults(r);
  }

  async function handleSelectResult(r: { display_name: string; lat: string; lon: string }) {
    const newCoords = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
    setCoords(newCoords);
    onChange?.(newCoords, r.display_name);
    setResults([]);
  }

  async function handleMarkerDragEnd(e: any) {
    const { lat, lng } = e.target.getLatLng();
    const addr = await reverseGeocode(lat, lng);
    const newCoords = { lat, lng };
    setCoords(newCoords);
    onChange?.(newCoords, addr);
  }

  return (
    <div className={className}>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          name={`${name}-search`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Buscar endereço, ponto de interesse, bairro..."
          className="flex-1 rounded-md bg-muted/40 border border-muted-foreground/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Buscar
        </button>
      </div>

      {results.length > 0 && (
        <div className="mb-3 rounded-md border border-muted-foreground/20 bg-muted/30">
          {results.map((r, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectResult(r)}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-muted/60"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-md overflow-hidden border border-muted-foreground/20">
        <MapContainer center={[center.lat, center.lng] as [number, number]} zoom={13} style={{ height: 300, width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickHandler
            onClick={(latlng) => {
              setCoords(latlng);
              onChange?.(latlng);
            }}
          />

          {coords && (
            <Marker position={[coords.lat, coords.lng] as [number, number]} draggable={true} eventHandlers={{ dragend: handleMarkerDragEnd }}>
              <Popup>
                Arraste para ajustar. Clique no mapa para mover.
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Campo oculto para integrar ao formulário se necessário */}
      <input type="hidden" name={name} value={coords ? `${coords.lat},${coords.lng}` : ""} />
    </div>
  );
}

export default LocationPickerLeaflet;