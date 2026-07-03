'use client'
import { useRef, useState } from 'react'
import { FileSpreadsheet, Upload } from 'lucide-react'

interface Props {
  onImport: (file: File, name: string) => Promise<void>
  loading?: boolean
}

export default function ExcelUpload({ onImport, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File) => {
    const name = window.prompt('Auditoriya adı:', file.name.replace(/\.[^.]+$/, ''))
    if (!name) return
    await onImport(file, name)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          dragging
            ? 'border-green-500 bg-green-50 text-green-700'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        } disabled:opacity-50`}
        title="Excel faylından auditoriya yarat"
      >
        <FileSpreadsheet size={16} className="text-green-600" />
        Excel
        {loading && <Upload size={14} className="animate-bounce" />}
      </button>
    </>
  )
}
