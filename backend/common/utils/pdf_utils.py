import io
import re
import os
from typing import Optional, List, Dict
try:
    import fitz  # PyMuPDF
    HAS_FITZ = True
except ImportError:
    HAS_FITZ = False

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes."""
    if not HAS_FITZ:
        return ""
    text_parts = []
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            text = page.get_text("text")
            if text.strip():
                text_parts.append(text)
        doc.close()
    except Exception as e:
        raise Exception(f"PDF text extraction failed: {str(e)}")
    return "\n\n".join(text_parts)

def clean_extracted_text(text: str) -> str:
    """Remove excessive whitespace and normalize text."""
    text = re.sub(r'[^\x20-\x7E\n\r\t]', '', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()

def generate_professional_offer_pdf(content: Dict, output_path: str):
    """Generate a branded PDF using ReportLab for an offer letter."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.colors import HexColor
    from datetime import datetime

    BLUE_COLOR = HexColor("#0070C0") # Corporate Blue
    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(name='OfferContent', parent=styles['Normal'], fontSize=11, leading=14, spaceAfter=12))
    styles.add(ParagraphStyle(name='OfferTitle', parent=styles['Heading1'], fontSize=18, alignment=TA_CENTER, spaceAfter=24, color=BLUE_COLOR, underline=True))
    styles.add(ParagraphStyle(name='OfferSignatory', parent=styles['Normal'], fontSize=12, leading=14, color=BLUE_COLOR, fontWeight='bold'))

    elements = []
    elements.append(Paragraph("OFFER LETTER", styles['OfferTitle']))
    
    date_str = datetime.utcnow().strftime("%B %d, %Y")
    elements.append(Paragraph(f"Date: {date_str}", styles['Normal']))
    elements.append(Spacer(1, 0.4*inch))

    elements.append(Paragraph(content.get("salutation", "Dear Candidate,"), styles['OfferContent']))
    for para in content.get("body_paragraphs", []):
        elements.append(Paragraph(para, styles['OfferContent']))
        elements.append(Spacer(1, 0.1*inch))

    elements.append(Spacer(1, 0.2*inch))
    elements.append(Paragraph(content.get("closing", "Sincerely,"), styles['OfferContent']))
    elements.append(Paragraph(f"{content.get('signatory_name', 'HR Operations Team')}", styles['OfferSignatory']))
    elements.append(Paragraph(content.get('signatory_title', 'Manager - Talent Acquisition'), styles['OfferSignatory']))
    
    doc.build(elements)
