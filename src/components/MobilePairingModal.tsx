import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface MobilePairingModalProps {
    onClose: () => void;
}

interface NetworkInfo {
    localIp: string | null;
    publicIp: string | null;
    port: number;
}

export const MobilePairingModal = ({ onClose }: MobilePairingModalProps) => {
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
    const [viewMode, setViewMode] = useState<'local' | 'public'>('local');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const { data } = await axios.get('/api/config/info');
                setNetworkInfo(data);
            } catch (error) {
                console.error('Failed to fetch network info', error);
            } finally {
                setLoading(false);
            }
        };
        fetchInfo();
    }, []);

    const protocol = window.location.protocol;
    const port = window.location.port || (protocol === 'https:' ? '443' : '80');

    const localUrl = networkInfo?.localIp
        ? `${protocol}//${networkInfo.localIp}:${port}`
        : window.location.origin;

    const publicUrl = networkInfo?.publicIp
        ? `${protocol}//${networkInfo.publicIp}:${port}`
        : null;

    const currentUrl = viewMode === 'local' ? localUrl : (publicUrl || 'Public IP unavailable');
    const canSwitch = !!publicUrl;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="space-y-2">
                        <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Pair Mobile Device</h2>

                        {/* Toggle Buttons */}
                        <div className="flex bg-slate-800 p-1 rounded-lg mx-auto w-fit">
                            <button
                                onClick={() => setViewMode('local')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'local'
                                        ? 'bg-cyan-500 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                Local Network
                            </button>
                            <button
                                onClick={() => setViewMode('public')}
                                disabled={!canSwitch}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'public'
                                        ? 'bg-cyan-500 text-white shadow-md'
                                        : 'text-slate-400 hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed'
                                    }`}
                                title={!canSwitch ? "Public IP not found" : ""}
                            >
                                Public (Internet)
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-lg relative min-h-[232px] flex items-center justify-center transition-all duration-300">
                        {loading ? (
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
                        ) : (
                            <QRCodeSVG
                                value={currentUrl}
                                size={200}
                                level="H"
                                includeMargin={false}
                            />
                        )}
                    </div>

                    <div className="space-y-4 w-full">
                        <p className="text-xs text-slate-500">
                            Server Address: <span className="font-mono text-cyan-500/70 select-all">{currentUrl}</span>
                        </p>
                        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 text-xs text-slate-300 text-left">
                            <ol className="list-decimal pl-4 space-y-1">
                                <li>Ensure your phone is on the <strong>{viewMode === 'local' ? 'same Wi-Fi' : 'internet'}</strong></li>
                                <li>Scan the code above 📷</li>
                                {viewMode === 'public' && (
                                    <li className="text-amber-400">Requires port {port} forwarding!</li>
                                )}
                                <li><strong>Add to Home Screen</strong> for app experience</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
