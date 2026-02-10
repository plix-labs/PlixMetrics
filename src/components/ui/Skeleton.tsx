import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
    const baseClasses = "animate-pulse bg-slate-700/50";
    const variantClasses = {
        text: "rounded h-4 w-full",
        circular: "rounded-full",
        rectangular: "rounded-lg"
    };

    return (
        <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}></div>
    );
};
