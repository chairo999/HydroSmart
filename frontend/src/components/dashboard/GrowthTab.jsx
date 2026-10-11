import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Edit3, Check, Plus, Trash2, RotateCcw, Sparkles, Leaf } from 'lucide-react';
import { CROP_DETAILS, GREENHOUSE_SECTIONS } from '../../shared/constants';

// Crop color palette
const CROP_COLORS = {
  lettuce: '#10b981',
  pechay: '#3b82f6',
  spinach: '#8b5cf6',
  basil: '#f59e0b'
};

const CROP_EMOJIS = {
  lettuce: '🥬',
  pechay: '🥦',
  spinach: '🌿',
  basil: '🌱'
};

// Default data points per crop
const DEFAULT_POINTS = [
  { name: 'Week 1' },
  { name: 'Week 2' },
  { name: 'Week 3' },
  { name: 'Week 4' }
];

const DEFAULT_HEIGHTS = {
  lettuce: [2, 9, 18, 26],
  pechay:  [3, 10, 20, 29],
  spinach: [2, 8, 15, 22],
  basil:   [1, 6, 13, 20]
};

export default function GrowthTab({
  selectedCropTab,
  activeStage,
  cropProfile,
  greenhouseSections = GREENHOUSE_SECTIONS
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [activePeriod, setActivePeriod] = useState('Week');

  // Derive active crops from greenhouse sections
  const activeCropKeys = useMemo(() => {
    const keys = new Set((greenhouseSections || GREENHOUSE_SECTIONS).map(s => s.cropKey));
    // Always show all 4 supported crops in chart
    return ['lettuce', 'pechay', 'spinach', 'basil'].filter(k => keys.has(k) || true);
  }, [greenhouseSections]);

  // Editable chart data: array of {name, lettuce, pechay, spinach, basil}
  const [chartData, setChartData] = useState(() => {
    try {
      const saved = localStorage.getItem('hydrosmart_multicrop_growth');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_POINTS.map((pt, i) => ({
      name: pt.name,
      lettuce: DEFAULT_HEIGHTS.lettuce[i],
      pechay:  DEFAULT_HEIGHTS.pechay[i],
      spinach: DEFAULT_HEIGHTS.spinach[i],
      basil:   DEFAULT_HEIGHTS.basil[i]
    }));
  });

  // Diagnostics per crop (editable)
  const [diagnostics, setDiagnostics] = useState(() => {
    try {
      const saved = localStorage.getItem('hydrosmart_multicrop_diag');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      lettuce: { stage: 'Vegetative', tdsMin: 600, tdsMax: 900, note: 'Maintain 20–25°C for max leaf development.', daysUntilHarvest: 14, yield: '~240g/head' },
      pechay:  { stage: 'Vegetative', tdsMin: 700, tdsMax: 1050, note: 'Optimal pH 6.0–6.5 for nutrient uptake.', daysUntilHarvest: 18, yield: '~180g/plant' },
      spinach: { stage: 'Seedling', tdsMin: 900, tdsMax: 1260, note: 'Needs cooler temps (15–20°C) for best yield.', daysUntilHarvest: 22, yield: '~120g/plant' },
      basil:   { stage: 'Seedling', tdsMin: 700, tdsMax: 980, note: 'High light requirements; prune flower tips.', daysUntilHarvest: 20, yield: '~60g/plant' }
    };
  });

  const handleSave = () => {
    setIsEditing(false);
    try {
      localStorage.setItem('hydrosmart_multicrop_growth', JSON.stringify(chartData));
      localStorage.setItem('hydrosmart_multicrop_diag', JSON.stringify(diagnostics));
    } catch (e) {}
  };

  const handleReset = () => {
    const defaultData = DEFAULT_POINTS.map((pt, i) => ({
      name: pt.name,
      lettuce: DEFAULT_HEIGHTS.lettuce[i],
      pechay:  DEFAULT_HEIGHTS.pechay[i],
      spinach: DEFAULT_HEIGHTS.spinach[i],
      basil:   DEFAULT_HEIGHTS.basil[i]
    }));
    setChartData(defaultData);
    try { localStorage.removeItem('hydrosmart_multicrop_growth'); } catch (e) {}
  };

  const addPoint = () => {
    const idx = chartData.length + 1;
    setChartData(prev => [...prev, {
      name: `${activePeriod} ${idx}`,
      lettuce: (prev[prev.length - 1]?.lettuce || 0) + 7,
      pechay:  (prev[prev.length - 1]?.pechay  || 0) + 8,
      spinach: (prev[prev.length - 1]?.spinach  || 0) + 5,
      basil:   (prev[prev.length - 1]?.basil    || 0) + 6
    }]);
  };

  const removePoint = (idx) => {
    if (chartData.length <= 1) return;
    setChartData(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePoint = (idx, field, value) => {
    setChartData(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: field === 'name' ? value : Number(value) };
      return next;
    });
  };

  const updateDiag = (cropKey, field, value) => {
    setDiagnostics(prev => ({
      ...prev,
      [cropKey]: { ...prev[cropKey], [field]: field === 'stage' || field === 'note' || field === 'yield' ? value : Number(value) }
    }));
  };

  return (
    <div className="fade-in" style={{
      display: 'flex', flexDirection: 'column', gap: '20px',
      padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%'
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Multi-Crop Growth Analytics
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Simultaneous height tracking for all NFT bay crops — Lettuce, Pechay, Spinach, Basil
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Period toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-main)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {['Day', 'Week', 'Month'].map(p => (
              <span
                key={p}
                onClick={() => setActivePeriod(p)}
                style={{
                  padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                  background: activePeriod === p ? 'var(--bg-panel)' : 'transparent',
                  fontWeight: activePeriod === p ? 700 : 500,
                  color: activePeriod === p ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: activePeriod === p ? 'var(--shadow-sm)' : 'none'
                }}
              >{p}</span>
            ))}
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              <Edit3 size={13} /> Edit Data
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleSave}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                <Check size={13} /> Save
              </button>
              <button
                onClick={handleReset}
                title="Reset to default"
                style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', fontSize: '12px', borderRadius: '8px', background: 'var(--bg-main)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
              >
                <RotateCcw size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN GRID: Chart (left) + Diagnostics (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>

        {/* LEFT: Multi-Crop Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Chart Card */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: '16px',
            border: '1px solid var(--border-color)', padding: '20px',
            minHeight: '340px'
          }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }}
                  label={{ value: 'Height (cm)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: '11px' } }}
                />
                <Tooltip
                  formatter={(val, name) => [`${val} cm`, name.charAt(0).toUpperCase() + name.slice(1)]}
                  contentStyle={{
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', fontSize: '12px'
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-main)' }}>
                      {CROP_EMOJIS[value]} {value}
                    </span>
                  )}
                />
                {['lettuce', 'pechay', 'spinach', 'basil'].map(crop => (
                  <Line
                    key={crop}
                    type="monotone"
                    dataKey={crop}
                    stroke={CROP_COLORS[crop]}
                    strokeWidth={3}
                    dot={{ r: 4, fill: CROP_COLORS[crop] }}
                    activeDot={{ r: 7 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Editable data table */}
          {isEditing && (
            <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }} className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>Edit Measurement Data Points</span>
                <button
                  onClick={addPoint}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--primary-glow)', color: 'var(--primary)', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus size={12} /> Add Point
                </button>
              </div>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(4, 1fr) 30px', gap: '6px', marginBottom: '6px' }}>
                {['Period', 'Lettuce', 'Pechay', 'Spinach', 'Basil', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{h}</span>
                ))}
              </div>
              {chartData.map((pt, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px repeat(4, 1fr) 30px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <input
                    type="text" value={pt.name}
                    onChange={e => updatePoint(idx, 'name', e.target.value)}
                    style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}
                  />
                  {['lettuce', 'pechay', 'spinach', 'basil'].map(crop => (
                    <input
                      key={crop} type="number" min={0} max={150} step={0.5}
                      value={pt[crop]}
                      onChange={e => updatePoint(idx, crop, e.target.value)}
                      style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: `1px solid ${CROP_COLORS[crop]}55`, background: 'var(--bg-main)', color: CROP_COLORS[crop], fontWeight: 700, outline: 'none' }}
                    />
                  ))}
                  <button
                    onClick={() => removePoint(idx)}
                    disabled={chartData.length <= 1}
                    style={{ border: 'none', background: 'transparent', color: chartData.length <= 1 ? 'var(--text-tertiary)' : 'var(--red)', cursor: chartData.length <= 1 ? 'not-allowed' : 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Per-Crop Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {['lettuce', 'pechay', 'spinach', 'basil'].map(crop => {
            const diag = diagnostics[crop];
            const details = CROP_DETAILS[crop];
            return (
              <div key={crop} style={{
                background: 'var(--bg-card)', borderRadius: '12px',
                border: `1px solid var(--border-color)`,
                borderLeft: `3px solid ${CROP_COLORS[crop]}`,
                padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>{CROP_EMOJIS[crop]}</span>
                    <span style={{ textTransform: 'capitalize' }}>{crop}</span>
                  </span>
                  {isEditing ? (
                    <select
                      value={diag.stage}
                      onChange={e => updateDiag(crop, 'stage', e.target.value)}
                      style={{ padding: '3px 6px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontWeight: 700, outline: 'none' }}
                    >
                      {['Seedling', 'Vegetative', 'Flowering', 'Harvest Ready'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: `${CROP_COLORS[crop]}22`, color: CROP_COLORS[crop] }}>
                      {diag.stage}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>TDS Target (ppm)</span>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input type="number" value={diag.tdsMin} onChange={e => updateDiag(crop, 'tdsMin', e.target.value)}
                          style={{ width: '52px', padding: '2px 4px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none' }} />
                        <span>–</span>
                        <input type="number" value={diag.tdsMax} onChange={e => updateDiag(crop, 'tdsMax', e.target.value)}
                          style={{ width: '52px', padding: '2px 4px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none' }} />
                      </div>
                    ) : (
                      <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{diag.tdsMin}–{diag.tdsMax}</span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '10px', marginBottom: '2px' }}>Days to Harvest</span>
                    {isEditing ? (
                      <input type="number" min={1} max={120} value={diag.daysUntilHarvest} onChange={e => updateDiag(crop, 'daysUntilHarvest', e.target.value)}
                        style={{ width: '52px', padding: '2px 4px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: CROP_COLORS[crop], fontWeight: 700, outline: 'none' }} />
                    ) : (
                      <span style={{ fontWeight: 700, color: CROP_COLORS[crop] }}>{diag.daysUntilHarvest} days</span>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <textarea
                    value={diag.note}
                    onChange={e => updateDiag(crop, 'note', e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '5px 7px', fontSize: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                  />
                ) : (
                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>{diag.note}</p>
                )}
              </div>
            );
          })}

          {/* Yield summary card */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Sparkles size={13} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>Projected Yields</span>
            </div>
            {['lettuce', 'pechay', 'spinach', 'basil'].map(crop => (
              <div key={crop} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px dashed var(--border-color)', fontSize: '11px' }}>
                <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{CROP_EMOJIS[crop]} {crop}</span>
                {isEditing ? (
                  <input type="text" value={diagnostics[crop].yield} onChange={e => updateDiag(crop, 'yield', e.target.value)}
                    style={{ width: '90px', padding: '2px 4px', fontSize: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none', textAlign: 'right' }} />
                ) : (
                  <span style={{ fontWeight: 700, color: CROP_COLORS[crop] }}>{diagnostics[crop].yield}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
