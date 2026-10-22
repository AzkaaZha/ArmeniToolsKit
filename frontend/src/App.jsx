
import { useState } from 'react'
import DaftarHadir from './DaftarHadir'
import SuratMenyurat from './SuratMenyurat'
import logo from './assets/logo.png'
import {
  LayoutDashboard,
  ClipboardList,
  ReceiptText,
  Building2,
  History,
  Settings,
  Bell,
  Files,
  Menu,
  X,
  Mail,
  ChevronRight,
  Sparkles,
  Hash,
} from 'lucide-react'

const tools = [
  {
    title: 'Generator Daftar Hadir & Semkit',
    description:
      'Buat daftar hadir dan seminar kit kegiatan dan event dalam format PDF yang siap dicetak.',
    icon: ClipboardList,
    status: 'Tersedia',
    color: 'bg-blue-50 text-blue-700',
    available: true,
    action: 'daftar-hadir',
  },
  {
    title: 'Generator Invoice',
    description:
      'Buat invoice perusahaan dengan format yang praktis dan konsisten.',
    icon: ReceiptText,
    status: 'Segera Hadir',
    color: 'bg-amber-50 text-amber-700',
    available: false,
  },
  {
    title: 'Generator Nomor Surat',
    description:
      'Generate nomor surat otomatis untuk empat perusahaan, lengkap dengan pencarian dan riwayat nomor.',
    icon: Hash,
    status: 'Tersedia',
    color: 'bg-emerald-50 text-emerald-700',
    available: true,
    action: 'nomor-surat',
  },
]

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '#dashboard' },
  { label: 'Generator Dokumen', icon: Files, href: '#tools' },
  { label: 'Data Perusahaan', icon: Building2, href: '#perusahaan' },
  { label: 'Riwayat Dokumen', icon: History, href: '#riwayat' },
  { label: 'Pengaturan', icon: Settings, href: '#pengaturan' },
]

function App() {
  const [halaman, setHalaman] = useState('dashboard')
  const [menuMobile, setMenuMobile] = useState(false)
  const [menuAktif, setMenuAktif] = useState('Dashboard')

  if (halaman === 'daftar-hadir') {
    return <DaftarHadir onKembali={() => setHalaman('dashboard')} />
  }

  if (halaman === 'nomor-surat') {
    return <SuratMenyurat onKembali={() => setHalaman('dashboard')} />
  }

  const SidebarContent = ({ mobile = false }) => (
    <>
      <div className="flex items-center gap-3 px-1">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-300 p-1.5">
          <img
            src={logo}
            alt="Logo Armeni"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight text-white">
            Armeni ToolsKit
          </h1>
          <p className="mt-1 text-[11px] font-bold tracking-[0.16em] text-amber-300">
            INTERNAL TOOLS
          </p>
        </div>

        {mobile && (
          <button
            onClick={() => setMenuMobile(false)}
            className="ml-auto rounded-xl p-2 text-slate-300 hover:bg-white/10"
            aria-label="Tutup menu"
          >
            <X size={21} />
          </button>
        )}
      </div>

      <div className="mt-10">
        <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
          Menu Utama
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = menuAktif === item.label

            return (
              <a
                key={item.label}
                href={item.href}
                onClick={() => {
                  setMenuAktif(item.label)
                  if (mobile) setMenuMobile(false)
                }}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-3.5 text-[14px] transition ${
                  active
                    ? 'bg-white/10 font-bold text-white'
                    : 'font-medium text-slate-300 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <Icon
                  size={20}
                  className={
                    active
                      ? 'text-amber-300'
                      : 'text-slate-400 group-hover:text-white'
                  }
                />
                <span>{item.label}</span>
                {active && (
                  <ChevronRight
                    size={17}
                    className="ml-auto text-slate-400"
                  />
                )}
              </a>
            )
          })}
        </nav>
      </div>

      <div className="mt-auto pt-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300">
            <Building2 size={21} />
          </div>
          <p className="text-[14px] font-bold text-white">
            Armeni Sejahtera Kreasi
          </p>
          <p className="mt-1 text-[13px] leading-5 text-slate-400">
            Internal Operations Platform
          </p>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-slate-400">
              Workspace internal
            </span>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-slate-900 md:flex">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col bg-[#172B4D] px-5 py-6 md:flex">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      {menuMobile && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-slate-950/60"
            onClick={() => setMenuMobile(false)}
            aria-label="Tutup menu"
          />
          <aside className="relative flex h-full w-[285px] flex-col bg-[#172B4D] px-5 py-6 shadow-2xl">
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      <main id="dashboard" className="min-w-0 flex-1">
        {/* Header */}
        <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50 md:hidden"
              onClick={() => setMenuMobile(true)}
              aria-label="Buka menu"
            >
              <Menu size={21} />
            </button>

            <div>
              <p className="text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
                Dashboard
              </p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Pusat tools operasional perusahaan
              </p>
            </div>
          </div>

          <button
            className="relative rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50"
            aria-label="Notifikasi"
            title="Notifikasi"
          >
            <Bell size={20} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-amber-500" />
          </button>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-8 p-5 sm:p-7 lg:p-10">
          {/* Welcome banner */}
          <section className="relative overflow-hidden rounded-[28px] bg-[#172B4D] px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10 lg:px-10">
            <div className="pointer-events-none absolute -right-14 -top-24 h-72 w-72 rounded-full border-[42px] border-white/[0.04]" />
            <div className="pointer-events-none absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-amber-300/[0.08] blur-3xl" />

            <div className="relative max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2 text-xs font-bold tracking-[0.1em] text-amber-300">
                <Sparkles size={15} />
                ARMENI TOOLSKIT
              </div>

              <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[42px]">
                Semua tools kerja,
                <span className="block text-amber-300">
                  dalam satu tempat.
                </span>
              </h2>

              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-300 sm:text-[17px]">
                Akses alat bantu administrasi dan operasional perusahaan
                dengan lebih cepat, praktis, dan terorganisir.
              </p>

              <button
                onClick={() => {
                  setMenuAktif('Generator Dokumen')
                  document.getElementById('tools')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }}
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-extrabold text-[#172B4D] transition hover:bg-amber-200"
              >
                Lihat Semua Tools
                <ChevronRight size={18} />
              </button>
            </div>
          </section>

          {/* Tools: langsung tampil tanpa summary dan riwayat */}
          <section id="tools" className="scroll-mt-28">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#172B4D] text-amber-300">
                    <Files size={23} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-[27px]">
                      Generator Tools
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">
                      Pilih tools yang kamu butuhkan.
                    </p>
                  </div>
                </div>
              </div>

              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600">
                {tools.length} tools
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {tools.map((tool, index) => {
                const Icon = tool.icon

                return (
                  <article
                    key={tool.title}
                    className="group flex min-h-[300px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg sm:p-7"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tool.color} transition group-hover:scale-105`}
                      >
                        <Icon size={27} strokeWidth={2.2} />
                      </div>

                      <span
                        className={`rounded-full px-3.5 py-2 text-xs font-bold ${
                          tool.available
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {tool.status}
                      </span>
                    </div>

                    <p className="mt-6 text-xs font-extrabold tracking-[0.14em] text-slate-400">
                      TOOL {String(index + 1).padStart(2, '0')}
                    </p>

                    <h4 className="mt-2 text-xl font-extrabold leading-snug tracking-tight text-slate-950 sm:text-[22px]">
                      {tool.title}
                    </h4>

                    <p className="mt-3 flex-1 text-[15px] font-medium leading-7 text-slate-600">
                      {tool.description}
                    </p>

                    {tool.available ? (
                      <button
                        onClick={() => setHalaman(tool.action)}
                        className="mt-7 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-[#172B4D] px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#243D66] focus:outline-none focus:ring-4 focus:ring-blue-100"
                      >
                        Buka {tool.title}
                        <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button
                        disabled
                        className="mt-7 flex min-h-[50px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-[15px] font-bold text-slate-400"
                      >
                        Segera Hadir
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          <footer className="border-t border-slate-200 pt-5 text-sm font-medium text-slate-500">
            <div className="flex flex-col justify-between gap-2 sm:flex-row">
              <p>© {new Date().getFullYear()} Armeni ToolsKit</p>
              <p>Internal Operations Platform · Armeni Sejahtera Kreasi</p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
