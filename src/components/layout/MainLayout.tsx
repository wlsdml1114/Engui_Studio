'use client';

import React from 'react';
import { StudioProvider } from '@/lib/context/StudioContext';
import LeftPanel from './LeftPanel';
import CenterPanel from './CenterPanel';
import RightPanel from './RightPanel';

export default function MainLayout() {
    return (
        <StudioProvider>
            <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
                <LeftPanel />
                <CenterPanel />
                <RightPanel />
            </div>
        </StudioProvider>
    );
}
