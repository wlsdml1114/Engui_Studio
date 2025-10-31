
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { VideoCameraIcon, ChatBubbleLeftRightIcon, CogIcon, SparklesIcon, MicrophoneIcon, CloudIcon, PhotoIcon, ArrowUpIcon, PlayIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon as DiscordIcon } from '@heroicons/react/24/solid';
import { useI18n } from '@/lib/i18n/context';

export default function Sidebar() {
  const { t } = useI18n();
  const pathname = usePathname();

  const menuItems = [
    { href: '/video-generation', label: t('menu.videoGeneration'), icon: VideoCameraIcon },
    { href: '/wan-animate', label: t('menu.wanAnimate'), icon: PlayIcon },
    { href: '/video-upscale', label: t('menu.videoUpscale'), icon: ArrowUpIcon },
    { href: '/flux-kontext', label: t('menu.fluxKontext'), icon: SparklesIcon },
    { href: '/flux-krea', label: t('menu.fluxKrea'), icon: PhotoIcon },
    { href: '/qwen-image-edit', label: t('menu.qwenImageEdit'), icon: PhotoIcon },
    { href: '/multitalk', label: t('menu.multitalk'), icon: ChatBubbleLeftRightIcon },
    { href: '/infinite-talk', label: t('menu.infiniteTalk'), icon: MicrophoneIcon },
    { href: '/speech-sequencer', label: t('menu.speechSequencer'), icon: MicrophoneIcon },
    { href: '/s3-storage', label: t('menu.s3Storage'), icon: CloudIcon },
    { href: '/settings', label: t('menu.settings'), icon: CogIcon },
  ];

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
      
      {/* GitHub 링크 */}
      <div className="mb-2">
        <a
          href="https://github.com/wlsdml1114/Engui_Studio"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-900 text-white transition-colors duration-200 group"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.799 8.205 11.387.6.111.82-.261.82-.579 0-.286-.011-1.041-.017-2.045-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.757-1.333-1.757-1.089-.745.083-.729.083-.729 1.205.085 1.839 1.237 1.839 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.775.418-1.305.762-1.605-2.665-.304-5.467-1.333-5.467-5.932 0-1.311.469-2.383 1.236-3.222-.124-.303-.536-1.527.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.984-.399 3.003-.404 1.019.005 2.046.138 3.005.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.649.243 2.873.12 3.176.77.839 1.235 1.911 1.235 3.222 0 4.61-2.807 5.625-5.479 5.921.43.371.823 1.103.823 2.222 0 1.604-.015 2.896-.015 3.289 0 .321.216.694.825.576C20.565 21.796 24 17.298 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span className="font-medium">{t('sidebar.github')}</span>
          <svg className="w-4 h-4 ml-auto opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
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
          <span className="font-medium">{t('sidebar.discord')}</span>
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
