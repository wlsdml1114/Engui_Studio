'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

export default function LayoutWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isSpeechSequencer = pathname.startsWith('/speech-sequencer');

  if (isSpeechSequencer) {
    // Speech Sequencer는 children[1] (main)만 렌더링
    const mainChild = (children as ReactNode[])[1];
    return <div className="w-full h-screen bg-background text-foreground">{mainChild}</div>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
