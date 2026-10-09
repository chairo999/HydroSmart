import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Edit3, Check, Plus, Trash2, RotateCcw, Sparkles } from 'lucide-react';

const DEFAULT_GROWTH_DATA = {
  activePeriod: 'Week',
  chartData: [
    { name: 'Week 1', height: 2 },
    { name: 'Week 2', height: 8 },
    { name: 'Week 3', height: 16 },
    { name: 'Week 4', height: 24 }
  ],
  stage: 'Vegetative',
  targetTDSMin: 600,
  targetTDSMax: 900,
  tempRange: '20°C - 25°C',
  daysUntilHarvest: 14,
  projectedYield: '~240g/head base crop spacing profile index',
  customNote: 'Maintain stable ambient environments (DHT22 sensor reads) between 20°C and 25°C for maximum leaf volume development.'
};

export default function GrowthTab({
  selectedCropTab,
  activeStage,
  cropProfile
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(`hydrosmart_growth_${selectedCropTab}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      ...DEFAULT_GROWTH_DATA,
      stage: activeStage || 'Vegetative',
      targetTDSMin: Math.round((cropProfile?.targets?.ec?.min || 1.2) * 500),
      targetTDSMax: Math.round((cropProfile?.targets?.ec?.max || 1.8) * 500)
    };
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`hydrosmart_growth_${selectedCropTab}`);
      if (saved) {
        setData(JSON.parse(saved));
      } else {
        setData({
          ...DEFAULT_GROWTH_DATA,
          stage: activeStage || 'Vegetative',
          targetTDSMin: Math.round((cropProfile?.targets?.ec?.min || 1.2) * 500),
          targetTDSMax: Math.round((cropProfile?.targets?.ec?.max || 1.8) * 500)
        });
      }
    } catch (e) {}
  }, [selectedCropTab]);

  const handleSave = () => {
    setIsEditing(false);
    try {
      localStorage.setItem(`hydrosmart_growth_${selectedCropTab}`, JSON.stringify(data));
    } catch (e) {}
  };

  const handleReset = () => {
    const resetData = {
      ...DEFAULT_GROWTH_DATA,
      stage: activeStage || 'Vegetative',
      targetTDSMin: Math.round((cropProfile?.targets?.ec?.min || 1.2) * 500),
      targetTDSMax: Math.round((cropProfile?.targets?.ec?.max || 1.8) * 500)
    };
    setData(resetData);
    try {
      localStorage.setItem(`hydrosmart_growth_${selectedCropTab}`, JSON.stringify(resetData));
    } catch (e) {}
  };

  const updateChartPoint = (index, field, value) => {
    const nextPoints = [...data.chartData];
    nextPoints[index] = { ...nextPoints[index], [field]: field === 'height' ? Number(value) : value };
    setData(prev => ({ ...prev, chartData: nextPoints }));
  };

  const addChartPoint = () => {
    const nextIndex = data.chartData.length + 1;
    const lastHeight = data.chartData.length > 0 ? data.chartData[data.chartData.length - 1].height : 0;
    const newPoint = { name: `${data.activePeriod} ${nextIndex}`, height: lastHeight + 6 };
    setData(prev => ({ ...prev, chartData: [...prev.chartData, newPoint] }));
  };

  const removeChartPoint = (index) => {
    if (data.chartData.length <= 1) return;
    const nextPoints = data.chartData.filter((_, i) => i !== index);
    setData(prev => ({ ...prev, chartData: nextPoints }));
  };

  return (
    <div className="map-view-container fade-in" style={{ gridTemplateColumns: '1fr 360px' }}>
      {/* Left Panel: Recharts Analytics Growth Curve & Editable Inputs */}
      <div className="map-canvas-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="growth-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {selectedCropTab.toUpperCase()} GROWTH PROGRESSION
              </h3>
              <span style={{ fontSize: '11px', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                Editable
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Interactive height tracking, TDS Nutrients index, and analytics
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="growth-toggle-period" style={{ display: 'flex', background: 'var(--bg-main)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {['Day', 'Week', 'Month'].map(p => (
                <span
                  key={p}
                  className={`growth-period-btn ${data.activePeriod === p ? 'active' : ''}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: data.activePeriod === p ? 'var(--bg-panel)' : 'transparent',
                    fontWeight: data.activePeriod === p ? 700 : 500,
                    color: data.activePeriod === p ? 'var(--primary)' : 'var(--text-secondary)',
                    boxShadow: data.activePeriod === p ? 'var(--shadow-sm)' : 'none'
                  }}
                  onClick={() => setData(prev => ({ ...prev, activePeriod: p }))}
                >
                  {p}
                </span>
              ))}
            </div>

            {!isEditing ? (
              <button
                className="sim-btn"
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={14} /> Edit Data
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="sim-btn"
                  onClick={handleSave}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Check size={14} /> Save
                </button>
                <button
                  className="sim-btn"
                  onClick={handleReset}
                  title="Reset to default data"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '7px 10px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    background: 'var(--bg-main)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Recharts Analytics Curve */}
        <div style={{ flex: 1, minHeight: '300px', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px 20px 0 20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} label={{ value: 'Height (cm)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8', fontSize: '12px', fontWeight: 500 } }} />
              <Tooltip formatter={(val) => [`${val} cm`, 'Plant Height']} />
              <Line type="monotone" dataKey="height" stroke="var(--primary)" strokeWidth={3} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Editable Table of Height Data Points */}
        {isEditing && (
          <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                Edit Measurement Data Points
              </span>
              <button
                onClick={addChartPoint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--primary-glow)',
                  color: 'var(--primary)',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Plus size={13} /> Add Point
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
              {data.chartData.map((pt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-main)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input
                    type="text"
                    value={pt.name}
                    onChange={(e) => updateChartPoint(idx, 'name', e.target.value)}
                    style={{
                      width: '75px',
                      padding: '4px 6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-panel)',
                      color: 'var(--text-main)',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
                    <input
                      type="number"
                      min={0}
                      max={150}
                      step={0.5}
                      value={pt.height}
                      onChange={(e) => updateChartPoint(idx, 'height', e.target.value)}
                      style={{
                        width: '55px',
                        padding: '4px 6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-panel)',
                        color: 'var(--primary)',
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>cm</span>
                  </div>
                  <button
                    onClick={() => removeChartPoint(idx)}
                    disabled={data.chartData.length <= 1}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: data.chartData.length <= 1 ? 'var(--text-tertiary)' : 'var(--red)',
                      cursor: data.chartData.length <= 1 ? 'not-allowed' : 'pointer',
                      padding: '2px'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Growth Diagnostics & Yield Projection (User Editable) */}
      <div className="map-right-panel">
        <div className="panel-card" style={{ gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="panel-card-title">Staging Diagnostics</div>
            <Sparkles size={14} style={{ color: 'var(--primary)' }} />
          </div>
          <span className="panel-card-subtitle">AI & User Configured Insights</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            {/* Stage input/display */}
            <div style={{ display: 'flex', gap: '10px', alignItems: isEditing ? 'center' : 'flex-start' }}>
              <span style={{ fontSize: '16px' }}>🌱</span>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Stage:</span>
                  <select
                    value={data.stage}
                    onChange={(e) => setData(prev => ({ ...prev, stage: e.target.value }))}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-panel)',
                      color: 'var(--text-main)',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  >
                    <option value="Seedling">Seedling</option>
                    <option value="Vegetative">Vegetative</option>
                    <option value="Flowering">Flowering</option>
                    <option value="Harvest">Harvest</option>
                  </select>
                </div>
              ) : (
                <span>Your crop is currently indexing at the <b>{data.stage}</b> stage.</span>
              )}
            </div>

            {/* Target TDS Nutrients (ppm) input/display */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', display: 'flex', gap: '10px', alignItems: isEditing ? 'center' : 'flex-start' }}>
              <span style={{ fontSize: '16px' }}>🧪</span>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TARGET TDS NUTRIENTS (ppm / mg/L)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      value={data.targetTDSMin}
                      onChange={(e) => setData(prev => ({ ...prev, targetTDSMin: Number(e.target.value) }))}
                      style={{ width: '70px', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--primary)', fontWeight: 700 }}
                    />
                    <span>–</span>
                    <input
                      type="number"
                      value={data.targetTDSMax}
                      onChange={(e) => setData(prev => ({ ...prev, targetTDSMax: Number(e.target.value) }))}
                      style={{ width: '70px', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--primary)', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>ppm</span>
                  </div>
                </div>
              ) : (
                <span>
                  The Neural Dosing MLP network recommends maintaining a target <b>TDS Nutrients</b> of <b>{data.targetTDSMin}–{data.targetTDSMax} ppm (mg/L)</b> to avoid crop tipburn.
                </span>
              )}
            </div>

            {/* Ambient note */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', display: 'flex', gap: '10px' }}>
              <span style={{ fontSize: '16px' }}>☀️</span>
              {isEditing ? (
                <textarea
                  value={data.customNote}
                  onChange={(e) => setData(prev => ({ ...prev, customNote: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-panel)',
                    color: 'var(--text-main)',
                    resize: 'none',
                    outline: 'none'
                  }}
                />
              ) : (
                <span>{data.customNote}</span>
              )}
            </div>
          </div>
        </div>

        {/* Yield Projection */}
        <div className="panel-card" style={{ padding: '20px', gap: '12px' }}>
          <span className="panel-card-title">Yield Projection</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
            {isEditing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={data.daysUntilHarvest}
                  onChange={(e) => setData(prev => ({ ...prev, daysUntilHarvest: Number(e.target.value) }))}
                  style={{
                    width: '60px',
                    fontSize: '24px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-panel)',
                    color: 'var(--primary)',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>Days</span>
              </div>
            ) : (
              <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>
                {data.daysUntilHarvest} Days
              </span>
            )}
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Until Harvest</span>
          </div>

          {isEditing ? (
            <input
              type="text"
              value={data.projectedYield}
              onChange={(e) => setData(prev => ({ ...prev, projectedYield: e.target.value }))}
              placeholder="Projected yield notes"
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-panel)',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
          ) : (
            <span className="panel-info">Projected yield weight: {data.projectedYield}</span>
          )}
        </div>
      </div>
    </div>
  );
}
