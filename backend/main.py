
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
