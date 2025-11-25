#!/usr/bin/env python3
"""
Skript na konverziu Markdown súboru do DOCX formátu
"""
import re
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def add_heading_style(doc, level, text, bold=True):
    """Pridá nadpis s príslušným štýlom"""
    heading = doc.add_heading(text, level=level)
    if level == 1:
        heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return heading

def add_formatted_paragraph(doc, text):
    """Pridá odsek s formátovaním markdown"""
    # Odstráň kódové bloky
    text = re.sub(r'`([^`]+)`', r'\1', text)
    
    # Spracuj tučné písmo
    parts = re.split(r'(\*\*[^*]+\*\*)', text)
    para = doc.add_paragraph()
    
    for part in parts:
        if part.startswith('**') and part.endswith('**'):
            # Tučné písmo
            run = para.add_run(part[2:-2])
            run.bold = True
        else:
            para.add_run(part)
    
    return para

def process_list_item(doc, text, level=0):
    """Spracuje položku zoznamu"""
    # Odstráň markdown značky
    text = re.sub(r'^- ', '', text)
    text = re.sub(r'^\d+\. ', '', text)
    text = text.strip()
    
    para = doc.add_paragraph(text, style='List Bullet' if level == 0 else 'List Bullet 2')
    para.paragraph_format.left_indent = Inches(0.25 * (level + 1))
    return para

def convert_markdown_to_docx(md_file, docx_file):
    """Konvertuje Markdown súbor do DOCX"""
    doc = Document()
    
    # Nastavenie štýlov
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    
    with open(md_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    i = 0
    in_code_block = False
    code_block_lines = []
    
    while i < len(lines):
        line = lines[i].rstrip()
        
        # Spracuj kódové bloky
        if line.startswith('```'):
            if in_code_block:
                # Ukonči kódový blok
                if code_block_lines:
                    para = doc.add_paragraph('\n'.join(code_block_lines), style='No Spacing')
                    para.style.font.name = 'Courier New'
                    para.style.font.size = Pt(9)
                code_block_lines = []
                in_code_block = False
            else:
                in_code_block = True
            i += 1
            continue
        
        if in_code_block:
            code_block_lines.append(line)
            i += 1
            continue
        
        # Prázdny riadok
        if not line.strip():
            doc.add_paragraph()
            i += 1
            continue
        
        # Nadpisy
        if line.startswith('# '):
            add_heading_style(doc, 1, line[2:].strip())
        elif line.startswith('## '):
            add_heading_style(doc, 2, line[3:].strip())
        elif line.startswith('### '):
            add_heading_style(doc, 3, line[4:].strip())
        elif line.startswith('#### '):
            add_heading_style(doc, 4, line[5:].strip())
        # Horizontálna čiara
        elif line.strip() == '---':
            para = doc.add_paragraph()
            para.paragraph_format.space_after = Pt(12)
        # Zoznamy
        elif line.strip().startswith('- ') or re.match(r'^\d+\. ', line.strip()):
            process_list_item(doc, line.strip())
        # Obyčajný text
        else:
            # Skontroluj, či nasledujúci riadok nie je súčasťou toho istého odseku
            if i + 1 < len(lines) and lines[i + 1].strip() and not lines[i + 1].strip().startswith('#') and not lines[i + 1].strip().startswith('-') and not re.match(r'^\d+\. ', lines[i + 1].strip()):
                # Zbieraj riadky do jedného odseku
                paragraph_text = line
                i += 1
                while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith('#') and not lines[i].strip().startswith('-') and not re.match(r'^\d+\. ', lines[i].strip()) and not lines[i].strip().startswith('```'):
                    paragraph_text += ' ' + lines[i].strip()
                    i += 1
                add_formatted_paragraph(doc, paragraph_text)
                continue
            else:
                add_formatted_paragraph(doc, line)
        
        i += 1
    
    # Ulož dokument
    doc.save(docx_file)
    print(f"Dokument bol úspešne uložený do {docx_file}")

if __name__ == '__main__':
    import sys
    md_file = 'SOP_ZAKAZNIK.md'
    docx_file = 'SOP_ZAKAZNIK.docx'
    
    try:
        convert_markdown_to_docx(md_file, docx_file)
    except ImportError:
        print("Chýbajú potrebné knižnice. Inštalujem...")
        import subprocess
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'python-docx'])
        convert_markdown_to_docx(md_file, docx_file)

