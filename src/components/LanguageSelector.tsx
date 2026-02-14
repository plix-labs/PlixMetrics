import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
    { code: 'en', label: 'EN', countryCode: 'gb' },
    { code: 'es', label: 'ES', countryCode: 'es' },
    { code: 'fr', label: 'FR', countryCode: 'fr' },
    { code: 'pt', label: 'PT', countryCode: 'pt' },
    { code: 'de', label: 'DE', countryCode: 'de' },
    { code: 'ru', label: 'RU', countryCode: 'ru' },
    { code: 'zh', label: 'ZH', countryCode: 'cn' }
];

const FlagIcon = ({ lang }: { lang: typeof languages[0] }) => {
    if (lang.code === 'en') {
        return (
            <div className="relative w-6 h-4 rounded shadow-sm overflow-hidden">
                <img
                    src="https://flagcdn.com/w40/us.png"
                    alt="US"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
                />
                <img
                    src="https://flagcdn.com/w40/gb.png"
                    alt="GB"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                />
            </div>
        );
    }
    return (
        <img
            src={`https://flagcdn.com/w40/${lang.countryCode}.png`}
            alt={lang.label}
            className="w-6 h-4 object-cover rounded shadow-sm"
        />
    );
};

export const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const current = languages.find(l => l.code === i18n.language?.substring(0, 2)) || languages[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const changeLanguage = (code: string) => {
        i18n.changeLanguage(code);
        setOpen(false);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(!open)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center justify-center font-bold text-sm"
                title={current.label}
            >
                {current.label}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50 min-w-[60px]">
                    {languages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`w-full px-3 py-2 flex justify-center items-center transition-colors ${current.code === lang.code
                                ? 'bg-cyan-500/10'
                                : 'hover:bg-slate-700/50'
                                }`}
                            title={lang.label}
                        >
                            <FlagIcon lang={lang} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
