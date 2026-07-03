'use client'
import type { AudienceFull } from '@/lib/types'

interface Props {
  audience: AudienceFull
}

export default function AudiencePreview({ audience }: Props) {
  const preview = audience.rows.slice(0, 10)

  return (
    <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">Önizləmə</span>
        <span className="text-xs text-gray-400">{audience.rows.length} kontakt</span>
      </div>
      <div className="overflow-auto max-h-52">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              {audience.columns.map((col) => (
                <th key={col} className="text-left px-3 py-2 font-medium text-gray-500">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                {audience.columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-gray-700">{String(row[col] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {audience.rows.length > 10 && (
          <p className="text-xs text-gray-400 text-center py-2">
            +{audience.rows.length - 10} daha...
          </p>
        )}
      </div>
    </div>
  )
}
