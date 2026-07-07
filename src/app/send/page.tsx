'use client'
import { useState, useEffect, useCallback } from 'react'
import { Send, RefreshCw, CheckCircle, XCircle, SkipForward, Users, UserCheck, UserX } from 'lucide-react'
import TemplateCard from '@/components/TemplateCard'
import AudiencePreview from '@/components/AudiencePreview'
import TemplatePreview from '@/components/TemplatePreview'
import type { AudienceListItem, AudienceFull, Template, BulkSendResult } from '@/lib/types'

function getBodyVarNumbers(template: Template): number[] {
  const body = template.components.find((c) => c.type === 'BODY') as Record<string, unknown> | undefined
  const text = body?.text as string | undefined
  if (!text) return []
  const matches = text.match(/\{\{(\d+)\}\}/g) ?? []
  const nums = Array.from(new Set(matches.map((m) => Number(m.replace(/[{}]/g, ''))))).sort((a, b) => a - b)
  return nums
}

function getBodyVarExample(template: Template, n: number): string | undefined {
  const body = template.components.find((c) => c.type === 'BODY') as Record<string, unknown> | undefined
  const example = (body?.example as Record<string, unknown> | undefined)?.body_text as string[][] | undefined
  return example?.[0]?.[n - 1]
}

interface CheckSentInfo {
  total: number
  sentCount: number
  newCount: number
  sentPhones: string[]
}

export default function SendPage() {
  const [audiences, setAudiences] = useState<AudienceListItem[]>([])
  const [selectedAudienceId, setSelectedAudienceId] = useState<number | ''>('')
  const [audienceFull, setAudienceFull] = useState<AudienceFull | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<{ sent: number; failed: number; skipped: number; results: BulkSendResult[] } | null>(null)
  const [templateError, setTemplateError] = useState('')
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({})
  const [checkSent, setCheckSent] = useState<CheckSentInfo | null>(null)
  const [checkingeSent, setCheckingSent] = useState(false)

  useEffect(() => {
    fetch('/api/audiences').then((r) => r.json()).then(setAudiences)
  }, [])

  useEffect(() => {
    if (!sending) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [sending])

  useEffect(() => {
    setVariableMapping({})
  }, [selectedTemplate])

  const fetchCheckSent = useCallback(async (audienceId: number, templateName: string) => {
    setCheckingSent(true)
    setCheckSent(null)
    try {
      const res = await fetch(`/api/messages/check-sent?audienceId=${audienceId}&templateName=${encodeURIComponent(templateName)}`, { cache: 'no-store' })
      if (res.ok) setCheckSent(await res.json())
    } catch {}
    setCheckingSent(false)
  }, [])

  useEffect(() => {
    if (selectedAudienceId && selectedTemplate) {
      fetchCheckSent(selectedAudienceId as number, selectedTemplate.name)
    } else {
      setCheckSent(null)
    }
  }, [selectedAudienceId, selectedTemplate, fetchCheckSent])

  const bodyVarNumbers = selectedTemplate ? getBodyVarNumbers(selectedTemplate) : []
  const allVarsMapped = bodyVarNumbers.every((n) => !!variableMapping[String(n)])

  const selectAudience = async (id: number) => {
    setSelectedAudienceId(id)
    setAudienceFull(null)
    setCheckSent(null)
    if (!id) return
    const res = await fetch(`/api/audiences/${id}`)
    setAudienceFull(await res.json())
  }

  const loadTemplates = async () => {
    setLoadingTemplates(true)
    setTemplateError('')
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      if (data.error) { setTemplateError(data.error); setTemplates([]) }
      else setTemplates(data)
    } catch (e) {
      setTemplateError(String(e))
    }
    setLoadingTemplates(false)
  }

  const runSend = async (skipAlreadySent: boolean) => {
    if (!selectedTemplate || !selectedAudienceId) return
    setSending(true)
    setResults(null)
    setProgress(null)

    const BATCH = 15
    let offset = 0
    let mediaId: string | null = null
    let accSent = 0, accFailed = 0, accSkipped = 0
    const accResults: BulkSendResult[] = []

    while (true) {
      const res: Response = await fetch('/api/messages/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audienceId: selectedAudienceId,
          templateName: selectedTemplate.name,
          templateLanguage: selectedTemplate.language,
          template: selectedTemplate,
          variableMapping: bodyVarNumbers.length > 0 ? variableMapping : undefined,
          offset,
          limit: BATCH,
          mediaId,
          skipAlreadySent,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setResults({ sent: accSent, failed: accFailed + 1, skipped: accSkipped, results: accResults })
        break
      }

      mediaId = data.mediaId
      accSent += data.sent
      accFailed += data.failed
      accSkipped += data.skipped
      accResults.push(...(data.results ?? []))

      setProgress({ done: data.processedUpTo, total: data.totalRows })
      setResults({ sent: accSent, failed: accFailed, skipped: accSkipped, results: accResults })

      if (data.done) break
      offset += BATCH
    }

    setSending(false)
    setProgress(null)
    // Refresh check-sent after send
    if (selectedAudienceId && selectedTemplate) {
      fetchCheckSent(selectedAudienceId as number, selectedTemplate.name)
    }
  }

  const canSend = !!selectedAudienceId && !!selectedTemplate && !sending && allVarsMapped

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shrink-0">
        <div className="p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-3">Göndərmə</h2>

          {/* Audience selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Auditoriya</label>
            <select
              value={selectedAudienceId}
              onChange={(e) => selectAudience(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
            >
              <option value="">Auditoriya seçin...</option>
              {audiences.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.rowCount})</option>
              ))}
            </select>
            {audienceFull && <AudiencePreview audience={audienceFull} />}
          </div>

          {/* Template load button */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Template</label>
              <button
                onClick={loadTemplates}
                disabled={loadingTemplates}
                className="flex items-center gap-1 text-xs text-[#00a884] hover:underline"
              >
                <RefreshCw size={12} className={loadingTemplates ? 'animate-spin' : ''} />
                Yüklə
              </button>
            </div>
            {templateError && <p className="text-xs text-red-500">{templateError}</p>}
          </div>
        </div>

        {/* Send status check + buttons */}
        <div className="p-5 border-b border-gray-200 space-y-3">

          {/* Check-sent summary */}
          {selectedAudienceId && selectedTemplate && (
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {checkingeSent ? (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-400">
                  <RefreshCw size={12} className="animate-spin" /> Yoxlanılır...
                </div>
              ) : checkSent ? (
                <div className="divide-y divide-gray-100">
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <Users size={15} className="text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-500 flex-1">Ümumi kontakt</span>
                    <span className="text-sm font-bold text-gray-800">{checkSent.total}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50">
                    <UserCheck size={15} className="text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-600 flex-1">Artıq göndərilib</span>
                    <span className="text-sm font-bold text-amber-600">{checkSent.sentCount}</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-green-50">
                    <UserX size={15} className="text-green-600 shrink-0" />
                    <span className="text-xs text-green-700 flex-1">Yeni kontakt</span>
                    <span className="text-sm font-bold text-green-700">{checkSent.newCount}</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Progress bar */}
          {sending && progress && (
            <div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-[#00a884] h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-1">
                {progress.done}/{progress.total} — {Math.round((progress.done / progress.total) * 100)}%
              </p>
            </div>
          )}

          {/* Send buttons */}
          {!sending && canSend && checkSent && checkSent.newCount > 0 && (
            <button
              onClick={() => runSend(true)}
              className="w-full flex items-center justify-center gap-2 bg-[#00a884] hover:bg-[#008f6f] text-white py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              <Send size={15} />
              {checkSent.newCount}-ə göndər (yeni)
            </button>
          )}
          {!sending && canSend && (
            <button
              onClick={() => runSend(false)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-colors border ${
                checkSent && checkSent.newCount > 0
                  ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  : 'bg-[#00a884] hover:bg-[#008f6f] text-white border-transparent'
              }`}
            >
              <Send size={15} />
              Hamısına göndər ({checkSent ? checkSent.total : '...'})
            </button>
          )}
          {sending && (
            <div className="w-full flex items-center justify-center gap-2 bg-[#00a884] text-white py-2.5 rounded-xl font-medium text-sm opacity-70 cursor-not-allowed">
              <RefreshCw size={15} className="animate-spin" />
              {progress ? `Göndərilir... ${progress.done}/${progress.total}` : 'Göndərilir...'}
            </div>
          )}

          {!selectedAudienceId && !sending && <p className="text-xs text-gray-400 text-center">Auditoriya seçin</p>}
          {selectedAudienceId && !selectedTemplate && !sending && <p className="text-xs text-gray-400 text-center">Template seçin</p>}
          {selectedAudienceId && selectedTemplate && !allVarsMapped && !sending && (
            <p className="text-xs text-amber-500 text-center">Bütün dəyərləri sütuna bağlayın →</p>
          )}
        </div>

        {/* Results */}
        {results && (
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-medium text-gray-700 mb-3 text-sm">Nəticələr</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-green-600">{results.sent}</p>
                <p className="text-xs text-green-500">Göndərildi</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-red-500">{results.failed}</p>
                <p className="text-xs text-red-400">Uğursuz</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold text-gray-500">{results.skipped}</p>
                <p className="text-xs text-gray-400">Buraxıldı</p>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {results.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {r.status === 'sent' && <CheckCircle size={12} className="text-green-500 shrink-0" />}
                  {r.status === 'failed' && <XCircle size={12} className="text-red-400 shrink-0" />}
                  {r.status === 'skipped' && <SkipForward size={12} className="text-gray-400 shrink-0" />}
                  <span className="text-gray-600">{r.phone}</span>
                  {r.error && <span className="text-red-400 truncate">{r.error}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Middle: template list */}
      <div className="flex-1 overflow-y-auto p-6">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <p className="mb-3">Template yükləmək üçün &ldquo;Yüklə&rdquo; düyməsini basın</p>
            {templateError && <p className="text-red-500 text-sm">{templateError}</p>}
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-gray-700 mb-4">Mövcud Templatelar ({templates.length})</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {templates.map((t) => (
                <TemplateCard
                  key={t.name}
                  template={t}
                  selected={selectedTemplate?.name === t.name}
                  onClick={() => setSelectedTemplate(t)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right: live preview + variable mapping */}
      {selectedTemplate && (
        <div className="w-80 border-l border-gray-200 bg-white p-5 overflow-y-auto shrink-0 space-y-5">
          {bodyVarNumbers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Dəyərləri sütuna bağla
              </p>
              {!audienceFull ? (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">
                  Əvvəlcə auditoriya seçin
                </p>
              ) : (
                <div className="space-y-2.5">
                  {bodyVarNumbers.map((n) => {
                    const example = getBodyVarExample(selectedTemplate, n)
                    return (
                      <div key={n}>
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 mb-1">
                          <span className="font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{`{{${n}}}`}</span>
                          {example && <span className="text-gray-400 italic truncate">məs: {example}</span>}
                        </label>
                        <select
                          value={variableMapping[String(n)] ?? ''}
                          onChange={(e) => setVariableMapping((prev) => ({ ...prev, [String(n)]: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">Sütun seçin...</option>
                          {audienceFull.columns.map((col) => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <TemplatePreview template={selectedTemplate} />
        </div>
      )}
    </div>
  )
}
