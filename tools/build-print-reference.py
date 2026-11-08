"""Rebuild both one-page reference PDFs with ReportLab 4.4.9."""

from pathlib import Path

from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas


OUTPUT = Path(__file__).resolve().parents[1] / "assets"


def make_sheet(name, slug, size, dimensions):
    width, height = size
    mid_x, mid_y = width / 2, height / 2
    left = 25 * mm
    pdf = Canvas(str(OUTPUT / f"print-scale-{slug}.pdf"), pagesize=size)
    pdf.setTitle(f"{name} print scale and edge check | Printer Resolve")
    pdf.setAuthor("Printer Resolve")
    pdf.setCreator("Printer Resolve")
    pdf.setSubject("A 100 mm reference line and four sets of edge marks")

    def label(x, y, value, font="Helvetica", points=10, grey=0.13):
        pdf.setFillGray(grey)
        pdf.setFont(font, points)
        pdf.drawString(x, y, value)

    def section(top, title, lines):
        label(left, top, title, "Helvetica-Bold", 13)
        for index, line in enumerate(lines, 1):
            label(left, top - index * 15, line)

    label(left, height - 32 * mm, "PRINTER RESOLVE", "Helvetica-Bold", 10)
    label(left, height - 46 * mm, "Print scale and edge check", "Helvetica-Bold", 23)
    label(left, height - 55 * mm, f"{name}   /   {dimensions} mm   /   Portrait")
    section(height - 73 * mm, "Print one copy", [
        "Load the paper size named above. Select the same size in the print dialog.",
        "For the first print, choose Actual size or 100% and turn off borderless expansion.",
    ])

    # The centers of these two end ticks are exactly 100 mm apart.
    start, end = mid_x - 50 * mm, mid_x + 50 * mm
    pdf.setStrokeGray(0)
    pdf.setLineWidth(0.26 * mm)
    pdf.line(start, mid_y, end, mid_y)
    for x in (start, end):
        pdf.line(x, mid_y - 3 * mm, x, mid_y + 3 * mm)
    pdf.setFont("Helvetica-Bold", 13)
    pdf.setFillGray(0.1)
    pdf.drawCentredString(mid_x, mid_y + 7 * mm, "100 mm")
    pdf.setFont("Helvetica", 9)
    pdf.drawCentredString(mid_x, mid_y - 10 * mm, "Measure from the center of one end tick to the other.")

    # At each edge, the 5, 10 and 15 mm marks are 4, 8 and 12 mm long.
    for distance, length in ((5, 4), (10, 8), (15, 12)):
        d, half = distance * mm, length * mm / 2
        for y in (d, height - d):
            pdf.line(mid_x - half, y, mid_x + half, y)
        for x in (d, width - d):
            pdf.line(x, mid_y - half, x, mid_y + half)

    section(mid_y - 28 * mm, "Read the edges", [
        "Each edge has three marks. From the paper edge inward, the shortest is at 5 mm,",
        "the middle one at 10 mm and the longest at 15 mm in the PDF.",
        "Circle any side that lost a mark, and record your measured line length below.",
    ])
    label(left, mid_y - 58 * mm, "Top     /     Bottom     /     Left     /     Right", "Helvetica-Bold", 11)
    label(left, mid_y - 72 * mm, "Measured: __________ mm       Print setting: __________________________")
    section(44 * mm, "Compare one change", [
        "For a second copy, change only scaling to Fit and compare the line and edges.",
        "A shorter line means the page was reduced. Missing marks can also reflect",
        "paper size, alignment or the printable area of the device.",
    ])
    label(left, 19 * mm, "printerresolve.com/tools/page-fit", points=8)
    pdf.showPage()
    pdf.save()


if __name__ == "__main__":
    make_sheet("A4", "a4", A4, "210 x 297")
    make_sheet("US Letter", "letter", letter, "215.9 x 279.4")
