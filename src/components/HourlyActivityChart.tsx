import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

interface HourlyActivityChartProps {
    data?: { hour: number; plays: number }[];
}

export const HourlyActivityChart: React.FC<HourlyActivityChartProps> = ({ data }) => {
    const { t } = useTranslation();
    // Transform data for chart if valid, otherwise use empty or mock
    const chartData = data ? data.map(item => ({
        hour: `${item.hour.toString().padStart(2, '0')}:00`,
        value: item.plays
    })) : [
        // Mock data as fallback (or remove if preferred)
        { hour: '00:00', value: 0 },
        { hour: '06:00', value: 0 },
        { hour: '12:00', value: 0 },
        { hour: '18:00', value: 0 },
    ];

    if (data && data.length === 0) {
        // If data is provided but empty, show empty chart structure
    }

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                        dataKey="hour"
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        interval={data ? 3 : 2} // Adjust interval based on data density
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
                        itemStyle={{ color: '#06b6d4' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        name={t('charts.plays')}
                        stroke="#06b6d4"
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        strokeWidth={2}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
