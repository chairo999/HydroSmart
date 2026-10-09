import React from 'react';
import { Calendar, Plus, X, Zap } from 'lucide-react';
import { CROP_IMAGES, CROP_SPECIES } from '../../shared/constants';

export default function MonitorTab({
  selectedCropTab,
  setSelectedCropTab,
  selectCrop,
  activeStage,
  cropProfile,
  wateringMode,
  setWateringMode,
  wateringDays,
  setWateringDays,
  waterVolume,
  setWaterVolume,
  wateringSlots,
  addWateringSlot,
  updateSlotField,
  deleteWateringSlot,
  isWateringNow,
  manualTimeLeft,
  triggerManualWater,
  getNextWateringText
}) {
  return (
    <div className="map-view-container fade-in">
      {/* Left Panel: Crop List & Selected Crop Details */}
      <div className="map-left-panel">
        {/* Crop Monitor Header */}
        <div className="panel-card" style={{ gap: '8px', padding: '20px' }}>
          <div className="panel-card-title">
            <span>Hydroponic Monitor</span>
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700 }}>NFT System</span>
          </div>
          <span className="panel-card-subtitle" style={{ margin: 0 }}>Monitor and schedule nutrients & watering for active crops</span>
        </div>

        {/* Crop list */}
        <div className="sections-list">
          {['lettuce', 'pechay', 'spinach'].map(crop => (
            <div
              key={crop}
              className={`section-item-row ${selectedCropTab === crop ? 'active' : ''}`}
              onClick={() => {
                setSelectedCropTab(crop);
                selectCrop(crop);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={CROP_IMAGES[crop]} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} alt={crop} />
                <div>
                  <div className="section-item-name" style={{ textTransform: 'capitalize' }}>{crop} Plant</div>
                  <div className="section-item-crop" style={{ fontStyle: 'italic' }}>{CROP_SPECIES[crop]}</div>
                </div>
              </div>
              <span className="section-health-badge good">94% Health</span>
            </div>
          ))}
        </div>

        {/* Selected Crop Detail Panel */}
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

          <div className="drawer-stat-row" style={{ padding: '6px 0' }}>
            <span className="drawer-stat-label">Species</span>
            <span className="drawer-stat-value" style={{ fontStyle: 'italic' }}>{CROP_SPECIES[selectedCropTab]}</span>
          </div>

          <div className="drawer-stat-row" style={{ padding: '6px 0' }}>
            <span className="drawer-stat-label">Age</span>
            <span className="drawer-stat-value">34 Days (from seed)</span>
          </div>

          <div className="drawer-stat-row" style={{ padding: '6px 0' }}>
            <span className="drawer-stat-label">Estimated Water Flow</span>
            <span className="drawer-stat-value">43 mL/h</span>
          </div>

          <div className="drawer-stat-row" style={{ padding: '6px 0' }}>
            <span className="drawer-stat-label">TDS Nutrients Target (Optimal)</span>
            <span className="drawer-stat-value" style={{ color: 'var(--blue)' }}>
              {Math.round((cropProfile?.targets?.ec?.optimal || 1.5) * 500)} ppm (mg/L)
            </span>
          </div>

          <div className="drawer-stat-row" style={{ padding: '6px 0' }}>
            <span className="drawer-stat-label">pH Target (Optimal)</span>
            <span className="drawer-stat-value" style={{ color: 'var(--primary)' }}>
              {cropProfile?.targets?.ph?.optimal || 6.0}
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="map-canvas-container" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
        <div className="map-canvas-header" style={{ padding: '16px 20px' }}>
          <div className="drawer-title-group">
            <span className="drawer-title" style={{ fontSize: '15px' }}>Advanced Watering Scheduler</span>
            <span className="drawer-subtitle">Configure automated timing, custom cycles, and volume outputs</span>
          </div>
        </div>

        <div className="panel-card" style={{ border: 'none', boxShadow: 'none', background: 'transparent', flex: 1, padding: '20px', gap: '20px', overflowY: 'auto' }}>
          {/* Countdown banner */}
          <div style={{
            background: 'var(--primary-glow)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '12px 20px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <Calendar size={20} style={{ color: 'var(--primary)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next Cycle Breakdown</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>{getNextWateringText()}</span>
            </div>
          </div>

          {/* Mode Tabs */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '5px', borderRadius: '10px', border: '1px solid var(--border-color)', maxWidth: '400px' }}>
            {['auto', 'scheduled', 'manual'].map(mode => (
              <button
                key={mode}
                style={{
                  flex: 1,
                  border: 'none',
                  background: wateringMode === mode ? 'var(--primary)' : 'transparent',
                  color: wateringMode === mode ? 'white' : 'var(--text-secondary)',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => setWateringMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Scheduled Mode Section */}
          {wateringMode === 'scheduled' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="fade-in">
              {/* Weekday selector */}
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Active Calendar Days</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {Object.entries(wateringDays).map(([dayKey, active]) => {
                    const label = dayKey.replace(/[0-9]/g, '');
                    return (
                      <button
                        key={dayKey}
                        className={`sim-btn ${active ? 'active' : ''}`}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          background: active ? 'var(--primary)' : 'var(--bg-card)',
                          color: active ? 'white' : 'var(--text-main)',
                          borderColor: active ? 'var(--primary)' : 'var(--border-color)',
                        }}
                        onClick={() => setWateringDays(prev => ({ ...prev, [dayKey]: !prev[dayKey] }))}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cycles List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Configured Cycle Slots</span>
                  <button
                    onClick={addWateringSlot}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--primary)',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add Cycle
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {wateringSlots.map(slot => (
                    <div
                      key={slot.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        background: 'var(--bg-card-hover)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <label className="sim-switch">
                            <input
                              type="checkbox"
                              checked={slot.active}
                              onChange={() => updateSlotField(slot.id, 'active', !slot.active)}
                            />
                            <span className="sim-slider"></span>
                          </label>
                          <input
                            type="text"
                            value={slot.name}
                            onChange={(e) => updateSlotField(slot.id, 'name', e.target.value)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              fontSize: '14px',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                              width: '120px',
                              padding: '2px 0',
                              outline: 'none'
                            }}
                          />
                        </div>
                        <button
                          onClick={() => deleteWateringSlot(slot.id)}
                          style={{ border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', opacity: slot.active ? 1 : 0.5 }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)' }}>START TIME</span>
                          <input
                            type="time"
                            value={slot.time}
                            onChange={(e) => updateSlotField(slot.id, 'time', e.target.value)}
                            disabled={!slot.active}
                            style={{
                              background: 'var(--bg-panel)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              fontSize: '12px',
                              color: 'var(--text-main)',
                              fontWeight: 600,
                              width: '100%',
                              outline: 'none'
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)' }}>DURATION</span>
                          <select
                            value={slot.duration}
                            onChange={(e) => updateSlotField(slot.id, 'duration', Number(e.target.value))}
                            disabled={!slot.active}
                            style={{
                              background: 'var(--bg-panel)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              fontSize: '12px',
                              color: 'var(--text-main)',
                              fontWeight: 600,
                              width: '100%',
                              outline: 'none'
                            }}
                          >
                            <option value={5}>5 mins</option>
                            <option value={10}>10 mins</option>
                            <option value={15}>15 mins</option>
                            <option value={20}>20 mins</option>
                            <option value={30}>30 mins</option>
                          </select>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)' }}>VOLUME (mL)</span>
                          <input
                            type="number"
                            min={100}
                            max={5000}
                            step={100}
                            value={slot.volume}
                            onChange={(e) => updateSlotField(slot.id, 'volume', Number(e.target.value))}
                            disabled={!slot.active}
                            style={{
                              background: 'var(--bg-panel)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              padding: '6px 8px',
                              fontSize: '12px',
                              color: 'var(--text-main)',
                              fontWeight: 600,
                              width: '100%',
                              outline: 'none'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Auto Mode Section */}
          {wateringMode === 'auto' && (
            <div style={{ padding: '16px', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }} className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>
                <Zap size={16} /> Sensor-Driven Feedback Control Active
              </div>
              Watering cycles are automatically regulated using live telemetry.
              The physical water pump will engage when the ultrasonic water tank level drops below <b>45%</b> or when soil humidity sensors register below optimal crop target settings.
            </div>
          )}

          {/* Manual Mode Section */}
          {wateringMode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', background: 'var(--bg-card-hover)', borderRadius: '12px', border: '1px solid var(--border-color)', gap: '16px' }} className="fade-in">
              {isWateringNow ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'var(--primary)', width: '100%' }}>
                  <div style={{
                    position: 'relative',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'var(--primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid var(--primary)',
                    boxShadow: '0 0 20px var(--primary-glow)'
                  }}>
                    <span style={{ fontSize: '40px', animation: 'bounce 1s infinite alternate' }}>💧</span>
                    <div style={{
                      position: 'absolute',
                      bottom: '-8px',
                      background: 'var(--primary)',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '12px'
                    }}>
                      {manualTimeLeft}s left
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 800, display: 'block', fontSize: '16px', color: 'var(--text-main)' }}>Dispensing Nutrient Solution</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>Delivering {waterVolume}mL to active grow channels</span>
                  </div>
                </div>
              ) : (
                <button
                  className="sim-btn"
                  style={{
                    padding: '14px 28px',
                    borderRadius: '30px',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    boxShadow: '0 6px 16px rgba(16, 185, 129, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={triggerManualWater}
                >
                  💧 Water {selectedCropTab.toUpperCase()} Now
                </button>
              )}
            </div>
          )}

          {/* Volume Slider */}
          {wateringMode !== 'auto' && (
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                <span>WATER VOLUME PER CYCLE</span>
                <span style={{ color: 'var(--primary)' }}>{(waterVolume / 1000).toFixed(1)}L ({waterVolume} mL)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '14px' }}>💧</span>
                <input
                  type="range"
                  min="500"
                  max="3000"
                  step="250"
                  value={waterVolume}
                  onChange={(e) => setWaterVolume(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary)', height: '6px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '18px' }}>🪣</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
