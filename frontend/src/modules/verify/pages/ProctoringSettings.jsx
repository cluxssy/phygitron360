import React, { useState, useEffect } from 'react';
import { Shield, Info, Save, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ProctoringStrictness from '../components/ProctoringStrictness';
import {
  PROCTORING_FEATURES,
  STRICTNESS_LEVELS,
  buildProctoringConfig,
} from '../proctoringConfig';

const LEVELS = Object.keys(STRICTNESS_LEVELS);

// ── Numeric threshold keys that admins can fine-tune ──────────────────────────
const THRESHOLD_LABELS = {
  max_strikes:            { label: 'Max Strikes before terminate', unit: '' },
  gaze_out_sustain_ms:    { label: 'Gaze away sustain', unit: 'ms' },
  head_turn_sustain_ms:   { label: 'Head turn sustain', unit: 'ms' },
  face_missing_sustain_ms:{ label: 'Face missing sustain', unit: 'ms' },
  multi_face_samples:     { label: 'Multi-face sample threshold', unit: '' },
  audio_voice_sustain_ms: { label: 'Voice sustain (murmur detection)', unit: 'ms' },
  tab_switch_cooldown_ms: { label: 'Tab-switch cooldown', unit: 'ms' },
};

export default function ProctoringSettings() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [globalLevel, setGlobalLevel] = useState('balanced');
  const [toggles, setToggles]   = useState(() => {
    const t = {};
    PROCTORING_FEATURES.forEach(f => { t[f.key] = true; });
    return t;
  });
  const [thresholds, setThresholds] = useState(() => {
    const t = {};
    LEVELS.forEach(l => { t[l] = { ...STRICTNESS_LEVELS[l] }; });
    return t;
  });

  // ── Fetch saved settings on mount ─────────────────────────────────────────
  useEffect(() => {
    fetch('/api/verify/builder/proctoring-settings', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        const pd = d.data?.proctoring_defaults || {};
        if (pd.global_strictness) setGlobalLevel(pd.global_strictness);
        if (pd.feature_toggles) {
          setToggles(prev => ({ ...prev, ...pd.feature_toggles }));
        }
        if (pd.custom_thresholds) {
          setThresholds(prev => {
            const merged = { ...prev };
            LEVELS.forEach(l => {
              merged[l] = { ...STRICTNESS_LEVELS[l], ...(pd.custom_thresholds[l] || {}) };
            });
            return merged;
          });
        }
      })
      .catch(() => toast.error('Could not load proctoring settings'))
      .finally(() => setLoading(false));
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/verify/builder/proctoring-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proctoring_defaults: {
            global_strictness:  globalLevel,
            feature_toggles:    toggles,
            custom_thresholds:  thresholds,
          },
        }),
      });
      const d = await res.json();
      if (d.success) toast.success('Proctoring settings saved!');
      else toast.error(d.detail || 'Failed to save');
    } catch {
      toast.error('Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  const resetLevel = (level) => {
    setThresholds(prev => ({ ...prev, [level]: { ...STRICTNESS_LEVELS[level] } }));
    toast.success(`${level.charAt(0).toUpperCase() + level.slice(1)} reset to defaults`);
  };

  const setParam = (level, key, val) =>
    setThresholds(prev => ({ ...prev, [level]: { ...prev[level], [key]: Number(val) } }));

  const descriptions = {};
  LEVELS.forEach(l => { descriptions[l] = STRICTNESS_LEVELS[l].description || l; });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-purple-500" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4 px-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={22} className="text-purple-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-800">Proctoring Settings</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Organisation-wide defaults applied to every new assessment
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* Strictness selector */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Global Strictness Level</h3>
        <ProctoringStrictness value={globalLevel} onChange={setGlobalLevel} descriptions={descriptions} />
        <p className="text-[11px] text-gray-400 flex items-start gap-1.5 mt-1">
          <Info size={12} className="mt-0.5 shrink-0" />
          Controls how quickly strikes are issued and the maximum allowed before termination.
          You can also fine-tune individual thresholds per level below.
        </p>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Feature Toggles</h3>
        <div className="space-y-3">
          {PROCTORING_FEATURES.map(f => (
            <label key={f.key} className="flex items-center justify-between gap-3 cursor-pointer group">
              <div>
                <span className="text-sm text-gray-700 group-hover:text-purple-700 transition-colors">{f.label}</span>
                <p className="text-[10px] text-gray-400 mt-0.5">{f.description || ''}</p>
              </div>
              {/* Toggle switch */}
              <button
                role="switch"
                aria-checked={!!toggles[f.key]}
                onClick={() => setToggles(t => ({ ...t, [f.key]: !t[f.key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                  toggles[f.key] ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  toggles[f.key] ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Per-level Threshold Tuning */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Fine-tune Thresholds</h3>
        <p className="text-xs text-gray-400">
          Adjust detection sensitivity per strictness level. Hover over the default badge to see original value.
        </p>

        {LEVELS.map(level => {
          const isModified = Object.keys(THRESHOLD_LABELS).some(
            k => (thresholds[level]?.[k] ?? STRICTNESS_LEVELS[level][k]) !== STRICTNESS_LEVELS[level][k]
          );
          return (
            <details key={level} className="border border-gray-100 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="text-sm font-semibold capitalize text-gray-700">
                  {level}
                  {isModified && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-bold">Modified</span>}
                </span>
                <button
                  onClick={e => { e.preventDefault(); resetLevel(level); }}
                  className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-purple-600 transition-colors"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              </summary>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(THRESHOLD_LABELS).map(([key, { label, unit }]) => {
                  const current = thresholds[level]?.[key] ?? STRICTNESS_LEVELS[level][key];
                  const def = STRICTNESS_LEVELS[level][key];
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-600">{label}</label>
                        {current !== def && (
                          <span className="text-[10px] text-gray-400" title={`Default: ${def}${unit}`}>
                            default: {def}{unit}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={current}
                          min={0}
                          step={unit === 'ms' ? 500 : 1}
                          onChange={e => setParam(level, key, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none"
                        />
                        {unit && <span className="text-xs text-gray-400 shrink-0">{unit}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      {/* Save footer */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
