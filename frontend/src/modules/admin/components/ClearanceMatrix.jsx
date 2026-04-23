import React, { useState } from 'react';
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
      { key: 'deploy.employees.view', label: 'View Directory' },
      { key: 'deploy.employees.create', label: 'Add Employee' },
      { key: 'deploy.employees.edit', label: 'Edit Employee' },
      { key: 'deploy.employees.delete', label: 'Delete Employee' },
      { key: 'deploy.employees.offboard', label: 'Offboard Access' },
    ]
  },
  {
    group: 'Deployment: Core Ops',
    perms: [
      { key: 'deploy.assets.view', label: 'View Assets' },
      { key: 'deploy.assets.manage', label: 'Manage Assets' },
      { key: 'deploy.attendance.view_personal', label: 'Personal Attendance' },
      { key: 'deploy.attendance.view_team', label: 'Team Attendance' },
      { key: 'deploy.attendance.manage', label: 'Manage Attendance' },
      { key: 'deploy.onboarding.view', label: 'View Onboarding' },
      { key: 'deploy.onboarding.manage', label: 'Manage Onboarding' },
      { key: 'deploy.notifications.view_admin', label: 'Admin Notifications' },
      { key: 'deploy.dashboard.view_admin', label: 'Admin Analytics' },
    ]
  },
  {
    group: 'Deployment: Learning',
    perms: [
      { key: 'deploy.assessments.view', label: 'View Assessments' },
      { key: 'deploy.assessments.manage', label: 'Manage Assessments' },
      { key: 'deploy.training.view', label: 'View Training' },
      { key: 'deploy.training.manage', label: 'Manage Training' },
    ]
  },
  {
    group: 'Verify & Source Ops',
    perms: [
      { key: 'source.jobs.manage', label: 'Manage Recruitment' },
      { key: 'source.candidates.view', label: 'View Candidates' },
      { key: 'source.candidates.manage', label: 'Manage Candidates' },
      { key: 'verify.assessments.manage', label: 'Assessment Builder' },
      { key: 'verify.assessments.assign', label: 'Assign Tests' },
      { key: 'verify.assessments.view_results', label: 'View Results' },
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

export default function ClearanceMatrix({ rolesPerms, onUpdate }) {
  const roles = Object.keys(rolesPerms);

  const togglePermission = async (role, permKey) => {
    const currentList = rolesPerms[role] || [];
    const newList = currentList.includes(permKey)
      ? currentList.filter(p => p !== permKey)
      : [...currentList, permKey];
    
    try {
      const res = await fetch('/api/admin/permissions/roles', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, permissions: newList })
      });
      if (!res.ok) throw new Error();
      onUpdate(role, newList);
      toast.success('Clearance Updated');
    } catch {
      toast.error('Sync Error');
    }
  };

  return (
    <div className="glass-panel border-white/5 overflow-hidden animate-fade-in-up">
      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Shield className="text-primary" size={20} /> Identity Clearance Matrix
          </h3>
          <p className="text-[10px] text-white/30 mt-1 uppercase tracking-[0.2em] font-bold">Standard Role Permission Governance</p>
        </div>
        <div className="flex gap-2">
            {roles.map(r => (
                <div key={r} className="px-3 py-1 glass-panel border-white/10 text-[9px] font-black uppercase text-white/60">
                    {r}
                </div>
            ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-white/20 border-b border-white/5 bg-black/20 w-1/3">Clearance Key</th>
              {roles.map(r => (
                <th key={r} className="p-6 text-[10px] font-semibold uppercase tracking-widest text-primary border-b border-white/5 text-center bg-black/20">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {PERMISSIONS_CATEGORIES.map(cat => (
              <React.Fragment key={cat.group}>
                <tr className="bg-primary/5">
                  <td colSpan={roles.length + 1} className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 border-y border-white/5">
                    {cat.group}
                  </td>
                </tr>
                {cat.perms.map(p => (
                  <tr key={p.key} className="hover:bg-white/[0.03] group transition-colors">
                    <td className="p-6 border-b border-white/[0.02]">
                      <p className="text-sm font-bold text-white transition-colors group-hover:text-primary">{p.label}</p>
                      <p className="text-[9px] text-white/20 font-mono mt-1 uppercase tracking-tight">{p.key}</p>
                    </td>
                    {roles.map(r => {
                      const isAllowed = rolesPerms[r]?.includes(p.key);
                      return (
                        <td key={`${r}-${p.key}`} className="p-6 border-b border-white/[0.02] text-center">
                          <button
                            onClick={() => togglePermission(r, p.key)}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                              isAllowed 
                                ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_-5px_rgba(var(--color-primary),0.3)]' 
                                : 'bg-white/[0.03] text-white/10 border border-white/5 hover:border-white/20 hover:text-white/40'
                            }`}
                          >
                            {isAllowed ? <Check size={18} strokeWidth={3} /> : <X size={16} strokeWidth={2} />}
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
      
      <div className="p-8 bg-black/40 border-t border-white/5">
        <div className="flex items-center gap-4 text-white/40">
            <Zap size={16} className="text-primary animate-pulse" />
            <p className="text-[10px] font-medium uppercase tracking-widest leading-relaxed">
                Changes propagate instantly to all active neural sessions. <span className="text-white/60">SuperAdmin</span> and <span className="text-white/60">OrgAdmin</span> bypass these checks for platform integrity.
            </p>
        </div>
      </div>
    </div>
  );
}
