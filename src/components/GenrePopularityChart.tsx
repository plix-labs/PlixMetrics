import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

const data = [
    { subject: 'Action', A: 120, fullMark: 150 },
    { subject: 'Sci-Fi', A: 98, fullMark: 150 },
    { subject: 'Drama', A: 86, fullMark: 150 },
    { subject: 'Comedy', A: 99, fullMark: 150 },
    { subject: 'Horror', A: 85, fullMark: 150 },
    { subject: 'Animation', A: 65, fullMark: 150 },
];

export const GenrePopularityChart: React.FC = () => {
    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 150]}
                        tick={false}
                        axisLine={false}
                    />
                    <Radar
                        name="New Views"
                        dataKey="A"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        fill="#f43f5e"
                        fillOpacity={0.5}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            color: '#e2e8f0',
                            borderRadius: '8px',
                        }}
                        itemStyle={{ color: '#f43f5e' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
