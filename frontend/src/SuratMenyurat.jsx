import { useEffect, useMemo, useState } from 'react'
import { apiUrl } from './api'
import { ArrowLeft, Hash, Copy, Check, Trash2, RefreshCw, Search, Filter } from 'lucide-react'

const API = apiUrl('/api/nomor-surat')
const PT = [
  { kode: 'ASK', nama: 'Armeni Sejahtera Kreasi' },
  { kode: 'ACP', nama: 'Arka Creative Production' },
  { kode: 'PKB', nama: 'Kreasi Pemuda Perkasa' },
  { kode: 'KPP', nama: 'Pesona Kreasi Bangsa' },
]
const JENIS = [
  ['SPD','Surat Perjalanan Dinas'],['SKK','Surat Keterangan Kerja'],['SKP','Surat Keterangan Penghasilan'],
  ['SBA','Surat Berita Acara'],['STB','Surat Terima Barang'],['SPK','Surat Penawaran Kualifikasi'],
  ['SPH','Surat Penawaran Harga'],['SPP','Surat Permohonan Pembayaran'],['KWT','Kuitansi'],['INV','Invoice'],
  ['UM','Umum'],['F','Faktur'],['SP','Surat Pernyataan'],['DKH','Daftar Kuantitas dan Harga'],
  ['SPL','Surat Pernyataan Lainnya'],['ST','Surat Spesifikasi Teknis'],['JP','Jadwal Pekerjaan'],
  ['SK','Surat Kuasa'],['SKS','Surat Klarifikasi SP2DK'],
].map(([kode,nama])=>({kode,nama}))
const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const inputClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const dateLabel = v => { if(!v)return '-'; const [y,m,d]=v.split('-'); return `${d}/${m}/${y}` }

export default function SuratMenyurat({ onKembali }) {
  const [perusahaan,setPerusahaan]=useState('ASK')
  const [filterPT,setFilterPT]=useState('ALL')
  const [tanggal,setTanggal]=useState(today())
  const [kodeJenis,setKodeJenis]=useState('SKK')
  const [kl,setKl]=useState('')
  const [riwayat,setRiwayat]=useState([])
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [nomor,setNomor]=useState('')
  const [pesan,setPesan]=useState('')
  const [copied,setCopied]=useState('')
  const [q,setQ]=useState('')

  async function muatRiwayat(){
    try { const r=await fetch(`${API}?${filterPT==='ALL'?'':'perusahaan='+encodeURIComponent(filterPT)+'&'}q=${encodeURIComponent(q)}`); if(!r.ok) throw Error('Backend belum berjalan.'); setRiwayat(await r.json()); setError('') }
    catch(e){ setError(e.message) }
  }
  useEffect(()=>{ muatRiwayat() },[filterPT])
  async function generate(e){
    e.preventDefault(); setError(''); setPesan(''); setNomor(''); setLoading(true)
    try {
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({perusahaan,tanggal,kode_jenis:kodeJenis,kl})})
      const d=await r.json(); if(!r.ok) throw Error(d.detail||'Nomor gagal dibuat')
      setNomor(d.nomor); setPesan('Nomor berhasil dibuat.'); setFilterPT('ALL'); await muatRiwayat()
    } catch(e){setError(e.message)} finally{setLoading(false)}
  }
  async function salin(value){try{await navigator.clipboard.writeText(value);setCopied(value);setPesan('Nomor berhasil disalin.');setTimeout(()=>setCopied(''),1500)}catch{setError('Tidak bisa menyalin otomatis. Silakan salin manual.')}}
  async function hapus(item){if(!confirm(`Hapus nomor ${item.nomor} dari riwayat?`))return;try{const r=await fetch(`${API}/${item.id}`,{method:'DELETE'});const d=await r.json();if(!r.ok)throw Error(d.detail||'Gagal menghapus');await muatRiwayat()}catch(e){setError(e.message)}}
  const shown = useMemo(()=>riwayat.filter(x=>!q || [x.nomor,x.kl,x.kode_jenis,x.nama_jenis,x.perusahaan].some(v=>String(v||'').toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>a.tanggal.localeCompare(b.tanggal)||a.perusahaan.localeCompare(b.perusahaan)||a.id-b.id),[riwayat,q])
  return <main className="min-h-screen bg-[#F5F7FB] p-3 text-slate-800 sm:p-5 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-4">
      <button onClick={onKembali} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"><ArrowLeft size={17}/> Kembali ke Dashboard</button>
      <header className="rounded-3xl bg-[#172B4D] p-5 text-white sm:p-6"><div className="flex items-center gap-3"><span className="rounded-2xl bg-amber-300 p-3 text-[#172B4D]"><Hash size={24}/></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">Armeni ToolsKit</p><h1 className="mt-1 text-2xl font-bold">Generator Nomor Surat</h1></div></div><p className="mt-2 text-sm text-slate-300">Pilih perusahaan, tanggal, dan jenis surat. Kode urutan tambahan dibuat otomatis.</p></header>
      {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.7fr)]">
        <form onSubmit={generate} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div><h2 className="text-lg font-bold">Generate nomor baru</h2><p className="mt-1 text-sm text-slate-500">Nomor utama dan kode surat lanjutan dihitung otomatis.</p></div>
          <label className="block text-sm font-semibold">Perusahaan *<select required value={perusahaan} onChange={e=>{setPerusahaan(e.target.value);setNomor('')}} className={inputClass}>{PT.map(x=><option key={x.kode} value={x.kode}>{x.nama} ({x.kode})</option>)}</select></label>
          <label className="block text-sm font-semibold">Tanggal surat *<input required type="date" value={tanggal} onChange={e=>{setTanggal(e.target.value);setNomor('')}} className={inputClass}/></label>
          <label className="block text-sm font-semibold">Jenis surat *<select required value={kodeJenis} onChange={e=>{setKodeJenis(e.target.value);setNomor('')}} className={inputClass}>{JENIS.map(x=><option key={x.kode} value={x.kode}>{x.nama} ({x.kode})</option>)}</select></label>
          <label className="block text-sm font-semibold">Kode K/L atau instansi *<input required value={kl} onChange={e=>setKl(e.target.value)} placeholder="Contoh: KEMENDES, BAWASLU, DPMPTSP" className={inputClass}/><span className="mt-1 block text-xs font-normal text-slate-500">Kode instansi menjadi bagian nomor sesuai pola perusahaan.</span></label>
          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Kode jenis surat diambil otomatis dari dropdown. Jika pada tanggal yang sama ada surat kedua atau berikutnya untuk PT yang sama, kode tambahannya ditentukan otomatis.</div>
          <button disabled={loading} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#172B4D] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#243D66] disabled:cursor-wait disabled:opacity-70"><Hash size={17}/>{loading?'Membuat nomor...':'Generate Nomor Surat'}</button>
          {nomor&&<section className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">Nomor surat berhasil dibuat</p><p className="mt-2 break-all font-mono text-base font-bold text-slate-900">{nomor}</p><button type="button" onClick={()=>salin(nomor)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#172B4D] px-3 py-2 text-sm font-semibold text-white">{copied===nomor?<Check size={15}/>:<Copy size={15}/>} Salin Nomor</button>{pesan&&<p className="mt-2 text-xs text-slate-600">{pesan}</p>}</section>}
        </form>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Daftar Nomor Surat</h2><p className="mt-1 text-sm text-slate-500">Semua nomor tersusun berdasarkan tanggal, dari yang paling awal.</p></div><button onClick={muatRiwayat} title="Muat ulang" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><RefreshCw size={16}/></button></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari nomor, instansi, jenis..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"/></label><label className="relative block"><Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><select value={filterPT} onChange={e=>setFilterPT(e.target.value)} className="w-full appearance-none rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"><option value="ALL">Semua perusahaan</option>{PT.map(x=><option key={x.kode} value={x.kode}>{x.nama} ({x.kode})</option>)}</select></label></div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Tanggal</th><th className="px-3 py-3">PT</th><th className="px-3 py-3">Jenis Surat</th><th className="px-3 py-3">Nomor Surat</th><th className="px-3 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{shown.map(item=><tr key={item.id} className="align-top hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-3">{dateLabel(item.tanggal)}</td><td className="px-3 py-3 font-semibold">{item.perusahaan}</td><td className="px-3 py-3"><div>{item.nama_jenis}</div><div className="mt-1 text-xs text-slate-400">{item.kode_jenis}</div></td><td className="px-3 py-3"><span className="break-all font-mono text-xs font-semibold sm:text-sm">{item.nomor}</span></td><td className="px-3 py-3"><div className="flex justify-end gap-1"><button onClick={()=>salin(item.nomor)} title="Salin nomor" className="rounded-lg p-2 hover:bg-blue-50">{copied===item.nomor?<Check size={15}/>:<Copy size={15}/>}</button><button onClick={()=>hapus(item)} title="Hapus nomor" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15}/></button></div></td></tr>)}{shown.length===0&&<tr><td colSpan="5" className="px-3 py-10 text-center text-sm text-slate-500">Belum ada nomor surat yang cocok.</td></tr>}</tbody></table></div>
          <p className="mt-3 text-xs text-slate-500">Total {shown.length} nomor surat</p>
        </section>
      </div>
    </div>
  </main>
}
