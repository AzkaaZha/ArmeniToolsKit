
import { useState } from 'react'
import { ArrowLeft, Download, FileText, LoaderCircle } from 'lucide-react'
import * as XLSX from 'xlsx'

const perusahaanList = [
  'Armeni',
  'Arka Creative Production',
  'Kreasi Pemuda Perkasa',
  'Pesona Kreasi Bangsa',
]

function tanggalHariIni() {
  const sekarang = new Date()
  const tahun = sekarang.getFullYear()
  const bulan = String(sekarang.getMonth() + 1).padStart(2, '0')
  const hari = String(sekarang.getDate()).padStart(2, '0')

  return `${tahun}-${bulan}-${hari}`
}

export default function DaftarHadir({ onKembali }) {
  const [perusahaan, setPerusahaan] = useState('Armeni')
  const [kegiatan, setKegiatan] = useState('')
  const [tanggal, setTanggal] = useState(tanggalHariIni())
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')
  const [jumlahPeserta, setJumlahPeserta] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jenisDaftar, setJenisDaftar] = useState('Peserta')
  const [jenisDokumen, setJenisDokumen] = useState('Daftar Hadir')
  const [namaPeserta, setNamaPeserta] = useState([])
  const [fileNama, setFileNama] = useState('')

  async function bacaFilePeserta(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })

      if (!workbook.SheetNames.length) {
        throw new Error('Sheet Excel tidak ditemukan.')
      }

      // Cari sheet bernama Daftar Nama.
      // Jika tidak ada, gunakan sheet pertama.
      const namaSheet = workbook.SheetNames.find(
        (nama) => nama.trim().toLowerCase() === 'daftar nama',
      ) || workbook.SheetNames[0]

      const sheet = workbook.Sheets[namaSheet]

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      })

      if (!rows.length) {
        throw new Error('File Excel kosong.')
      }

      // Cari kolom Nama berdasarkan header,
      // bukan berdasarkan posisi kolom pertama.
      const header = rows[0].map((nilai) =>
        String(nilai ?? '').trim().toLowerCase(),
      )

      const indeksNama = header.indexOf('nama')

      if (indeksNama === -1) {
        throw new Error(
          'Kolom "Nama" tidak ditemukan. Gunakan template yang tersedia.',
        )
      }

      const names = rows
        .slice(1)
        .map((row) => String(row[indeksNama] ?? '').trim())
        .filter(Boolean)

      if (!names.length) {
        throw new Error('Belum ada nama peserta di dalam file.')
      }

      if (names.length > 10000) {
        throw new Error('Maksimal 10.000 nama peserta.')
      }

      setNamaPeserta(names)
      setJumlahPeserta(names.length)
      setFileNama(file.name)
      setError('')
    } catch (err) {
      setNamaPeserta([])
      setFileNama('')
      setError(
        err.message || 'File gagal dibaca. Periksa format Excel atau CSV.',
      )
      e.target.value = ''
    }
  }

  async function unduhPDF(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!kegiatan.trim()) {
        throw new Error('Nama kegiatan wajib diisi.')
      }

      if (namaPeserta.length === 0 && (
        !jumlahPeserta ||
        Number(jumlahPeserta) < 1 ||
        Number(jumlahPeserta) > 10000
      )) {
        throw new Error('Jumlah peserta harus antara 1 dan 10.000.')
      }

      if (jenisDokumen === 'Daftar Hadir' && !tanggal) {
        throw new Error('Tanggal kegiatan wajib diisi.')
      }

      if (jenisDokumen === 'Tanda Terima Seminar Kit') {
        if (!tanggalMulai || !tanggalSelesai) {
          throw new Error('Tanggal mulai dan selesai wajib diisi.')
        }

        if (tanggalSelesai < tanggalMulai) {
          throw new Error(
            'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.',
          )
        }
      }

      const payload = {
        perusahaan,
        kegiatan: kegiatan.trim(),
        jenis_dokumen: jenisDokumen,
        jenis_daftar: jenisDaftar,
        jumlah_peserta: Number(jumlahPeserta),
        nama_peserta: namaPeserta,

        // Daftar Hadir menggunakan satu tanggal.
        tanggal: jenisDokumen === 'Daftar Hadir' ? tanggal : null,

        // Seminar Kit menggunakan rentang tanggal.
        tanggal_mulai:
          jenisDokumen === 'Tanda Terima Seminar Kit'
            ? tanggalMulai
            : null,

        tanggal_selesai:
          jenisDokumen === 'Tanda Terima Seminar Kit'
            ? tanggalSelesai
            : null,
      }

      const response = await fetch(
        'http://127.0.0.1:8000/api/daftar-hadir/pdf',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      )

      if (!response.ok) {
        let pesan = 'Gagal membuat PDF. Periksa data dan server.'

        try {
          const hasilError = await response.json()

          if (typeof hasilError.detail === 'string') {
            pesan = hasilError.detail
          } else if (Array.isArray(hasilError.detail)) {
            pesan = hasilError.detail
              .map((item) => item.msg)
              .join(', ')
          }
        } catch {
          // Gunakan pesan default jika respons bukan JSON.
        }

        throw new Error(pesan)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download =
        jenisDokumen === 'Tanda Terima Seminar Kit'
          ? 'tanda-terima-seminar-kit.pdf'
          : 'daftar-hadir.pdf'

      document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Tidak dapat terhubung ke backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={onKembali}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Kembali ke Dashboard
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-[#172B4D] p-3 text-white">
            <FileText size={24} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Generator Dokumen
            </h1>
            <p className="text-sm text-slate-500">
              Buat Daftar Hadir atau Tanda Terima Seminar Kit dalam PDF A4.
            </p>
          </div>
        </div>

        <form
          onSubmit={unduhPDF}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {/* Perusahaan */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Perusahaan / Kop Surat
            </label>

            <select
              value={perusahaan}
              onChange={(e) => setPerusahaan(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            >
              {perusahaanList.map((nama) => (
                <option key={nama} value={nama}>
                  {nama}
                </option>
              ))}
            </select>
          </div>

          {/* Nama kegiatan */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Nama Kegiatan
            </label>

            <input
              required
              maxLength={200}
              value={kegiatan}
              onChange={(e) => setKegiatan(e.target.value)}
              placeholder="Contoh: Rapat Koordinasi Regional"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            />
          </div>

          {/* Jenis dokumen: cukup satu pilihan */}
          <div>
            <label
              htmlFor="jenisDokumen"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Jenis Dokumen
            </label>

            <select
              id="jenisDokumen"
              value={jenisDokumen}
              onChange={(e) => setJenisDokumen(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            >
              <option value="Daftar Hadir">Daftar Hadir</option>
              <option value="Tanda Terima Seminar Kit">
                Tanda Terima Seminar Kit
              </option>
            </select>
          </div>

          {/* Tanggal berubah sesuai jenis dokumen */}
          {jenisDokumen === 'Daftar Hadir' ? (
            <div>
              <label
                htmlFor="tanggal"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Tanggal Kegiatan
              </label>

              <input
                id="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
              />
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="tanggalMulai"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Tanggal Mulai Pembagian Seminar Kit
                </label>

                <input
                  id="tanggalMulai"
                  type="date"
                  value={tanggalMulai}
                  onChange={(e) => {
                    setTanggalMulai(e.target.value)

                    if (
                      tanggalSelesai &&
                      tanggalSelesai < e.target.value
                    ) {
                      setTanggalSelesai('')
                    }
                  }}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="tanggalSelesai"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Tanggal Selesai Pembagian Seminar Kit
                </label>

                <input
                  id="tanggalSelesai"
                  type="date"
                  min={tanggalMulai || undefined}
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
                />
              </div>
            </>
          )}

          {/* Jenis daftar */}
          <div>
            <label
              htmlFor="jenisDaftar"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Jenis Daftar
            </label>

            <select
              id="jenisDaftar"
              value={jenisDaftar}
              onChange={(e) => setJenisDaftar(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700"
            >
              <option value="Peserta">Peserta</option>
              <option value="Panitia">Panitia</option>
              <option value="Narasumber">Narasumber</option>
              <option value="Moderator">Moderator</option>
              <option value="Undangan">Undangan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {/* Download template */}
          <div>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/template-daftar-hadir.xlsx'
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download size={18} />
              Download Template Excel
            </button>

            <p className="mt-2 text-xs text-slate-500">
              Isi kolom Nama pada template. Kolom Jabatan dan Instansi
              boleh dikosongkan.
            </p>
          </div>

          {/* Upload Excel */}
          <div>
            <label
              htmlFor="filePeserta"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Upload Daftar Nama (Opsional)
            </label>

            <input
              id="filePeserta"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={bacaFilePeserta}
              className="w-full rounded-xl border border-slate-300 p-3"
            />

            {fileNama && (
              <p className="mt-2 text-sm text-emerald-700">
                {fileNama} — {namaPeserta.length} nama terbaca
              </p>
            )}

            {namaPeserta.length > 0 && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Preview nama peserta
                </p>

                <ul className="space-y-1 text-sm text-slate-600">
                  {namaPeserta.slice(0, 5).map((nama, index) => (
                    <li key={`${index}-${nama}`}>
                      {index + 1}. {nama}
                    </li>
                  ))}
                </ul>

                {namaPeserta.length > 5 && (
                  <p className="mt-2 text-xs text-slate-500">
                    dan {namaPeserta.length - 5} nama lainnya
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setNamaPeserta([])
                    setFileNama('')
                    setJumlahPeserta(20)

                    const input = document.getElementById('filePeserta')
                    if (input) input.value = ''
                  }}
                  className="mt-3 text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  Hapus file yang diunggah
                </button>
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500">
              Jika tidak mengunggah file, tabel akan dibuat dengan
              nama kosong sesuai jumlah peserta.
            </p>
          </div>

          {/* Jumlah peserta */}
          <div>
            <label
              htmlFor="jumlahPeserta"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Jumlah Peserta
            </label>

            <input
              id="jumlahPeserta"
              type="number"
              required
              min="1"
              max="10000"
              value={jumlahPeserta}
              onChange={(e) => setJumlahPeserta(e.target.value)}
              disabled={namaPeserta.length > 0}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-700 disabled:bg-slate-100"
            />

            <p className="mt-1 text-xs text-slate-500">
              Maksimal 10.000 peserta. Jika Excel diunggah, jumlah
              mengikuti nama yang terbaca.
            </p>
          </div>

          {/* Ringkasan */}
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Ringkasan dokumen
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {namaPeserta.length > 0
                ? namaPeserta.length
                : Number(jumlahPeserta) || 0}{' '}
              baris · {jenisDokumen} · {jenisDaftar} · PDF A4
            </p>

            {jenisDokumen === 'Daftar Hadir' ? (
              <p className="mt-1 text-sm text-slate-500">
                Tanggal:{' '}
                {tanggal
                  ? new Date(`${tanggal}T12:00:00`).toLocaleDateString(
                      'id-ID',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      },
                    )
                  : '-'}
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                Rentang:{' '}
                {tanggalMulai && tanggalSelesai
                  ? `${new Date(`${tanggalMulai}T12:00:00`).toLocaleDateString(
                      'id-ID',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      },
                    )} – ${new Date(`${tanggalSelesai}T12:00:00`).toLocaleDateString(
                      'id-ID',
                      {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      },
                    )}`
                  : 'Belum ditentukan'}
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#172B4D] px-4 py-3 font-semibold text-white hover:bg-[#243d66] disabled:opacity-60"
          >
            {loading ? (
              <LoaderCircle size={19} className="animate-spin" />
            ) : (
              <Download size={19} />
            )}

            {loading ? 'Membuat PDF...' : 'Buat dan Unduh PDF'}
          </button>
        </form>
      </div>
    </main>
  )
}
