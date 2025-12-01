
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { VideoCameraIcon, ChatBubbleLeftRightIcon, CogIcon, SparklesIcon, MicrophoneIcon, CloudIcon, PhotoIcon, ArrowUpIcon, PlayIcon, FilmIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon as DiscordIcon } from '@heroicons/react/24/solid';

const menuItems = [
  { href: '/video-generation', label: 'WAN 2.2', icon: VideoCameraIcon },
  { href: '/wan-animate', label: 'WAN Animate', icon: PlayIcon },
  { href: '/video-upscale', label: 'Video Upscale', icon: ArrowUpIcon },
  { href: '/flux-kontext', label: 'FLUX KONTEXT', icon: SparklesIcon },
  { href: '/flux-krea', label: 'FLUX KREA', icon: PhotoIcon },
  { href: '/multitalk', label: 'MultiTalk', icon: ChatBubbleLeftRightIcon },
  { href: '/infinite-talk', label: 'Infinite Talk', icon: MicrophoneIcon },
  { href: '/studio', label: 'Studio', icon: FilmIcon },
  { href: '/s3-storage', label: 'S3 Storage', icon: CloudIcon },
  { href: '/settings', label: 'Settings', icon: CogIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-secondary p-6 flex flex-col flex-shrink-0 border-r border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center">
          <Image 
            src="/logo.png" 
            alt="EnguiStudio Logo" 
            width={48} 
            height={48}
            className="object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold">EnguiStudio</h2>
      </div>
      
      {/* Discord 링크 */}
      <div className="mb-6">
        <a
          href="https://discord.gg/8Xhq9f77fK"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-200 group"
        >
          <DiscordIcon className="w-5 h-5" />
          <span className="font-medium">Discord 커뮤니티</span>
          <svg className="w-4 h-4 ml-auto opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
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
