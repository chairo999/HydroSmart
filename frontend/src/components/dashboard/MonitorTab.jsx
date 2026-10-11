import React, { useState, useEffect } from 'react';
import { Droplet, AlertCircle, Zap, Activity, Thermometer, Wind, CheckCircle2 } from 'lucide-react';
import { CROP_IMAGES, CROP_SPECIES } from '../../shared/constants';

// Relative time helper
const formatRelTime = (tsMs, now = Date.now()) => {
  const sec = Math.max(0, Math.floor((now - tsMs) / 1000));
  if (sec < 10) return 'Just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
};

export default function MonitorTab({
  selectedCropTab,
  setSelectedCropTab,
  selectCrop,
  activeStage,
  cropProfile,
  sensors
}) {
  // Water-level state tracking
  const waterLevel = typeof sensors?.waterLevel === 'number' ? sensors.waterLevel : null;
  const isWaterSensorValid = waterLevel !== null && waterLevel >= 0 && waterLevel <= 100;
  const isWaterLow = isWaterSensorValid && waterLevel < 20;
  const isWaterReplenishing = isWaterSensorValid && waterLevel < 20;

  const [waterLastChanged, setWaterLastChanged] = useState(Date.now());
  const [prevWaterLevel, setPrevWaterLevel] = useState(waterLevel);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (waterLevel !== prevWaterLevel) {
      setWaterLastChanged(Date.now());
      setPrevWaterLevel(waterLevel);
    }
  }, [waterLevel]);

  // Determine water status badge
  const waterStatusBadge = () => {
    if (!isWaterSensorValid) {
      return { label: 'Sensor Error', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: <AlertCircle size={14} /> };
    }
    if (isWaterLow) {
      return { label: 'Low — Replenishment Needed', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <AlertCircle size={14} /> };
    }
    if (waterLevel >= 80) {
      return { label: 'Full — Optimal Level', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle2 size={14} /> };
    }
    return { label: 'Normal — Monitoring Active', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <CheckCircle2 size={14} /> };
  };

  const badge = waterStatusBadge();

  // Gauge fill color
  const gaugeFillColor = !isWaterSensorValid ? '#ef4444' : isWaterLow ? '#f59e0b' : '#10b981';

  const crops = ['lettuce', 'pechay', 'spinach', 'basil'];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>

      {/* ── TOP SECTION: Hydroponic Monitor (centered) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', alignItems: 'start' }}>

        {/* LEFT: Crop List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="panel-card" style={{ gap: '8px', padding: '16px' }}>
            <div className="panel-card-title">
              <span>Hydroponic Monitor</span>
              <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>NFT System</span>
            </div>
            <span className="panel-card-subtitle" style={{ margin: 0 }}>Live crop health and nutrient targets</span>
          </div>

          <div className="sections-list" style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            {crops.map(crop => (
              <div
                key={crop}
                className={`section-item-row ${selectedCropTab === crop ? 'active' : ''}`}
                onClick={() => { setSelectedCropTab(crop); selectCrop(crop); }}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={CROP_IMAGES[crop]} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} alt={crop} />
                  <div>
                    <div className="section-item-name" style={{ textTransform: 'capitalize' }}>{crop} Plant</div>
                    <div className="section-item-crop" style={{ fontStyle: 'italic' }}>{CROP_SPECIES[crop]}</div>
                  </div>
                </div>
                <span className="section-health-badge good">94%</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Selected Crop Detail Panel */}
        <div className="section-drawer-card" style={{ padding: '20px', gap: '16px' }}>
          <div className="drawer-header" style={{ paddingBottom: '12px' }}>
            <div className="drawer-title-group">
              <span className="drawer-title" style={{ textTransform: 'capitalize', fontSize: '16px' }}>
                {selectedCropTab} Detail Profile
              </span>
              <span className="drawer-subtitle">{CROP_SPECIES[selectedCropTab]}</span>
            </div>
            <span className="overall-health-badge" style={{ fontSize: '10px' }}>{activeStage} Stage</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {/* pH */}
            <div style={{ background: 'var(--bg-card-hover)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Droplet size={13} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>pH Level</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)' }}>{sensors?.ph ?? '—'}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Target: {cropProfile?.targets?.ph?.optimal ?? 6.0}
              </div>
            </div>
            {/* TDS */}
            <div style={{ background: 'var(--bg-card-hover)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Activity size={13} style={{ color: 'var(--blue)' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>TDS Nutrients</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--blue)' }}>
                {sensors?.tds ?? Math.round((sensors?.ec ?? 1.5) * 500)}
                <span style={{ fontSize: '12px', fontWeight: 500 }}> ppm</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Target: {Math.round((cropProfile?.targets?.ec?.optimal ?? 1.5) * 500)} ppm
              </div>
            </div>
            {/* Water Temp */}
            <div style={{ background: 'var(--bg-card-hover)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Thermometer size={13} style={{ color: 'var(--amber)' }} />
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Water Temp</span>
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--amber)' }}>
                {sensors?.waterTemp ?? '—'}<span style={{ fontSize: '14px' }}>°C</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>DS18B20 Probe</div>
            </div>
          </div>

          {/* Air temp / humidity row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
            <div className="drawer-stat-row" style={{ padding: '8px 0' }}>
              <span className="drawer-stat-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wind size={12} style={{ color: 'var(--text-tertiary)' }} /> Air Temp
              </span>
              <span className="drawer-stat-value">{sensors?.airTemp ?? '—'}°C</span>
            </div>
            <div className="drawer-stat-row" style={{ padding: '8px 0' }}>
              <span className="drawer-stat-label">Humidity</span>
              <span className="drawer-stat-value">{sensors?.humidity ?? '—'}%</span>
            </div>
            <div className="drawer-stat-row" style={{ padding: '8px 0' }}>
              <span className="drawer-stat-label">Species</span>
              <span className="drawer-stat-value" style={{ fontStyle: 'italic' }}>{CROP_SPECIES[selectedCropTab]}</span>
            </div>
            <div className="drawer-stat-row" style={{ padding: '8px 0' }}>
              <span className="drawer-stat-label">pH Target</span>
              <span className="drawer-stat-value" style={{ color: 'var(--primary)' }}>{cropProfile?.targets?.ph?.optimal ?? 6.0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION: Automatic Ultrasonic Water-Level Monitor ── */}
      <div className="panel-card" style={{ padding: '24px', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div className="panel-card-title" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Zap size={16} style={{ color: 'var(--primary)' }} />
              <span>Automatic Water-Level Monitor</span>
            </div>
            <span className="panel-card-subtitle">
              Ultrasonic reservoir sensor — continuously monitored, no scheduling required
            </span>
          </div>
          {/* Status Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            background: badge.bg, color: badge.color,
            border: `1px solid ${badge.color}40`
          }}>
            {badge.icon}
            {badge.label}
          </div>
        </div>

        {/* Sensor error alert */}
        {!isWaterSensorValid && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444', fontSize: '12px', fontWeight: 600
          }}>
            <AlertCircle size={15} />
            <span>
              Water-level sensor reading unavailable or out of range.
              Automatic pump control is <b>locked</b> until a valid reading is restored.
              Do not activate pumps manually until the sensor issue is resolved.
            </span>
          </div>
        )}

        {/* Gauge + stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '24px', alignItems: 'center' }}>

          {/* Circular / bar gauge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            {/* Vertical tank visual */}
            <div style={{
              width: '90px',
              height: '160px',
              borderRadius: '10px',
              border: `2px solid ${gaugeFillColor}`,
              background: 'var(--bg-card-hover)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 0 12px ${gaugeFillColor}33`
            }}>
              {/* Fill */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: isWaterSensorValid ? `${waterLevel}%` : '0%',
                background: `linear-gradient(to top, ${gaugeFillColor}cc, ${gaugeFillColor}66)`,
                transition: 'height 0.8s ease',
                borderRadius: '0 0 8px 8px'
              }} />
              {/* Threshold line at 20% */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '20%',
                height: '1px',
                background: 'rgba(239,68,68,0.5)',
                borderTop: '1px dashed rgba(239,68,68,0.6)'
              }} />
              {/* 80% target line */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '80%',
                height: '1px',
                background: 'rgba(16,185,129,0.4)',
                borderTop: '1px dashed rgba(16,185,129,0.5)'
              }} />
              {/* % label */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2
              }}>
                <span style={{
                  fontSize: '22px', fontWeight: 800,
                  color: isWaterSensorValid ? '#fff' : '#ef4444',
                  textShadow: '0 1px 4px rgba(0,0,0,0.4)'
                }}>
                  {isWaterSensorValid ? `${Math.round(waterLevel)}%` : 'ERR'}
                </span>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Reservoir Tank Level
            </span>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--bg-card-hover)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Current Level</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: gaugeFillColor }}>
                  {isWaterSensorValid ? `${Math.round(waterLevel)}%` : 'N/A'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Ultrasonic Sensor</div>
              </div>
              <div style={{ background: 'var(--bg-card-hover)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Replenishment Target</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>80%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Auto-stop threshold</div>
              </div>
              <div style={{ background: 'var(--bg-card-hover)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Low Water Threshold</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>20%</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Alert triggers below</div>
              </div>
              <div style={{ background: 'var(--bg-card-hover)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Reading Updated</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {formatRelTime(waterLastChanged, now)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>Last level change</div>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px', color: 'var(--text-secondary)' }}>
                <span>0% <span style={{ color: '#ef4444', fontWeight: 600 }}>▲ Low (20%)</span></span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Target (80%) ▲</span>
                <span>100%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
                {/* Low threshold marker */}
                <div style={{ position: 'absolute', left: '20%', top: 0, bottom: 0, width: '2px', background: 'rgba(239,68,68,0.6)', zIndex: 2 }} />
                {/* Target threshold marker */}
                <div style={{ position: 'absolute', left: '80%', top: 0, bottom: 0, width: '2px', background: 'rgba(16,185,129,0.6)', zIndex: 2 }} />
                {/* Fill */}
                <div style={{
                  width: isWaterSensorValid ? `${waterLevel}%` : '0%',
                  height: '100%',
                  background: `linear-gradient(to right, ${gaugeFillColor}aa, ${gaugeFillColor})`,
                  borderRadius: '5px',
                  transition: 'width 0.8s ease'
                }} />
              </div>
            </div>

            {/* Safeguard notice */}
            <div style={{
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              background: 'var(--bg-card-hover)',
              padding: '8px 12px',
              borderRadius: '8px',
              borderLeft: '3px solid var(--primary)',
              lineHeight: '1.5'
            }}>
              <b style={{ color: 'var(--text-main)' }}>Auto-Monitoring Active:</b> The ultrasonic sensor continuously measures reservoir water level.
              {isWaterLow
                ? ' ⚠️ Water level is below the safe threshold — please replenish the reservoir.'
                : ' ✅ Reservoir level is within the normal operating range.'}
              {' '}Pumps will not activate automatically unless hardware replenishment logic and plumbing support it.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
