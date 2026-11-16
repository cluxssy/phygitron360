import pytest
from unittest.mock import MagicMock, patch
from backend.modules.deploy.services.attendance_service import AttendanceService

def test_clock_in_blocked_on_regular_holiday():
    service = AttendanceService(tenant_id="test_tenant")
    service.repo = MagicMock()
    service.repo.get_history.return_value = []
    service.repo.get_todays_attendance.return_value = None
    service.holiday_repo = MagicMock()
    service.holiday_repo.get_holidays_in_range.return_value = [
        {"name": "Diwali", "date": "2026-11-08", "holiday_type": "regular_holiday", "is_half_day": False}
    ]

    with pytest.raises(ValueError) as exc:
        service.clock_in("EMP001", "127.0.0.1", local_date="2026-11-08", local_time="09:00:00")
    assert "Attendance logging is disabled" in str(exc.value)
    assert "Diwali" in str(exc.value)

def test_clock_in_allowed_on_restricted_holiday():
    service = AttendanceService(tenant_id="test_tenant")
    service.repo = MagicMock()
    service.repo.get_history.return_value = []
    service.repo.get_todays_attendance.return_value = None
    service.holiday_repo = MagicMock()
    service.holiday_repo.get_holidays_in_range.return_value = [
        {"name": "Govardhan Puja", "date": "2026-11-09", "holiday_type": "restricted_holiday", "is_half_day": False}
    ]

    res = service.clock_in("EMP001", "127.0.0.1", local_date="2026-11-09", local_time="09:00:00")
    assert res["success"] is True
    service.repo.clock_in.assert_called_once_with("EMP001", "2026-11-09", "09:00:00", "127.0.0.1", "test_tenant")

@patch("backend.modules.deploy.services.attendance_service.add_notification")
def test_self_service_correction_restricted_holiday(mock_notif):
    service = AttendanceService(tenant_id="test_tenant")
    service.repo = MagicMock()
    service.repo.get_todays_attendance.return_value = None
    service.holiday_repo = MagicMock()
    service.holiday_repo.get_holidays_in_range.return_value = [
        {"name": "Maha Shivratri", "date": "2026-03-08", "holiday_type": "restricted_holiday", "is_half_day": False}
    ]

    with patch.object(service, '_is_self_service_date', return_value=True):
        res = service.apply_self_service_correction(
            employee_code="EMP001",
            date_str="2026-03-08",
            clock_in="09:30",
            clock_out="18:30",
            reason="Worked on restricted holiday",
            client_date="2026-03-09"
        )
    assert res["success"] is True
    service.repo.upsert_attendance.assert_called_once()

def test_self_service_correction_blocked_on_national_holiday():
    service = AttendanceService(tenant_id="test_tenant")
    service.holiday_repo = MagicMock()
    service.holiday_repo.get_holidays_in_range.return_value = [
        {"name": "Independence Day", "date": "2026-08-15", "holiday_type": "national_holiday", "is_half_day": False}
    ]

    with patch.object(service, '_is_self_service_date', return_value=True):
        with pytest.raises(ValueError) as exc:
            service.apply_self_service_correction(
                employee_code="EMP001",
                date_str="2026-08-15",
                clock_in="09:30",
                clock_out="18:30",
                reason="Attempt to log on mandatory holiday",
                client_date="2026-08-16"
            )
    assert "Attendance logging is disabled" in str(exc.value)

@patch("backend.modules.deploy.services.attendance_service.add_notification")
def test_employee_cancel_pending_leave_success(mock_notif):
    service = AttendanceService(tenant_id="test_tenant")
    service.repo = MagicMock()
    service.repo.get_leave_by_id.return_value = {
        "id": 10,
        "employee_code": "EMP001",
        "leave_type": "Casual",
        "start_date": "2026-12-01",
        "end_date": "2026-12-02",
        "duration_days": 2.0,
        "status": "Pending"
    }
    service.repo.get_manager_code.return_value = "MGR001"
    user = {"employee_code": "EMP001", "role": "Employee", "permissions": {}}

    res = service.cancel_leave(10, user, reason="Plans cancelled")
    assert res["success"] is True
    service.repo.update_leave_status.assert_called_once_with(10, "Cancelled", "Plans cancelled", "test_tenant")

def test_employee_cancel_approved_leave_forbidden():
    service = AttendanceService(tenant_id="test_tenant")
    service.repo = MagicMock()
    service.repo.get_leave_by_id.return_value = {
        "id": 11,
        "employee_code": "EMP001",
        "leave_type": "Sick",
        "start_date": "2026-12-05",
        "end_date": "2026-12-06",
        "duration_days": 2.0,
        "status": "Approved"
    }
    service.repo.get_manager_code.return_value = "MGR001"
    user = {"employee_code": "EMP001", "role": "Employee", "permissions": {}}

    with pytest.raises(ValueError) as exc:
        service.cancel_leave(11, user)
    assert "not yet been approved" in str(exc.value)

@patch("backend.modules.deploy.services.attendance_service.add_notification")
def test_management_cancel_approved_leave_restores_quota(mock_notif):
    service = AttendanceService(tenant_id="test_tenant")
    service.repo = MagicMock()
    service.repo.get_leave_by_id.return_value = {
        "id": 12,
        "employee_code": "EMP002",
        "leave_type": "Casual",
        "start_date": "2026-12-10",
        "end_date": "2026-12-12",
        "duration_days": 3.0,
        "status": "Approved"
    }
    service.get_leave_balance = MagicMock(return_value={
        "total_leaves": 15.0,
        "used_leaves": 5.0,
        "extended_leaves": 0.0
    })
    manager_user = {
        "employee_code": "MGR001",
        "role": "org_admin",
        "permissions": {"deploy.leaves.approve": True}
    }

    res = service.cancel_leave(12, manager_user, reason="Project emergency")
    assert res["success"] is True
    assert "quota balance restored" in res["message"]
    # Revert balance should restore 3.0 days used
    service.repo.revert_leave_balance.assert_called_once_with("EMP002", 3.0, 0.0, "test_tenant")
    service.repo.update_leave_status.assert_called_once_with(12, "Cancelled", "Project emergency", "test_tenant")
