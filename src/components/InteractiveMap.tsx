import React, { useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { ActiveSession } from '../types';
import { usePrivacy } from '../lib/privacy';

interface InteractiveMapProps {
    sessions: ActiveSession[];
    enableClustering?: boolean;
    onUserClick?: (username: string) => void;
}

// Component to handle auto-zooming to fit markers
const AutoZoom = ({ sessions }: { sessions: ActiveSession[] }) => {
    const map = useMap();
    const hasZoomed = useRef(false);

    useEffect(() => {
        // Only zoom if we have sessions and haven't zoomed automatically yet
        // Resetting hasZoomed if sessions drop to 0 could be an option, but we stick to "initial" behavior per request.
        if (sessions.length > 0 && !hasZoomed.current) {
            const points = sessions.map(s => [s.latitude!, s.longitude!] as [number, number]);
            const bounds = L.latLngBounds(points);

            if (sessions.length === 1) {
                // If only one session, zoom to a reasonable regional level (State/Country view)
                // User asked for "greater initial zoom", so 6 or 7 is better than world view 3.
                map.setView(points[0], 6, { animate: true });
            } else {
                // Fit all points
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10, animate: true });
            }
            hasZoomed.current = true;
        }
    }, [sessions, map]);

    return null;
};

// Custom Zoom Control component
const CustomZoomControl = () => {
    const map = useMap();

    return (
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2"> {/* z-[400] to match Leaflet controls z-index range */}
            <button
                onClick={() => map.zoomIn()}
                className="w-9 h-9 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl text-cyan-400 hover:bg-cyan-500 hover:text-white hover:border-cyan-400 transition-all shadow-xl flex items-center justify-center group"
                title="Zoom In"
                aria-label="Zoom In"
            >
                <svg className="w-5 h-5 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </button>
            <button
                onClick={() => map.zoomOut()}
                className="w-9 h-9 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl text-cyan-400 hover:bg-cyan-500 hover:text-white hover:border-cyan-400 transition-all shadow-xl flex items-center justify-center group"
                title="Zoom Out"
                aria-label="Zoom Out"
            >
                <svg className="w-5 h-5 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                </svg>
            </button>
        </div>
    );
};

// Custom pulsing icon using Tailwind classes - Enhanced Neon Look
const createPulsingIcon = () => {
    return L.divIcon({
        className: 'bg-transparent',
        html: `
            <div class="relative flex items-center justify-center w-5 h-5 -ml-2.5 -mt-2.5 group cursor-pointer">
                <!-- Outer ping animation - Slower duration (3s) -->
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-25" style="animation-duration: 3s;"></span>
                
                <!-- Static Glow (Halo) -->
                <span class="absolute inline-flex h-3 w-3 rounded-full bg-cyan-400 opacity-40 blur-[1.5px]"></span>
                
                <!-- Core Dot -->
                <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)] transition-transform duration-300 group-hover:scale-125"></span>
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10], // Center the icon
    });
};

// Custom cluster icon matching the theme with pulsing effect - Enhanced Glassmorphism
const createClusterCustomIcon = (cluster: any) => {
    const count = cluster.getChildCount();
    let size = 'w-8 h-8'; // Smaller base size
    let textSize = 'text-xs'; // Smaller font

    if (count > 10) {
        size = 'w-10 h-10';
        textSize = 'text-sm';
    }
    if (count > 50) {
        size = 'w-12 h-12';
        textSize = 'text-base';
    }

    return L.divIcon({
        html: `
            <div class="relative flex items-center justify-center w-full h-full group cursor-pointer">
                 <!-- Outer Ripple -->
                 <span class="absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-20 animate-ping" style="animation-duration: 2s;"></span>
                 <span class="absolute inline-flex h-[115%] w-[115%] rounded-full bg-cyan-400/10 animate-pulse"></span>

                 <!-- Glass Core - Full Cyan Text and Border -->
                 <div class="relative flex items-center justify-center ${size} rounded-full bg-slate-900/80 border-2 border-cyan-400 text-cyan-400 font-bold shadow-[0_0_15px_rgba(34,211,238,0.3)] backdrop-blur-md transition-all duration-300 transform group-hover:scale-110 group-hover:border-cyan-300 group-hover:text-cyan-300 group-hover:shadow-[0_0_25px_rgba(34,211,238,0.6)]">
                      <span class="${textSize} drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">${count}</span>
                 </div>
            </div>
        `,
        className: 'custom-marker-cluster',
        iconSize: L.point(40, 40, true), // Keep anchor stable
    });
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({ sessions, enableClustering = true, onUserClick }) => {
    const { anonymizeUser, anonymizeServer } = usePrivacy();
    // Filter valid sessions
    const validSessions = useMemo(() => {
        return sessions.filter(s =>
            s.latitude !== undefined &&
            s.longitude !== undefined &&
            !isNaN(s.latitude) &&
            !isNaN(s.longitude)
        );
    }, [sessions]);

    // Calculate center
    const defaultCenter: [number, number] = [40.4168, -3.7038]; // Madrid/Spain default center
    const center: [number, number] = validSessions.length > 0
        ? [validSessions[0].latitude!, validSessions[0].longitude!]
        : defaultCenter;

    // Jitter helper to avoid overlapping markers
    const getJitteredPosition = (lat: number, lon: number, index: number) => {
        const jitterAmount = 0.0001 * (index % 5);
        return [lat + jitterAmount, lon + jitterAmount] as [number, number];
    };

    return (
        <MapContainer
            center={center}
            zoom={3}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%", background: '#0f172a' }}
            zoomControl={false}
            attributionControl={false}
            minZoom={3}
            maxZoom={12} // Limit zoom to population/city level approx
        >
            <AutoZoom sessions={validSessions} />
            <CustomZoomControl />

            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                subdomains="abcd"
                maxZoom={20}
            />

            {enableClustering ? (
                <MarkerClusterGroup
                    chunkedLoading
                    iconCreateFunction={createClusterCustomIcon}
                    maxClusterRadius={35} // Reduced radius to show more groups/points
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={false} // Cleaner look
                >
                    {validSessions.map((session, idx) => (
                        <Marker
                            key={session.session_id}
                            position={getJitteredPosition(session.latitude!, session.longitude!, idx)}
                            icon={createPulsingIcon()}
                        >
                            <Popup
                                closeButton={false}
                                className="custom-popup"
                            >
                                <div className="bg-slate-800 text-slate-200 p-2 rounded-lg border border-slate-700 shadow-xl w-max max-w-[200px]">
                                    <div
                                        className={`font-bold text-cyan-400 text-sm mb-1 truncate ${onUserClick ? 'cursor-pointer hover:text-cyan-300 hover:underline' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent map click
                                            if (onUserClick) onUserClick(session.user);
                                        }}
                                    >
                                        {anonymizeUser(session.user)}
                                    </div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium truncate">
                                        {anonymizeServer(session.server_name || 'Unknown Server')}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            ) : (
                validSessions.map((session, idx) => (
                    <Marker
                        key={session.session_id}
                        position={getJitteredPosition(session.latitude!, session.longitude!, idx)}
                        icon={createPulsingIcon()}
                    >
                        <Popup
                            closeButton={false}
                            className="custom-popup"
                        >
                            <div className="bg-slate-800 text-slate-200 p-2 rounded-lg border border-slate-700 shadow-xl w-max max-w-[200px]">
                                <div
                                    className={`font-bold text-cyan-400 text-sm mb-1 truncate ${onUserClick ? 'cursor-pointer hover:text-cyan-300 hover:underline' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent map click
                                        if (onUserClick) onUserClick(session.user);
                                    }}
                                >
                                    {anonymizeUser(session.user)}
                                </div>
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium truncate">
                                    {anonymizeServer(session.server_name || 'Unknown Server')}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))
            )}

            <style>{`
                .leaflet-popup-content-wrapper, .leaflet-popup-tip {
                    background: transparent;
                    box-shadow: none;
                    padding: 0;
                }
                .leaflet-popup-content {
                    margin: 0;
                }
                .custom-marker-cluster {
                    background: transparent;
                    border: none;
                }
            `}</style>
        </MapContainer>
    );
};

export default InteractiveMap;
