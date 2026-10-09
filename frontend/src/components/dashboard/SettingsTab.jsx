import React from 'react';

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
                  placeholder="Owner Name"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    fontWeight: 700,
                    outline: 'none',
                    width: '100%'
                  }}
                />
                <input
                  type="text"
                  value={ownerRole}
                  onChange={(e) => setOwnerRole(e.target.value)}
                  placeholder="Role"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>
            )}
          </div>

          {!isEditingOwner ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-secondary">Location</span>
                <span style={{ fontWeight: 600 }}>{farmLocation}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-secondary">Contact Number</span>
                <span style={{ fontWeight: 600 }}>{ownerPhone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-secondary">Email Address</span>
                <span style={{ fontWeight: 600 }}>{ownerEmail}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Location</span>
                <input
                  type="text"
                  value={farmLocation}
                  onChange={(e) => setFarmLocation(e.target.value)}
                  placeholder="Location (e.g. Muntinlupa City, Philippines)"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Contact Number</span>
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="Contact Number"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Email Address</span>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="Email Address"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            {!isEditingOwner ? (
              <button
                onClick={() => setIsEditingOwner(true)}
                className="sim-btn"
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '15px' }}
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={() => setIsEditingOwner(false)}
                className="sim-btn"
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '15px', background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)' }}
              >
                Save Profile
              </button>
            )}
          </div>
        </div>

        {/* NFT Hardware specs */}
        <div className="panel-card" style={{ gap: '16px' }}>
          <div className="panel-card-title">NFT Hydroponics Setup Configuration</div>
          <span className="panel-card-subtitle">Live hardware telemetry details</span>

          <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
            <img src="/images/hydro-system.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Hydroponics System Rig" />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.7))' }} />
            <div style={{ position: 'absolute', bottom: '12px', left: '16px', color: 'white' }}>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Block A - NFT System</h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', opacity: 0.8 }}>Active smart hydroponics channels</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span className="text-secondary">Main Controller</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>Raspberry Pi Zero 2 W</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span className="text-secondary">Sensor Node</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>ESP32-WROOM-32D</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <span className="text-secondary">Telemetry Modules</span>
              <span style={{ fontWeight: 600 }}>INA219 Power, DHT22, pH, TDS Nutrients</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="text-secondary">Power Source</span>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Solar-Grid Hybrid</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Preferences & Calibration */}
      <div className="map-right-panel" style={{ overflowY: 'auto' }}>
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
