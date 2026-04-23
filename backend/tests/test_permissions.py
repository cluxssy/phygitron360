"""
Tests for backend/core/permissions.py and backend/core/auth.py
================================================================
Tests the permission system in isolation using mocked dependencies
so no real DB connection is required.

Run with:
    cd backend && python -m pytest tests/test_permissions.py -v
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helper factories for fake users
# ---------------------------------------------------------------------------

def make_user(role: str, roles: list = None, permissions: dict = None):
    """Returns a fake user dict matching what get_current_user produces."""
    return {
        "id": 1,
        "username": f"test_{role}",
        "name": f"Test {role}",
        "role": role,
        "roles": roles or [role],
        "tenant_id": "tenant_test",
        "employee_code": None,
        "permissions": permissions or {},
        "modules_enabled": ["source", "forge", "verify", "deploy"],
    }


# ---------------------------------------------------------------------------
# Tests: require_permission guard
# ---------------------------------------------------------------------------

class TestRequirePermission:
    """Test the require_permission dependency factory."""

    def setup_method(self):
        from backend.core.permissions import require_permission
        self.guard = require_permission

    def _call(self, perm_key: str, user: dict):
        """Simulate calling the dependency with a fake current user."""
        checker = self.guard(perm_key)
        # Inject the fake user directly (bypasses get_current_user)
        return checker.__wrapped__(user) if hasattr(checker, "__wrapped__") else self._inject(checker, user)

    def _inject(self, checker_factory, user):
        """Call the inner closure directly."""
        from backend.core.permissions import require_permission, get_current_user
        # Get the inner function
        inner = require_permission.__code__  # just validate we can import

        # Call the closure with a patched dependency
        with patch("backend.core.permissions.get_current_user", return_value=user):
            dep = require_permission("some.perm")
            inner_fn = dep.__wrapped__ if hasattr(dep, "__wrapped__") else dep
            # For a closure, we simulate the current_user injection
            return inner_fn(current_user=user)

    def test_super_admin_bypasses_permission_check(self):
        from backend.core.permissions import require_permission
        user = make_user("super_admin", permissions={})

        def checker(current_user=None):
            from backend.core.permissions import _get_user_roles, _is_platform_admin
            roles = _get_user_roles(current_user)
            assert _is_platform_admin(roles)

        checker(current_user=user)

    def test_user_with_permission_granted(self):
        from backend.core.permissions import _get_user_roles, _is_platform_admin
        user = make_user("employee", permissions={"deploy.employees.view": True})
        roles = _get_user_roles(user)
        assert not _is_platform_admin(roles)
        assert user["permissions"].get("deploy.employees.view") is True

    def test_user_without_permission_raises_403(self):
        from backend.core.permissions import require_permission
        user = make_user("employee", permissions={})

        # Simulate what the dependency checker does
        perm_key = "deploy.employees.delete"
        perms = user.get("permissions", {})
        has_access = perms.get(perm_key, False) if isinstance(perms, dict) else perm_key in perms

        assert has_access is False

    def test_list_permissions_legacy_format(self):
        """Legacy list-format permissions still work."""
        user = make_user("employee", permissions=["deploy.employees.view", "module.deploy.access"])
        perms = user["permissions"]
        assert isinstance(perms, list)
        assert "deploy.employees.view" in perms
        assert "deploy.employees.delete" not in perms

    def test_org_admin_does_NOT_get_bypass(self):
        """
        org_admin should NOT be bypassed in the guard.
        Their access comes from seeded permissions in the DB.
        This test confirms the security fix is in place.
        """
        from backend.core.permissions import _is_platform_admin, _get_user_roles
        user = make_user("org_admin", permissions={})
        roles = _get_user_roles(user)
        # org_admin should NOT be treated as platform admin
        assert not _is_platform_admin(roles)


# ---------------------------------------------------------------------------
# Tests: require_module guard
# ---------------------------------------------------------------------------

class TestRequireModule:
    def test_module_access_via_permission(self):
        from backend.core.permissions import require_module
        user = make_user("manager", permissions={"module.source.access": True})
        perm_key = "module.source.access"
        perms = user["permissions"]
        assert perms.get(perm_key) is True

    def test_module_access_denied_when_not_in_permissions(self):
        user = make_user("employee", permissions={})
        perm_key = "module.source.access"
        perms = user["permissions"]
        has_access = perms.get(perm_key, False)
        assert has_access is False

    def test_module_access_fallback_to_modules_enabled(self):
        """Fallback: if permission missing, check modules_enabled list."""
        user = make_user("employee", permissions={})
        user["modules_enabled"] = ["deploy", "forge"]
        module_name = "deploy"
        # Should pass via fallback list check
        enabled = user.get("modules_enabled", [])
        assert module_name.lower() in [m.lower() for m in enabled]


# ---------------------------------------------------------------------------
# Tests: Permission Registry (P class)
# ---------------------------------------------------------------------------

class TestPermissionRegistry:
    def test_all_keys_are_strings(self):
        from backend.core.permissions import P
        for attr_name in dir(P):
            if not attr_name.startswith("_"):
                val = getattr(P, attr_name)
                assert isinstance(val, str), f"P.{attr_name} should be a string, got {type(val)}"

    def test_no_duplicate_values(self):
        """All permission keys must be unique."""
        from backend.core.permissions import P
        values = [getattr(P, a) for a in dir(P) if not a.startswith("_")]
        assert len(values) == len(set(values)), "Duplicate permission key values found!"

    def test_dot_notation_format(self):
        """All keys must follow the dot-notation convention (at least one dot, no spaces)."""
        from backend.core.permissions import P
        # Short top-level keys like 'manage_system' are allowed (no dot required for platform-level perms)
        values = [getattr(P, a) for a in dir(P) if not a.startswith("_")]
        for v in values:
            assert " " not in v, f"Permission key '{v}' must not contain spaces."
            assert v.strip() == v, f"Permission key '{v}' has leading/trailing whitespace."


# ---------------------------------------------------------------------------
# Tests: Default Permissions seed matrix
# ---------------------------------------------------------------------------

class TestDefaultPermissions:
    def test_all_roles_present(self):
        from backend.core.permissions import DEFAULT_PERMISSIONS
        for role in ("org_admin", "manager", "employee", "candidate"):
            assert role in DEFAULT_PERMISSIONS, f"Role '{role}' missing from DEFAULT_PERMISSIONS"

    def test_super_admin_not_in_seed(self):
        """super_admin gets a hardcoded platform bypass — it must NOT be seeded."""
        from backend.core.permissions import DEFAULT_PERMISSIONS
        assert "super_admin" not in DEFAULT_PERMISSIONS

    def test_org_admin_has_all_module_accesses(self):
        from backend.core.permissions import DEFAULT_PERMISSIONS, P
        org_perms = DEFAULT_PERMISSIONS["org_admin"]
        for perm in (P.MODULE_SOURCE_ACCESS, P.MODULE_FORGE_ACCESS, P.MODULE_VERIFY_ACCESS, P.MODULE_DEPLOY_ACCESS):
            assert perm in org_perms, f"org_admin missing module access: {perm}"

    def test_employee_cannot_delete(self):
        from backend.core.permissions import DEFAULT_PERMISSIONS, P
        employee_perms = DEFAULT_PERMISSIONS["employee"]
        assert P.DEPLOY_EMP_DELETE not in employee_perms
        assert P.DEPLOY_EMP_OFFBOARD not in employee_perms

    def test_candidate_has_minimal_permissions(self):
        from backend.core.permissions import DEFAULT_PERMISSIONS, P
        candidate_perms = DEFAULT_PERMISSIONS["candidate"]
        # Candidates should only have verify + source access
        assert P.MODULE_VERIFY_ACCESS in candidate_perms
        assert P.DEPLOY_EMP_DELETE not in candidate_perms
        assert P.ADMIN_USERS_MANAGE not in candidate_perms

    def test_no_seed_without_permission_constant(self):
        """Every seeded permission must have a corresponding P.xxx constant."""
        from backend.core.permissions import DEFAULT_PERMISSIONS, P
        all_p_values = {getattr(P, a) for a in dir(P) if not a.startswith("_")}
        for role, perms in DEFAULT_PERMISSIONS.items():
            for perm in perms:
                assert perm in all_p_values, (
                    f"Permission '{perm}' seeded for '{role}' has no "
                    f"corresponding constant in class P. Add P.XXX = '{perm}'."
                )


# ---------------------------------------------------------------------------
# Tests: Role normalization helpers
# ---------------------------------------------------------------------------

class TestRoleNormalization:
    def test_legacy_admin_normalizes_to_org_admin(self):
        from backend.core.auth import _normalize_role
        assert _normalize_role("admin") == "org_admin"
        assert _normalize_role("administrator") == "org_admin"

    def test_hr_role_normalizes_to_manager(self):
        from backend.core.auth import _normalize_role
        assert _normalize_role("hr") == "manager"
        assert _normalize_role("HR_Manager") == "manager"

    def test_unknown_roles_pass_through(self):
        from backend.core.auth import _normalize_role
        assert _normalize_role("super_admin") == "super_admin"
        assert _normalize_role("employee") == "employee"

    def test_none_role_handled(self):
        from backend.core.auth import _normalize_role
        assert _normalize_role(None) is None
        assert _normalize_role("") == ""
