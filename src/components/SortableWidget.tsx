import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableWidgetProps {
    id: string;
    children: React.ReactNode;
}

export const SortableWidget: React.FC<SortableWidgetProps> = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none' // Important for touch devices if we want to allow scrolling elsewhere
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none select-none cursor-grab active:cursor-grabbing">
            {children}
        </div>
    );
};
