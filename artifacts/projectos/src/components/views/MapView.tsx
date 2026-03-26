import { useState, useMemo, useEffect, useRef } from "react";
import { MapPin, Navigation, Search, X, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const PRIORITY_ICONS: Record<string, string> = { critical: "🔴", high: "🟡", medium: "🔵", low: "⚪" };

const STATUS_DOTS: Record<string, string> = {
  backlog: "#94a3b8", todo: "#60a5fa", inprogress: "#a78bfa",
  review: "#fbbf24", done: "#34d399", blocked: "#f87171",
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const PRESET_LOCATIONS: { name: string; lat: number; lng: number }[] = [
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Berlin", lat: 52.52, lng: 13.405 },
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Toronto", lat: 43.6532, lng: -79.3832 },
  { name: "Singapore", lat: 1.3521, lng: 103.8198 },
  { name: "Dubai", lat: 25.2048, lng: 55.2708 },
  { name: "Remote", lat: 0, lng: 0 },
  { name: "HQ", lat: 37.3861, lng: -122.0839 },
];

type Props = {
  tasks: any[];
  projects: any[];
  members: any[];
  onTaskClick: (task: any) => void;
};

export default function MapView({ tasks, projects, members, onTaskClick }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const locationGroups = useMemo(() => {
    const groups: Record<string, { tasks: any[]; lat?: number; lng?: number }> = {};

    tasks.forEach(t => {
      const loc = t.location || "No Location";
      if (!groups[loc]) {
        const lat = parseFloat(t.locationLat) || undefined;
        const lng = parseFloat(t.locationLng) || undefined;
        if (lat !== undefined && lng !== undefined) {
          groups[loc] = { tasks: [], lat, lng };
        } else {
          const preset = PRESET_LOCATIONS.find(p => p.name.toLowerCase() === loc.toLowerCase());
          groups[loc] = { tasks: [], lat: preset?.lat, lng: preset?.lng };
        }
      }
      groups[loc].tasks.push(t);
    });

    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.tasks.length - a.tasks.length);
  }, [tasks]);

  const locationsWithCoords = useMemo(() => {
    return locationGroups.filter(g => g.lat !== undefined && g.lng !== undefined && g.name !== "No Location");
  }, [locationGroups]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return locationGroups;
    const q = searchQuery.toLowerCase();
    return locationGroups.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.tasks.some(t => t.title.toLowerCase().includes(q))
    );
  }, [locationGroups, searchQuery]);

  useEffect(() => {
    if (!mapContainerRef.current || mapLoaded) return;
    if (locationsWithCoords.length === 0) return;

    const loadLeaflet = async () => {
      try {
        const L = await import("leaflet");

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        await new Promise(resolve => setTimeout(resolve, 300));

        if (!mapContainerRef.current) return;
        const map = L.map(mapContainerRef.current).setView([30, 0], 2);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        locationsWithCoords.forEach(group => {
          if (group.lat === undefined || group.lng === undefined) return;

          const taskCount = group.tasks.length;
          const doneCount = group.tasks.filter(t => t.status === "done").length;
          const blockedCount = group.tasks.filter(t => t.status === "blocked").length;

          const markerColor = blockedCount > 0 ? "#f87171" : doneCount === taskCount ? "#34d399" : "#a78bfa";
          const size = Math.min(40, 20 + taskCount * 3);

          const icon = L.divIcon({
            className: "custom-marker",
            html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${markerColor};border:3px solid rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${size > 30 ? 14 : 11}px;box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer">${taskCount}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          const marker = L.marker([group.lat!, group.lng!], { icon }).addTo(map);

          const popupContent = `
            <div style="font-family:system-ui;min-width:200px">
              <h3 style="margin:0 0 8px;font-size:14px;font-weight:700">${escapeHtml(group.name)}</h3>
              <div style="font-size:12px;color:#888;margin-bottom:8px">${taskCount} tasks · ${doneCount} done</div>
              ${group.tasks.slice(0, 5).map(t => `
                <div style="padding:4px 0;border-top:1px solid #eee;font-size:12px;display:flex;align-items:center;gap:6px">
                  <span style="width:8px;height:8px;border-radius:50%;background:${STATUS_DOTS[t.status] || '#888'};flex-shrink:0"></span>
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t.title)}</span>
                </div>
              `).join("")}
              ${taskCount > 5 ? `<div style="font-size:11px;color:#888;padding-top:4px">+${taskCount - 5} more</div>` : ""}
            </div>
          `;

          marker.bindPopup(popupContent, { maxWidth: 280 });
          marker.on("click", () => setSelectedLocation(group.name));
        });

        if (locationsWithCoords.length > 1) {
          const bounds = L.latLngBounds(locationsWithCoords.map(g => [g.lat!, g.lng!] as [number, number]));
          map.fitBounds(bounds, { padding: [50, 50] });
        }

        mapRef.current = map;
        setMapLoaded(true);
      } catch (err) {
        console.error("Failed to load map:", err);
      }
    };

    loadLeaflet();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapLoaded(false);
      }
    };
  }, [locationsWithCoords.length]);

  const selectedGroup = selectedLocation ? locationGroups.find(g => g.name === selectedLocation) : null;

  return (
    <div className="pb-8 px-2 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search locations or tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5" />
          <span>{locationGroups.filter(g => g.name !== "No Location").length} locations</span>
          <span className="text-border">·</span>
          <span>{tasks.filter(t => t.location).length}/{tasks.length} tasks mapped</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-4" style={{ height: "calc(100vh - 280px)" }}>
        <div className="border border-border rounded-xl overflow-hidden relative">
          {locationsWithCoords.length > 0 ? (
            <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: 400 }} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/20 text-muted-foreground">
              <MapPin className="w-12 h-12 mb-3 opacity-30" />
              <div className="text-sm font-medium mb-1">No mapped locations yet</div>
              <div className="text-xs max-w-xs text-center">Add location data to your tasks to see them on the map. Edit a task and set its location field.</div>
            </div>
          )}
        </div>

        <div className="border border-border rounded-xl overflow-y-auto bg-card/50">
          <div className="p-3 border-b border-border bg-secondary/30">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Locations</h3>
          </div>
          <div className="divide-y divide-border/30">
            {filteredGroups.map(group => {
              const doneCount = group.tasks.filter(t => t.status === "done").length;
              const totalCount = group.tasks.length;
              const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
              const hasBlocked = group.tasks.some(t => t.status === "blocked");
              const isSelected = selectedLocation === group.name;

              return (
                <div key={group.name}>
                  <button
                    onClick={() => setSelectedLocation(isSelected ? null : group.name)}
                    className={`w-full text-left p-3 hover:bg-white/[0.03] transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className={`w-3.5 h-3.5 ${group.name === "No Location" ? "text-muted-foreground" : "text-primary"}`} />
                      <span className="text-sm font-semibold flex-1 truncate">{group.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{totalCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${hasBlocked ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{progress}%</span>
                    </div>
                  </button>

                  {isSelected && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {group.tasks.map(t => {
                        const project = projects.find(p => p.id === t.projectId);
                        return (
                          <div key={t.id} onClick={() => onTaskClick(t)}
                            className="p-2.5 rounded-lg border border-border/50 hover:border-primary/30 cursor-pointer bg-secondary/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_DOTS[t.status] || "#888" }} />
                              <span className={`text-xs font-medium flex-1 truncate ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                              <span className="text-[10px]">{PRIORITY_ICONS[t.priority]}</span>
                            </div>
                            {(t.due || project) && (
                              <div className="flex items-center gap-2 mt-1 ml-4">
                                {project && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />{project.name}
                                  </span>
                                )}
                                {t.due && <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(t.due), "MMM d")}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredGroups.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No locations match your search</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
