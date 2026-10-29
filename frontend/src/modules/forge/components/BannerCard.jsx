import React from 'react';

/**
 * Enterprise BannerCard matching Employee Central (Phygitron 360) design system.
 */
export default function BannerCard({ eyebrow, title, subtitle, children, rightContent }) {
  return (
    <div className="bg-[#f6f0ff] border border-[#ebe4ff] rounded-[2.5rem] p-8 sm:p-10 mb-8">
      <div className="flex justify-between items-end flex-wrap gap-6 text-left w-full">
        <div className="text-left max-w-2xl">
          {eyebrow && (
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7c3aed] mb-3 text-left">
              {eyebrow}
            </p>
          )}
          <h1 className="text-4xl lg:text-5xl font-black text-black tracking-tight leading-none text-left">
            {title}
          </h1>
          {subtitle && (
            <p className="text-black/60 mt-3 text-sm font-medium text-left">
              {subtitle}
            </p>
          )}
        </div>

        {(rightContent || children) && (
          <div className="flex items-center gap-4 flex-wrap">
            {rightContent}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
