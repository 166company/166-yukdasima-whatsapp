import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: '166 Yükdaşıma — WhatsApp Bulk Sender',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="az">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-hidden bg-[#f0f2f5]">{children}</main>
        </div>
      </body>
    </html>
  )
}
