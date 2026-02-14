import { useTranslation } from 'react-i18next';

interface LogoProps {
    className?: string;
    showText?: boolean;
    subText?: string;
}

export const Logo = ({
    className = "h-10",
    showText = true,
    subText
}: LogoProps) => {
    const { t } = useTranslation();
    const displaySubText = subText || t('logo.subText');
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {/* Symbol */}
            <svg
                viewBox="0 0 100 100"
                className="h-full w-auto drop-shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all duration-500 hover:scale-110"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#22d3ee" /> {/* Cyan 400 */}
                        <stop offset="100%" stopColor="#818cf8" /> {/* Indigo 400 */}
                    </linearGradient>
                </defs>

                {/* stylized Dynamic Chart Symbol */}
                <rect x="25" y="60" width="12" height="20" rx="3" fill="url(#logo-gradient)" opacity="0.5">
                    <animate attributeName="height" values="20;35;20" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="y" values="60;45;60" dur="2.5s" repeatCount="indefinite" />
                </rect>
                <rect x="45" y="40" width="12" height="40" rx="3" fill="url(#logo-gradient)" opacity="0.8">
                    <animate attributeName="height" values="40;60;40" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
                    <animate attributeName="y" values="40;20;40" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
                </rect>
                <rect x="65" y="20" width="12" height="60" rx="3" fill="url(#logo-gradient)">
                    <animate attributeName="height" values="60;75;60" dur="2.5s" repeatCount="indefinite" begin="1.6s" />
                    <animate attributeName="y" values="20;5;20" dur="2.5s" repeatCount="indefinite" begin="1.6s" />
                </rect>

                {/* Pulsing Connector */}
                <path
                    d="M31 60 L51 40 L71 20"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.2"
                />
            </svg>

            {/* Text Content */}
            {showText && (
                <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tighter leading-none bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
                        PlixMetrics
                    </span>
                    {displaySubText && (
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">
                            {displaySubText}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
