import React from 'react';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoryPoint } from '../hooks/useNetworkHistory';

interface BandwidthChartProps {
    data: HistoryPoint[];
}

export const BandwidthChart: React.FC<BandwidthChartProps> = ({ data }) => {
    const { t } = useTranslation();
    if (data.length < 2) return <div className="h-full flex items-center justify-center text-slate-500 text-sm">{t('charts.waitingForData')}</div>;

    // Custom dot for the last data point (Scanning effect)
    const renderDot = (props: any) => {
        const { cx, cy, index } = props;
        if (index === data.length - 1) {
            return (
                <svg x={cx - 10} y={cy - 10} width={20} height={20} className="overflow-visible" key={index}>
                    <circle cx="10" cy="10" r="4" fill="#06b6d4" stroke="#fff" strokeWidth={2} />
                    <circle cx="10" cy="10" r="8" fill="#06b6d4" fillOpacity={0.4} className="animate-ping" style={{ transformOrigin: 'center' }} />
                </svg>
            );
        }
        return <g key={index} />;
    };

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 0,
                        left: 0,
                        bottom: 0,
                    }}
                >
                    <defs>
                        <linearGradient id="colorBandwidth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis
                        dataKey="time"
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={40}
                    />
                    <YAxis
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value} M`}
                        domain={[0, (data: number) => Math.ceil(data * 1.2)]}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                        itemStyle={{ color: '#22d3ee' }}
                        formatter={(value: number) => [`${value.toFixed(1)} Mbps`, t('charts.bandwidth')]}
                        labelStyle={{ color: '#94a3b8' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="bandwidth"
                        stroke="#06b6d4"
                        fillOpacity={1}
                        fill="url(#colorBandwidth)"
                        strokeWidth={2}
                        isAnimationActive={false}
                        dot={renderDot}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
