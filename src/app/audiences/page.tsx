'use client'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, Check, X, Users } from 'lucide-react'
import AudienceTable from '@/components/AudienceTable'
import ExcelUpload from '@/components/ExcelUpload'
import type { AudienceListItem, AudienceFull, AudienceRow } from '@/lib/types'

export default function AudiencesPage() {
  const [list, setList] = useState<AudienceListItem[]>([])
  const [selected, setSelected] = useState<AudienceFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [newName, setNewName] = useState('')

  const loadList = useCallback(async () => {
    const res = await fetch('/api/audiences')
    setList(await res.json())
  }, [])

  const loadAudience = useCallback(async (id: number) => {
    setLoading(true)
    const res = await fetch(`/api/audiences/${id}`)
    const data = await res.json()
    setSelected(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadList() }, [loadList])

  const createAudience = async () => {
    if (!newName.trim()) return
    const res = await fetch('/api/audiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const created = await res.json()
    setCreatingNew(false)
    setNewName('')
    await loadList()
    await loadAudience(created.id)
  }

  const renameAudience = async () => {
    if (!selected || !nameVal.trim()) { setEditingName(false); return }
    await fetch(`/api/audiences/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameVal.trim() }),
    })
    setSelected({ ...selected, name: nameVal.trim() })
    setList(list.map((a) => a.id === selected.id ? { ...a, name: nameVal.trim() } : a))
    setEditingName(false)
  }

  const deleteAudience = async (id: number) => {
    if (!confirm('Bu auditoriya silinsin?')) return
    await fetch(`/api/audiences/${id}`, { method: 'DELETE' })
    if (selected?.id === id) setSelected(null)
    await loadList()
  }

  const handleImport = async (file: File, name: string) => {
    setImporting(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name)
    const res = await fetch('/api/audiences/import', { method: 'POST', body: fd })
    const created = await res.json()
    setImporting(false)
    if (created.id) {
      await loadList()
      await loadAudience(created.id)
    }
  }

  const addRow = async () => {
    if (!selected) return
    const res = await fetch(`/api/audiences/${selected.id}/rows`, { method: 'POST' })
    const row = await res.json()
    setSelected({ ...selected, rows: [...selected.rows, row] })
    setList(list.map((a) => a.id === selected.id ? { ...a, rowCount: a.rowCount + 1 } : a))
  }

  const updateCell = async (rowId: number, col: string, val: string) => {
    if (!selected) return
    const row = selected.rows.find((r) => r.id === rowId)
    if (!row) return
    const newData: Record<string, string> = {}
    for (const c of selected.columns) newData[c] = String(row[c] ?? '')
    newData[col] = val
    await fetch(`/api/audiences/${selected.id}/rows/${rowId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: newData }),
    })
    setSelected({
      ...selected,
      rows: selected.rows.map((r) => r.id === rowId ? { id: rowId, ...newData } as AudienceRow : r),
    })
  }

  const deleteRow = async (rowId: number) => {
    if (!selected) return
    await fetch(`/api/audiences/${selected.id}/rows/${rowId}`, { method: 'DELETE' })
    setSelected({ ...selected, rows: selected.rows.filter((r) => r.id !== rowId) })
    setList(list.map((a) => a.id === selected.id ? { ...a, rowCount: a.rowCount - 1 } : a))
  }

  const addColumn = async () => {
    if (!selected) return
    const colName = window.prompt('Yeni sütun adı:')
    if (!colName?.trim()) return
    const newColumns = [...selected.columns, colName.trim()]
    const res = await fetch(`/api/audiences/${selected.id}/columns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns: newColumns }),
    })
    const data = await res.json()
    const newRows = selected.rows.map((r) => ({ ...r, [colName.trim()]: '' }))
    setSelected({ ...selected, columns: data.columns, rows: newRows })
  }

  const renameColumn = async (oldName: string, newName: string) => {
    if (!selected) return
    const newColumns = selected.columns.map((c) => (c === oldName ? newName : c))
    const res = await fetch(`/api/audiences/${selected.id}/columns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns: newColumns }),
    })
    const data = await res.json()
    const newRows = selected.rows.map((r) => {
      const row = { ...r }
      row[newName] = row[oldName] ?? ''
      delete row[oldName]
      return row as AudienceRow
    })
    setSelected({ ...selected, columns: data.columns, rows: newRows })
  }

  const deleteColumn = async (colName: string) => {
    if (!selected) return
    if (selected.columns.length <= 1) { alert('Ən az bir sütun olmalıdır'); return }
    if (!confirm(`"${colName}" sütunu silinsin?`)) return
    const newColumns = selected.columns.filter((c) => c !== colName)
    const res = await fetch(`/api/audiences/${selected.id}/columns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns: newColumns }),
    })
    const data = await res.json()
    setSelected({ ...selected, columns: data.columns })
  }

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Auditoriyalar</h2>
          <div className="flex gap-1">
            <ExcelUpload onImport={handleImport} loading={importing} />
            <button
              onClick={() => { setCreatingNew(true); setNewName('') }}
              className="p-1.5 rounded-lg bg-[#00a884] text-white hover:bg-[#008f6f] transition-colors"
              title="Yeni auditoriya"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {creatingNew && (
          <div className="p-3 border-b border-gray-100 bg-green-50">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createAudience(); if (e.key === 'Escape') setCreatingNew(false) }}
              placeholder="Auditoriya adı..."
              className="w-full border border-green-400 rounded px-2 py-1 text-sm outline-none text-gray-800"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={createAudience} className="flex-1 bg-[#00a884] text-white rounded px-2 py-1 text-xs font-medium hover:bg-[#008f6f]">Yarat</button>
              <button onClick={() => setCreatingNew(false)} className="flex-1 bg-gray-100 text-gray-700 rounded px-2 py-1 text-xs font-medium hover:bg-gray-200">Ləğv et</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4 text-center">
              <Users size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Hələ auditoriya yoxdur</p>
            </div>
          ) : (
            list.map((a) => (
              <div
                key={a.id}
                onClick={() => loadAudience(a.id)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 flex items-center justify-between group ${selected?.id === a.id ? 'bg-green-50 border-l-4 border-l-[#00a884]' : ''}`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.rowCount} kontakt</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteAudience(a.id) }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Users size={48} className="mb-3 opacity-30" />
            <p>Auditoriya seçin</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">Yüklənir...</div>
        ) : (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              {editingName ? (
                <>
                  <input
                    autoFocus
                    value={nameVal}
                    onChange={(e) => setNameVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') renameAudience(); if (e.key === 'Escape') setEditingName(false) }}
                    className="text-xl font-bold border-b-2 border-blue-400 outline-none bg-transparent text-gray-800 min-w-[200px]"
                  />
                  <button onClick={renameAudience} className="text-green-600 hover:text-green-800"><Check size={20} /></button>
                  <button onClick={() => setEditingName(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-800">{selected.name}</h1>
                  <button
                    onClick={() => { setEditingName(true); setNameVal(selected.name) }}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Adı dəyiş"
                  >
                    <Edit2 size={16} />
                  </button>
                  <span className="text-sm text-gray-400 ml-2">{selected.rows.length} kontakt</span>
                </>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <AudienceTable
                columns={selected.columns}
                rows={selected.rows}
                onUpdateCell={updateCell}
                onDeleteRow={deleteRow}
                onRenameColumn={renameColumn}
                onDeleteColumn={deleteColumn}
                onAddRow={addRow}
                onAddColumn={addColumn}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
