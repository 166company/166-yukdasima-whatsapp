'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, Users, MessageSquare, Send, Phone, CreditCard, CheckCircle, AlertCircle, Clock, BarChart3 } from 'lucide-react'

interface Stats {
  db: {
    totalAudiences: number
    totalContacts: number
    totalMessages: number
    sentMessages: number
    inMessages: number
    uniqueConversations: number
  }
  phone: {
    display_phone_number: string
    verified_name: string
    quality_rating: string
    throughput: { level: string }
    status: string
    code_verification_status: string
  } | null
  waba: {
    name: string
    currency: string
    timezone_id: string
    account_review_status: string
  } | null
  billing: { data: Array<{ credit_type: string; credit_limit: number; currency: string }> } | null
}

function QualityBadge({ rating }: { rating: string }) {
  const map: Record<string, { label: string; color: string }> = {
    GREEN: { label: 'Yaxşı', color: 'bg-green-100 text-green-700' },
    YELLOW: { label: 'Orta', color: 'bg-yellow-100 text-yellow-700' },
    RED: { label: 'Aşağı', color: 'bg-red-100 text-red-700' },
  }
  const info = map[rating] ?? { label: rating, color: 'bg-gray-100 text-gray-600' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>{info.label}</span>
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    teal: 'bg-teal-50 text-teal-600',
    pink: 'bg-pink-50 text-pink-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stats')
      setStats(await res.json())
      setLastUpdate(new Date().toLocaleTimeString('az-AZ'))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const qualityMap: Record<string, string> = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴' }
  const throughputMap: Record<string, string> = {
    STANDARD: 'Standart (1K/gün)',
    HIGH: 'Yüksək (10K/gün)',
    NOT_APPLICABLE: 'Tətbiq edilmir',
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Statistika</h1>
          {lastUpdate && <p className="text-xs text-gray-400 mt-0.5">Son yenilənmə: {lastUpdate}</p>}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Yenilə
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <RefreshCw size={24} className="animate-spin mr-2" /> Yüklənir...
        </div>
      ) : stats ? (
        <div className="space-y-6">

          {/* Message stats */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <BarChart3 size={14} /> Mesaj Statistikası
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard icon={MessageSquare} label="Ümumi mesaj" value={stats.db.totalMessages} color="blue" />
              <StatCard icon={Send} label="Göndərilən" value={stats.db.sentMessages} color="green" />
              <StatCard icon={MessageSquare} label="Gələn" value={stats.db.inMessages} color="purple" />
              <StatCard icon={Users} label="Söhbətlər" value={stats.db.uniqueConversations} color="teal" />
              <StatCard icon={Users} label="Auditoriyalar" value={stats.db.totalAudiences} color="orange" />
              <StatCard icon={Users} label="Kontaktlar" value={stats.db.totalContacts} color="pink" />
            </div>
          </div>

          {/* Phone & Account info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Phone Number Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Phone size={14} /> WhatsApp Nömrəsi
              </h2>
              {stats.phone ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Nömrə</span>
                    <span className="font-semibold text-gray-800">{stats.phone.display_phone_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Ad</span>
                    <span className="text-sm text-gray-700">{stats.phone.verified_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Keyfiyyət</span>
                    <div className="flex items-center gap-2">
                      <span>{qualityMap[stats.phone.quality_rating] ?? '⚪'}</span>
                      <QualityBadge rating={stats.phone.quality_rating} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Göndərmə limiti</span>
                    <span className="text-sm text-gray-700">{throughputMap[stats.phone.throughput?.level] ?? stats.phone.throughput?.level}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <div className="flex items-center gap-1.5">
                      {stats.phone.status === 'CONNECTED' ? (
                        <><CheckCircle size={14} className="text-green-500" /><span className="text-sm text-green-600">Qoşulub</span></>
                      ) : (
                        <><AlertCircle size={14} className="text-yellow-500" /><span className="text-sm text-yellow-600">{stats.phone.status}</span></>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Məlumat alına bilmədi</p>
              )}
            </div>

            {/* WABA Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                <CreditCard size={14} /> Biznes Hesabı
              </h2>
              {stats.waba ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Hesab adı</span>
                    <span className="text-sm font-medium text-gray-800">{stats.waba.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Valyuta</span>
                    <span className="text-sm text-gray-700">{stats.waba.currency}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Saat qurşağı</span>
                    <span className="text-sm text-gray-700">UTC{parseInt(stats.waba.timezone_id) >= 0 ? '+' : ''}{Math.round(parseInt(stats.waba.timezone_id) / 60)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Hesab statusu</span>
                    <div className="flex items-center gap-1.5">
                      {stats.waba.account_review_status === 'APPROVED' ? (
                        <><CheckCircle size={14} className="text-green-500" /><span className="text-sm text-green-600">Təsdiqlənib</span></>
                      ) : (
                        <><Clock size={14} className="text-yellow-500" /><span className="text-sm text-yellow-600">{stats.waba.account_review_status ?? 'Yoxlanılır'}</span></>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Məlumat alına bilmədi</p>
              )}

              {/* Billing status */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Ödəniş</h3>
                <a
                  href={`https://business.facebook.com/billing_hub/accounts/details/?asset_id=24519784917609742&wizard_name=PAY_NOW`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <CreditCard size={14} />
                  Meta Billing Panelinə keç →
                </a>
                <p className="text-xs text-gray-400 mt-2">
                  Ödəniş statusunu, hesabı və kart məlumatlarını Meta-da idarə edin
                </p>
              </div>
            </div>
          </div>

          {/* Messaging limits info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <BarChart3 size={14} /> WhatsApp Mesajlaşma Limitləri
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-medium text-gray-700 mb-1">Standart Tier</p>
                <p className="text-2xl font-bold text-blue-600">1,000</p>
                <p className="text-xs text-gray-500">mesaj/gün</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-medium text-gray-700 mb-1">Yüksək Tier</p>
                <p className="text-2xl font-bold text-blue-600">10,000</p>
                <p className="text-xs text-gray-500">mesaj/gün</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="font-medium text-gray-700 mb-1">Maksimum Tier</p>
                <p className="text-2xl font-bold text-blue-600">100,000</p>
                <p className="text-xs text-gray-500">mesaj/gün</p>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              Cari tier: <strong>{throughputMap[stats.phone?.throughput?.level ?? ''] ?? (stats.phone?.throughput?.level ?? 'Bilinmir')}</strong> — Keyfiyyət reytinqinizi artıraraq limiti yüksəldə bilərsiniz.
            </p>
          </div>

        </div>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <AlertCircle size={24} className="mr-2" /> Statistika alına bilmədi
        </div>
      )}
    </div>
    </div>
  )
}
