'use client'
import type { Template } from '@/lib/types'

interface Props {
  template: Template
}

function fillVars(text: string, example?: string[]): string {
  if (!example) return text
  let out = text
  example.forEach((val, i) => { out = out.replace(`{{${i + 1}}}`, val) })
  return out
}

export default function TemplatePreview({ template }: Props) {
  const header = template.components.find((c) => c.type === 'HEADER') as Record<string, unknown> | undefined
  const body = template.components.find((c) => c.type === 'BODY') as Record<string, unknown> | undefined
  const footer = template.components.find((c) => c.type === 'FOOTER') as Record<string, unknown> | undefined
  const buttonsComp = template.components.find((c) => c.type === 'BUTTONS') as Record<string, unknown> | undefined
  const buttons = (buttonsComp?.buttons as Array<{ type: string; text: string }>) ?? []

  const headerFmt = header?.format as string | undefined
  const headerText = header?.text as string | undefined
  const headerExample = header?.example as Record<string, unknown> | undefined
  const headerUrl = (headerExample?.header_handle as string[] | undefined)?.[0]

  const bodyText = body?.text as string | undefined
  const bodyExample = (body?.example as Record<string, unknown> | undefined)?.body_text as string[][] | undefined
  const filledBody = bodyText ? fillVars(bodyText, bodyExample?.[0]) : ''

  const footerText = footer?.text as string | undefined

  return (
    <div className="sticky top-0">
      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Önizləmə — necə görünəcək</p>

      {/* Phone-like WhatsApp bubble mockup */}
      <div
        className="rounded-2xl overflow-hidden shadow-lg"
        style={{ background: '#0b141a', padding: '16px 12px' }}
      >
        <div className="flex justify-start">
          <div
            className="max-w-[280px] overflow-hidden rounded-lg shadow"
            style={{ background: '#202c33', borderRadius: '0 8px 8px 8px' }}
          >
            {/* Header media */}
            {headerFmt === 'IMAGE' && headerUrl && (
              <img src={headerUrl} alt="Header" className="w-full object-cover max-h-44" />
            )}
            {headerFmt === 'VIDEO' && headerUrl && (
              <video src={headerUrl} className="w-full max-h-44" controls />
            )}
            {headerFmt === 'DOCUMENT' && (
              <div className="flex items-center gap-2 px-3 py-3 bg-black/20">
                <span className="text-lg">📄</span>
                <span className="text-xs text-[#8696a0]">Sənəd əlavəsi</span>
              </div>
            )}
            {headerFmt === 'TEXT' && headerText && (
              <p className="px-3 pt-3 text-sm font-bold text-[#e9edef]">{headerText}</p>
            )}

            {/* Body */}
            <div className="px-3 py-2.5">
              <p className="text-sm text-[#e9edef] whitespace-pre-wrap leading-relaxed">
                {filledBody || <span className="text-white/40 italic">Mətn yoxdur</span>}
              </p>
              {footerText && (
                <p className="text-xs text-[#8696a0] mt-1.5">{footerText}</p>
              )}
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-[#8696a0]">12:34</span>
              </div>
            </div>

            {/* Buttons */}
            {buttons.length > 0 && (
              <div className="border-t border-white/10">
                {buttons.map((btn, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 border-b border-white/5 last:border-0"
                  >
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
        </div>
      </div>

      {/* Template meta info */}
      <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
        <div className="flex justify-between"><span>Ad</span><span className="font-medium text-gray-700">{template.name}</span></div>
        <div className="flex justify-between"><span>Dil</span><span className="font-medium text-gray-700">{template.language}</span></div>
        <div className="flex justify-between"><span>Status</span><span className="font-medium text-green-600">{template.status}</span></div>
      </div>
    </div>
  )
}
