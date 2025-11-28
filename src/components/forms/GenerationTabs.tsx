'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
    PhotoIcon,
    VideoCameraIcon,
    MicrophoneIcon,
    MusicalNoteIcon
} from '@heroicons/react/24/outline';

export type GenerationMode = 'image' | 'video' | 'voiceover' | 'music';

interface GenerationTabsProps {
    activeMode: GenerationMode;
    onModeChange: (mode: GenerationMode) => void;
}

export default function GenerationTabs({ activeMode, onModeChange }: GenerationTabsProps) {
    const tabs: { id: GenerationMode; label: string; icon: React.ElementType }[] = [
        { id: 'image', label: 'Image', icon: PhotoIcon },
        { id: 'video', label: 'Video', icon: VideoCameraIcon },
        { id: 'voiceover', label: 'Voiceover', icon: MicrophoneIcon },
        { id: 'music', label: 'Music', icon: MusicalNoteIcon },
    ];

    return (
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted/20 rounded-lg mb-4">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onModeChange(tab.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs font-medium transition-all duration-200 ${activeMode === tab.id
                            ? 'bg-muted text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                >
                    <tab.icon className="w-4 h-4 mb-1" />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
