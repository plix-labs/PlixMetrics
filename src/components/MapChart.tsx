import React, { useMemo } from "react";
import {
    ComposableMap,
    Geographies,
    Geography,
    Marker,
    Sphere,
    Graticule,
    ZoomableGroup
} from "react-simple-maps";
import { ActiveSession } from "../types";

// Higher detail world atlas (includes provinces/states where available in common TopoJSON sources)
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

interface MapChartProps {
    sessions: ActiveSession[];
}

// Helper for stable random jitter based on ID
const getJitter = (id: string, intensity = 0.3) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latJitter = ((hash & 0xFF) / 255 - 0.5) * intensity;
    const lonJitter = (((hash >> 8) & 0xFF) / 255 - 0.5) * intensity;
    return [latJitter, lonJitter];
};

const MapChart: React.FC<MapChartProps> = ({ sessions }) => {
    const validSessions = useMemo(() => {
        return sessions.filter(s =>
            s.latitude !== undefined &&
            s.longitude !== undefined &&
            !isNaN(s.latitude) &&
            !isNaN(s.longitude)
        );
    }, [sessions]);

    // Calculate center and zoom based on points
    const { center, zoom } = useMemo(() => {
        if (validSessions.length === 0) {
            return { center: [0, 20] as [number, number], zoom: 1 };
        }

        const lats = validSessions.map(s => s.latitude!);
        const lons = validSessions.map(s => s.longitude!);

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);

        const avgLat = (minLat + maxLat) / 2;
        const avgLon = (minLon + maxLon) / 2;

        // Calculate spread to determine zoom
        const latRange = maxLat - minLat;
        const lonRange = maxLon - minLon;
        const maxRange = Math.max(latRange, lonRange);

        // Deeper zoom levels
        let z = 1;
        if (maxRange < 2) z = 18;       // Very deep zoom for single city
        else if (maxRange < 5) z = 12;  // Region zoom
        else if (maxRange < 15) z = 7;  // Country zoom
        else if (maxRange < 40) z = 4;
        else if (maxRange < 90) z = 2;

        return { center: [avgLon, avgLat] as [number, number], zoom: z };
    }, [validSessions]);

    const [tooltip, setTooltip] = React.useState<{
        user: string;
        server: string;
    } | null>(null);

    return (
        <div className="w-full h-full relative group">
            <ComposableMap
                projectionConfig={{
                    rotate: [-10, 0, 0],
                    scale: 147
                }}
                style={{ width: "100%", height: "100%" }}
            >
                <ZoomableGroup center={center} zoom={zoom} filterZoomEvent={() => true}>
                    <Sphere stroke="#1e293b" strokeWidth={0.3} id="sphere" fill="transparent" />
                    <Graticule stroke="#1e293b" strokeWidth={0.3} />
                    <Geographies geography={geoUrl}>
                        {({ geographies }: { geographies: any[] }) =>
                            geographies.map((geo) => (
                                <Geography
                                    key={geo.rsmKey}
                                    geography={geo}
                                    fill="#101827" // Darker land
                                    stroke="#1e293b" // Borders
                                    strokeWidth={0.4}
                                    style={{
                                        default: { outline: "none" },
                                        hover: { fill: "#1e293b", outline: "none" },
                                        pressed: { outline: "none" },
                                    }}
                                />
                            ))
                        }
                    </Geographies>
                    {validSessions.map((session) => {
                        const [latJitter, lonJitter] = getJitter(session.session_id, 0.2);
                        return (
                            <Marker
                                key={session.session_id}
                                coordinates={[session.longitude! + lonJitter, session.latitude! + latJitter]}
                                onMouseEnter={() => {
                                    setTooltip({
                                        user: session.user,
                                        server: session.server_name || 'Unknown'
                                    });
                                }}
                                onMouseLeave={() => {
                                    setTooltip(null);
                                }}
                                style={{
                                    default: { outline: "none", cursor: "pointer" },
                                    hover: { outline: "none", cursor: "pointer" },
                                    pressed: { outline: "none", cursor: "pointer" }
                                }}
                            >
                                {/* Ultra-small precise dots for high zoom levels */}
                                <circle r={0.4} fill="#22d3ee" />
                                <circle r={0.8} fill="#22d3ee" fillOpacity={0.3} className="animate-pulse" />
                                {/* Minimal Ping effect */}
                                <circle r={1.2} fill="#22d3ee" fillOpacity={0.15} className="animate-ping" style={{ animationDuration: '3s' }} />
                            </Marker>
                        );
                    })}
                </ZoomableGroup>
            </ComposableMap>

            {tooltip && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl px-4 py-2 pointer-events-none transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="text-sm font-semibold text-slate-100 whitespace-nowrap flex items-center gap-2">
                            <span className="text-cyan-400">User:</span>
                            {tooltip.user}
                        </div>
                        <div className="w-px h-4 bg-slate-700"></div>
                        <div className="text-sm text-slate-300 whitespace-nowrap flex items-center gap-2">
                            <span className="text-slate-500">Server:</span>
                            {tooltip.server}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapChart;
