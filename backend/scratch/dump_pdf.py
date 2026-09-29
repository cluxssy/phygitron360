import sys, io
sys.stdout.reconfigure(encoding='utf-8')
import PyPDF2

pdf_path = r'C:\Users\Rishit\Downloads\AI_Robotics_Automation_Master_Roadmap_Level_1_to_Final(2).pdf'
reader = PyPDF2.PdfReader(pdf_path)
print(f'Total pages: {len(reader.pages)}')
for p_idx, page in enumerate(reader.pages):
    text = page.extract_text()
    print(f'=== PAGE {p_idx+1} ===')
    for line in text.split('\n')[:35]:
        print(repr(line))
