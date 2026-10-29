import React from 'react';

/**
 * Enterprise StatCard matching Employee Central (Phygitron 360) design system.
 */
export default function StatCard({ label, value, color, borderColor, icon: Icon, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#ebe4ff] p-6 rounded-2xl shadow-[0_10px_40px_rgba(180,140,255,0.08)] relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(124,58,237,0.08)] ${
        onClick ? 'cursor-pointer' : ''
      } border-t-4 ${borderColor || ''}`}
      style={!borderColor && color ? { borderTopColor: color } : undefined}
    >
      {Icon && (
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: `${color}15`,
            border: `1px solid ${color}25`,
            color: color
          }}
        >
          {React.isValidElement(Icon) ? Icon : <Icon size={20} style={{ color }} />}
        </div>
      )}

      {/* Value */}
      <h3 className="text-4xl font-black leading-none mb-2 text-black tracking-tight">
        {value}
      </h3>

      {/* Label */}
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-black/50">
        {label}
      </p>

      {/* Subtext */}
      {sub && (
        <p className="text-[9px] text-black/60 mt-2 uppercase tracking-widest flex items-center gap-1 font-semibold">
          {sub}
        </p>
      )}
    </div>
  );
}
