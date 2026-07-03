'use client'
import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  const [form, setForm] = useState({ meta_token: '', waba_id: '', phone_id: '' })
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((d) => {
      setForm({ meta_token: d.meta_token ?? '', waba_id: d.waba_id ?? '', phone_id: d.phone_id ?? '' })
    })
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="h-full overflow-y-auto"><div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tənzimləmələr</h1>
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={form.meta_token}
              onChange={(e) => setForm({ ...form, meta_token: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
              placeholder="EAAxxxxxxxx..."
            />
            <button onClick={() => setShowToken(!showToken)} className="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
              {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Meta Business Suite → WhatsApp → API Setup</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WABA ID</label>
          <input
            type="text"
            value={form.waba_id}
            onChange={(e) => setForm({ ...form, waba_id: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
            placeholder="WhatsApp Business Account ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
          <input
            type="text"
            value={form.phone_id}
            onChange={(e) => setForm({ ...form, phone_id: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
            placeholder="Phone Number ID"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-[#00a884] hover:bg-[#008f6f] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {saved ? 'Saxlandı!' : saving ? 'Saxlanılır...' : 'Saxla'}
        </button>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-700">
          <p className="font-semibold mb-2">Webhook quraşdırma:</p>
          <p>URL: <code className="bg-blue-100 px-1 rounded">https://&lt;ngrok-url&gt;/api/webhook</code></p>
          <p className="mt-1">Verify Token: <code className="bg-blue-100 px-1 rounded">166yukdasima_webhook_token</code></p>
        </div>
      </div>
    </div></div>
  )
}
