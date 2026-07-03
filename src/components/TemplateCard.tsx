'use client'
import { MessageSquare, Check } from 'lucide-react'
import type { Template } from '@/lib/types'

interface Props {
  template: Template
  selected: boolean
  onClick: () => void
}

export default function TemplateCard({ template, selected, onClick }: Props) {
  const body = template.components.find((c) => c.type === 'BODY')?.text ?? ''
  const buttons = template.components.find((c) => c.type === 'BUTTONS')?.buttons ?? []

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 transition-all ${
        selected
          ? 'border-[#00a884] bg-green-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare size={16} className={selected ? 'text-[#00a884]' : 'text-gray-400'} />
          <span className="font-medium text-gray-800 text-sm truncate">{template.name}</span>
        </div>
        {selected && <Check size={16} className="text-[#00a884] shrink-0" />}
      </div>
      <p className="text-xs text-gray-400 mt-1 mb-2">{template.language}</p>
      {body && (
        <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{body}</p>
      )}
      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {buttons.map((btn, i) => (
            <span key={i} className="text-xs border border-[#00a884] text-[#00a884] rounded px-2 py-0.5">
              {btn.text}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
