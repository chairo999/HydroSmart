import React, { useState } from 'react';
import { X, Edit3, Check, RotateCcw, Plus } from 'lucide-react';
import { GREENHOUSE_SECTIONS, CROP_SPECIES } from '../../shared/constants';

export default function MapTab({
  activeSectionId,
  setActiveSectionId,
  activeSectionData,
  activeSectionSensors,
  getSectionHealthColor,
  greenhouseSections = GREENHOUSE_SECTIONS,
  updateGreenhouseSection,
  setGreenhouseSections
}) {
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    cropKey: 'lettuce',
    baseHealth: 90,
    area: '25 m²',
    lastWatered: '19/09/2024',
    fertPlanned: '20/09/2024 - Hi-Fos',
    centralHub: 'Pi Zero 2 W',
    sensorNode: 'ESP32'
  });

  const startEditing = () => {
    if (!activeSectionData) return;
    const computedHealth = activeSectionData.health ?? (activeSectionData.id === 4 ? 41 : (activeSectionData.id === 2 || activeSectionData.id === 7 ? 75 : activeSectionData.baseHealth));
    setEditForm({
      name: activeSectionData.name,
      cropKey: activeSectionData.cropKey,
      baseHealth: computedHealth,
      area: activeSectionData.area,
      lastWatered: activeSectionData.lastWatered || '19/09/2024',
      fertPlanned: activeSectionData.fertPlanned || '20/09/2024 - Hi-Fos',
      centralHub: activeSectionData.centralHub || 'Pi Zero 2 W',
      sensorNode: activeSectionData.sensorNode || 'ESP32'
    });
    setIsEditingSection(true);
  };

  const handleSaveSection = () => {
    if (updateGreenhouseSection && activeSectionData) {
      updateGreenhouseSection(activeSectionData.id, {
        name: editForm.name,
        cropKey: editForm.cropKey,
        baseHealth: Number(editForm.baseHealth),
        health: Number(editForm.baseHealth),
        area: editForm.area,
        lastWatered: editForm.lastWatered,
        fertPlanned: editForm.fertPlanned,
        centralHub: editForm.centralHub,
        sensorNode: editForm.sensorNode
      });
    }
    setIsEditingSection(false);
  };

  const handleResetSections = () => {
    if (setGreenhouseSections) {
      setGreenhouseSections(GREENHOUSE_SECTIONS);
      try {
        localStorage.removeItem('hydrosmart_greenhouse_sections');
      } catch (e) {}
    }
    setIsEditingSection(false);
  };

  const sectionsToRender = greenhouseSections && greenhouseSections.length > 0 ? greenhouseSections : GREENHOUSE_SECTIONS;

  return (
    <div className="map-view-container fade-in">
      {/* Left Panel: Overall Health & Section List */}
      <div className="map-left-panel">
        <div className="overall-health-card">
          <div className="overall-health-number">92%</div>
          <div className="overall-health-details">
            <span className="overall-health-badge">Good Health</span>
            <div className="overall-health-desc">Crops are growing normally and showing stable nutrient absorption.</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', margin: '4px 0' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            Greenhouse Bays ({sectionsToRender.length})
          </span>
          <button
            onClick={handleResetSections}
            title="Reset layout to default"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            <RotateCcw size={11} /> Reset
          </button>
        </div>

        <div className="sections-list">
          {sectionsToRender.map(s => {
            const computedHealth = s.health ?? (s.id === 4 ? 41 : (s.id === 2 || s.id === 7 ? 75 : s.baseHealth));
            const healthColor = getSectionHealthColor(computedHealth);
            return (
              <div
                className={`section-item-row ${activeSectionId === s.id ? 'active' : ''}`}
                key={s.id}
                onClick={() => {
                  setActiveSectionId(s.id);
                  setIsEditingSection(false);
                }}
              >
                <div>
                  <div className="section-item-name">{s.name}</div>
                  <div className="section-item-crop">
                    {s.cropKey.charAt(0).toUpperCase() + s.cropKey.slice(1)} • {s.area}
                  </div>
                </div>
                <span className={`section-health-badge ${healthColor}`}>
                  {computedHealth}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center Panel: Greenhouse Image Hotspots */}
      <div className="map-canvas-container">
        <div className="map-canvas-header">
          <div className="drawer-title-group">
            <span className="drawer-title" style={{ fontSize: '15px' }}>Greenhouse Layout Map</span>
            <span className="drawer-subtitle">Click markers to overlay section parameters or edit section details</span>
          </div>
        </div>

        <div className="map-canvas-view">
          <img src="/images/hydro-bg.jpg" className="map-bg-image" alt="Greenhouse Map background" />

          {sectionsToRender.map(s => {
            const computedHealth = s.health ?? (s.id === 4 ? 41 : (s.id === 2 || s.id === 7 ? 75 : s.baseHealth));
            const healthColor = getSectionHealthColor(computedHealth);
            return (
              <div
                key={s.id}
                className={`map-hotspot ${activeSectionId === s.id ? 'active' : ''} health-${healthColor}`}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                onClick={() => {
                  setActiveSectionId(s.id);
                  setIsEditingSection(false);
                }}
              >
                {s.id}
                {activeSectionId === s.id && (
                  <span className="map-hotspot-label">{s.name}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Panel: Detail Panel Drawer (Editable by User) */}
      <div className="map-right-panel">
        {activeSectionData && activeSectionSensors && (
          <div className="section-drawer-card fade-in">
            <div className="drawer-header">
              <div className="drawer-title-group">
                <span className="drawer-title">{activeSectionData.name}</span>
                <span className="drawer-subtitle">{CROP_SPECIES[activeSectionData.cropKey] || activeSectionData.cropKey}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!isEditingSection ? (
                  <button
                    onClick={startEditing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'var(--primary-glow)',
                      color: 'var(--primary)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                ) : (
                  <button
                    onClick={handleSaveSection}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Check size={12} /> Save
                  </button>
                )}
                <button className="drawer-close-btn" onClick={() => { setActiveSectionId(null); setIsEditingSection(false); }}>
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Editable Form Mode */}
            {isEditingSection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }} className="fade-in">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Section Name</span>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Crop Species</span>
                  <select
                    value={editForm.cropKey}
                    onChange={(e) => setEditForm(prev => ({ ...prev, cropKey: e.target.value }))}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none' }}
                  >
                    <option value="lettuce">Lettuce (Lactuca sativa)</option>
                    <option value="pechay">Pechay (Brassica rapa)</option>
                    <option value="spinach">Spinach (Spinacia oleracea)</option>
                    <option value="basil">Basil (Ocimum basilicum)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Health Index</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}>{editForm.baseHealth}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={editForm.baseHealth}
                    onChange={(e) => setEditForm(prev => ({ ...prev, baseHealth: Number(e.target.value) }))}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Coverage Area</span>
                  <input
                    type="text"
                    value={editForm.area}
                    onChange={(e) => setEditForm(prev => ({ ...prev, area: e.target.value }))}
                    placeholder="e.g. 25 m²"
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Last Watered Date</span>
                  <input
                    type="text"
                    value={editForm.lastWatered}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastWatered: e.target.value }))}
                    placeholder="DD/MM/YYYY"
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Fertilization Schedule</span>
                  <input
                    type="text"
                    value={editForm.fertPlanned}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fertPlanned: e.target.value }))}
                    placeholder="e.g. 20/09/2024 - Hi-Fos"
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button
                    onClick={handleSaveSection}
                    style={{ flex: 1, padding: '8px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Save Section
                  </button>
                  <button
                    onClick={() => setIsEditingSection(false)}
                    style={{ padding: '8px 12px', background: 'var(--bg-main)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Normal View Mode */
              <>
                <div className="drawer-stat-row">
                  <span className="drawer-stat-label">Species</span>
                  <span className="drawer-stat-value">
                    {activeSectionData.cropKey.charAt(0).toUpperCase() + activeSectionData.cropKey.slice(1)}
                  </span>
                </div>

                <div className="drawer-stat-row">
                  <span className="drawer-stat-label">Section Health</span>
                  <span className={`drawer-stat-value health-text ${getSectionHealthColor(activeSectionData.health ?? (activeSectionData.id === 4 ? 41 : activeSectionData.baseHealth))}`}>
                    {activeSectionData.health ? `${activeSectionData.health}%` : (activeSectionData.id === 4 ? '41% - Critical' : activeSectionData.id === 2 || activeSectionData.id === 7 ? '75% - Warning' : `${activeSectionData.baseHealth}% - Good`)}
                  </span>
                </div>

                <div className="drawer-stat-row">
                  <span className="drawer-stat-label">Coverage Area</span>
                  <span className="drawer-stat-value">{activeSectionData.area}</span>
                </div>

                <div className="drawer-stat-row">
                  <span className="drawer-stat-label">Last Watered</span>
                  <span className="drawer-stat-value">{activeSectionData.lastWatered || '19/09/2024'}</span>
                </div>

                <div className="drawer-stat-row">
                  <span className="drawer-stat-label">Fertilization Planned</span>
                  <span className="drawer-stat-value" style={{ color: 'var(--amber)', fontWeight: 600 }}>
                    {activeSectionData.fertPlanned || '20/09/2024 - Hi-Fos'}
                  </span>
                </div>

                {/* Parameters Grid with TDS Nutrients (Replaced EC) */}
                <div style={{ marginTop: '10px' }}>
                  <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Real-time Readings
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span className="text-secondary">pH Level</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{activeSectionSensors.ph}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span className="text-secondary">TDS Nutrients</span>
                      <span style={{ fontWeight: 700, color: 'var(--blue)' }}>
                        {activeSectionSensors.tds || Math.round(activeSectionSensors.ec * 500)} ppm
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span className="text-secondary">Water Level</span>
                      <span style={{ fontWeight: 700 }}>{activeSectionSensors.waterLevel}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span className="text-secondary">Water Temp</span>
                      <span style={{ fontWeight: 700 }}>{activeSectionSensors.temperature}°C</span>
                    </div>
                  </div>
                </div>

                {/* Hardware details */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
                  <h4 style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    System Nodes
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Central Hub</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{activeSectionData.centralHub || 'Pi Zero 2 W'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Sensor Node</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{activeSectionData.sensorNode || 'ESP32'}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
