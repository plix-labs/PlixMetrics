import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';

interface PlaybackHealthChartProps {
    data?: { name: string; value: number; color?: string }[];
}

export const PlaybackHealthChart: React.FC<PlaybackHealthChartProps> = ({ data }) => {

    // Fallback data
    const chartData = (data && data.length > 0) ? data : [
        { name: 'Direct Play', value: 65, color: '#10b981' }, // Emerald
        { name: 'Direct Stream', value: 25, color: '#3b82f6' }, // Blue
        { name: 'Transcode (Video)', value: 8, color: '#f59e0b' }, // Amber
        { name: 'Transcode (Audio)', value: 2, color: '#ef4444' }, // Red
    ];

    return (
        <div className="w-full h-[300px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            color: '#e2e8f0',
                            borderRadius: '8px',
                        }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value: number) => [value, 'Sessions']}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value, _) => <span className="text-slate-300 ml-1">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
