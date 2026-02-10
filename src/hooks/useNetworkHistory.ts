import { useState, useEffect } from 'react';
import { NetworkStatus } from '../types';

export interface HistoryPoint {
    time: string;
    bandwidth: number;
    streams: number;
}

export const useNetworkHistory = (currentData: NetworkStatus | null) => {
    const [history, setHistory] = useState<HistoryPoint[]>([]);

    // Use stable values to prevent infinite loop
    const bandwidth = currentData?.total_bandwidth ?? 0;
    const streamCount = currentData?.total_stream_count ?? 0;

    useEffect(() => {
        if (!currentData) return;

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setHistory(prev => {
            // Don't add duplicate points (same bandwidth and streams)
            const lastPoint = prev[prev.length - 1];
            const newBandwidth = bandwidth / 1000; // Convert to Mbps

            if (lastPoint &&
                lastPoint.bandwidth === newBandwidth &&
                lastPoint.streams === streamCount) {
                return prev; // Skip duplicate
            }

            const newPoint: HistoryPoint = {
                time: timeString,
                bandwidth: newBandwidth,
                streams: streamCount
            };

            // Keep last 90 points (15 minutes with 10s poll)
            const newHistory = [...prev, newPoint];
            if (newHistory.length > 90) return newHistory.slice(newHistory.length - 90);
            return newHistory;
        });
    }, [bandwidth, streamCount]); // Stable primitive dependencies

    return history;
};
