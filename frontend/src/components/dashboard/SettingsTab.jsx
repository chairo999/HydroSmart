import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Send, Wifi, ShieldAlert, Cpu, Edit3, Check } from 'lucide-react';
import {
  getFirebaseUrl, setFirebaseUrl, isFirebaseEnabled, setFirebaseEnabled,
  testFirebaseConnection, seedFirebaseData, DEFAULT_FIREBASE_DB_URL
} from '../../shared/firebaseService';

// The 5 primary sensors in the NFT system
const PRIMARY_SENSORS = [
  { key: 'ph',        label: 'pH Sensor',            hardware: 'Analog pH Probe + ADC',       unit: '',    icon: '🧪' },
  { key: 'tds',       label: 'TDS Nutrient Sensor',  hardware: 'TDS Probe (EC-to-TDS)',       unit: 'ppm', icon: '💧' },
  { key: 'waterTemp', label: 'Water Temperature',    hardware: 'DS18B20 Waterproof Probe',    unit: '°C',  icon: '🌡️' },
  { key: 'airTemp',   label: 'Air Temp / Humidity',  hardware: 'DHT22 Ambient Sensor',        unit: '',    icon: '🌬️' },
  { key: 'waterLevel',label: 'Water Level',          hardware: 'HC-SR04 Ultrasonic Sensor',  unit: '%',   icon: '📊' }
];

export default function SettingsTab({
  ownerName,
  setOwnerName,
  ownerRole,
  setOwnerRole,
  isEditingOwner,
  setIsEditingOwner,
  ownerAvatar,
  setOwnerAvatar,
  ownerPhone,
  setOwnerPhone,
  ownerEmail,
  setOwnerEmail,
  farmLocation,
  setFarmLocation,
  dashboardTheme,
  setDashboardTheme,
  criticalAlerts,
  setCriticalAlerts,
  energySaver,
  setEnergySaver,
  dosing,
  sensors
}) {
  const [fbUrl, setFbUrl] = useState(() => getFirebaseUrl());
  const [fbEnabled, setFbEnabled] = useState(() => isFirebaseEnabled());
  const [fbTestStatus, setFbTestStatus] = useState(null);
  const [isTestingFb, setIsTestingFb] = useState(false);
  const [isSeedingFb, setIsSeedingFb] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Per-sensor calibration tracking
  const [calibrationDates, setCalibrationDates] = useState(() => {
    try {
      const saved = localStorage.getItem('hydrosmart_calibration_dates');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { ph: null, tds: null, waterTemp: null, airTemp: null, waterLevel: null };
  });

  // Per-sensor reference values for error % calculation
  const [referenceValues, setReferenceValues] = useState({ ph: '', tds: '', waterTemp: '', airTemp: '', waterLevel: '' });

  const markCalibrated = (sensorKey) => {
    const updated = { ...calibrationDates, [sensorKey]: new Date().toISOString() };
    setCalibrationDates(updated);
    try { localStorage.setItem('hydrosmart_calibration_dates', JSON.stringify(updated)); } catch (e) {}
  };

  const getCalibrationErrorPct = (sensorKey) => {
    const refStr = referenceValues[sensorKey];
    if (!refStr || refStr.trim() === '') return null;
    const ref = parseFloat(refStr);
    if (isNaN(ref) || ref === 0) return null;
    let measured = null;
    if (sensorKey === 'ph') measured = parseFloat(sensors?.ph);
    else if (sensorKey === 'tds') measured = parseFloat(sensors?.tds ?? Math.round((sensors?.ec ?? 1.5) * 500));
    else if (sensorKey === 'waterTemp') measured = parseFloat(sensors?.waterTemp);
    else if (sensorKey === 'airTemp') measured = parseFloat(sensors?.airTemp);
    else if (sensorKey === 'waterLevel') measured = parseFloat(sensors?.waterLevel);
    if (isNaN(measured) || measured === null) return null;
    return (Math.abs(measured - ref) / Math.abs(ref) * 100).toFixed(2);
  };

  const handleToggleFirebase = (enabled) => {
    setFbEnabled(enabled);
    setFirebaseEnabled(enabled);
  };

  const handleSaveFbUrl = (url) => {
    setFbUrl(url);
    setFirebaseUrl(url);
  };

  const handleTestConnection = async () => {
    setIsTestingFb(true);
    setFbTestStatus(null);
    const res = await testFirebaseConnection(fbUrl);
    setIsTestingFb(false);
    if (res.ok) {
      if (res.hasData && res.sensors) {
        setFbTestStatus({
          type: 'success',
          message: `Connected to Firebase! Live hardware probe readings: pH ${res.sensors.ph} • TDS ${res.sensors.tds} ppm • Water ${res.sensors.waterTemp}°C • Reservoir Level ${res.sensors.waterLevel} cm`
        });
      } else {
        setFbTestStatus({
          type: 'warn',
          message: 'Connected to Firebase, but no sensor_readings found yet. Click "Seed Initial Telemetry" to initialize.'
        });
      }
    } else {
      setFbTestStatus({
        type: 'error',
        message: `Connection failed: ${res.error}. Make sure Realtime Database is created and Rules allow read/write in Firebase console.`
      });
    }
  };

  const handleSeedData = async () => {
    setIsSeedingFb(true);
    const res = await seedFirebaseData(fbUrl);
    setIsSeedingFb(false);
    if (res.ok) {
      setFbTestStatus({
        type: 'success',
        message: 'Successfully populated initial telemetry tree in Firebase!'
      });
    } else {
      setFbTestStatus({
        type: 'error',
        message: `Failed to seed data: ${res.error}. Check your Firebase Security Rules.`
      });
    }
  };

  return (
    <div className="map-view-container fade-in" style={{ gridTemplateColumns: '1fr 1fr' }}>
      {/* Left Column: Profile & NFT Hardware Specs */}
      <div className="map-left-panel" style={{ overflowY: 'auto' }}>
        {/* Profile Card */}
        <div className="panel-card" style={{ gap: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div className="profile-avatar-container" style={{ position: 'relative' }}>
              <div className="profile-avatar" style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '20px', overflow: 'hidden', position: 'relative' }}>
                <span style={{ position: 'absolute', zIndex: 1 }}>
                  {ownerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </span>
                {ownerAvatar && (
                  <img
                    src={ownerAvatar}
                    alt={ownerName}
                    onError={(e) => { e.target.style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', zIndex: 2, top: 0, left: 0 }}
                  />
                )}
              </div>
              {isEditingOwner && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setOwnerAvatar(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: 'none' }}
                    id="avatar-upload-input"
                  />
                  <label htmlFor="avatar-upload-input" style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: 'var(--primary)',
                    color: 'white',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    border: '2px solid white'
                  }} title="Change Photo">
                    📷
                  </label>
                </>
              )}
              {!isEditingOwner && (
                <div className="profile-badge-online" style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', background: 'var(--primary)', border: '2px solid white', borderRadius: '50%' }} />
              )}
            </div>

            {!isEditingOwner ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{ownerName}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{ownerRole}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Full Name"
                  style={{
                    background: 'var(--bg-input, rgba(0,0,0,0.03))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
                <input
                  type="text"
                  value={ownerRole}
                  onChange={(e) => setOwnerRole(e.target.value)}
                  placeholder="Role / Title"
                  style={{
                    background: 'var(--bg-input, rgba(0,0,0,0.03))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span className="text-secondary">Farm Location</span>
              {!isEditingOwner ? (
                <span style={{ fontWeight: 600 }}>{farmLocation}</span>
              ) : (
                <input
                  type="text"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  style={{
                    background: 'var(--bg-input, rgba(0,0,0,0.03))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span className="text-secondary">Phone Contact</span>
              {!isEditingOwner ? (
                <span style={{ fontWeight: 600 }}>{ownerPhone}</span>
              ) : (
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  style={{
                    background: 'var(--bg-input, rgba(0,0,0,0.03))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span className="text-secondary">Email Address</span>
              {!isEditingOwner ? (
                <span style={{ fontWeight: 600 }}>{ownerEmail}</span>
              ) : (
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  style={{
                    background: 'var(--bg-input, rgba(0,0,0,0.03))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              )}
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px',
            marginTop: '8px'
          }}>
            {!isEditingOwner ? (
              <button
                type="button"
                onClick={() => setIsEditingOwner(true)}
                className="sim-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  minHeight: '38px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Edit3 size={14} style={{ color: 'var(--primary)' }} />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingOwner(false)}
                className="sim-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: 'var(--primary)',
                  color: '#ffffff',
                  border: '1px solid var(--primary)',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                  cursor: 'pointer',
                  minHeight: '38px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Check size={14} />
                <span>Save Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* NFT Hardware specs — Primary Sensors Only */}
        <div className="panel-card" style={{ gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Cpu size={15} style={{ color: 'var(--primary)' }} />
            <div className="panel-card-title">NFT Hydroponics Setup</div>
          </div>
          <span className="panel-card-subtitle">Primary sensor hardware and live telemetry</span>

          <div style={{ width: '100%', height: '100px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
            <img src="/images/hydro-system.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Hydroponics System Rig" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))' }} />
            <div style={{ position: 'absolute', bottom: '10px', left: '14px', color: 'white' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Block A — NFT System</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '10px', opacity: 0.8 }}>Raspberry Pi Zero 2W · ESP32-WROOM-32D</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {PRIMARY_SENSORS.map((s, i) => {
              let liveVal = '—';
              if (s.key === 'ph') liveVal = sensors?.ph ?? '—';
              else if (s.key === 'tds') liveVal = `${sensors?.tds ?? Math.round((sensors?.ec ?? 1.5) * 500)} ppm`;
              else if (s.key === 'waterTemp') liveVal = sensors?.waterTemp != null ? `${sensors.waterTemp}°C` : '—';
              else if (s.key === 'airTemp') liveVal = (sensors?.airTemp != null && sensors?.humidity != null) ? `${sensors.airTemp}°C / ${sensors.humidity}%` : '—';
              else if (s.key === 'waterLevel') liveVal = sensors?.waterLevel != null ? `${sensors.waterLevel}%` : '—';
              return (
                <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: i < PRIMARY_SENSORS.length - 1 ? '1px solid var(--border-color)' : 'none', fontSize: '12px', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '15px' }}>{s.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{s.hardware}</div>
                    </div>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{liveVal}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Firebase Integration, Preferences & Calibration */}
      <div className="map-right-panel" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Firebase Realtime Database Integration Card */}
        <div className="panel-card" style={{ gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="panel-card-title" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Database size={16} style={{ color: 'var(--primary)' }} />
                <span>Firebase Realtime Database</span>
              </div>
              <span className="panel-card-subtitle">Connect live hardware cloud sync via Firebase RTDB</span>
            </div>
            <a
              href="https://console.firebase.google.com/u/0/project/hydrosmart-sensor-data/overview"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none'
              }}
              title="Open Firebase Console"
            >
              Console <ExternalLink size={11} />
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Firebase Active Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Live Firebase RTDB Sync
                </span>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {fbEnabled ? 'Dashboard polls telemetry from Firebase' : 'Using local simulator fallback'}
                </span>
              </div>
              <label className="sim-switch">
                <input
                  type="checkbox"
                  checked={fbEnabled}
                  onChange={(e) => handleToggleFirebase(e.target.checked)}
                />
                <span className="sim-slider"></span>
              </label>
            </div>

            {/* Database URL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Database Endpoint URL
                </span>
                <button
                  onClick={() => handleSaveFbUrl(DEFAULT_FIREBASE_DB_URL)}
                  style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Reset Default
                </button>
              </div>
              <input
                type="text"
                value={fbUrl}
                onChange={(e) => handleSaveFbUrl(e.target.value)}
                placeholder="https://hydrosmart-sensor-data-default-rtdb.firebaseio.com"
                style={{
                  background: 'var(--bg-input, rgba(0,0,0,0.03))',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '7px 10px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                Target endpoint: <code>{fbUrl.replace(/\/$/, '')}/telemetry.json</code>
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              <button
                onClick={handleTestConnection}
                disabled={isTestingFb}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                  border: '1px solid var(--border-color)', background: 'var(--bg-panel)',
                  color: 'var(--text-main)', cursor: 'pointer'
                }}
              >
                <RefreshCw size={12} className={isTestingFb ? 'spin' : ''} />
                {isTestingFb ? 'Testing…' : 'Test Connection'}
              </button>

              <button
                onClick={handleSeedData}
                disabled={isSeedingFb}
                title="Pushes default schema into Firebase so the database has valid telemetry data"
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                  border: 'none', background: 'var(--primary-glow)',
                  color: 'var(--primary)', cursor: 'pointer'
                }}
              >
                <Send size={12} />
                {isSeedingFb ? 'Initializing…' : 'Seed Initial Telemetry'}
              </button>

              <button
                onClick={() => setShowSetupGuide(!showSetupGuide)}
                style={{
                  marginLeft: 'auto', border: 'none', background: 'transparent',
                  color: 'var(--text-tertiary)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline'
                }}
              >
                {showSetupGuide ? 'Hide Setup Guide' : 'Setup Guide'}
              </button>
            </div>

            {/* Test Status Message */}
            {fbTestStatus && (
              <div style={{
                padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px',
                background: fbTestStatus.type === 'success'
                  ? 'rgba(16,185,129,0.1)'
                  : fbTestStatus.type === 'warn'
                  ? 'rgba(245,158,11,0.1)'
                  : 'rgba(239,68,68,0.1)',
                color: fbTestStatus.type === 'success'
                  ? '#10b981'
                  : fbTestStatus.type === 'warn'
                  ? '#f59e0b'
                  : '#ef4444',
                border: `1px solid ${
                  fbTestStatus.type === 'success'
                    ? '#10b981'
                    : fbTestStatus.type === 'warn'
                    ? '#f59e0b'
                    : '#ef4444'
                }`
              }}>
                {fbTestStatus.type === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{fbTestStatus.message}</span>
              </div>
            )}

            {/* Setup Instructions Box */}
            {showSetupGuide && (
              <div style={{
                background: 'var(--bg-card-hover)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '11px',
                lineHeight: '1.5',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column', gap: '6px'
              }}>
                <b style={{ color: 'var(--text-main)', fontSize: '12px' }}>How to link Firebase in 3 steps:</b>
                <div>
                  1. In <a href="https://console.firebase.google.com/u/0/project/hydrosmart-sensor-data/overview" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>Firebase Console</a>, click <b>Build &gt; Realtime Database</b> &gt; <b>Create Database</b>.
                </div>
                <div>
                  2. In the <b>Rules</b> tab, set open permissions for your test phase:
                  <pre style={{ margin: '4px 0', padding: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
{`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`}
                  </pre>
                </div>
                <div>
                  3. Click <b>"Seed Initial Telemetry"</b> above to write the starting sensor structure. Once your ESP32 powers on, it will push directly to <code>/telemetry.json</code>!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* System Preferences Card */}
        <div className="panel-card" style={{ gap: '16px' }}>
          <div className="panel-card-title">System Preferences</div>
          <span className="panel-card-subtitle">Configure notification and power alerts</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Theme Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Dark Theme Mode</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Enable/disable simulator color scheme (Light Mode default)</span>
              </div>
              <label className="sim-switch">
                <input
                  type="checkbox"
                  checked={dashboardTheme === 'dark'}
                  onChange={() => setDashboardTheme(dashboardTheme === 'light' ? 'dark' : 'light')}
                />
                <span className="sim-slider"></span>
              </label>
            </div>

            {/* Alerts toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Critical Notifications</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Get alerts for abnormal TDS Nutrients/pH levels</span>
              </div>
              <label className="sim-switch">
                <input
                  type="checkbox"
                  checked={criticalAlerts}
                  onChange={() => setCriticalAlerts(!criticalAlerts)}
                />
                <span className="sim-slider"></span>
              </label>
            </div>

            {/* Energy Saver Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Energy Saver Mode</span>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Optimize light and pump duty cycles</span>
              </div>
              <label className="sim-switch">
                <input
                  type="checkbox"
                  checked={energySaver}
                  onChange={() => setEnergySaver(!energySaver)}
                />
                <span className="sim-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Diagnostics and Support */}
        <div className="panel-card" style={{ gap: '16px' }}>
          <div className="panel-card-title">Diagnostics & Support</div>
          <span className="panel-card-subtitle">Calibrate probes and view documents</span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', alignItems: 'center' }}>
              <span className="text-secondary">Dosing Calibration</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{dosing.mlpConfidence}% Confidence Index</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', alignItems: 'center' }}>
              <span className="text-secondary">Sensor Calibration</span>
              <span style={{ fontWeight: 600 }}>pH: {sensors.ph} / TDS Nutrients: {sensors.tds || Math.round(sensors.ec * 500)} ppm</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-secondary">System Specs & Hardware Details</span>
              <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>Firmware v2.4.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
