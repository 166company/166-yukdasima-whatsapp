'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Send, MessageSquare, Settings, BarChart3 } from 'lucide-react'

const nav = [
  { href: '/audiences', icon: Users, label: 'Auditoriya' },
  { href: '/send', icon: Send, label: 'Göndər' },
  { href: '/messenger', icon: MessageSquare, label: 'Mesajlar' },
  { href: '/stats', icon: BarChart3, label: 'Statistika' },
  { href: '/settings', icon: Settings, label: 'Tənzimləmələr' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 bg-[#111b21] flex flex-col shrink-0 border-r border-white/10">
      <div className="px-5 py-4 border-b border-white/10">
        <h1 className="text-white font-bold text-base leading-tight">WhatsApp Bulk Sender</h1>
        <p className="text-green-400 text-xs mt-1">166 Yükdaşıma</p>
      </div>
      <nav className="flex-1 py-2">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              pathname.startsWith(href)
                ? 'bg-[#00a884] text-white'
                : 'text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
