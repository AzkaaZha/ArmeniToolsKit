import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Download, FileText, LoaderCircle, Plus, Search, Pencil,
  Trash2, Copy, X, Save, CalendarDays, ClipboardList
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { apiUrl } from './api'

const STORAGE_KEY = 'armeni_tools_daftar_hadir_v1'
const perusahaanList = [
  'Armeni',
  'Arka Creative Production',
  'Kreasi Pemuda Perkasa',
  'Pesona Kreasi Bangsa',
]
const jenisDokumenList = ['Daftar Hadir', 'Tanda Terima Seminar Kit']
const jenisDaftarList = ['Peserta', 'Panitia', 'Narasumber', 'Moderator', 'Undangan', 'Lainnya']
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const emptyForm = () => ({
  id: '',
  perusahaan: 'Armeni',
  kegiatan: '',
  tanggal: today(),
  tanggal_mulai: today(),
  tanggal_selesai: today(),
  jumlah_peserta: 20,
  jenis_dokumen: 'Daftar Hadir',
  jenis_daftar: 'Peserta',
  nama_peserta: [],
  file_nama: '',
})
const loadRecords = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}
const formatDate = (value) => {
  if (!value) return '-'
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function DaftarHadir({ onKembali }) {
  const [records, setRecords] = useState(loadRecords)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('Semua jenis')
  const [filterPerusahaan, setFilterPerusahaan] = useState('Semua perusahaan')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }, [records])

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...records]
      .filter((r) => filterJenis === 'Semua jenis' || r.jenis_dokumen === filterJenis)
      .filter((r) => filterPerusahaan === 'Semua perusahaan' || r.perusahaan === filterPerusahaan)
      .filter((r) => !q || [r.kegiatan, r.perusahaan, r.jenis_dokumen, r.jenis_daftar]
        .some((v) => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''))
  }, [records, search, filterJenis, filterPerusahaan])

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function bukaForm(record = null) {
    setError('')
    setNotice('')
    if (record) {
      setForm({ ...emptyForm(), ...record, nama_peserta: record.nama_peserta || [] })
      setEditingId(record.id)
    } else {
      setForm(emptyForm())
      setEditingId('')
    }
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function bacaFilePeserta(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      const names = rows.slice(1).map((row) => String(row[0] ?? '').trim()).filter(Boolean)
      setForm((prev) => ({ ...prev, nama_peserta: names, jumlah_peserta: names.length, file_nama: file.name }))
      setError('')
    } catch {
      setError('File gagal dibaca. Periksa format Excel atau CSV.')
    }
  }

  function simpanData(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!form.kegiatan.trim()) {
      setError('Nama kegiatan wajib diisi.')
      return
    }
    if (form.jenis_dokumen === 'Daftar Hadir' && !form.tanggal) {
      setError('Tanggal kegiatan wajib diisi.')
      return
    }
    if (form.jenis_dokumen === 'Tanda Terima Seminar Kit') {
      if (!form.tanggal_mulai || !form.tanggal_selesai) {
        setError('Tanggal mulai dan selesai wajib diisi.')
        return
      }
      if (form.tanggal_selesai < form.tanggal_mulai) {
        setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.')
        return
      }
    }
    const now = new Date().toISOString()
    const data = {
      ...form,
      id: editingId || (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      jumlah_peserta: Math.max(1, Number(form.jumlah_peserta) || 1),
      created_at: editingId ? (records.find((r) => r.id === editingId)?.created_at || now) : now,
      updated_at: now,
    }
    setRecords((prev) => editingId ? prev.map((r) => r.id === editingId ? data : r) : [data, ...prev])
    setNotice(editingId ? 'Data berhasil diperbarui.' : 'Data berhasil disimpan.')
    setShowForm(false)
    setEditingId('')
  }

  function hapusData(record) {
    if (!window.confirm(`Hapus data "${record.kegiatan}"? Data yang dihapus tidak dapat dikembalikan.`)) return
    setRecords((prev) => prev.filter((r) => r.id !== record.id))
    setNotice('Data berhasil dihapus.')
  }

  function duplikatData(record) {
    const clone = { ...record, id: '', kegiatan: `${record.kegiatan} (Salinan)`, created_at: '', updated_at: '' }
    setForm({ ...emptyForm(), ...clone, id: '' })
    setEditingId('')
    setShowForm(true)
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function unduhPDF(record, e) {
    e?.preventDefault?.()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(apiUrl('/api/daftar-hadir/pdf'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perusahaan: record.perusahaan,
          kegiatan: record.kegiatan,
          tanggal: record.tanggal || null,
          tanggal_mulai: record.jenis_dokumen === 'Tanda Terima Seminar Kit' ? record.tanggal_mulai : null,
          tanggal_selesai: record.jenis_dokumen === 'Tanda Terima Seminar Kit' ? record.tanggal_selesai : null,
          jumlah_peserta: Number(record.jumlah_peserta),
          jenis_dokumen: record.jenis_dokumen,
          jenis_daftar: record.jenis_daftar,
          nama_peserta: record.nama_peserta || [],
        }),
      })
      if (!response.ok) {
        let message = 'Gagal membuat PDF. Periksa data dan server.'
        try { const body = await response.json(); message = body.detail || message } catch {}
        throw new Error(message)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const safeName = String(record.kegiatan || 'dokumen').replace(/[^\w-]+/g, '-').slice(0, 60)
      link.download = `${record.jenis_dokumen === 'Daftar Hadir' ? 'Daftar-Hadir' : 'Tanda-Terima-Seminar-Kit'}-${safeName}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setError(err.message || 'Tidak dapat terhubung ke backend.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F6FA] p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px]">
        <button onClick={onKembali} className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <ArrowLeft size={18} /> Kembali ke Dashboard
        </button>

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-[#172B4D] p-3.5 text-amber-300"><ClipboardList size={27} /></div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Generator Daftar Hadir & Seminar Kit</h1>
              <p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">Kelola data kegiatan yang pernah dibuat, edit kapan saja, lalu buat ulang PDF.</p>
            </div>
          </div>
          <button onClick={() => bukaForm()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#172B4D] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#243d66]">
            <Plus size={19} /> Buat Data Baru
          </button>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice}</div>}

        {showForm && (
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold">{editingId ? 'Edit Data Kegiatan' : 'Buat Data Kegiatan Baru'}</h2>
                <p className="mt-1 text-sm text-slate-500">Data disimpan agar dapat dibuka dan direvisi kembali.</p>
              </div>
              <button type="button" onClick={() => { setShowForm(false); setError('') }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup form"><X size={20} /></button>
            </div>

            <form onSubmit={simpanData} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">Perusahaan / Kop Surat</label>
                  <select value={form.perusahaan} onChange={(e) => update('perusahaan', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-700">
                    {perusahaanList.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold">Jenis Dokumen</label>
                  <select value={form.jenis_dokumen} onChange={(e) => update('jenis_dokumen', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-700">
                    {jenisDokumenList.map((j) => <option key={j}>{j}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold">Nama Kegiatan</label>
                  <input required maxLength={200} value={form.kegiatan} onChange={(e) => update('kegiatan', e.target.value)} placeholder="Contoh: Rapat Koordinasi Regional" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-700" />
                </div>
                {form.jenis_dokumen === 'Daftar Hadir' ? (
                  <div>
                    <label className="mb-2 block text-sm font-bold">Tanggal Kegiatan</label>
                    <input type="date" required value={form.tanggal} onChange={(e) => update('tanggal', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-700" />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-bold">Tanggal Mulai Pembagian</label>
                      <input type="date" required value={form.tanggal_mulai} onChange={(e) => update('tanggal_mulai', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-700" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold">Tanggal Selesai Pembagian</label>
                      <input type="date" required min={form.tanggal_mulai || undefined} value={form.tanggal_selesai} onChange={(e) => update('tanggal_selesai', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-700" />
                    </div>
                  </>
                )}
                <div>
                  <label className="mb-2 block text-sm font-bold">Jenis Daftar</label>
                  <select value={form.jenis_daftar} onChange={(e) => update('jenis_daftar', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-700">
                    {jenisDaftarList.map((j) => <option key={j}>{j}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold">Jumlah Peserta / Baris</label>
                  <input type="number" required min="1" max="500" value={form.jumlah_peserta} onChange={(e) => update('jumlah_peserta', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-700" />
                </div>
                <div className="md:col-span-2 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Butuh format daftar nama?</p>
                      <p className="mt-1 text-sm leading-5 text-slate-600">Unduh template Excel, isi nama peserta pada kolom A, lalu unggah kembali di bawah ini.</p>
                    </div>
                    <a
                      href="/template-daftar-hadir.xlsx"
                      download
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-[#172B4D] hover:bg-blue-100"
                    >
                      <Download size={17} /> Download Template Excel
                    </a>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold">Upload Daftar Nama (Opsional)</label>
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={bacaFilePeserta} className="w-full rounded-xl border border-slate-300 p-3 text-sm" />
                  {form.file_nama && <p className="mt-2 text-sm font-medium text-emerald-700">{form.file_nama} — {form.nama_peserta.length} nama tersimpan</p>}
                  {form.nama_peserta?.length > 0 && (
                    <div className="mt-3 max-h-44 overflow-auto rounded-xl border border-slate-200 p-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Pratinjau nama peserta ({form.nama_peserta.length})</p>
                      {form.nama_peserta.slice(0, 12).map((nama, i) => <p key={`${nama}-${i}`} className="border-b border-slate-100 py-1.5 text-sm">{i + 1}. {nama}</p>)}
                      {form.nama_peserta.length > 12 && <p className="pt-2 text-xs text-slate-500">dan {form.nama_peserta.length - 12} nama lainnya...</p>}
                    </div>
                  )}
                  <p className="mt-2 text-xs leading-5 text-slate-500">Saat edit, daftar nama yang sudah tersimpan tetap dipakai jika tidak mengunggah file baru.</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button type="button" onClick={() => { setShowForm(false); setError('') }} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Batal</button>
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#172B4D] px-5 py-3 text-sm font-bold text-white hover:bg-[#243d66]"><Save size={17} /> {editingId ? 'Simpan Perubahan' : 'Simpan Data'}</button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-extrabold">Data yang Pernah Dibuat</h2>
                <p className="mt-1 text-sm text-slate-500">Buka kembali data untuk mengedit, menduplikasi, atau membuat ulang PDF.</p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3.5 py-2 text-sm font-bold text-slate-700">{filteredRecords.length} data</span>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px_220px]">
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama kegiatan..." className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-700" />
              </div>
              <select value={filterPerusahaan} onChange={(e) => setFilterPerusahaan(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-700">
                <option>Semua perusahaan</option>{perusahaanList.map((p) => <option key={p}>{p}</option>)}
              </select>
              <select value={filterJenis} onChange={(e) => setFilterJenis(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-700">
                <option>Semua jenis</option>{jenisDokumenList.map((j) => <option key={j}>{j}</option>)}
              </select>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><FileText size={26} /></div>
              <h3 className="text-base font-extrabold">{records.length ? 'Data tidak ditemukan' : 'Belum ada data kegiatan'}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{records.length ? 'Coba ubah kata kunci atau filter yang dipilih.' : 'Klik “Buat Data Baru” untuk menyimpan kegiatan pertama. Data akan tersedia di tabel ini untuk diedit kembali.'}</p>
              {!records.length && <button onClick={() => bukaForm()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#172B4D] px-4 py-3 text-sm font-bold text-white"><Plus size={17} /> Buat Data Baru</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left">
                <thead className="bg-slate-50">
                  <tr className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">Tanggal</th>
                    <th className="px-5 py-4">Nama Kegiatan</th>
                    <th className="px-5 py-4">Perusahaan</th>
                    <th className="px-5 py-4">Jenis Dokumen</th>
                    <th className="px-5 py-4">Jumlah</th>
                    <th className="px-5 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="align-middle hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">{formatDate(r.jenis_dokumen === 'Daftar Hadir' ? r.tanggal : r.tanggal_mulai)}{r.jenis_dokumen === 'Tanda Terima Seminar Kit' && <span className="block pt-1 text-xs font-medium text-slate-400">s.d. {formatDate(r.tanggal_selesai)}</span>}</td>
                      <td className="max-w-[300px] px-5 py-4"><p className="font-bold text-slate-900">{r.kegiatan}</p><p className="mt-1 text-xs text-slate-500">{r.jenis_daftar || 'Peserta'}</p></td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-600">{r.perusahaan}</td>
                      <td className="px-5 py-4"><span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700">{r.jenis_dokumen}</span></td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">{r.jumlah_peserta} baris</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button title="Edit data" onClick={() => bukaForm(r)} className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><Pencil size={16} /></button>
                          <button title="Duplikat data" onClick={() => duplikatData(r)} className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-100"><Copy size={16} /></button>
                          <button title="Buat ulang PDF" disabled={loading} onClick={() => unduhPDF(r)} className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"><Download size={16} /></button>
                          <button title="Hapus data" onClick={() => hapusData(r)} className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-col justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs font-medium text-slate-500 sm:flex-row">
            <span>Data disimpan pada browser yang digunakan saat ini.</span>
            <span><CalendarDays size={13} className="mr-1 inline" /> Diperbarui saat data disimpan</span>
          </div>
        </section>
      </div>
    </main>
  )
}
