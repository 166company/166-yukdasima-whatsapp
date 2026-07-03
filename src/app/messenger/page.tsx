'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Send, MoreVertical, Phone, Video, CheckCheck, Paperclip, X } from 'lucide-react'
import type { Conversation } from '@/lib/types'

interface TplBtn { type: string; text: string; phone_number?: string; url?: string }
interface TemplateMeta { name: string; body?: string; headerFormat?: string; mediaId?: string | null; buttons?: TplBtn[] }

function formatTime(ts: number | null) {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
}

function formatConvTime(ts: number) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === yesterday.toDateString()) return 'Dünən'
  return d.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatDateDivider(ts: number) {
  const d = new Date(ts * 1000)
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString()) return 'Bu gün'
  if (d.toDateString() === yesterday.toDateString()) return 'Dünən'
  return d.toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

const AVATAR_COLORS = ['#b15cde','#20b038','#00a884','#ff6b35','#34B7F1','#e91e8c','#ff9800','#2196f3']

function MediaMessage({ text, metadata }: { text: string; metadata?: string }) {
  const match = text.match(/^\[MEDIA:(\w+):([^:\]]+)(?::([^\]]+))?\]$/)
  if (!match) return <span>{text}</span>
  const [, type, id, extra] = match

  let caption: string | undefined
  try { if (metadata) caption = JSON.parse(metadata)?.caption } catch {}

  if (type === 'image' || type === 'sticker') {
    return (
      <div>
        <img
          src={`/api/media/${id}`}
          alt={type === 'sticker' ? 'Stiker' : 'Şəkil'}
          className={type === 'sticker' ? 'w-24 h-24 object-contain' : 'max-w-[240px] rounded-lg'}
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        {caption && <p className="mt-1 text-sm">{caption}</p>}
      </div>
    )
  }
  if (type === 'video') {
    return (
      <div>
        <video src={`/api/media/${id}`} controls className="max-w-[240px] rounded-lg" preload="metadata" />
        {caption && <p className="mt-1 text-sm">{caption}</p>}
      </div>
    )
  }
  if (type === 'audio') {
    return <audio src={`/api/media/${id}`} controls className="w-48" preload="metadata" />
  }
  if (type === 'document') {
    return (
      <div>
        <a href={`/api/media/${id}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm">
          📎 {extra ?? 'Fayl'}
        </a>
        {caption && <p className="mt-1 text-sm">{caption}</p>}
      </div>
    )
  }
  return <span>{text}</span>
}

function TemplateMessage({ text, metadata }: { text: string; metadata?: string }) {
  const oldMatch = text.match(/^\[Template:\s*(.+)\]$/)
  let meta: TemplateMeta | null = null
  try { if (metadata) meta = JSON.parse(metadata) } catch {}

  const templateName = meta?.name ?? (oldMatch ? oldMatch[1] : null)
  const body = meta?.body ?? (oldMatch ? null : text)
  const buttons: TplBtn[] = meta?.buttons ?? []
  const headerFormat = meta?.headerFormat?.toUpperCase()

  return (
    <div className="min-w-[200px] max-w-[300px] overflow-hidden rounded-lg" style={{ background: '#1a2a2a' }}>
      {/* Header media */}
      {meta?.mediaId && headerFormat === 'IMAGE' && (
        <img
          src={`/api/media/${meta.mediaId}`}
          alt="Header"
          className="w-full object-cover max-h-40"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      {meta?.mediaId && headerFormat === 'VIDEO' && (
        <video
          src={`/api/media/${meta.mediaId}`}
          className="w-full max-h-40"
          controls
          preload="metadata"
        />
      )}
      {meta?.mediaId && headerFormat === 'DOCUMENT' && (
        <div className="flex items-center gap-2 px-3 py-3" style={{ background: '#0d1f1f' }}>
          <span className="text-2xl">📄</span>
          <span className="text-xs text-[#8696a0]">Sənəd əlavəsi</span>
        </div>
      )}
      {/* Template label */}
      <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
        <svg viewBox="0 0 20 20" className="w-3 h-3 fill-[#53bdeb] shrink-0">
          <path d="M18 3H2a1 1 0 00-1 1v12a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1zm-1 12H3V5h14v10z"/>
        </svg>
        <span className="text-[10px] text-[#53bdeb] font-semibold uppercase tracking-wider">Template mesaj</span>
        {templateName && <span className="text-[10px] text-[#8696a0] truncate">· {templateName}</span>}
      </div>
      {/* Body */}
      <div className="px-3 pb-2">
        {body ? (
          <p className="text-sm text-[#e9edef] whitespace-pre-wrap leading-relaxed">{body}</p>
        ) : (
          <p className="text-sm text-white/40 italic">Template məzmunu</p>
        )}
      </div>
      {/* Buttons */}
      {buttons.length > 0 && (
        <div className="border-t border-white/10">
          {buttons.map((btn, i) => (
            <div key={i} className="flex items-center justify-center gap-1.5 px-3 py-2 border-b border-white/5 last:border-0">
              {btn.type === 'PHONE_NUMBER' && <span className="text-[#53bdeb] text-xs">📞</span>}
              {btn.type === 'URL' && <span className="text-[#53bdeb] text-xs">🔗</span>}
              {btn.type === 'FLOW' && <span className="text-[#53bdeb] text-xs">📋</span>}
              {btn.type === 'QUICK_REPLY' && <span className="text-[#53bdeb] text-xs">↩</span>}
              <span className="text-[#53bdeb] text-xs font-medium">{btn.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageContent({ text, type, metadata }: { text: string | null; type: string; metadata?: string }) {
  if (!text) return <span className="text-gray-500 italic text-xs">Boş mesaj</span>
  if (text.startsWith('[MEDIA:')) return <MediaMessage text={text} metadata={metadata} />
  if (type === 'template' || text.startsWith('[Template:')) {
    return <TemplateMessage text={text} metadata={metadata} />
  }
  return <span>{text}</span>
}

function Avatar({ name, size = 'md', photoUrl, onClick }: {
  name: string; size?: 'sm' | 'md' | 'lg'; photoUrl?: string; onClick?: () => void
}) {
  const color = AVATAR_COLORS[(name.charCodeAt(0) || 65) % AVATAR_COLORS.length]
  const cls = size === 'sm' ? 'w-9 h-9 text-sm' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-12 h-12 text-base'

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onClick={onClick}
        className={`${cls} rounded-full object-cover shrink-0 ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      />
    )
  }
  return (
    <div
      onClick={onClick}
      className={`${cls} rounded-full flex items-center justify-center text-white font-semibold shrink-0 select-none ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{ background: color }}
    >
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

export default function MessengerPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [lastRead, setLastRead] = useState<Record<string, number>>({})
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const selected = conversations.find((c) => c.contact === selectedContact) ?? null

  const loadInbox = useCallback(async () => {
    const res = await fetch('/api/messages/inbox')
    const data: Conversation[] = await res.json()
    setConversations(data)
  }, [])

  const uploadAvatar = async (waId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    await fetch(`/api/contacts/${waId}/photo`, { method: 'POST', body: fd })
    await loadInbox()
  }

  // Load lastRead from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('wa_lastread')
      if (saved) setLastRead(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    loadInbox()
    const interval = setInterval(loadInbox, 3000)
    return () => clearInterval(interval)
  }, [loadInbox])

  useEffect(() => {
    if (selectedContact) {
      const now = Date.now() / 1000
      setLastRead((prev) => {
        const next = { ...prev, [selectedContact]: now }
        localStorage.setItem('wa_lastread', JSON.stringify(next))
        return next
      })
    }
  }, [selectedContact, selected?.messages?.length])

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [selectedContact, selected?.messages?.length])

  const sendReply = async () => {
    if (!selected || sending || uploadingFile) return

    if (attachedFile) {
      setUploadingFile(true)
      const fd = new FormData()
      fd.append('file', attachedFile)
      fd.append('to', selected.contact)
      if (reply.trim()) fd.append('caption', reply.trim())
      await fetch('/api/messages/send-media', { method: 'POST', body: fd })
      setAttachedFile(null)
      setReply('')
      setUploadingFile(false)
      await loadInbox()
      return
    }

    if (!reply.trim()) return
    setSending(true)
    await fetch('/api/messages/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: selected.contact, text: reply.trim() }),
    })
    setReply('')
    setSending(false)
    inputRef.current?.focus()
    await loadInbox()
  }

  const getUnread = (conv: Conversation) => {
    const lr = lastRead[conv.contact] ?? 0
    return conv.messages.filter((m) => m.direction === 'in' && (m.timestamp ?? 0) > lr).length
  }

  const filtered = conversations.filter((c) =>
    (c.contactName || c.contact).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full" style={{ background: '#111b21' }}>

      {/* ──── LEFT PANEL ──── */}
      <div className="flex flex-col shrink-0 border-r border-[#222e35]" style={{ width: 370, background: '#111b21' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 shrink-0" style={{ background: '#202c33', height: 60 }}>
          <div className="flex items-center gap-3">
            <Avatar name="166" size="sm" />
            <div>
              <p className="text-[#e9edef] font-medium text-sm">166 Yükdaşıma</p>
              <p className="text-[10px] text-[#8696a0]">{conversations.length} söhbət</p>
            </div>
          </div>
          <MoreVertical size={20} className="text-[#aebac1] cursor-pointer hover:text-white" />
        </div>

        {/* Search */}
        <div className="px-3 py-2 shrink-0" style={{ background: '#111b21' }}>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: '#202c33' }}>
            <Search size={16} className="text-[#8696a0] shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Axtar"
              className="flex-1 bg-transparent text-[#d1d7db] text-sm outline-none placeholder:text-[#8696a0]"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[#8696a0]">
              <Search size={40} className="opacity-20" />
              <p className="text-sm">Söhbət tapılmadı</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const last = conv.messages[conv.messages.length - 1]
              const isActive = selectedContact === conv.contact
              const unread = isActive ? 0 : getUnread(conv)
              const displayName = conv.contactName && conv.contactName !== conv.contact
                ? conv.contactName : `+${conv.contact}`

              return (
                <div
                  key={conv.contact}
                  onClick={() => setSelectedContact(conv.contact)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors"
                  style={{ background: isActive ? '#2a3942' : undefined }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#202c33' }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '' }}
                >
                  <Avatar name={displayName} size="md" photoUrl={conv.photoUrl} />
                  <div className="flex-1 min-w-0 py-3 border-b border-[#222e35]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[#e9edef] font-medium text-sm truncate">{displayName}</p>
                      <p className={`text-[11px] shrink-0 ${unread > 0 ? 'text-[#00a884]' : 'text-[#8696a0]'}`}>
                        {formatConvTime(conv.lastAt)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[13px] text-[#8696a0] truncate flex-1">
                        {last?.direction === 'out' && (
                          <span className="inline-flex items-center mr-1">
                            <CheckCheck size={14} className="text-[#53bdeb]" />
                          </span>
                        )}
                        {last?.type === 'template' || last?.text?.startsWith('[Template:')
                          ? '📋 ' + (last?.text?.match(/^\[Template:\s*(.+)\]$/)?.[1] ?? 'Template')
                          : last?.text?.startsWith('[MEDIA:image') ? '📷 Şəkil'
                          : last?.text?.startsWith('[MEDIA:sticker') ? '🎭 Stiker'
                          : last?.text?.startsWith('[MEDIA:video') ? '🎥 Video'
                          : last?.text?.startsWith('[MEDIA:audio') ? '🎵 Ses'
                          : last?.text?.startsWith('[MEDIA:document') ? '📎 Fayl'
                          : last?.text ?? ''}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[#00a884] text-white text-[11px] flex items-center justify-center font-medium">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ──── RIGHT PANEL ──── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6" style={{ background: '#222e35' }}>
          <div className="w-52 h-52 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,168,132,0.07)' }}>
            <svg viewBox="0 0 303 172" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-44 opacity-30">
              <path d="M229.565 160.229C262.212 149.245 286 118.367 286 82C286 36.7715 249.228 0 204 0C158.772 0 122 36.7715 122 82C122 127.228 158.772 164 204 164C215.386 164 226.213 161.624 235.998 157.358L285.5 172L229.565 160.229Z" fill="#00a884" fillOpacity="0.3"/>
              <path d="M73.4346 160.229C40.7878 149.245 17 118.367 17 82C17 36.7715 53.7715 0 99 0C144.228 0 181 36.7715 181 82C181 127.228 144.228 164 99 164C87.614 164 76.787 161.624 67.0018 157.358L17.5 172L73.4346 160.229Z" fill="#00a884" fillOpacity="0.15"/>
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-[#e9edef] text-2xl font-light">WhatsApp Web</h2>
            <p className="text-[#8696a0] text-sm">Söhbəti seçin və ya yeni mesaj başladın</p>
            <p className="text-[#8696a0] text-xs">{conversations.length} söhbət mövcuddur</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 shrink-0" style={{ background: '#202c33', height: 60 }}>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f && selected) uploadAvatar(selected.contact, f); e.target.value = '' }}
            />
            <Avatar
              name={selected.contactName && selected.contactName !== selected.contact ? selected.contactName : `+${selected.contact}`}
              size="sm"
              photoUrl={selected.photoUrl}
              onClick={() => avatarInputRef.current?.click()}
            />
            <div className="flex-1 min-w-0 cursor-pointer">
              <p className="text-[#e9edef] font-medium text-sm">
                {selected.contactName && selected.contactName !== selected.contact ? selected.contactName : `+${selected.contact}`}
              </p>
              <p className="text-[11px] text-[#8696a0]">+{selected.contact} · {selected.messages.length} mesaj</p>
            </div>
            <div className="flex items-center gap-5 text-[#aebac1]">
              <Video size={20} className="cursor-pointer hover:text-white transition-colors" />
              <Phone size={20} className="cursor-pointer hover:text-white transition-colors" />
              <Search size={20} className="cursor-pointer hover:text-white transition-colors" />
              <MoreVertical size={20} className="cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-[5%] py-3" style={{ background: '#0b141a' }}>
            {selected.messages.map((msg, idx) => {
              const isOut = msg.direction === 'out'
              const prevMsg = idx > 0 ? selected.messages[idx - 1] : null
              const showDate = !prevMsg || (
                msg.timestamp && prevMsg.timestamp &&
                new Date(msg.timestamp * 1000).toDateString() !== new Date(prevMsg.timestamp * 1000).toDateString()
              )
              const prevIsOut = prevMsg?.direction === 'out'
              const isFirstInGroup = !prevMsg || prevIsOut !== isOut

              return (
                <div key={msg.id}>
                  {showDate && msg.timestamp && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs px-3 py-1.5 rounded-full text-[#e9edef]" style={{ background: '#182229' }}>
                        {formatDateDivider(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}>
                    <div
                      className="max-w-[65%] px-3 pt-2 pb-1 shadow-sm"
                      style={{
                        background: isOut ? '#005c4b' : '#202c33',
                        borderRadius: isOut
                          ? (isFirstInGroup ? '8px 8px 0 8px' : '8px 8px 0 8px')
                          : (isFirstInGroup ? '0 8px 8px 8px' : '8px 8px 8px 8px'),
                      }}
                    >
                      <div className="text-[#e9edef] text-sm break-words leading-relaxed whitespace-pre-wrap">
                        <MessageContent text={msg.text} type={msg.type} metadata={msg.metadata} />
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                        <span className="text-[11px] text-[#8696a0]">{formatTime(msg.timestamp)}</span>
                        {isOut && <CheckCheck size={14} className="text-[#53bdeb]" />}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Attached file preview */}
          {attachedFile && (
            <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ background: '#1a2730' }}>
              {attachedFile.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(attachedFile)} alt="" className="w-10 h-10 rounded object-cover" />
              ) : (
                <Paperclip size={16} className="text-[#8696a0]" />
              )}
              <span className="text-xs text-[#d1d7db] flex-1 truncate">{attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} className="text-[#8696a0] hover:text-white">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: '#202c33' }}>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setAttachedFile(f); e.target.value = '' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#8696a0] hover:text-white hover:bg-white/5 transition-colors shrink-0"
              title="Fayl əlavə et"
            >
              <Paperclip size={20} />
            </button>
            <div className="flex-1 flex items-center rounded-lg px-4 py-2" style={{ background: '#2a3942', minHeight: 42 }}>
              <input
                ref={inputRef}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                placeholder={attachedFile ? 'Altyazı (istəyə görə)...' : 'Mesaj yazın'}
                className="flex-1 bg-transparent text-[#d1d7db] text-sm outline-none placeholder:text-[#8696a0]"
              />
            </div>
            <button
              onClick={sendReply}
              disabled={(!reply.trim() && !attachedFile) || sending || uploadingFile}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 disabled:opacity-30"
              style={{ background: (reply.trim() || attachedFile) ? '#00a884' : '#2a3942' }}
            >
              {uploadingFile ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={18} className="text-white ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
