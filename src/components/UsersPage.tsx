import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/client';
import { useServers } from '../hooks/useServers';
import { UserTableItem } from '../types';
import { UserDetailsModal } from './UserDetailsModal';

interface ColumnConfig {
    id: keyof UserTableItem | 'last_streamed' | 'ip' | 'last_played' | 'plays' | 'duration' | 'server';
    label: string;
    visible: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: 'username', label: 'User', visible: true },
    { id: 'email', label: 'Email', visible: true },
    { id: 'server', label: 'Server', visible: false },
    { id: 'last_streamed', label: 'Last Streamed', visible: true },
    { id: 'ip', label: 'Last Known IP', visible: true },
    { id: 'platform', label: 'Last Platform', visible: true },
    { id: 'player', label: 'Last Player', visible: true },
    { id: 'last_played', label: 'Last Played', visible: true },
    { id: 'plays', label: 'Total Plays', visible: true },
    { id: 'duration', label: 'Total Played Duration', visible: true }
];

export const UsersPage = () => {
    const { servers } = useServers();
    const [selectedServerId, setSelectedServerId] = useState<string>(''); // Empty initially
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'last_streamed', direction: 'desc' });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowColumnSelector(false);
            }
        };

        if (showColumnSelector) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showColumnSelector]);

    // Set default server when servers load
    useMemo(() => {
        if (servers.length > 0 && selectedServerId === '') {
            setSelectedServerId(servers[0].id.toString());
        }
    }, [servers, selectedServerId]);

    // Update 'server' column visibility based on selectedServerId
    useMemo(() => {
        setColumns(prev => prev.map(col =>
            col.id === 'server'
                ? { ...col, visible: selectedServerId === 'all' }
                : col
        ));
    }, [selectedServerId]);

    // Fetch users
    const { data: users, isLoading, isFetching } = useQuery({
        queryKey: ['users', selectedServerId],
        queryFn: async () => {
            if (!selectedServerId) return [];
            const response = await usersApi.list(selectedServerId);
            return response.data as UserTableItem[];
        },
        enabled: !!selectedServerId, // Only fetch if we have a server ID
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    // Helper to format duration (seconds -> days hrs mins)
    const formatDuration = (seconds: number) => {
        if (!seconds) return '0 mins';
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);

        const parts = [];
        if (d > 0) parts.push(`${d} days`);
        if (h > 0) parts.push(`${h} hrs`);
        if (m > 0 || parts.length === 0) parts.push(`${m} mins`);

        return parts.join(' ');
    };

    // Helper for relative time
    const timeAgo = (timestamp: number) => {
        if (!timestamp) return 'Never';
        const seconds = Math.floor((Date.now() / 1000) - timestamp);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    // Filtered and Sorted data
    const sortedUsers = useMemo(() => {
        if (!users) return [];
        let data = [...users];

        // Filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            data = data.filter(user =>
                (user.username || '').toLowerCase().includes(lowerQuery) ||
                (user.friendly_name || '').toLowerCase().includes(lowerQuery) ||
                (user.email || '').toLowerCase().includes(lowerQuery) ||
                (user.last_played && user.last_played.toLowerCase().includes(lowerQuery))
            );
        }

        // Sort
        if (sortConfig) {
            data.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof UserTableItem];
                let bValue: any = b[sortConfig.key as keyof UserTableItem];

                // Handle special cases or defaults
                if (sortConfig.key === 'last_streamed') {
                    aValue = a.last_seen;
                    bValue = b.last_seen;
                } else if (sortConfig.key === 'plays') {
                    aValue = a.total_plays;
                    bValue = b.total_plays;
                } else if (sortConfig.key === 'duration') {
                    aValue = a.total_duration;
                    bValue = b.total_duration;
                } else if (sortConfig.key === 'username') {
                    aValue = a.friendly_name || a.username || a.email;
                    bValue = b.friendly_name || b.username || b.email;
                } else if (sortConfig.key === 'server') {
                    aValue = a.server_name;
                    bValue = b.server_name;
                }

                if (aValue === undefined || aValue === null) aValue = '';
                if (bValue === undefined || bValue === null) bValue = '';

                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [users, searchQuery, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev && prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' }; // Default to desc for new sort
        });
    };

    const toggleColumn = (id: string) => {
        setColumns(prev => prev.map(col =>
            col.id === id ? { ...col, visible: !col.visible } : col
        ));
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="relative z-20 bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Users
                    </h1>

                    {/* Server Selector */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                value={selectedServerId}
                                onChange={(e) => setSelectedServerId(e.target.value)}
                                className="bg-slate-700/50 border border-slate-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 pr-8 appearance-none"
                            >
                                <option value="all">All Servers</option>
                                {servers.map(server => (
                                    <option key={server.id} value={server.id.toString()}>
                                        {server.name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                        {isFetching && !isLoading && (
                            <div className="text-cyan-400 animate-spin" title="Updating...">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="bg-slate-700/50 border border-slate-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 p-2.5"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Column Selector */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                            className="text-white bg-slate-700 hover:bg-slate-800 focus:ring-4 focus:outline-none focus:ring-slate-300 font-medium rounded-lg text-sm px-4 py-2.5 text-center inline-flex items-center border border-slate-600"
                        >
                            Select columns
                            <svg className="w-2.5 h-2.5 ml-2.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
                            </svg>
                        </button>

                        {showColumnSelector && (
                            <div className="z-50 absolute right-0 top-full mt-2 bg-slate-800 divide-y divide-slate-700 rounded-lg shadow-lg w-48 border border-slate-600">
                                <ul className="p-3 space-y-2 text-sm text-slate-200">
                                    {columns.map(col => (
                                        <li key={col.id}>
                                            <div className="flex items-center">
                                                <input
                                                    id={`checkbox-${col.id}`}
                                                    type="checkbox"
                                                    checked={col.visible}
                                                    onChange={() => toggleColumn(col.id as string)}
                                                    className="w-4 h-4 text-cyan-600 bg-slate-700 border-slate-500 rounded focus:ring-cyan-500 focus:ring-2"
                                                />
                                                <label htmlFor={`checkbox-${col.id}`} className="ml-2 text-sm font-medium text-slate-300 cursor-pointer">
                                                    {col.label}
                                                </label>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="relative z-10 bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left text-slate-400">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                            <tr>
                                {columns.map(col => col.visible && (
                                    <th
                                        key={col.id}
                                        scope="col"
                                        className="px-3 py-2 font-bold tracking-wider cursor-pointer hover:bg-slate-800 hover:text-cyan-400 transition-colors select-none"
                                        onClick={() => handleSort(col.id)}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {sortConfig?.key === col.id && (
                                                <svg className={`w-3 h-3 transition-transform ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            )}
                                            {sortConfig?.key !== col.id && (
                                                <svg className="w-3 h-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                                </svg>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={columns.filter(c => c.visible).length} className="px-6 py-8 text-center text-slate-500">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400 mb-2"></div>
                                        <p>Loading users...</p>
                                    </td>
                                </tr>
                            ) : sortedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.filter(c => c.visible).length} className="px-6 py-8 text-center text-slate-500">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                sortedUsers.map((user) => (
                                    <tr key={user.user_id} className="bg-transparent border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">

                                        {/* User & Avatar */}
                                        {columns.find(c => c.id === 'username')?.visible && (
                                            <td
                                                className="px-3 py-2 font-medium text-white whitespace-nowrap flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 transition-colors group"
                                                onClick={() => setSelectedUser(user.username || user.friendly_name || user.email)}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm group-hover:text-cyan-400 transition-colors">{user.friendly_name || user.username}</span>
                                                    <span className="text-[10px] text-slate-500 group-hover:text-cyan-500/70">{user.username}</span>
                                                </div>
                                            </td>
                                        )}

                                        {/* Email */}
                                        {columns.find(c => c.id === 'email')?.visible && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {user.email}
                                            </td>
                                        )}

                                        {/* Server */}
                                        {columns.find(c => c.id === 'server')?.visible && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-900/50">
                                                    {user.server_name}
                                                </span>
                                            </td>
                                        )}

                                        {/* Last Streamed */}
                                        {columns.find(c => c.id === 'last_streamed')?.visible && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {timeAgo(user.last_seen)}
                                            </td>
                                        )}

                                        {/* IP */}
                                        {columns.find(c => c.id === 'ip')?.visible && (
                                            <td className="px-3 py-2 whitespace-nowrap font-mono text-[10px] text-slate-300">
                                                {user.ip_address || '-'}
                                            </td>
                                        )}

                                        {/* Platform */}
                                        {columns.find(c => c.id === 'platform')?.visible && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {user.platform || '-'}
                                            </td>
                                        )}

                                        {/* Player */}
                                        {columns.find(c => c.id === 'player')?.visible && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {user.player || '-'}
                                            </td>
                                        )}

                                        {/* Last Played */}
                                        {columns.find(c => c.id === 'last_played')?.visible && (
                                            <td className="px-3 py-2 whitespace-nowrap" title={user.last_played}>
                                                {user.last_played || '-'}
                                            </td>
                                        )}

                                        {/* Total Plays */}
                                        {columns.find(c => c.id === 'plays')?.visible && (
                                            <td className="px-3 py-2 whitespace-nowrap font-mono">
                                                {user.total_plays}
                                            </td>
                                        )}

                                        {/* Duration */}
                                        {columns.find(c => c.id === 'duration')?.visible && (
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {formatDuration(user.total_duration)}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination Placeholder */}
                <div className="px-6 py-4 bg-slate-900/30 border-t border-slate-700 flex justify-between items-center text-xs text-slate-500">
                    <span>Showing {sortedUsers.length} users</span>
                    {/* Add pagination controls here if needed */}
                </div>
            </div>

            {/* User Details Modal */}
            {selectedUser && (
                <UserDetailsModal
                    username={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
};
