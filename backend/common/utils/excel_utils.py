import io
from datetime import datetime
from typing import List, Dict, Any, Optional
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def generate_attendance_excel(
    report_data: List[Dict[str, Any]],
    period_label: str,
    company_name: str = "Phygitron 360",
    is_org_wide: bool = False
) -> bytes:
    """
    Generate an executive, professional Excel workbook (.xlsx) for workforce attendance reports.
    Contains:
    - Sheet 1: 'Attendance Summary' (Totals, counts, zebra striping, grand totals)
    - Sheet 2: 'Daily Status Matrix' (Date-by-date status for each employee with color badges)
    """
    wb = Workbook()
    font_family = "Segoe UI"

    purple_header_fill = PatternFill(start_color="5B21B6", end_color="5B21B6", fill_type="solid")
    purple_sub_fill = PatternFill(start_color="EDE9FE", end_color="EDE9FE", fill_type="solid")
    table_hdr_fill = PatternFill(start_color="6D28D9", end_color="6D28D9", fill_type="solid")
    total_fill = PatternFill(start_color="F5F3FF", end_color="F5F3FF", fill_type="solid")
    zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    white_fill = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    double_bottom_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='double', color='6D28D9')
    )

    # ── SHEET 1: ATTENDANCE SUMMARY ──
    ws_summary = wb.active
    ws_summary.title = "Attendance Summary"
    ws_summary.views.sheetView[0].showGridLines = True

    # 1. Main Banner Header
    ws_summary.merge_cells('A1:I1')
    c_title = ws_summary['A1']
    scope_str = "Organization-Wide" if is_org_wide else "Team"
    c_title.value = f"{company_name} — {scope_str} Attendance Report"
    c_title.fill = purple_header_fill
    c_title.font = Font(name=font_family, size=14, bold=True, color="FFFFFF")
    c_title.alignment = Alignment(horizontal='center', vertical='center')
    ws_summary.row_dimensions[1].height = 32

    # 2. Metadata Subtitle
    ws_summary.merge_cells('A2:I2')
    c_sub = ws_summary['A2']
    now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
    c_sub.value = f"Reporting Period: {period_label}   |   Scope: {scope_str} ({len(report_data)} Records)   |   Exported: {now_str}"
    c_sub.fill = purple_sub_fill
    c_sub.font = Font(name=font_family, size=10, bold=True, color="4C1D95")
    c_sub.alignment = Alignment(horizontal='center', vertical='center')
    ws_summary.row_dimensions[2].height = 22

    ws_summary.row_dimensions[3].height = 10

    # 3. Table Column Headers
    headers = [
        "S.No", "Employee Name", "Employee Code", "Department",
        "Present (Days)", "Absent (Days)", "Half-Day (Days)", "Leave (Days)", "Total Worked (Days)"
    ]
    for col_idx, h in enumerate(headers, 1):
        cell = ws_summary.cell(row=4, column=col_idx, value=h)
        cell.fill = table_hdr_fill
        cell.font = Font(name=font_family, size=10, bold=True, color="FFFFFF")
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = thin_border
    ws_summary.row_dimensions[4].height = 26

    # 4. Populate Employee Data Rows
    curr_row = 5
    tot_present = 0.0
    tot_absent = 0.0
    tot_half_day = 0.0
    tot_leave = 0.0
    tot_worked = 0.0

    for idx, emp in enumerate(report_data, 1):
        stats = emp.get("stats", {})
        pres = float(stats.get("present", 0))
        absn = float(stats.get("absent", 0))
        hday = float(stats.get("half_day", 0))
        leav = float(stats.get("leave", 0))
        worked = pres + (hday * 0.5)

        tot_present += pres
        tot_absent += absn
        tot_half_day += hday
        tot_leave += leav
        tot_worked += worked

        row_fill = zebra_fill if idx % 2 == 0 else white_fill

        row_vals = [
            (idx, Alignment(horizontal='center', vertical='center'), Font(name=font_family, size=10)),
            (emp.get("name", ""), Alignment(horizontal='left', vertical='center'), Font(name=font_family, size=10, bold=True)),
            (emp.get("code", ""), Alignment(horizontal='center', vertical='center'), Font(name=font_family, size=10)),
            (emp.get("team") or emp.get("department") or "—", Alignment(horizontal='left', vertical='center'), Font(name=font_family, size=10)),
            (int(pres) if pres.is_integer() else pres, Alignment(horizontal='center', vertical='center'), Font(name=font_family, size=10, bold=True, color="16A34A" if pres > 0 else "64748B")),
            (int(absn) if absn.is_integer() else absn, Alignment(horizontal='center', vertical='center'), Font(name=font_family, size=10, bold=True, color="DC2626" if absn > 0 else "64748B")),
            (int(hday) if hday.is_integer() else hday, Alignment(horizontal='center', vertical='center'), Font(name=font_family, size=10, bold=True, color="D97706" if hday > 0 else "64748B")),
            (int(leav) if leav.is_integer() else leav, Alignment(horizontal='center', vertical='center'), Font(name=font_family, size=10, bold=True, color="2563EB" if leav > 0 else "64748B")),
            (int(worked) if worked.is_integer() else worked, Alignment(horizontal='center', vertical='center'), Font(name=font_family, size=10, bold=True, color="0F172A")),
        ]

        for col_idx, (val, align, font) in enumerate(row_vals, 1):
            cell = ws_summary.cell(row=curr_row, column=col_idx, value=val)
            cell.fill = row_fill
            cell.font = font
            cell.alignment = align
            cell.border = thin_border

        ws_summary.row_dimensions[curr_row].height = 22
        curr_row += 1

    # 5. Grand Totals Summary Row
    ws_summary.merge_cells(start_row=curr_row, start_column=1, end_row=curr_row, end_column=4)
    tot_label = ws_summary.cell(row=curr_row, column=1, value="Total Summary")
    tot_label.font = Font(name=font_family, size=10, bold=True, color="4C1D95")
    tot_label.alignment = Alignment(horizontal='right', vertical='center')

    totals = [
        (int(tot_present) if tot_present.is_integer() else tot_present, "16A34A"),
        (int(tot_absent) if tot_absent.is_integer() else tot_absent, "DC2626"),
        (int(tot_half_day) if tot_half_day.is_integer() else tot_half_day, "D97706"),
        (int(tot_leave) if tot_leave.is_integer() else tot_leave, "2563EB"),
        (int(tot_worked) if tot_worked.is_integer() else tot_worked, "0F172A")
    ]
    for c_offset, (val, col_color) in enumerate(totals, 5):
        cell = ws_summary.cell(row=curr_row, column=c_offset, value=val)
        cell.font = Font(name=font_family, size=10, bold=True, color=col_color)
        cell.alignment = Alignment(horizontal='center', vertical='center')

    for c in range(1, 10):
        c_cell = ws_summary.cell(row=curr_row, column=c)
        c_cell.fill = total_fill
        c_cell.border = double_bottom_border

    ws_summary.row_dimensions[curr_row].height = 24
    ws_summary.freeze_panes = "A5"

    min_widths = {1: 7, 2: 24, 3: 16, 4: 18, 5: 15, 6: 15, 7: 16, 8: 15, 9: 18}
    for col_idx in range(1, 10):
        col_letter = get_column_letter(col_idx)
        ws_summary.column_dimensions[col_letter].width = min_widths.get(col_idx, 15)

    # ── SHEET 2: DAILY STATUS MATRIX ──
    if report_data and report_data[0].get("days"):
        ws_matrix = wb.create_sheet(title="Daily Matrix")
        ws_matrix.views.sheetView[0].showGridLines = True

        first_days = report_data[0]["days"]
        num_cols = len(first_days) + 2

        # Header Title
        ws_matrix.merge_cells(start_row=1, start_column=1, end_row=1, end_column=num_cols)
        m_title = ws_matrix.cell(row=1, column=1, value=f"{company_name} — Daily Attendance Matrix ({period_label})")
        m_title.fill = purple_header_fill
        m_title.font = Font(name=font_family, size=13, bold=True, color="FFFFFF")
        m_title.alignment = Alignment(horizontal='center', vertical='center')
        ws_matrix.row_dimensions[1].height = 28

        # Date Header Row
        ws_matrix.cell(row=2, column=1, value="Code").fill = table_hdr_fill
        ws_matrix.cell(row=2, column=1).font = Font(name=font_family, size=9, bold=True, color="FFFFFF")
        ws_matrix.cell(row=2, column=1).alignment = Alignment(horizontal='center', vertical='center')
        ws_matrix.cell(row=2, column=1).border = thin_border

        ws_matrix.cell(row=2, column=2, value="Employee Name").fill = table_hdr_fill
        ws_matrix.cell(row=2, column=2).font = Font(name=font_family, size=9, bold=True, color="FFFFFF")
        ws_matrix.cell(row=2, column=2).alignment = Alignment(horizontal='left', vertical='center')
        ws_matrix.cell(row=2, column=2).border = thin_border

        for d_idx, day_info in enumerate(first_days, 3):
            d_val = day_info.get("day") or d_idx - 2
            cell = ws_matrix.cell(row=2, column=d_idx, value=d_val)
            cell.fill = table_hdr_fill
            cell.font = Font(name=font_family, size=9, bold=True, color="FFFFFF")
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = thin_border
            col_let = get_column_letter(d_idx)
            ws_matrix.column_dimensions[col_let].width = 5.5

        ws_matrix.row_dimensions[2].height = 22

        status_styles = {
            'Present': (PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid"), Font(name=font_family, size=9, bold=True, color="15803D"), "P"),
            'Active': (PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid"), Font(name=font_family, size=9, bold=True, color="15803D"), "P"),
            'Absent': (PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid"), Font(name=font_family, size=9, bold=True, color="B91C1C"), "A"),
            'Leave': (PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid"), Font(name=font_family, size=9, bold=True, color="1D4ED8"), "L"),
            'Half Day': (PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid"), Font(name=font_family, size=9, bold=True, color="B45309"), "HD"),
            'Weekend': (PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid"), Font(name=font_family, size=9, color="94A3B8"), "W"),
            'Holiday': (PatternFill(start_color="F3E8FF", end_color="F3E8FF", fill_type="solid"), Font(name=font_family, size=9, bold=True, color="7C3AED"), "H"),
            'Not Started': (PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid"), Font(name=font_family, size=9, color="CBD5E1"), "-"),
            'Future': (PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid"), Font(name=font_family, size=9, color="CBD5E1"), "-"),
        }

        for r_idx, emp in enumerate(report_data, 3):
            c_code = ws_matrix.cell(row=r_idx, column=1, value=emp.get("code", ""))
            c_code.font = Font(name=font_family, size=9)
            c_code.alignment = Alignment(horizontal='center', vertical='center')
            c_code.border = thin_border

            c_name = ws_matrix.cell(row=r_idx, column=2, value=emp.get("name", ""))
            c_name.font = Font(name=font_family, size=9, bold=True)
            c_name.alignment = Alignment(horizontal='left', vertical='center')
            c_name.border = thin_border

            for c_idx, d_obj in enumerate(emp.get("days", []), 3):
                st = d_obj.get("status", "Absent")
                matched = None
                for key in status_styles:
                    if st.startswith(key):
                        matched = status_styles[key]
                        break
                if not matched:
                    matched = status_styles['Absent']

                fill, font, short_txt = matched
                d_cell = ws_matrix.cell(row=r_idx, column=c_idx, value=short_txt)
                d_cell.fill = fill
                d_cell.font = font
                d_cell.alignment = Alignment(horizontal='center', vertical='center')
                d_cell.border = thin_border

            ws_matrix.row_dimensions[r_idx].height = 20

        ws_matrix.freeze_panes = "C3"
        ws_matrix.column_dimensions["A"].width = 14
        ws_matrix.column_dimensions["B"].width = 24

    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()
