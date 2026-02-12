import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

interface LibraryQualityChartProps {
    data?: { name: string; '4K': number; '1080p': number; '720p': number; 'SD': number }[];
}

export const LibraryQualityChart: React.FC<LibraryQualityChartProps> = ({ data }) => {

    // Use data from props, ensure Movies are real. Inject WIP TV Shows if missing or empty.
    const chartData = (data && data.length > 0) ? [...data] : [];

    // Check if TV Shows exists, if not adds a placeholder with WIP label
    if (!chartData.find(d => d.name.includes('TV Shows'))) {
        chartData.push({
            name: 'TV Shows 🚧 (WIP)',
            '4K': 100,
            '1080p': 1500, // Mock value
            '720p': 300,
            'SD': 100
        });
    }

    return (
        <div className="w-full h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fontSize: 13 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            color: '#e2e8f0',
                            borderRadius: '8px',
                        }}
                        cursor={{ fill: '#334155', opacity: 0.2 }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value, _) => <span className="text-slate-300 ml-1">{value}</span>}
                    />
                    <Bar dataKey="4K" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="1080p" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="720p" stackId="a" fill="#06b6d4" />
                    <Bar dataKey="SD" stackId="a" fill="#64748b" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
