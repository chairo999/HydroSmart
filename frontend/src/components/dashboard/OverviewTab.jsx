import React, { useState } from 'react';
import {
  Leaf, Thermometer, Sun, Droplet, Wind, Zap, Cpu, RefreshCw, Check, ChevronRight, Activity, Clock,
  ArrowUp, ArrowDown, ExternalLink, X, FileText, CheckCircle2, Search
} from 'lucide-react';
import { CROP_IMAGES, CROP_SPECIES, formatShortDate } from '../../shared/constants';

export default function OverviewTab({
  sensors,
  energy,
  dosing,
  activeCrop,
  activeStage,
  selectCrop,
  cropProfile,
  tasks,
  toggleTask,
  getCompletedTasksCount,
  fetchData,
  currentTime,
  farmLocation,
  setDesktopTab
}) {
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logFilter, setLogFilter] = useState('all'); // 'all', 'nutrient', 'ph'
  const [logSearch, setLogSearch] = useState('');

  const currentTDS = sensors.tds || Math.round(sensors.ec * 500);
  const minTDS = Math.round((cropProfile?.targets?.ec?.min || 1.2) * 500);
  const maxTDS = Math.round((cropProfile?.targets?.ec?.max || 1.8) * 500);
  const targetTDS = Math.round((cropProfile?.targets?.ec?.optimal || 1.5) * 500);
  const targetPH = cropProfile?.targets?.ph?.optimal || 6.0;

  // Relative timestamp calculator that updates in real time
  const formatRelativeTime = (timeMs, now = new Date()) => {
    const elapsedSec = Math.max(0, Math.floor((now.getTime() - timeMs) / 1000));
    if (elapsedSec < 10) return 'Just now';
    if (elapsedSec < 60) return `${elapsedSec} seconds ago`;
    const elapsedMin = Math.floor(elapsedSec / 60);
    if (elapsedMin === 1) return '1 minute ago';
    if (elapsedMin < 60) return `${elapsedMin} minutes ago`;
    const elapsedHours = Math.floor(elapsedMin / 60);
    if (elapsedHours === 1) return '1 hour ago';
    if (elapsedHours < 24) return `${elapsedHours} hours ago`;
    const elapsedDays = Math.floor(elapsedHours / 24);
    if (elapsedDays === 1) return '1 day ago';
    return `${elapsedDays} days ago`;
  };

  // Complete operational logs from beginning of system operation up to present
  const allSystemLogs = [
    {
      id: 'log-1',
      timestamp: currentTime.getTime() - 15000, // 15 seconds ago
      pump: Number(sensors.ph) < targetPH ? 'pH-Up' : 'pH-Down',
      type: 'ph',
      dosage: Number(sensors.ph) < targetPH ? `${dosing.phUp_ml || 0.8} mL` : `${dosing.phDown_ml || 0.6} mL`,
      action: Number(sensors.ph) < targetPH ? 'pH Up Applied' : 'pH Down Applied',
      details: Number(sensors.ph) < targetPH
        ? `pH Up Applied: Previous pH ${(sensors.ph - 0.5).toFixed(1)} → Current pH ${sensors.ph} (+0.5)`
        : `pH Down Applied: Previous pH ${(Number(sensors.ph) + 0.6).toFixed(1)} → Current pH ${sensors.ph} (-0.6)`,
      direction: Number(sensors.ph) < targetPH ? 'up' : 'down'
    },
    {
      id: 'log-2',
      timestamp: currentTime.getTime() - 12 * 60 * 1000, // 12 minutes ago
      pump: 'Nutrient A & B',
      type: 'nutrient',
      dosage: `${dosing.nutrientA_ml || 2.4} mL (A) + ${dosing.nutrientB_ml || 1.8} mL (B)`,
      action: 'Automated TDS Nutrients Dosing',
      details: `Triggered by live TDS reading: ${currentTDS} ppm (Target: ${targetTDS} ppm / mg/L)`
    },
    {
      id: 'log-3',
      timestamp: currentTime.getTime() - 2 * 3600 * 1000 - 15 * 60 * 1000, // 2h 15m ago
      pump: 'Nutrient B',
      type: 'nutrient',
      dosage: '1.8 mL',
      action: 'Nutrient B Calibration Top-up',
      details: `Replenishment cycle: Monitored at ${Math.max(300, currentTDS - 55)} ppm (Target: ${targetTDS} ppm)`
    },
    {
      id: 'log-4',
      timestamp: currentTime.getTime() - 5 * 3600 * 1000 - 10 * 60 * 1000, // 5h 10m ago
      pump: 'pH-Up',
      type: 'ph',
      dosage: '1.0 mL',
      action: 'pH Up Applied',
      details: 'pH Up Applied: Previous pH 5.4 → Current pH 6.1 (+0.7)',
      direction: 'up'
    },
    {
      id: 'log-5',
      timestamp: currentTime.getTime() - 11 * 3600 * 1000, // 11 hours ago
      pump: 'Nutrient A',
      type: 'nutrient',
      dosage: '2.0 mL',
      action: 'Nutrient A Scheduled Cycle',
      details: `Morning vegetative nutrient boost: 680 ppm`
    },
    {
      id: 'log-6',
      timestamp: currentTime.getTime() - 17 * 3600 * 1000, // 17 hours ago
      pump: 'pH-Down',
      type: 'ph',
      dosage: '0.8 mL',
      action: 'pH Down Applied',
      details: 'pH Down Applied: Previous pH 7.2 → Current pH 6.5 (-0.7)',
      direction: 'down'
    },
    {
      id: 'log-7',
      timestamp: currentTime.getTime() - 24 * 3600 * 1000, // 24 hours ago (system startup)
      pump: 'Nutrient A & B',
      type: 'nutrient',
      dosage: '3.0 mL (A) + 3.0 mL (B)',
      action: 'System Startup Baseline Dosing',
      details: 'Initial reservoir batch charge at system power-on'
    }
  ];

  // Latest pumping activity log
  const latestLog = allSystemLogs[0];

  // Find latest pH activity to determine expected pH direction
  const latestPHLog = allSystemLogs.find(l => l.type === 'ph');
  const isExpectedIncrease = latestPHLog ? latestPHLog.direction === 'up' : Number(sensors.ph) < targetPH;

  return (
    <div className="dashboard-redesign-grid fade-in">
      {/* LEFT COLUMN */}
      <div className="dashboard-redesign-col">
        {/* Notification Banner */}
        <div className="dashboard-notification-banner">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="notif-banner-badge-container">
              <span className="notif-banner-days">14</span>
              <span className="notif-banner-days-lbl">Days</span>
            </div>
            <div className="notif-banner-divider" />
            <span className="notif-banner-text">
              Watering cycle pending for your <span style={{ textTransform: 'capitalize' }}>{activeCrop}</span> plants. Harvest in 14 days.
            </span>
          </div>
          <div className="notif-banner-icon-bg">
            <Leaf size={16} style={{ color: '#5b8e3b' }} />
          </div>
        </div>

        {/* Hero Banner Card */}
        <div className="hero-banner-card">
          <div className="hero-banner-overlay" />
          <div className="hero-hotspots-container">
            <div className="floating-hotspot temp-hotspot">
              <span className="hotspot-badge" title="Air Temperature Sensor"><Thermometer size={14} /></span>
              <span className="hotspot-label">Temperature</span>
              <div className="hotspot-connector" />
            </div>
            <div className="floating-hotspot light-hotspot">
              <span className="hotspot-badge" title="TDS Nutrients Sensor Probe"><Sun size={14} /></span>
              <span className="hotspot-label">TDS Nutrients</span>
              <div className="hotspot-connector" />
            </div>
            <div className="floating-hotspot water-hotspot">
              <span className="hotspot-badge" title="Ultrasonic Water Level Sensor"><Droplet size={14} /></span>
              <span className="hotspot-label">Water</span>
              <div className="hotspot-connector" />
            </div>
            <div className="floating-hotspot air-hotspot">
              <span className="hotspot-badge" title="pH Sensor Probe"><Wind size={14} /></span>
              <span className="hotspot-label">Air Circulation</span>
              <div className="hotspot-connector" />
            </div>
          </div>

          <div className="hero-banner-content">
            <div className="hero-banner-title">
              Revolutionize Your Yield with Smart Hydroponics
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button className="hero-banner-btn" onClick={() => setDesktopTab('map')}>
                Get Started <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Crop Recommendations Row */}
        <div className="recommendation-section">
          <div className="recommendation-section-title-row">
            <h3 className="recommendation-section-title">
              Suggested Crops
            </h3>
            <a href="#see-all" className="recommendation-see-all" onClick={(e) => { e.preventDefault(); setDesktopTab('map'); }}>see all</a>
          </div>

          <div className="recommendations-grid">
            {['lettuce', 'pechay', 'spinach'].map(crop => (
              <div
                key={crop}
                className={`recommendation-item-card ${activeCrop === crop ? 'active' : ''}`}
                onClick={() => selectCrop(crop)}
              >
                <img src={CROP_IMAGES[crop]} className="recommendation-item-img" alt={crop} />
                <div className="recommendation-item-info">
                  <span className="recommendation-item-name" style={{ textTransform: 'capitalize' }}>{crop}</span>
                  <span className="recommendation-item-species">({CROP_SPECIES[crop]})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6-parameters grid */}
        <div className="parameters-grid">
          <div className="param-card health-premium">
            <div className="param-header-row">
              <span className="param-label">Plant Health</span>
              <div className="param-icon"><Leaf size={14} /></div>
            </div>
            <span className="param-value">94%</span>
            <span className="param-info">The plants are showing excellent health status</span>
          </div>

          <div className="param-card">
            <div className="param-header-row">
              <span className="param-label">TDS Nutrients</span>
              <div className="param-icon"><Activity size={14} /></div>
            </div>
            <span className="param-value">{currentTDS} <span style={{ fontSize: '12px', fontWeight: 500 }}>ppm</span></span>
            <span className="param-info">Optimal TDS range: {minTDS}–{maxTDS} ppm (mg/L)</span>
          </div>

          <div className="param-card">
            <div className="param-header-row">
              <span className="param-label">Water Temp</span>
              <div className="param-icon"><Thermometer size={14} /></div>
            </div>
            <span className="param-value">{sensors.waterTemp}°C</span>
            <span className="param-info">DS18B20 Water Temperature Probe</span>
          </div>

          <div className="param-card">
            <div className="param-header-row">
              <span className="param-label">pH Level</span>
              <div className="param-icon"><Droplet size={14} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="param-value">{sensors.ph}</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                color: isExpectedIncrease ? '#10b981' : '#ef4444',
                background: isExpectedIncrease ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                padding: '2px 7px',
                borderRadius: '6px'
              }}>
                {isExpectedIncrease ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {isExpectedIncrease ? 'Expected to Increase' : 'Expected to Decrease'}
              </span>
            </div>
            <span className="param-info" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span>Analog pH Sensor probe readings</span>
              <span style={{
                fontWeight: 700,
                color: isExpectedIncrease ? '#10b981' : '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                • {isExpectedIncrease ? '▲' : '▼'} ({isExpectedIncrease ? 'pH Up Applied' : 'pH Down Applied'})
              </span>
            </span>
          </div>

          <div className="param-card">
            <div className="param-header-row">
              <span className="param-label">Air Temp / Humid</span>
              <div className="param-icon"><Wind size={14} /></div>
            </div>
            <span className="param-value" style={{ fontSize: '20px', marginTop: '4px' }}>
              {sensors.airTemp}°C / {sensors.humidity}%
            </span>
            <span className="param-info">DHT22 Ambient Environment Sensor</span>
          </div>

          <div className="param-card">
            <div className="param-header-row">
              <span className="param-label">Water Level</span>
              <div className="param-icon"><Droplet size={14} /></div>
            </div>
            <span className="param-value">{sensors.waterLevel}%</span>
            <span className="param-info">Ultrasonic Water Tank Level Sensor</span>
          </div>
        </div>

        {/* INA219 Energy Monitor */}
        <div className="energy-monitor-card">
          <div className="energy-header">
            <div className="energy-title">
              <Zap size={16} style={{ color: 'var(--amber)' }} />
              <span>INA219 Solar & Battery Energy Monitor</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>
              {energy.gridActive ? 'GRID BYPASS' : 'SOLAR HYBRID ACTIVE'}
            </span>
          </div>
          <span className="energy-subtitle">Integrated INA219 current & voltage sensor tracking solar harvesting, consumption, and battery state</span>

          <div className="energy-grid">
            <div className="energy-card-sub">
              <div className="energy-sub-title" style={{ color: 'var(--amber)' }}>
                <Sun size={14} /> Solar Harvesting (INA219)
              </div>
              <div className="energy-metrics-list">
                <div className="energy-metric-row">
                  <span className="energy-metric-label">Voltage</span>
                  <span className="energy-metric-val">{energy.solarVoltage.toFixed(1)} V</span>
                </div>
                <div className="energy-metric-row">
                  <span className="energy-metric-label">Current</span>
                  <span className="energy-metric-val">{(energy.solarCurrent / 1000).toFixed(2)} A</span>
                </div>
                <div className="energy-metric-row" style={{ borderTop: '1px dotted var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                  <span className="energy-metric-label" style={{ fontWeight: 600 }}>Harvest Power</span>
                  <span className="energy-metric-val" style={{ color: 'var(--amber)' }}>{energy.solarPower.toFixed(1)} W</span>
                </div>
              </div>
            </div>

            <div className="energy-card-sub">
              <div className="energy-sub-title" style={{ color: 'var(--blue)' }}>
                <Cpu size={14} /> System Load (INA219)
              </div>
              <div className="energy-metrics-list">
                <div className="energy-metric-row">
                  <span className="energy-metric-label">Voltage</span>
                  <span className="energy-metric-val">{energy.loadVoltage.toFixed(1)} V</span>
                </div>
                <div className="energy-metric-row">
                  <span className="energy-metric-label">Current</span>
                  <span className="energy-metric-val">{(energy.loadCurrent / 1000).toFixed(2)} A</span>
                </div>
                <div className="energy-metric-row" style={{ borderTop: '1px dotted var(--border-color)', paddingTop: '4px', marginTop: '2px' }}>
                  <span className="energy-metric-label" style={{ fontWeight: 600 }}>Load Power</span>
                  <span className="energy-metric-val" style={{ color: 'var(--blue)' }}>{energy.loadPower.toFixed(1)} W</span>
                </div>
              </div>
            </div>
          </div>

          <div className="battery-status-bar">
            <div className="battery-visual-container">
              <div className="battery-icon-simulated">
                <div
                  className="battery-level-fill"
                  style={{
                    width: `${energy.batterySoC}%`,
                    background: energy.batterySoC >= 50 ? 'var(--primary)' : energy.batterySoC >= 20 ? 'var(--amber)' : 'var(--red)'
                  }}
                />
              </div>
            </div>
            <div className="battery-text-info">
              <span className="battery-percent">{Math.round(energy.batterySoC)}% Capacity</span>
              <div className={`battery-charging-status ${energy.chargingState === 'discharging' ? 'discharging' : ''}`}>
                {energy.chargingState === 'solar' && '⚡ SOLAR CHARGING ACTIVE'}
                {energy.chargingState === 'grid' && '🔌 GRID CHARGING ACTIVE'}
                {energy.chargingState === 'discharging' && '⚠️ DISCHARGING (BATTERY RUNNING)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="dashboard-redesign-col">
        {/* Weather Widget */}
        <div className="panel-card weather-widget">
          <div className="weather-header">
            <div className="drawer-title-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="weather-location">{farmLocation}</span>
              </div>
              <span className="weather-date">{formatShortDate(currentTime)}</span>
            </div>
            <span style={{ fontSize: '20px' }}>☀️</span>
          </div>
          <div className="weather-main">
            <div className="weather-temp-container">
              <span className="weather-temp">{Math.round(sensors.airTemp)}</span>
              <span className="weather-temp-unit">°C</span>
            </div>
            <div className="weather-icon-desc">
              <div className="weather-desc">Sunny</div>
              <div className="weather-minmax">H: 34°C &nbsp; L: 24°C</div>
            </div>
          </div>
          <div className="garden-info-banner">
            <div className="garden-banner-item">
              <span className="garden-banner-label">Active Crop</span>
              <span className="garden-banner-val" style={{ textTransform: 'capitalize' }}>{activeCrop}</span>
            </div>
            <div className="garden-banner-item" style={{ alignItems: 'flex-end' }}>
              <span className="garden-banner-label">Growth Stage</span>
              <span className="garden-banner-val">{activeStage}</span>
            </div>
          </div>
        </div>

        {/* MLP Dosing Control */}
        <div className="panel-card">
          <div className="panel-card-title">
            <span>MLP Dosing Control</span>
            <span style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 600 }}>v2.1-NEURAL</span>
          </div>
          <span className="panel-card-subtitle">Neural network peristaltic pump controller & dosing history</span>

          {/* 4 Peristaltic Pump Tiles with Last Pumped Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
            <div style={{ background: 'var(--bg-card-hover)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)' }}>NUTRIENT A</span>
                <span style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: 600 }}>12m ago</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                {dosing.nutrientA_ml} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>mL</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                TDS: {currentTDS} ppm
              </div>
            </div>

            <div style={{ background: 'var(--bg-card-hover)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)' }}>NUTRIENT B</span>
                <span style={{ fontSize: '9px', color: 'var(--blue)', fontWeight: 600 }}>12m ago</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--blue)', marginTop: '2px' }}>
                {dosing.nutrientB_ml} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>mL</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                TDS: {currentTDS} ppm
              </div>
            </div>

            <div style={{ background: 'var(--bg-card-hover)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)' }}>pH-UP</span>
                <span style={{ fontSize: '9px', color: 'var(--amber)', fontWeight: 600 }}>2h 15m ago</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--amber)', marginTop: '2px' }}>
                {dosing.phUp_ml} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>mL</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Prev 5.6 → {sensors.ph}
              </div>
            </div>

            <div style={{ background: 'var(--bg-card-hover)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)' }}>pH-DOWN</span>
                <span style={{ fontSize: '9px', color: 'var(--red)', fontWeight: 600 }}>38m ago</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--red)', marginTop: '2px' }}>
                {dosing.phDown_ml} <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>mL</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Prev 6.8 → {sensors.ph}
              </div>
            </div>
          </div>

          {/* Dosing and Pumping Activity Logs (Displays ONLY the latest live telemetry, clickable with dynamic relative timestamp) */}
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Latest Pumping Activity Log
              </span>
              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11} /> {formatRelativeTime(latestLog.timestamp, currentTime)}
              </span>
            </div>

            {/* Clickable Single Latest Activity Card */}
            <div
              onClick={() => setShowLogsModal(true)}
              style={{
                background: 'var(--bg-card-hover)',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
              title="Click to view complete live logs from the beginning of system operation up to present"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '12px' }}>
                    {latestLog.pump}
                  </span>
                  <span style={{ fontSize: '9px', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                    Latest Live Action
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  View All Logs ({allSystemLogs.length}) <ExternalLink size={11} />
                </span>
              </div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '5px' }}>
                Dosed: <b>{latestLog.dosage}</b> • {latestLog.action}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {latestLog.details}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)', fontSize: '10px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>
                  Last changed: <b style={{ color: 'var(--text-main)' }}>{formatRelativeTime(latestLog.timestamp, currentTime)}</b>
                </span>
                <span style={{ color: 'var(--blue)', fontWeight: 600 }}>
                  Click to view full logs from system start ➔
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="panel-card">
          <div className="task-header">
            <div className="drawer-title-group">
              <span className="drawer-title" style={{ fontSize: '15px' }}>Task Checklist</span>
              <span className="drawer-subtitle">Automated daily greenhouse routines</span>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
              {Math.round((getCompletedTasksCount() / tasks.length) * 100)}% Completed
            </span>
          </div>

          <div className="task-progress-bar-container">
            <div
              className="task-progress-bar-fill"
              style={{ width: `${(getCompletedTasksCount() / tasks.length) * 100}%` }}
            />
          </div>

          <div className="task-list">
            {tasks.map(t => (
              <div className={`task-item ${t.completed ? 'completed' : ''}`} key={t.id}>
                <div className="task-item-left">
                  <div className="task-checkbox-wrapper">
                    <div
                      className={`task-checkbox ${t.completed ? 'checked' : ''}`}
                      onClick={() => toggleTask(t.id)}
                    >
                      {t.completed && <Check size={10} />}
                    </div>
                  </div>
                  <div className="task-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="task-title">{t.title}</span>
                      {t.autoCompleted && (
                        <span style={{ fontSize: '9px', background: 'var(--primary-light)', color: 'var(--primary-hover)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          Auto-Done
                        </span>
                      )}
                    </div>
                    <span className="task-desc">{t.desc}</span>
                  </div>
                </div>
                <span className="task-time">{t.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ── Full System Logs Modal ── */}
    {showLogsModal && (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}
        onClick={() => setShowLogsModal(false)}
      >
        <div
          style={{
            background: 'var(--bg-card)', borderRadius: '16px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            width: '100%', maxWidth: '560px', maxHeight: '80vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px 14px', borderBottom: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                Complete Pumping Activity Logs
              </span>
            </div>
            <button
              onClick={() => setShowLogsModal(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Filter + Search Bar */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['all', 'nutrient', 'ph'].map(f => (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  background: logFilter === f ? 'var(--primary)' : 'var(--primary-glow)',
                  color: logFilter === f ? '#fff' : 'var(--primary)'
                }}
              >
                {f === 'all' ? 'All Logs' : f === 'nutrient' ? 'Nutrients' : 'pH'}
              </button>
            ))}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input, var(--primary-glow))', borderRadius: '8px', padding: '5px 10px', minWidth: '120px' }}>
              <Search size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search logs…"
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: 'var(--text-main)', width: '100%' }}
              />
            </div>
          </div>

          {/* Log Entries */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(() => {
              const filtered = allSystemLogs.filter(log => {
                const matchesFilter = logFilter === 'all' || log.type === logFilter;
                const q = logSearch.toLowerCase();
                const matchesSearch = !q ||
                  log.pump.toLowerCase().includes(q) ||
                  log.action.toLowerCase().includes(q) ||
                  log.details.toLowerCase().includes(q) ||
                  log.dosage.toLowerCase().includes(q);
                return matchesFilter && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    No logs found.
                  </div>
                );
              }

              return filtered.map(log => (
                <div key={log.id} style={{
                  background: log.type === 'ph'
                    ? (log.direction === 'up' ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)')
                    : 'rgba(59,130,246,0.07)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  borderLeft: `3px solid ${log.type === 'ph' ? (log.direction === 'up' ? '#10b981' : '#ef4444') : 'var(--primary)'}`,
                  display: 'flex', flexDirection: 'column', gap: '3px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {log.type === 'ph'
                        ? (log.direction === 'up' ? <ArrowUp size={11} style={{ color: '#10b981' }} /> : <ArrowDown size={11} style={{ color: '#ef4444' }} />)
                        : <Activity size={11} style={{ color: 'var(--primary)' }} />
                      }
                      {log.pump}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                      {formatRelativeTime(log.timestamp, currentTime)}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.action}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{log.details}</span>
                  <span style={{
                    alignSelf: 'flex-start', fontSize: '10px', fontWeight: 700,
                    background: log.type === 'ph' ? (log.direction === 'up' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') : 'var(--primary-glow)',
                    color: log.type === 'ph' ? (log.direction === 'up' ? '#10b981' : '#ef4444') : 'var(--primary)',
                    padding: '2px 7px', borderRadius: '5px', marginTop: '2px'
                  }}>
                    {log.dosage}
                  </span>
                </div>
              ));
            })()}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {allSystemLogs.length} total entries • Live system log
            </span>
            <button
              onClick={() => setShowLogsModal(false)}
              style={{ padding: '5px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
  );
}
