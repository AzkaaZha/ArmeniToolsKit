import { useState } from 'react'
import DaftarHadir from './DaftarHadir'
import {
  LayoutDashboard,
  ClipboardList,
  ReceiptText,
  Wallet,
  Building2,
  History,
  Settings,
  Bell,
  FilePlus2,
  Files,
  Menu,
} from 'lucide-react'

const tools = [
  {
    title: 'Generator Daftar Hadir',
    description: 'Buat daftar hadir event siap cetak dalam PDF.',
    icon: ClipboardList,
    status: 'Tersedia',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    title: 'Generator Invoice',
    description: 'Buat invoice perusahaan secara otomatis.',
    icon: ReceiptText,
    status: 'Segera',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    title: 'Generator Tanda Terima Semkit',
    description: 'Buat tanda terima semkit dengan mudah.',
    icon: Wallet,
    status: 'Segera',
    color: 'bg-emerald-50 text-emerald-700',
  },
]

function App() {
  const [halaman, setHalaman] = useState('dashboard')

  if (halaman === 'daftar-hadir') {
    return <DaftarHadir onKembali={() => setHalaman('dashboard')} />
  }
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#172B4D] p-5 text-white md:flex">
        <div className="mb-10 flex items-center gap-3">
          <div className="rounded-xl bg-amber-300 p-2 text-[#172B4D]">
            <img src="../assets/logo.png" alt="Logo Armeni" className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Armeni ToolsKit</h1>
            <p className="text-xs tracking-widest text-amber-300">
              INTERNAL TOOLS
            </p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Menu Utama
        </p>

        <nav className="space-y-2">
          <a href="#dashboard" className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 font-medium">
            <LayoutDashboard size={19} />
            Dashboard
          </a>
          <a href="#tools" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-white/10">
            <Files size={19} />
            Generator Dokumen
          </a>
          <a href="#perusahaan" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-white/10">
            <Building2 size={19} />
            Data Perusahaan
          </a>
          <a href="#riwayat" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-white/10">
            <History size={19} />
            Riwayat Dokumen
          </a>
          <a href="#pengaturan" className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-300 hover:bg-white/10">
            <Settings size={19} />
            Pengaturan
          </a>
        </nav>

        <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">Armeni Sejahtera Kreasi</p>
          <p className="mt-1 text-xs text-slate-400">
            Internal Operations Platform
          </p>
        </div>
      </aside>

      <main id="dashboard" className="min-w-0 flex-1">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 hover:bg-slate-100 md:hidden" aria-label="Menu">
              <Menu size={22} />
            </button>
            <div>
              <p className="font-semibold text-slate-800">Dashboard</p>
              <p className="hidden text-xs text-slate-500 sm:block">
                Pusat tools operasional perusahaan
              </p>
            </div>
          </div>
          <button className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Notifikasi">
            <Bell size={19} />
          </button>
        </header>

        <div className="mx-auto max-w-7xl space-y-8 p-5 md:p-8">
          <section>
            <p className="text-sm font-medium text-amber-700">
              ARMENI TOOLSKIT
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Selamat datang di dashboard!
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Kelola kebutuhan administrasi dan operasional event dari satu tempat.
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Tools Tersedia</p>
                <Files className="text-blue-700" size={22} />
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">1</p>
              <p className="mt-1 text-xs text-slate-500">Generator daftar hadir</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Perusahaan</p>
                <Building2 className="text-amber-600" size={22} />
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">4</p>
              <p className="mt-1 text-xs text-slate-500">Pilihan kop surat</p>
            </div>
          </section>

          <section id="tools">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-[#172B4D] p-2.5 text-white">
                <FilePlus2 size={21} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Generator Dokumen</h3>
                <p className="text-sm text-slate-500">
                  Pilih tools yang ingin kamu gunakan.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {tools.map((tool) => {
                const Icon = tool.icon
                const available = tool.status === 'Tersedia'

                return (
                  <article
                    key={tool.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className={`rounded-xl p-3 ${tool.color}`}>
                        <Icon size={23} />
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        available
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {tool.status}
                      </span>
                    </div>

                    <h4 className="mt-5 font-bold text-slate-900">
                      {tool.title}
                    </h4>
                    <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">
                      {tool.description}
                    </p>

                    {available ? (
                      <button
                        onClick={() => setHalaman('daftar-hadir')}
                        className="mt-5 w-full rounded-xl bg-[#172B4D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#243d66]"
                      >
                        Buka Generator
                      </button>
                    ) : (
                      <button
                        disabled
                        className="mt-5 w-full cursor-not-allowed rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-400"
                      >
                        Segera Hadir
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          <footer className="border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
            Armeni ToolsKit · Internal Operations Platform
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
