import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

const data = [
    { hour: '00:00', value: 12 },
    { hour: '01:00', value: 8 },
    { hour: '02:00', value: 4 },
    { hour: '03:00', value: 2 },
    { hour: '04:00', value: 1 },
    { hour: '05:00', value: 0 },
    { hour: '06:00', value: 1 },
    { hour: '07:00', value: 3 },
    { hour: '08:00', value: 5 },
    { hour: '09:00', value: 4 },
    { hour: '10:00', value: 6 },
    { hour: '11:00', value: 8 },
    { hour: '12:00', value: 10 },
    { hour: '13:00', value: 12 },
    { hour: '14:00', value: 11 },
    { hour: '15:00', value: 14 },
    { hour: '16:00', value: 18 },
    { hour: '17:00', value: 25 },
    { hour: '18:00', value: 32 },
    { hour: '19:00', value: 45 },
    { hour: '20:00', value: 58 },
    { hour: '21:00', value: 52 },
    { hour: '22:00', value: 40 },
    { hour: '23:00', value: 25 },
];

export const HourlyActivityChart: React.FC = () => {
    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
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
                        interval={2}
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
