import React from 'react';
import {
  Leaf, Thermometer, Sun, Droplet, Wind, Zap, Cpu, RefreshCw, Check, ChevronRight, Activity, Clock
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
  const currentTDS = sensors.tds || Math.round(sensors.ec * 500);
  const minTDS = Math.round((cropProfile?.targets?.ec?.min || 1.2) * 500);
  const maxTDS = Math.round((cropProfile?.targets?.ec?.max || 1.8) * 500);
  const targetTDS = Math.round((cropProfile?.targets?.ec?.optimal || 1.5) * 500);
  const targetPH = cropProfile?.targets?.ph?.optimal || 6.0;

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
            <span className="param-value">{sensors.ph}</span>
            <span className="param-info">Analog pH Sensor probe readings</span>
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

          {/* Dosing and Pumping Activity Logs */}
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Pumping Activity Logs
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={11} /> Live Telemetry
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Log 1: Nutrient A & B */}
              <div style={{ background: 'var(--bg-card-hover)', padding: '7px 9px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Nutrient A & B Pumped</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>12m ago</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Amount: <b>{dosing.nutrientA_ml} mL (A)</b> + <b>{dosing.nutrientB_ml} mL (B)</b>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  Triggered by <b>TDS Nutrients: {currentTDS} ppm</b> (Target: {targetTDS} ppm / mg/L)
                </div>
              </div>

              {/* Log 2: pH adjustment */}
              <div style={{ background: 'var(--bg-card-hover)', padding: '7px 9px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: Number(sensors.ph) < targetPH ? 'var(--amber)' : 'var(--red)' }}>
                    {Number(sensors.ph) < targetPH ? 'pH-Up Pumped' : 'pH-Down Pumped'}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>38m ago</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Amount: <b>{Number(sensors.ph) < targetPH ? `${dosing.phUp_ml || 0.8} mL` : `${dosing.phDown_ml || 0.6} mL`}</b>
                </div>
                <div style={{ fontSize: '10px', color: Number(sensors.ph) < targetPH ? 'var(--amber)' : 'var(--red)', fontWeight: 600, marginTop: '1px' }}>
                  {Number(sensors.ph) < targetPH
                    ? `pH Up Applied (Previous pH: ${(sensors.ph - 0.5).toFixed(1)} → Current pH: ${sensors.ph})`
                    : `pH Down Applied (Previous pH: ${(Number(sensors.ph) + 0.6).toFixed(1)} → Current pH: ${sensors.ph})`}
                </div>
              </div>

              {/* Log 3: Previous Nutrient B */}
              <div style={{ background: 'var(--bg-card-hover)', padding: '7px 9px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--blue)' }}>Nutrient B Pumped</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>2h 15m ago</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Amount: <b>1.8 mL</b> | Triggered by <b>TDS Nutrients: {Math.max(300, currentTDS - 55)} ppm</b>
                </div>
              </div>

              {/* Log 4: pH Up Log */}
              <div style={{ background: 'var(--bg-card-hover)', padding: '7px 9px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--amber)' }}>pH-Up Pumped</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>5h 10m ago</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Amount: <b>1.0 mL</b>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--amber)', fontWeight: 600, marginTop: '1px' }}>
                  pH Up Applied (Previous pH: 5.4 → Current pH: 6.1)
                </div>
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
  );
}
