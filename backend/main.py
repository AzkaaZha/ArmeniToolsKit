
from pathlib import Path
from io import BytesIO
from datetime import date

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    NextPageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from pypdf import PdfReader, PdfWriter
from xml.sax.saxutils import escape


app = FastAPI(
    title="Armeni ToolsKit API",
    description="API internal untuk tools operasional Armeni",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AttendanceRequest(BaseModel):
    perusahaan: str
    kegiatan: str = Field(min_length=1, max_length=200)

    # Tanggal tunggal untuk Daftar Hadir.
    tanggal: date | None = None

    # Rentang tanggal untuk Tanda Terima Seminar Kit.
    tanggal_mulai: date | None = None
    tanggal_selesai: date | None = None

    jumlah_peserta: int = Field(ge=1, le=10000)
    jenis_dokumen: str = "Daftar Hadir"
    jenis_daftar: str = "Peserta"
    nama_peserta: list[str] | None = None

    @model_validator(mode="after")
    def validasi_tanggal(self):
        if self.jenis_dokumen == "Daftar Hadir":
            if self.tanggal is None:
                raise ValueError(
                    "Tanggal kegiatan wajib diisi untuk Daftar Hadir"
                )

        elif self.jenis_dokumen == "Tanda Terima Seminar Kit":
            if self.tanggal_mulai is None:
                raise ValueError(
                    "Tanggal mulai pembagian seminar kit wajib diisi"
                )

            if self.tanggal_selesai is None:
                raise ValueError(
                    "Tanggal selesai pembagian seminar kit wajib diisi"
                )

            if self.tanggal_selesai < self.tanggal_mulai:
                raise ValueError(
                    "Tanggal selesai tidak boleh lebih awal dari tanggal mulai"
                )

        return self


PERUSAHAAN = {
    "Armeni": "Armeni Sejahtera Kreasi",
    "Arka Creative Production": "Arka Creative Production",
    "Kreasi Pemuda Perkasa": "Kreasi Pemuda Perkasa",
    "Pesona Kreasi Bangsa": "Pesona Kreasi Bangsa",
}

FILE_KOP = {
    "Armeni": "kop_armeni.pdf",
    "Arka Creative Production": "kop_arka.pdf",
    "Kreasi Pemuda Perkasa": "kop_kpp.pdf",
    "Pesona Kreasi Bangsa": "kop_pkb.pdf",
}

JENIS_DOKUMEN = [
    "Daftar Hadir",
    "Tanda Terima Seminar Kit",
]

JENIS_DAFTAR = [
    "Peserta",
    "Panitia",
    "Narasumber",
    "Moderator",
    "Undangan",
    "Lainnya",
]


@app.get("/")
def home():
    return {
        "message": "Armeni ToolsKit API berjalan",
        "status": "ok",
    }


@app.post("/api/daftar-hadir/pdf")
def buat_pdf(data: AttendanceRequest):

    if data.perusahaan not in PERUSAHAAN:
        raise HTTPException(
            status_code=400,
            detail="Pilihan perusahaan tidak valid",
        )

    if data.jenis_dokumen not in JENIS_DOKUMEN:
        raise HTTPException(
            status_code=400,
            detail="Pilihan jenis dokumen tidak valid",
        )

    if data.jenis_daftar not in JENIS_DAFTAR:
        raise HTTPException(
            status_code=400,
            detail="Pilihan jenis daftar tidak valid",
        )

    folder_template = Path(__file__).parent / "templates"
    nama_file_kop = FILE_KOP[data.perusahaan]
    kop_path = folder_template / nama_file_kop

    if not kop_path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"File kop perusahaan tidak ditemukan: {nama_file_kop}",
        )

    # Format tanggal dalam bahasa Indonesia.
    nama_bulan = [
        "Januari", "Februari", "Maret", "April",
        "Mei", "Juni", "Juli", "Agustus",
        "September", "Oktober", "November", "Desember",
    ]

    def format_tanggal(tgl: date) -> str:
        return (
            f"{tgl.day} "
            f"{nama_bulan[tgl.month - 1]} "
            f"{tgl.year}"
        )

    # Tentukan tanggal yang akan dicetak.
    if data.jenis_dokumen == "Daftar Hadir":
        tanggal_cetak = format_tanggal(data.tanggal)

    else:
        mulai = data.tanggal_mulai
        selesai = data.tanggal_selesai

        # Jika bulan dan tahun sama, tampilkan ringkas:
        # 22–24 Oktober 2026.
        if mulai.month == selesai.month and mulai.year == selesai.year:
            tanggal_cetak = (
                f"{mulai.day}–{selesai.day} "
                f"{nama_bulan[selesai.month - 1]} "
                f"{selesai.year}"
            )

        # Jika berbeda bulan, tampilkan kedua bulan.
        else:
            tanggal_cetak = (
                f"{format_tanggal(mulai)} – "
                f"{format_tanggal(selesai)}"
            )

    judul_dokumen = (
        f"{data.jenis_dokumen.upper()} "
        f"{data.jenis_daftar.upper()}"
    )

    page_width, page_height = A4
    margin_left = 1.5 * cm
    margin_right = 1.5 * cm
    margin_bottom = 2.8 * cm

    first_top = 4.1 * cm
    next_top = 5.2 * cm

    buffer = BytesIO()
    pdf_final = BytesIO()

    def buat_frame(top_margin, frame_id):
        return Frame(
            margin_left,
            margin_bottom,
            page_width - margin_left - margin_right,
            page_height - top_margin - margin_bottom,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            id=frame_id,
        )

    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin_left,
        rightMargin=margin_right,
        topMargin=first_top,
        bottomMargin=margin_bottom,
        title=judul_dokumen,
    )

    doc.addPageTemplates([
        PageTemplate(
            id="halaman_pertama",
            frames=[buat_frame(first_top, "frame_pertama")],
        ),
        PageTemplate(
            id="halaman_lanjutan",
            frames=[buat_frame(next_top, "frame_lanjutan")],
        ),
    ])

    styles = getSampleStyleSheet()

    judul_style = ParagraphStyle(
        "JudulKegiatan",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.black,
        spaceBefore=0,
        spaceAfter=0,
    )

    tanggal_style = ParagraphStyle(
        "TanggalKegiatan",
        parent=styles["Normal"],
        alignment=TA_CENTER,
        fontName="Helvetica",
        fontSize=12,
        leading=15,
        textColor=colors.black,
    )

    elements = [
        Paragraph(
            escape(judul_dokumen),
            judul_style,
        ),
        Spacer(1, 0.15 * cm),
        Paragraph(
            escape(data.kegiatan),
            judul_style,
        ),
        Spacer(1, 0.15 * cm),
        Paragraph(
            escape(tanggal_cetak),
            tanggal_style,
        ),
        Spacer(1, 0.65 * cm),
        NextPageTemplate("halaman_lanjutan"),
    ]

    # Bersihkan nama peserta yang dikirim dari frontend.
    nama_list = [
        nama.strip()
        for nama in (data.nama_peserta or [])
        if nama and nama.strip()
    ]

    jumlah = len(nama_list) if nama_list else data.jumlah_peserta

    if jumlah < 1 or jumlah > 10000:
        raise HTTPException(
            status_code=400,
            detail="Jumlah peserta harus antara 1 dan 10.000",
        )

    table_data = [[
        "NO",
        "NAMA",
        "JABATAN",
        "INSTANSI",
        "TANDA TANGAN",
        "",
    ]]

    for nomor in range(1, jumlah + 1):
        nama = nama_list[nomor - 1] if nama_list else ""

        if nomor % 2 == 1:
            ttd_kiri = str(nomor)
            ttd_kanan = ""
        else:
            ttd_kiri = ""
            ttd_kanan = str(nomor)

        table_data.append([
            str(nomor),
            Paragraph(escape(nama), styles["Normal"]),
            "",
            "",
            ttd_kiri,
            ttd_kanan,
        ])

    table = Table(
        table_data,
        colWidths=[
            0.8 * cm,
            5.0 * cm,
            3.4 * cm,
            2.8 * cm,
            3.0 * cm,
            3.0 * cm,
        ],
        rowHeights=[0.9 * cm] + [1.25 * cm] * jumlah,
        repeatRows=1,
        hAlign="CENTER",
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D9D9D9")),
        ("SPAN", (4, 0), (5, 0)),
        ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("ALIGN", (0, 1), (0, -1), "CENTER"),
        ("ALIGN", (4, 1), (4, -1), "LEFT"),
        ("ALIGN", (5, 1), (5, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))

    elements.append(table)
    doc.build(elements)

    # Tempelkan kop perusahaan di setiap halaman.
    isi_pdf = PdfReader(buffer)
    kop_pdf = PdfReader(str(kop_path))
    halaman_kop = kop_pdf.pages[0]

    writer = PdfWriter()

    for halaman in isi_pdf.pages:
        halaman.merge_page(halaman_kop, over=False)
        writer.add_page(halaman)

    writer.write(pdf_final)
    pdf_final.seek(0)

    if data.jenis_dokumen == "Tanda Terima Seminar Kit":
        nama_output = "tanda-terima-seminar-kit.pdf"
    else:
        nama_output = "daftar-hadir.pdf"

    return StreamingResponse(
        pdf_final,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{nama_output}"'
            )
        },
        status_code=200,
    )


# --- Generator Nomor Surat (bukan pembuat isi surat) ---
import sqlite3
from pathlib import Path
from datetime import datetime
import re

DB_PATH = Path(__file__).resolve().parent / "nomor_surat.db"
ROMAWI = {1:"I",2:"II",3:"III",4:"IV",5:"V",6:"VI",7:"VII",8:"VIII",9:"IX",10:"X",11:"XI",12:"XII"}
PERUSAHAAN_SURAT = {"ASK":"Armeni Sejahtera Kreasi", "ACP":"Arka Creative Production", "PKB":"Kreasi Pemuda Perkasa", "KPP":"Pesona Kreasi Bangsa"}
JENIS_SURAT = [
    ("SPD", "Surat Perjalanan Dinas"), ("SKK", "Surat Keterangan Kerja"),
    ("SKP", "Surat Keterangan Penghasilan"), ("SBA", "Surat Berita Acara"),
    ("STB", "Surat Terima Barang"), ("SPK", "Surat Penawaran Kualifikasi"),
    ("SPH", "Surat Penawaran Harga"), ("SPP", "Surat Permohonan Pembayaran"),
    ("KWT", "Kuitansi"), ("INV", "Invoice"), ("UM", "Umum"), ("F", "Faktur"),
    ("SP", "Surat Pernyataan"), ("DKH", "Daftar Kuantitas dan Harga"),
    ("SPL", "Surat Pernyataan Lainnya"), ("ST", "Surat Spesifikasi Teknis"),
    ("JP", "Jadwal Pekerjaan"), ("SK", "Surat Kuasa"), ("SKS", "Surat Klarifikasi SP2DK"),
]

def db_surat():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE IF NOT EXISTS nomor_surat (id INTEGER PRIMARY KEY AUTOINCREMENT, perusahaan TEXT NOT NULL, tanggal TEXT NOT NULL, kode_jenis TEXT NOT NULL, nama_jenis TEXT NOT NULL, kl TEXT NOT NULL DEFAULT '', kode_tambahan TEXT NOT NULL DEFAULT '', divisi TEXT NOT NULL DEFAULT '', nomor TEXT NOT NULL, dibuat TEXT NOT NULL)")
    conn.commit()
    return conn

def nomor_format(perusahaan, tanggal, urut, kode_jenis, kl, kode_tambahan="1", divisi=""):
    """Format nomor mengikuti susunan formula tiap sheet; slot tanggal dibuat otomatis."""
    d = datetime.strptime(tanggal, "%Y-%m-%d").date()
    bulan = ROMAWI[d.month]
    urut3 = f"{urut:03d}"
    kl = kl.strip().upper()
    slot = str(kode_tambahan or "1").strip().upper()
    if perusahaan == "ASK":
        # ASK: nomor/K-L-kode jenis.slot/ASK/bulan.tahun
        return f"{urut3}/{kl}-{kode_jenis}.{slot}/ASK/{bulan}.{d.year}"
    if perusahaan == "ACP":
        # ACP: nomor.ACP.slot/kode jenis-K/L/bulan.tahun
        return f"{urut3}.ACP.{slot}/{kode_jenis}-{kl}/{bulan}.{d.year}"
    if perusahaan == "PKB":
        # PKB: nomor.bulan-slot.tahun/K-L.PKB/kode jenis
        return f"{urut3}.{bulan}-{slot}.{d.year}/{kl}.PKB/{kode_jenis}"
    if perusahaan == "KPP":
        # KPP: nomor.tanggal.KPP-kode jenis.slot/bulan.K-L/tahun
        return f"{urut3}.{d.day}.KPP-{kode_jenis}.{slot}/{bulan}.{kl}/{d.year}"
    raise HTTPException(status_code=400, detail="Perusahaan tidak dikenali")

def serialisasi_surat(row): return {k: row[k] for k in row.keys()}

def hitung_ulang_nomor(conn, perusahaan, tahun):
    rows = conn.execute("SELECT * FROM nomor_surat WHERE perusahaan=? AND substr(tanggal,1,4)=? ORDER BY tanggal,id", (perusahaan, tahun)).fetchall()
    tanggal_urut = {}
    tanggal_slot = {}
    for row in rows:
        if row["tanggal"] not in tanggal_urut:
            tanggal_urut[row["tanggal"]] = len(tanggal_urut) + 1
        tanggal_slot[row["tanggal"]] = tanggal_slot.get(row["tanggal"], 0) + 1
        slot_no = tanggal_slot[row["tanggal"]]
        slot = chr(64 + slot_no) if perusahaan in ("ACP", "PKB") and slot_no <= 26 else str(slot_no)
        nomor = nomor_format(row["perusahaan"], row["tanggal"], tanggal_urut[row["tanggal"]], row["kode_jenis"], row["kl"], slot)
        conn.execute("UPDATE nomor_surat SET kode_tambahan=?, nomor=? WHERE id=?", (slot, nomor, row["id"]))

@app.get("/api/nomor-surat/options")
def opsi_nomor_surat():
    return {"perusahaan":[{"kode":k,"nama":v} for k,v in PERUSAHAAN_SURAT.items()], "jenis":[{"kode":k,"nama":v} for k,v in JENIS_SURAT]}

@app.get("/api/nomor-surat")
def riwayat_nomor_surat(q: str = "", perusahaan: str = ""):
    conn = db_surat()
    try:
        sql = "SELECT * FROM nomor_surat WHERE 1=1"; params = []
        if perusahaan: sql += " AND perusahaan=?"; params.append(perusahaan)
        if q.strip():
            sql += " AND (nomor LIKE ? OR kl LIKE ? OR kode_jenis LIKE ? OR nama_jenis LIKE ? OR kode_tambahan LIKE ?)"
            params.extend([f"%{q.strip()}%"]*5)
        sql += " ORDER BY tanggal ASC, perusahaan ASC, id ASC"
        return [serialisasi_surat(r) for r in conn.execute(sql,params).fetchall()]
    finally: conn.close()

@app.post("/api/nomor-surat", status_code=201)
def buat_nomor_surat(data: dict):
    perusahaan = str(data.get("perusahaan", "")).upper()
    tanggal = str(data.get("tanggal", ""))
    kode_jenis = str(data.get("kode_jenis", "")).strip().upper()
    kl = str(data.get("kl", "")).strip()
    if perusahaan not in PERUSAHAAN_SURAT:
        raise HTTPException(400, "Pilih perusahaan yang valid")
    try:
        datetime.strptime(tanggal, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Tanggal tidak valid")
    jenis = dict(JENIS_SURAT).get(kode_jenis)
    if not jenis:
        raise HTTPException(400, "Pilih jenis surat")
    if not kl:
        raise HTTPException(400, "Kode K/L atau instansi wajib diisi")
    conn = db_surat()
    try:
        # Slot tambahan otomatis berdasarkan jumlah surat dari PT yang sama pada tanggal itu.
        jumlah = conn.execute(
            "SELECT COUNT(*) FROM nomor_surat WHERE perusahaan=? AND tanggal=?",
            (perusahaan, tanggal),
        ).fetchone()[0]
        slot_no = jumlah + 1
        # ASK memakai angka pada slot; ACP/PKB memakai A, B, C ...; KPP angka.
        slot = chr(64 + slot_no) if perusahaan in ("ACP", "PKB") and slot_no <= 26 else str(slot_no)
        nomor_utama = conn.execute(
            "SELECT COUNT(DISTINCT tanggal) FROM nomor_surat WHERE perusahaan=? AND substr(tanggal,1,4)=? AND tanggal<?",
            (perusahaan, tanggal[:4], tanggal),
        ).fetchone()[0] + 1
        nomor = nomor_format(perusahaan, tanggal, nomor_utama, kode_jenis, kl, slot)
        cur = conn.execute(
            "INSERT INTO nomor_surat(perusahaan,tanggal,kode_jenis,nama_jenis,kl,kode_tambahan,divisi,nomor,dibuat) VALUES(?,?,?,?,?,?,?,?,?)",
            (perusahaan, tanggal, kode_jenis, jenis, kl, slot, "", nomor, datetime.now().isoformat(timespec="seconds")),
        )
        hitung_ulang_nomor(conn, perusahaan, tanggal[:4])
        conn.commit()
        return serialisasi_surat(conn.execute("SELECT * FROM nomor_surat WHERE id=?", (cur.lastrowid,)).fetchone())
    finally:
        conn.close()

@app.delete("/api/nomor-surat/{surat_id}")
def hapus_nomor_surat(surat_id: int):
    conn = db_surat()
    try:
        row = conn.execute("SELECT perusahaan,tanggal FROM nomor_surat WHERE id=?",(surat_id,)).fetchone()
        if row is None: raise HTTPException(404, "Nomor surat tidak ditemukan")
        conn.execute("DELETE FROM nomor_surat WHERE id=?",(surat_id,))
        hitung_ulang_nomor(conn, row["perusahaan"], row["tanggal"][:4])
        conn.commit()
        return {"ok":True}
    finally: conn.close()
