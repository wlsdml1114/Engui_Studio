
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VideoCameraIcon, ChatBubbleLeftRightIcon, CogIcon, SparklesIcon } from '@heroicons/react/24/outline';

const menuItems = [
  { href: '/video-generation', label: 'WAN 2.2', icon: VideoCameraIcon },
  { href: '/flux-kontext', label: 'FLUX KONTEXT', icon: SparklesIcon },
  { href: '/multitalk', label: 'MultiTalk', icon: ChatBubbleLeftRightIcon },
  { href: '/settings', label: 'Settings', icon: CogIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-secondary p-6 flex flex-col flex-shrink-0 border-r border-border">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-2xl font-bold">E</span>
        </div>
        <h2 className="text-2xl font-bold">EnguiStudio</h2>
      </div>
      <nav className="flex-1">
        <ul>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="mb-3">
                <Link
                  href={item.href}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-primary text-white' : 'hover:bg-white/10'}`}>
                  <item.icon className="w-6 h-6" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })
          }
        </ul>
      </nav>
    </aside>
  );
}
