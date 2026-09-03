import pytest
from fastapi import HTTPException
from backend.core.permissions import P, require_permission
from backend.modules.deploy.services.password_service import PasswordService

def test_require_permission_admin_reset_password():
    checker = require_permission([P.DEPLOY_EMP_EDIT_BASIC, P.ADMIN_USERS_MANAGE])

    # Super admin bypass
    super_admin_user = {"roles": ["super_admin"], "permissions": {}}
    assert checker(super_admin_user) == super_admin_user

    # User with deploy.employees.edit_basic
    hr_user = {
        "roles": ["org_admin"],
        "permissions": {P.DEPLOY_EMP_EDIT_BASIC: True}
    }
    assert checker(hr_user) == hr_user

    # User with admin.users.manage
    admin_user = {
        "roles": ["admin"],
        "permissions": {P.ADMIN_USERS_MANAGE: True}
    }
    assert checker(admin_user) == admin_user

    # User with list permissions
    list_user = {
        "roles": ["org_admin"],
        "permissions": [P.DEPLOY_EMP_EDIT_BASIC]
    }
    assert checker(list_user) == list_user

    # User without permissions
    regular_user = {
        "roles": ["employee"],
        "permissions": {"deploy.employees.view_personal": True}
    }
    with pytest.raises(HTTPException) as exc_info:
        checker(regular_user)
    assert exc_info.value.status_code == 403
    assert "deploy.employees.edit_basic" in exc_info.value.detail or "admin.users.manage" in exc_info.value.detail

def test_password_service_generate_temp_password():
    svc = PasswordService()
    temp_pass = svc.generate_temp_password(length=12)
    assert len(temp_pass) == 12
    assert any(c.isupper() for c in temp_pass)
    assert any(c.isdigit() for c in temp_pass)
    assert any(c in "!@#$%" for c in temp_pass)
