'use client'
import { useState, useRef } from 'react'
import { Trash2, Plus, Check, X } from 'lucide-react'
import type { AudienceRow } from '@/lib/types'

interface Props {
  columns: string[]
  rows: AudienceRow[]
  onUpdateCell: (rowId: number, col: string, val: string) => Promise<void>
  onDeleteRow: (rowId: number) => Promise<void>
  onRenameColumn: (oldName: string, newName: string) => Promise<void>
  onDeleteColumn: (colName: string) => Promise<void>
  onAddRow: () => Promise<void>
  onAddColumn: () => Promise<void>
}

export default function AudienceTable({
  columns, rows, onUpdateCell, onDeleteRow, onRenameColumn, onDeleteColumn, onAddRow, onAddColumn,
}: Props) {
  const [editingCell, setEditingCell] = useState<{ rowId: number; col: string } | null>(null)
  const [cellValue, setCellValue] = useState('')
  const [editingCol, setEditingCol] = useState<string | null>(null)
  const [colValue, setColValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (rowId: number, col: string, current: string) => {
    setEditingCell({ rowId, col })
    setCellValue(current)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitCell = async () => {
    if (!editingCell) return
    await onUpdateCell(editingCell.rowId, editingCell.col, cellValue)
    setEditingCell(null)
  }

  const startColEdit = (col: string) => {
    setEditingCol(col)
    setColValue(col)
  }

  const commitCol = async () => {
    if (!editingCol || !colValue.trim() || colValue === editingCol) {
      setEditingCol(null)
      return
    }
    await onRenameColumn(editingCol, colValue.trim())
    setEditingCol(null)
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th key={col} className="text-left px-3 py-2 font-medium text-gray-700 border-r border-gray-200 min-w-[140px]">
                {editingCol === col ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={colValue}
                      onChange={(e) => setColValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitCol(); if (e.key === 'Escape') setEditingCol(null) }}
                      className="flex-1 border border-blue-400 rounded px-1 py-0.5 text-xs outline-none"
                    />
                    <button onClick={commitCol} className="text-green-600 hover:text-green-800"><Check size={14} /></button>
                    <button onClick={() => setEditingCol(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between group">
                    <span
                      className="cursor-pointer hover:text-blue-600"
                      onDoubleClick={() => startColEdit(col)}
                      title="Adı dəyişmək üçün iki dəfə klikləyin"
                    >
                      {col}
                    </span>
                    {columns.length > 1 && (
                      <button
                        onClick={() => onDeleteColumn(col)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity ml-2"
                        title="Sütunu sil"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                )}
              </th>
            ))}
            <th className="w-10 px-2 py-2">
              <button
                onClick={onAddColumn}
                className="text-gray-400 hover:text-green-600 transition-colors"
                title="Sütun əlavə et"
              >
                <Plus size={16} />
              </button>
            </th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 2} className="text-center text-gray-400 py-8">
                Hələ sətir yoxdur
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 border-r border-gray-100">
                    {editingCell?.rowId === row.id && editingCell.col === col ? (
                      <input
                        ref={inputRef}
                        value={cellValue}
                        onChange={(e) => setCellValue(e.target.value)}
                        onBlur={commitCell}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitCell(); if (e.key === 'Escape') setEditingCell(null) }}
                        className="w-full border border-blue-400 rounded px-1 py-0.5 outline-none text-gray-800"
                      />
                    ) : (
                      <span
                        className="block min-h-[1.5rem] cursor-text text-gray-800 hover:bg-blue-50 rounded px-1"
                        onClick={() => startEdit(row.id, col, String(row[col] ?? ''))}
                      >
                        {String(row[col] ?? '')}
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-2 py-1.5" />
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => onDeleteRow(row.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                    title="Sətiri sil"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <button
        onClick={onAddRow}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 px-3 py-2 transition-colors"
      >
        <Plus size={16} />
        Sətir əlavə et
      </button>
    </div>
  )
}
