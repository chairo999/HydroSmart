import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Edit3, Check, Plus, Trash2, RotateCcw, Sparkles, Layers, Info } from 'lucide-react';
import { GREENHOUSE_SECTIONS } from '../../shared/constants';
import { sanitizeGrowthInput } from '../../shared/numberUtils';

const DEFAULT_WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

const buildDefaultSeries = () =>
  DEFAULT_WEEKS.map((name, index) => ({
    name,
    value: Number((8 + index * 5.5).toFixed(1)),
    invalidMessage: null
  }));

export default function GrowthTab({ greenhouseSections = GREENHOUSE_SECTIONS }) {
  const [isEditing, setIsEditing] = useState(false);
  const [chartData, setChartData] = useState(() => {
    try {
      const saved = localStorage.getItem('hydrosmart_growth_tracking_weekly');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return buildDefaultSeries();
  });

  const handleSave = () => {
    setIsEditing(false);
    try {
      localStorage.setItem('hydrosmart_growth_tracking_weekly', JSON.stringify(chartData));
    } catch (e) {}
  };

  const handleReset = () => {
    const defaultData = buildDefaultSeries();
    setChartData(defaultData);
    try {
      localStorage.removeItem('hydrosmart_growth_tracking_weekly');
    } catch (e) {}
  };

  const addWeek = () => {
    const nextWeekNum = chartData.length + 1;
    setChartData(prev => {
      const lastPoint = prev[prev.length - 1] || { value: 0 };
      const nextValue = Number(((Number(lastPoint.value) || 0) + 6).toFixed(1));
      return [...prev, { name: `Week ${nextWeekNum}`, value: nextValue, invalidMessage: null }];
    });
  };

  const removeWeek = (idx) => {
    if (chartData.length <= 1) return;
    setChartData(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePoint = (idx, field, value) => {
    setChartData(prev => {
      const next = [...prev];
      if (field === 'name') {
        next[idx] = { ...next[idx], name: value };
        return next;
      }

      const sanitized = sanitizeGrowthInput(value, { min: 0, max: 2000 });
      if (!sanitized.valid) {
        next[idx] = {
          ...next[idx],
          value: null,
          invalidMessage: sanitized.message
        };
        return next;
      }

      next[idx] = {
        ...next[idx],
        value: sanitized.value,
        invalidMessage: null
      };
      return next;
    });
  };

  const lastValue = chartData[chartData.length - 1]?.value ?? 0;
  const firstValue = chartData[0]?.value ?? 0;
  const netChange = Number((lastValue - firstValue).toFixed(1));

  return (
    <div className="fade-in" style={{
      display: 'flex', flexDirection: 'column', gap: '20px',
      padding: '24px', maxWidth: '1240px', margin: '0 auto', width: '100%'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              Analytics & Growth Tracking
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Weekly canopy tracking for the active hydroponic system and crop performance trend.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'var(--primary-glow)', color: 'var(--primary)',
            padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)',
            fontSize: '12px', fontWeight: 800, letterSpacing: '0.3px'
          }}>
            <span>📅 Weekly Trend</span>
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
            <b style={{ color: 'var(--text-main)' }}>Metric:</b> Weekly mean canopy height in centimeters for the active crop profile.
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '20px', minHeight: '360px' }}>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }}
                  label={{ value: 'Height (cm)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: '11px' } }}
                />
                <Tooltip
                  formatter={(value) => [`${value} cm`, 'Average canopy height']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Average canopy height"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {isEditing && (
            <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }} className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Edit Weekly Growth Values
                </span>
                <button
                  onClick={addWeek}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--primary-glow)', color: 'var(--primary)', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus size={12} /> Add Week
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 32px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Week</span>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Height (cm)</span>
                <span />
              </div>

              {chartData.map((point, idx) => (
                <div key={`${point.name}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 32px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={point.name}
                    onChange={(e) => updatePoint(idx, 'name', e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={point.value ?? ''}
                    onChange={(e) => updatePoint(idx, 'value', e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}
                  />
                  <button
                    onClick={() => removeWeek(idx)}
                    disabled={chartData.length <= 1}
                    style={{ border: 'none', background: 'transparent', color: chartData.length <= 1 ? 'var(--text-tertiary)' : 'var(--red)', cursor: chartData.length <= 1 ? 'not-allowed' : 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                  {point.invalidMessage && (
                    <div style={{ gridColumn: '2 / 3', fontSize: '10px', color: '#ef4444', marginTop: '-4px' }}>
                      {point.invalidMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-main)' }}>Growth Summary</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'var(--bg-panel)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Current Average</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                {Number.isFinite(lastValue) ? `${lastValue.toFixed(1)} cm` : '—'}
              </div>
            </div>
            <div style={{ background: 'var(--bg-panel)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Trend</div>
              <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '4px', fontWeight: 700 }}>
                {chartData.length > 1 ? `${netChange.toFixed(1)} cm over ${chartData.length} weeks` : 'Only one reading recorded'}
              </div>
            </div>
            <div style={{ fontSize: '11px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Growth tracking is centered on the weekly crop trend and remains independent of greenhouse bay filters or per-bay analytics.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
