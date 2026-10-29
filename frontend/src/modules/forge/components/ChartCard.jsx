import React from 'react';

/**
 * Enterprise ChartCard matching Employee Central (Phygitron 360) design system.
 */
export default function ChartCard({ title, children, className = '', rightHeader }) {
  return (
    <div
      className={`bg-white border border-[#ebe4ff] p-6 sm:p-8 rounded-3xl shadow-[0_10px_40px_rgba(180,140,255,0.08)] ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-black/40">
          {title}
        </h3>
        {rightHeader}
      </div>
      {children}
    </div>
  );
}
