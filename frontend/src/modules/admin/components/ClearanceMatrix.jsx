import React from 'react';
import { Shield, Check, X, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const PERMISSIONS_CATEGORIES = [
  {
    group: 'Module Access',
    perms: [
      { key: 'module.source.access', label: 'Source Module' },
      { key: 'module.forge.access', label: 'Forge Module' },
      { key: 'module.verify.access', label: 'Verify Module' },
      { key: 'module.deploy.access', label: 'Deploy Module' },
    ]
  },
  {
    group: 'Deployment: Personnel',
    perms: [
      { key: 'deploy.employees.view_list', label: 'View Employee List' },
      { key: 'deploy.employees.view_profile', label: 'View Basic Profile' },
      { key: 'deploy.employees.view_profile_sensitive', label: 'View Sensitive Details' },
      { key: 'deploy.employees.view_profile_financial', label: 'View Financial Details' },
      { key: 'deploy.employees.create', label: 'Add Employee' },
      { key: 'deploy.employees.edit_basic', label: 'Edit Basic Details' },
      { key: 'deploy.employees.edit_job', label: 'Edit Job Details' },
      { key: 'deploy.employees.edit_financial', label: 'Edit Financials' },
      { key: 'deploy.employees.approve_basic', label: 'Approve Basic Details (HR)' },
      { key: 'deploy.employees.approve_sensitive', label: 'Approve Sensitive Details (HR)' },
      { key: 'deploy.employees.approve_financial', label: 'Approve Financial Details (Finance)' },
      { key: 'deploy.employees.manage_documents', label: 'Manage Documents' },
      { key: 'deploy.employees.offboard', label: 'Offboard Access' },
      { key: 'deploy.employees.delete', label: 'Delete Employee' },
      { key: 'deploy.employees.export', label: 'Export Personnel Data' },
    ]
  },
  {
    group: 'Deployment: Assets',
    perms: [
      { key: 'deploy.assets.view_personal', label: 'View Personal Assets' },
      { key: 'deploy.assets.view_all', label: 'View All Assets' },
      { key: 'deploy.assets.manage_onboarding', label: 'Manage Onboarding Assets' },
      { key: 'deploy.assets.manage_clearance', label: 'Manage Clearance Assets' },
      { key: 'deploy.assets.export_reports', label: 'Export Asset Reports' },
    ]
  },
  {
    group: 'Deployment: Attendance & Leaves',
    perms: [
      { key: 'deploy.attendance.view_personal', label: 'Personal Attendance' },
      { key: 'deploy.attendance.view_team', label: 'Team Attendance' },
      { key: 'deploy.attendance.view_all', label: 'All Attendance' },
      { key: 'deploy.attendance.clock_in_out', label: 'Clock In/Out' },
      { key: 'deploy.attendance.request_correction', label: 'Request Correction' },
      { key: 'deploy.attendance.approve_correction', label: 'Approve Correction' },
      { key: 'deploy.attendance.manage_policies', label: 'Manage Policies' },
      { key: 'deploy.leaves.view_personal', label: 'Personal Leaves' },
      { key: 'deploy.leaves.view_team', label: 'Team Leaves' },
      { key: 'deploy.leaves.view_all', label: 'All Leaves' },
      { key: 'deploy.leaves.request', label: 'Request Leave' },
      { key: 'deploy.leaves.approve', label: 'Approve Leave' },
      { key: 'deploy.leaves.manage_balances', label: 'Manage Balances' },
    ]
  },
  {
    group: 'Deployment: Onboarding',
    perms: [
      { key: 'deploy.onboarding.view', label: 'View Onboarding' },
      { key: 'deploy.onboarding.send_invite', label: 'Send Invite' },
      { key: 'deploy.onboarding.cancel_invite', label: 'Cancel Invite' },
      { key: 'deploy.onboarding.review_submissions', label: 'Review Submissions' },
    ]
  },
  {
    group: 'Deployment: Payroll',
    perms: [
      { key: 'deploy.payroll.view_personal', label: 'View Personal Payroll' },
      { key: 'deploy.payroll.view_all', label: 'View All Payroll' },
      { key: 'deploy.payroll.run_payroll', label: 'Run Payroll' },
      { key: 'deploy.payroll.edit_records', label: 'Edit Records' },
      { key: 'deploy.payroll.upload_bulk', label: 'Upload Bulk' },
      { key: 'deploy.payroll.approve', label: 'Approve Payroll' },
      { key: 'deploy.payroll.export_reports', label: 'Export Payroll Reports' },
    ]
  },
  {
    group: 'Deployment: Performance',
    perms: [
      { key: 'deploy.performance.view_personal', label: 'View Personal KRA' },
      { key: 'deploy.performance.view_team', label: 'View Team KRA' },
      { key: 'deploy.performance.view_all', label: 'View All KRA' },
      { key: 'deploy.performance.assign_kras', label: 'Assign KRAs' },
      { key: 'deploy.performance.submit_self_rating', label: 'Submit Self Rating' },
      { key: 'deploy.performance.submit_manager_rating', label: 'Submit Manager Rating' },
      { key: 'deploy.performance.manage_assessments', label: 'Manage Assessments' },
      { key: 'deploy.performance.export_reports', label: 'Export Perf Reports' },
    ]
  },
  {
    group: 'Deployment: Ops & Dashboards',
    perms: [
      { key: 'deploy.notifications.view_admin', label: 'Admin Notifications' },
      { key: 'deploy.notifications.manage', label: 'Manage Notifications' },
      { key: 'deploy.dashboard.view_admin', label: 'Admin Analytics' },
    ]
  },
  {
    group: 'Forge: Learning Hub',
    perms: [
      { key: 'forge.courses.view', label: 'View Courses' },
      { key: 'forge.courses.manage', label: 'Manage Courses' },
      { key: 'forge.courses.enroll', label: 'Course Enrollment' },
    ]
  },
  {
    group: 'Source: Talent Central',
    perms: [
      { key: 'source.jobs.view', label: 'View Jobs' },
      { key: 'source.jobs.manage', label: 'Manage Jobs' },
      { key: 'source.candidates.view', label: 'View Candidates' },
      { key: 'source.candidates.manage', label: 'Manage Candidates' },
      { key: 'source.offers.view', label: 'View Offers' },
      { key: 'source.offers.manage', label: 'Manage Offers' },
      { key: 'source.offers.approve', label: 'Approve Offers' },
      { key: 'source.evaluations.manage', label: 'Manage Evaluations' },
      { key: 'source.interviews.manage', label: 'Manage Interviews' },
    ]
  },
  {
    group: 'Verify: Assessment Central',
    perms: [
      { key: 'verify.assessments.view', label: 'View Assessments List' },
      { key: 'verify.assessments.manage', label: 'Manage & Build Assessments' },
      { key: 'verify.assessments.assign', label: 'Assign Tests to Candidates' },
      { key: 'verify.questions.view', label: 'View Question Bank' },
      { key: 'verify.questions.manage', label: 'Manage Question Bank & AI Import' },
      { key: 'verify.monitoring.view', label: 'Live Proctoring & Monitor' },
      { key: 'verify.results.view', label: 'View Analytics & Results' },
      { key: 'verify.results.manage', label: 'Release Results & Regrade' },
      { key: 'verify.queries.manage', label: 'Manage Candidate Disputes' },
    ]
  },
  {
    group: 'Governance',
    perms: [
      { key: 'admin.users.manage', label: 'User Management' },
      { key: 'admin.tenants.provision', label: 'Tenant Provisioning' },
      { key: 'manage_system', label: 'System Settings' },
      { key: 'view_reports', label: 'Global Analytics' },
    ]
  }
];

export default function ClearanceMatrix({ rolesPerms, customRolesList, onRefreshRoles, onUpdate }) {
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newRoleName, setNewRoleName] = React.useState('');
  const [newRoleDesc, setNewRoleDesc] = React.useState('');

  const roles = Object.keys(rolesPerms);

  const togglePermission = async (role, permKey) => {
    const currentList = rolesPerms[role] || [];
    const newList = currentList.includes(permKey)
      ? currentList.filter(p => p !== permKey)
      : [...currentList, permKey];

    try {
      const res = await fetch('/api/admin/permissions/roles', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role,
          permissions: newList
        })
      });

      if (!res.ok) throw new Error();
      onUpdate(role, newList);
      toast.success('Clearance Updated');
    } catch {
      toast.error('Sync Error');
    }
  };

  const createCustomRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const res = await fetch('/api/admin/permissions/templates', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newRoleName.trim(),
          description: newRoleDesc.trim() || undefined
        })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Creation failed');
      }
      toast.success('Template Created');
      setShowCreateModal(false);
      setNewRoleName('');
      setNewRoleDesc('');
      if (onRefreshRoles) onRefreshRoles();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteCustomRole = async (name) => {
    if (!confirm(`Delete template ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/permissions/templates/${name}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Deletion failed');
      toast.success('Template Deleted');
      if (onRefreshRoles) onRefreshRoles();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-2xl border border-primary/10 shadow-[0_10px_60px_rgba(180,140,255,0.08)] overflow-hidden animate-fade-in-up rounded-[2.5rem]">
      {/* HEADER */}
      <div className="p-8 border-b border-primary/10 flex justify-between items-center bg-gradient-to-r from-primary/[0.08] to-transparent">
  <div>
    <h3 className="text-2xl font-bold text-black uppercase tracking-tight flex items-center gap-3">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary shadow-[0_0_30px_rgba(180,140,255,0.15)]">
        <Shield size={22} />
      </div>
      Identity Clearance Matrix
    </h3>
    <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-[0.25em] font-medium">
      Standard Role Permission Governance
    </p>
  </div>

  <div className="flex gap-3 flex-wrap items-center">
    {roles.map(r => {
      const isCustom = customRolesList && customRolesList.find(cr => cr.name === r);
      return (
        <div
          key={r}
          className="group relative px-4 py-2 bg-white border border-black rounded-2xl text-[10px] font-semibold uppercase tracking-[0.12em] text-black shadow-[0_0_20px_rgba(0,0,0,0.08)] flex items-center gap-2"
        >
          {r}
          {isCustom && (
            <button 
              onClick={() => deleteCustomRole(r)}
              className="hidden group-hover:flex items-center justify-center text-red-500 hover:text-red-700 bg-red-50 p-1 rounded-md transition-all absolute -top-2 -right-2 border border-red-200"
              title="Delete Template"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>
      );
    })}
    <button
      onClick={() => setShowCreateModal(true)}
      className="px-4 py-2 bg-black text-white rounded-2xl text-[10px] font-semibold uppercase tracking-[0.12em] shadow-[0_0_20px_rgba(0,0,0,0.08)] hover:bg-violet-700 transition-all flex items-center gap-1 active:scale-95"
    >
      <Check size={12} />
      New Template
    </button>
  </div>
</div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-primary/[0.08] to-transparent border-b border-primary/10">
              <th className="p-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 w-1/3">
                Clearance Key
              </th>
              {roles.map(r => (
                <th
                  key={r}
                  className="p-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500 text-center"
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-primary/[0.05]">
            {PERMISSIONS_CATEGORIES.map(cat => (
              <React.Fragment key={cat.group}>
                {/* CATEGORY HEADER */}
                <tr className="bg-primary/[0.04]">
                <td
                  colSpan={roles.length + 1}
                  className="px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-black border-y border-primary/10"
                >
                  {cat.group}
                </td>
              </tr>

                {/* PERMISSIONS */}
                {cat.perms.map(p => (
                  <tr
                    key={p.key}
                    className="hover:bg-primary/[0.03] group transition-all duration-300"
                  >
                    {/* PERMISSION LABEL */}
                    <td className="p-6 border-b border-primary/[0.04]">
                      <p className="text-sm font-semibold text-black transition-colors group-hover:text-violet-700">
                        {p.label}
                      </p>
                      <p className="text-[10px] text-slate-500 font-normal font-mono mt-1 uppercase tracking-tight">
                        {p.key}
                      </p>
                    </td>

                    {/* ROLES */}
                    {roles.map(r => {
                      const isAllowed = rolesPerms[r]?.includes(p.key);
                      return (
                        <td
                          key={`${r}-${p.key}`}
                          className="p-6 border-b border-primary/[0.04] text-center"
                        >
                          <button
                            onClick={() => togglePermission(r, p.key)}
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
                              isAllowed
                                ? 'bg-gradient-to-br from-primary/20 to-primary/5 text-violet-700 border-primary/20 shadow-[0_0_25px_rgba(180,140,255,0.18)] hover:scale-105'
                                : 'bg-white text-black/20 border-primary/10 hover:border-primary/30 hover:text-primary hover:bg-primary/[0.04]'
                            }`}
                          >
                            {isAllowed
                              ? <Check size={18} strokeWidth={3} />
                              : <X size={16} strokeWidth={2.5} />
                            }
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-[400px] shadow-[0_20px_80px_rgba(0,0,0,0.2)] border border-primary/10">
            <h3 className="text-xl font-bold text-black uppercase tracking-tight mb-6 flex items-center gap-3">
              <Shield size={20} className="text-primary" />
              New Template
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="e.g. hr_reviewer"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2">Description (Optional)</label>
                <textarea
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  placeholder="What does this role do?"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRoleName('');
                  setNewRoleDesc('');
                }}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={createCustomRole}
                className="flex-1 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-violet-700 transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="p-8 bg-gradient-to-r from-primary/[0.04] to-transparent border-t border-primary/10">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary">
            <Zap size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-tight text-primary italic">
              Permission Management
            </p>
            <p className="text-sm text-gray-500 font-normal mt-3 leading-relaxed max-w-4xl">
              Changes to module permissions take effect immediately. Removing access to a module will instantly
              disable that module for users without special permissions within this workspace.
              User data is preserved across access changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}