
import { useState, useEffect } from 'react';

const ADJECTIVES = [
    'Happy', 'Sleepy', 'Grumpy', 'Dopey', 'Sneezy', 'Bashful', 'Doc',
    'Swift', 'Chrome', 'Golden', 'Silver', 'Arctic', 'Mystic', 'Hidden',
    'Secret', 'Silent', 'Dancing', 'Flying', 'Sneaky', 'Brave',
    'Lucky', 'Fancy', 'Jolly', 'Merry', 'Quiet', 'Candid', 'Epic'
];

const ANIMALS = [
    'Panda', 'Koala', 'Tiger', 'Lion', 'Eagle', 'Dolphin', 'Wolf',
    'Fox', 'Bear', 'Rabbit', 'Otter', 'Penguin', 'Owl', 'Cat', 'Dog',
    'Lynx', 'Falcon', 'Shark', 'Seal', 'Deer', 'Horse', 'Zebra'
];

const PLANETS = [
    'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
    'Ceres', 'Eris', 'Haumea', 'Makemake', 'Pluto', 'Titan', 'Europa'
];

const SERVER_PREFIXES = [
    'Cloud', 'Data', 'Media', 'Net', 'Plex', 'Node', 'Core', 'Link',
    'Vault', 'Ark', 'Zenith', 'Nexus', 'Horizon', 'Portal'
];

const SERVER_SUFFIXES = [
    'Prime', 'One', 'Server', 'Host', 'Base', 'Station', 'Hub',
    'System', 'Matrix', 'Lab', 'Vault', 'Center'
];

/**
 * Generates a deterministic hash from a string
 */
const hashString = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

/**
 * Anonymizes a user name deterministically
 */
export const anonymizeUser = (name: string): string => {
    if (!name) return 'Anonymous';
    const hash = hashString(name);
    const adj = ADJECTIVES[hash % ADJECTIVES.length];
    const animal = ANIMALS[hash % ANIMALS.length];
    return `${adj} ${animal}`;
};

/**
 * Anonymizes a server name deterministically
 */
export const anonymizeServer = (name: string): string => {
    if (!name) return 'Unknown Server';
    const hash = hashString(name);

    // 50% chance of Prefix + Planet vs Prefix + Suffix
    if (hash % 2 === 0) {
        const prefix = SERVER_PREFIXES[hash % SERVER_PREFIXES.length];
        const planet = PLANETS[hash % PLANETS.length];
        return `${prefix} ${planet}`;
    } else {
        const prefix = SERVER_PREFIXES[hash % SERVER_PREFIXES.length];
        const suffix = SERVER_SUFFIXES[hash % SERVER_SUFFIXES.length];
        return `${prefix} ${suffix}`;
    }
};

/**
 * Privacy context/state management
 */
const PRIVACY_MODE_KEY = 'plix_privacy_mode';

export const isPrivacyModeEnabled = (): boolean => {
    return localStorage.getItem(PRIVACY_MODE_KEY) === 'true';
};

export const setPrivacyModeState = (enabled: boolean): void => {
    localStorage.setItem(PRIVACY_MODE_KEY, String(enabled));
    window.dispatchEvent(new Event('privacy_mode_changed'));
};

export const usePrivacy = () => {
    const [privacyMode, setPrivacyMode] = useState(isPrivacyModeEnabled());

    useEffect(() => {
        const handler = () => {
            setPrivacyMode(isPrivacyModeEnabled());
        };
        window.addEventListener('privacy_mode_changed', handler);
        return () => window.removeEventListener('privacy_mode_changed', handler);
    }, []);

    const togglePrivacyMode = () => {
        setPrivacyModeState(!privacyMode);
    };

    return {
        privacyMode,
        togglePrivacyMode,
        anonymizeUser: (name: string) => privacyMode ? anonymizeUser(name) : name,
        anonymizeServer: (name: string) => privacyMode ? anonymizeServer(name) : name,
    };
};
