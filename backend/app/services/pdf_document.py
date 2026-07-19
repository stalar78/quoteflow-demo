from html import escape
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from app.schemas.calculation import CalculationResult, QuoteCalculationInput

FONT_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"
REGULAR_FONT_PATH = FONT_DIR / "DejaVuSans.ttf"
BOLD_FONT_PATH = FONT_DIR / "DejaVuSans-Bold.ttf"
FONT_REGULAR = "DejaVuSansQuoteFlow"
FONT_BOLD = "DejaVuSansQuoteFlowBold"


def render_quote_pdf(input_data: QuoteCalculationInput, result: CalculationResult) -> bytes:
    _register_fonts()
    buffer = BytesIO()
    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="QuoteFlow",
        author="QuoteFlow",
        subject="Demonstration quote document",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates(
        [
            PageTemplate(
                id="quote",
                frames=[frame],
                onPage=_draw_page_footer,
            )
        ]
    )

    styles = _styles()
    story = [
        Paragraph("QuoteFlow", styles["Title"]),
        Paragraph("Демонстрационный документ", styles["DemoLabel"]),
        Spacer(1, 5 * mm),
        Paragraph("Проект", styles["SectionTitle"]),
        Paragraph(_safe_text(input_data.projectName.strip()), styles["Body"]),
    ]

    if input_data.client.displayName.strip() or input_data.client.contactNote.strip():
        story.extend([Spacer(1, 3 * mm), Paragraph("Условный клиент", styles["SectionTitle"])])
        if input_data.client.displayName.strip():
            story.append(Paragraph(_safe_text(input_data.client.displayName.strip()), styles["Body"]))
        if input_data.client.contactNote.strip():
            story.append(Paragraph(_safe_text(input_data.client.contactNote.strip()), styles["Muted"]))

    story.extend(
        [
            Spacer(1, 5 * mm),
            Paragraph("Позиции", styles["SectionTitle"]),
            _items_table(input_data, result, styles),
            Spacer(1, 5 * mm),
            _totals_table(result, styles),
        ]
    )

    if input_data.comment.strip():
        story.extend(
            [
                Spacer(1, 5 * mm),
                Paragraph("Комментарий", styles["SectionTitle"]),
                Paragraph(_safe_text(input_data.comment.strip()), styles["Body"]),
            ]
        )

    story.extend(
        [
            Spacer(1, 5 * mm),
            Paragraph(
                "Расчёты необходимо проверять. QuoteFlow не заменяет бухгалтерское, "
                "налоговое или юридическое сопровождение.",
                styles["Disclaimer"],
            ),
        ]
    )

    doc.build(story)
    return buffer.getvalue()


def format_money(minor: int) -> str:
    if not isinstance(minor, int) or minor < 0:
        raise ValueError("Minor units must be a non-negative integer")
    rubles, kopecks = divmod(minor, 100)
    whole = f"{rubles:,}".replace(",", " ")
    return f"{whole},{kopecks:02d} ₽"


def format_basis_points(value: int) -> str:
    if not isinstance(value, int) or value < 0 or value > 10000:
        raise ValueError("Basis points must be 0..10000")
    whole, fraction = divmod(value, 100)
    if fraction == 0:
        return f"{whole}%"
    return f"{whole},{fraction:02d}%"


def _register_fonts() -> None:
    registered = set(pdfmetrics.getRegisteredFontNames())
    if FONT_REGULAR not in registered:
        pdfmetrics.registerFont(TTFont(FONT_REGULAR, str(REGULAR_FONT_PATH)))
    if FONT_BOLD not in registered:
        pdfmetrics.registerFont(TTFont(FONT_BOLD, str(BOLD_FONT_PATH)))


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "Title": ParagraphStyle(
            "QuoteTitle",
            parent=base["Title"],
            fontName=FONT_BOLD,
            fontSize=22,
            leading=27,
            textColor=colors.HexColor("#172033"),
            spaceAfter=4,
        ),
        "DemoLabel": ParagraphStyle(
            "DemoLabel",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#7a4b00"),
            backColor=colors.HexColor("#fff7df"),
            borderColor=colors.HexColor("#ead28b"),
            borderWidth=0.5,
            borderPadding=5,
            spaceAfter=4,
        ),
        "SectionTitle": ParagraphStyle(
            "SectionTitle",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#172033"),
            spaceBefore=2,
            spaceAfter=4,
        ),
        "Body": ParagraphStyle(
            "QuoteBody",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#172033"),
        ),
        "Muted": ParagraphStyle(
            "QuoteMuted",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#475569"),
        ),
        "TableHead": ParagraphStyle(
            "QuoteTableHead",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=8,
            leading=10,
            textColor=colors.white,
        ),
        "TableCell": ParagraphStyle(
            "QuoteTableCell",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#172033"),
        ),
        "TableCellRight": ParagraphStyle(
            "QuoteTableCellRight",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=8,
            leading=10,
            alignment=TA_RIGHT,
            textColor=colors.HexColor("#172033"),
        ),
        "TotalLabel": ParagraphStyle(
            "TotalLabel",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#172033"),
        ),
        "TotalValue": ParagraphStyle(
            "TotalValue",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=9,
            leading=12,
            alignment=TA_RIGHT,
            textColor=colors.HexColor("#172033"),
        ),
        "Disclaimer": ParagraphStyle(
            "Disclaimer",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor("#475569"),
        ),
    }


def _items_table(
    input_data: QuoteCalculationInput,
    result: CalculationResult,
    styles: dict[str, ParagraphStyle],
) -> Table:
    line_by_id = {line.itemId: line for line in result.items}
    rows = [
        [
            Paragraph("№", styles["TableHead"]),
            Paragraph("Наименование", styles["TableHead"]),
            Paragraph("Кол-во", styles["TableHead"]),
            Paragraph("Цена", styles["TableHead"]),
            Paragraph("Скидка", styles["TableHead"]),
            Paragraph("Итого", styles["TableHead"]),
        ]
    ]

    for index, item in enumerate(input_data.items, start=1):
        line = line_by_id[item.id]
        name_parts = [_safe_text(item.name.strip())]
        if item.description.strip():
            name_parts.append(f'<font color="#475569">{_safe_text(item.description.strip())}</font>')
        rows.append(
            [
                Paragraph(str(index), styles["TableCell"]),
                Paragraph("<br/>".join(name_parts), styles["TableCell"]),
                Paragraph(_safe_text(f"{item.quantity} {item.unit.strip()}"), styles["TableCell"]),
                Paragraph(format_money(item.unitPriceMinor), styles["TableCellRight"]),
                Paragraph(format_basis_points(item.discountBasisPoints), styles["TableCellRight"]),
                Paragraph(format_money(line.lineTotalMinor), styles["TableCellRight"]),
            ]
        )

    table = Table(
        rows,
        colWidths=[10 * mm, 66 * mm, 24 * mm, 27 * mm, 21 * mm, 30 * mm],
        repeatRows=1,
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("BACKGROUND", (0, 1), (-1, -1), colors.white),
            ]
        )
    )
    return table


def _totals_table(result: CalculationResult, styles: dict[str, ParagraphStyle]) -> KeepTogether:
    rows = [
        ("Подытог", result.subtotalMinor),
        ("Общая скидка", result.overallDiscountMinor),
        ("После скидки", result.amountAfterDiscountMinor),
        ("Налог", result.taxMinor),
        ("Всего", result.totalMinor),
    ]
    table = Table(
        [
            [
                Paragraph(label, styles["TotalLabel"]),
                Paragraph(format_money(value), styles["TotalValue"]),
            ]
            for label, value in rows
        ],
        colWidths=[55 * mm, 45 * mm],
        hAlign="RIGHT",
    )
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -2), 0.25, colors.HexColor("#e2e8f0")),
                ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor("#0f766e")),
                ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#ecfdf5")),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return KeepTogether([table])


def _safe_text(value: str) -> str:
    return escape(value, quote=True).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br/>")


def _draw_page_footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont(FONT_REGULAR, 8)
    canvas.setFillColor(colors.HexColor("#64748b"))
    canvas.drawRightString(A4[0] - doc.rightMargin, 10 * mm, f"Страница {doc.page}")
    canvas.restoreState()
