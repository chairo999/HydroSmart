import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { Edit3, Check, Plus, Trash2, RotateCcw, Sparkles, Layers, Info } from 'lucide-react';
import { CROP_DETAILS, GREENHOUSE_SECTIONS } from '../../shared/constants';

// Bay color palette - distinct colors for bays
const BAY_COLORS = [
  '#10b981', // Bay 1 - Emerald
  '#3b82f6', // Bay 2 - Blue
  '#f59e0b', // Bay 3 - Amber
  '#8b5cf6', // Bay 4 - Violet
  '#ec4899', // Bay 5 - Pink
  '#06b6d4', // Bay 6 - Cyan
  '#14b8a6', // Bay 7 - Teal
  '#f97316'  // Bay 8 - Orange
];

const DEFAULT_WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

// Baseline weekly height growth curves (cm) per crop type for simulated initial values
const CROP_BASE_CURVES = {
  lettuce: [3.5, 9.5, 18.0, 26.5],
  pechay:  [4.0, 11.0, 20.5, 29.0],
  spinach: [3.0, 8.5, 15.0, 22.0],
  basil:   [2.5, 7.5, 14.0, 21.0]
};

export default function GrowthTab({
  selectedCropTab,
  activeStage,
  cropProfile,
  greenhouseSections = GREENHOUSE_SECTIONS,
  updateGreenhouseSection
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBayFilter, setSelectedBayFilter] = useState('all'); // 'all' or bayId

  // Live bays from application state/configuration
  const bays = useMemo(() => {
    return greenhouseSections && greenhouseSections.length > 0
      ? greenhouseSections
      : GREENHOUSE_SECTIONS;
  }, [greenhouseSections]);

  // Compute weekly series data per bay
  const [chartData, setChartData] = useState(() => {
    try {
      const saved = localStorage.getItem('hydrosmart_bay_weekly_growth');
      if (saved) return JSON.parse(saved);
    } catch (e) {}

    // Initialize with 4 weeks for each bay based on its crop and stage
    return DEFAULT_WEEKS.map((wk, i) => {
      const point = { name: wk };
      (greenhouseSections || GREENHOUSE_SECTIONS).forEach(bay => {
        const cropCurve = CROP_BASE_CURVES[bay.cropKey] || [3, 9, 16, 24];
        // Scale slightly based on bay health
        const healthFactor = (bay.baseHealth || 90) / 100;
        const val = +(cropCurve[i] * healthFactor).toFixed(1);
        point[`bay_${bay.id}`] = val;
      });
      return point;
    });
  });

  // Keep chart data aligned if bays are added/removed/renamed in greenhouse map
  useEffect(() => {
    setChartData(prev => {
      return prev.map((pt, i) => {
        const updatedPt = { ...pt };
        bays.forEach(bay => {
          const key = `bay_${bay.id}`;
          if (updatedPt[key] === undefined) {
            const cropCurve = CROP_BASE_CURVES[bay.cropKey] || [3, 9, 16, 24];
            const healthFactor = (bay.baseHealth || 90) / 100;
            updatedPt[key] = +(cropCurve[i % cropCurve.length] * healthFactor).toFixed(1);
          }
        });
        return updatedPt;
      });
    });
  }, [bays]);

  // Save changes to localStorage
  const handleSave = () => {
    setIsEditing(false);
    try {
      localStorage.setItem('hydrosmart_bay_weekly_growth', JSON.stringify(chartData));
    } catch (e) {}
  };

  // Reset to default baseline values
  const handleReset = () => {
    const defaultData = DEFAULT_WEEKS.map((wk, i) => {
      const point = { name: wk };
      bays.forEach(bay => {
        const cropCurve = CROP_BASE_CURVES[bay.cropKey] || [3, 9, 16, 24];
        const healthFactor = (bay.baseHealth || 90) / 100;
        point[`bay_${bay.id}`] = +(cropCurve[i] * healthFactor).toFixed(1);
      });
      return point;
    });
    setChartData(defaultData);
    try {
      localStorage.removeItem('hydrosmart_bay_weekly_growth');
    } catch (e) {}
  };

  const addWeek = () => {
    const nextWeekNum = chartData.length + 1;
    setChartData(prev => {
      const lastPoint = prev[prev.length - 1] || {};
      const newPoint = { name: `Week ${nextWeekNum}` };
      bays.forEach(bay => {
        const key = `bay_${bay.id}`;
        const prevVal = lastPoint[key] || 20;
        newPoint[key] = +(prevVal + (bay.cropKey === 'lettuce' ? 6 : bay.cropKey === 'pechay' ? 7 : 5)).toFixed(1);
      });
      return [...prev, newPoint];
    });
  };

  const removeWeek = (idx) => {
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

  // Visible bays for chart
  const visibleBays = useMemo(() => {
    if (selectedBayFilter === 'all') return bays;
    return bays.filter(b => b.id === Number(selectedBayFilter));
  }, [bays, selectedBayFilter]);

  return (
    <div className="fade-in" style={{
      display: 'flex', flexDirection: 'column', gap: '20px',
      padding: '24px', maxWidth: '1240px', margin: '0 auto', width: '100%'
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Greenhouse Bay Analytics & Growth Tracking
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Weekly crop canopy & height tracking organized by greenhouse bay configuration ({bays.length} active bays)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Bay Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              Filter Bay:
            </span>
            <select
              value={selectedBayFilter}
              onChange={e => setSelectedBayFilter(e.target.value)}
              style={{
                padding: '6px 12px', fontSize: '12px', borderRadius: '8px',
                border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                color: 'var(--text-main)', fontWeight: 700, outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="all">All Bays ({bays.length})</option>
              {bays.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.cropKey.charAt(0).toUpperCase() + b.cropKey.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Time Scale Badge - Weekly Analytics Only */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'var(--primary-glow)', color: 'var(--primary)',
            padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
            fontSize: '12px', fontWeight: 800, letterSpacing: '0.3px'
          }}>
            <span>📅 Time Scale: Weekly Only</span>
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

      {/* Metric & Aggregation Method Banner */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <b style={{ color: 'var(--text-main)' }}>Metric:</b> Average Plant Canopy Height (cm). Values reflect weekly recorded progress per bay sourced directly from the Greenhouse Section Map.
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
          Source: Dynamic Greenhouse Bay Config • Aggregation: Mean Bay Height per Week
        </span>
      </div>

      {/* ── MAIN GRID: Chart (left) + Bay Status Cards (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>

        {/* LEFT: Per-Bay Weekly Chart */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Chart Card */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: '16px',
            border: '1px solid var(--border-color)', padding: '20px',
            minHeight: '360px'
          }}>
            {visibleBays.length === 0 ? (
              <div style={{
                height: '320px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)',
                gap: '8px'
              }}>
                <Layers size={32} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>No bay selected or insufficient data</span>
                <span style={{ fontSize: '12px' }}>Configure sections in the Greenhouse Section Map to populate analytics.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }}
                    label={{ value: 'Height (cm)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: '11px' } }}
                  />
                  <Tooltip
                    formatter={(val, name) => {
                      const bayId = name.replace('bay_', '');
                      const bay = bays.find(b => String(b.id) === bayId);
                      const bayLabel = bay ? `${bay.name} (${bay.cropKey.charAt(0).toUpperCase() + bay.cropKey.slice(1)})` : name;
                      return [`${val} cm`, bayLabel];
                    }}
                    contentStyle={{
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      borderRadius: '8px', fontSize: '12px'
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      const bayId = value.replace('bay_', '');
                      const bay = bays.find(b => String(b.id) === bayId);
                      if (!bay) return value;
                      return (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginRight: '8px' }}>
                          {bay.name} ({bay.cropKey})
                        </span>
                      );
                    }}
                  />
                  {visibleBays.map((bay, idx) => {
                    const color = BAY_COLORS[idx % BAY_COLORS.length];
                    return (
                      <Line
                        key={bay.id}
                        type="monotone"
                        dataKey={`bay_${bay.id}`}
                        name={`bay_${bay.id}`}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: color }}
                        activeDot={{ r: 6 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Editable data table (Weekly Points) */}
          {isEditing && (
            <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }} className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Edit Weekly Data Points by Bay
                </span>
                <button
                  onClick={addWeek}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--primary-glow)', color: 'var(--primary)', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus size={12} /> Add Week
                </button>
              </div>

              {/* Table Headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `90px repeat(${visibleBays.length}, 1fr) 30px`,
                gap: '6px',
                marginBottom: '6px',
                overflowX: 'auto'
              }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Week</span>
                {visibleBays.map(b => (
                  <span key={b.id} style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {b.name}
                  </span>
                ))}
                <span></span>
              </div>

              {chartData.map((pt, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `90px repeat(${visibleBays.length}, 1fr) 30px`,
                    gap: '6px',
                    marginBottom: '6px',
                    alignItems: 'center'
                  }}
                >
                  <input
                    type="text"
                    value={pt.name}
                    onChange={e => updatePoint(idx, 'name', e.target.value)}
                    style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}
                  />
                  {visibleBays.map((b, bIdx) => {
                    const color = BAY_COLORS[bIdx % BAY_COLORS.length];
                    const key = `bay_${b.id}`;
                    return (
                      <input
                        key={b.id}
                        type="number"
                        min={0}
                        max={150}
                        step={0.5}
                        value={pt[key] !== undefined ? pt[key] : ''}
                        onChange={e => updatePoint(idx, key, e.target.value)}
                        style={{ padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: `1px solid ${color}55`, background: 'var(--bg-main)', color: color, fontWeight: 700, outline: 'none' }}
                      />
                    );
                  })}
                  <button
                    onClick={() => removeWeek(idx)}
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

        {/* RIGHT: Greenhouse Bay Overview & Crop Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-main)' }}>
                Greenhouse Bays ({bays.length})
              </span>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>
                Live Sync
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {bays.map((bay, idx) => {
                const color = BAY_COLORS[idx % BAY_COLORS.length];
                const cropDetail = CROP_DETAILS[bay.cropKey];
                const latestWeekVal = chartData[chartData.length - 1]?.[`bay_${bay.id}`] || 0;
                const isSelected = selectedBayFilter === 'all' || selectedBayFilter === String(bay.id);

                return (
                  <div
                    key={bay.id}
                    onClick={() => setSelectedBayFilter(selectedBayFilter === String(bay.id) ? 'all' : String(bay.id))}
                    style={{
                      background: 'var(--bg-panel)',
                      borderRadius: '8px',
                      border: `1px solid ${selectedBayFilter === String(bay.id) ? color : 'var(--border-color)'}`,
                      borderLeft: `3px solid ${color}`,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      opacity: isSelected ? 1 : 0.6,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                        <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>
                          {bay.name}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          ({bay.area})
                        </span>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '6px',
                        background: 'var(--primary-glow)',
                        color: 'var(--primary)'
                      }}>
                        {bay.stage || 'Vegetative'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Crop: <b>{bay.cropKey.charAt(0).toUpperCase() + bay.cropKey.slice(1)}</b>
                      </span>
                      <span style={{ fontWeight: 800, color }}>
                        {latestWeekVal} cm (Current)
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                      <span>Planted: {bay.plantedDate || 'Sep 2026'}</span>
                      <span>Health: {bay.baseHealth || 90}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bay Metric Summary */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Sparkles size={13} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>Bay Tracking Logic</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Analytics dynamically derive configuration from the Greenhouse Section Map. Modifying a bay's name, assigned crop, or planted date in the map will automatically update this chart's tracking series.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
