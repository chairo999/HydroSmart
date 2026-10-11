import React, { useState, useRef } from 'react';
import { X, Edit3, Check, RotateCcw, Plus, Upload, Move, Trash2, Image as ImageIcon, MapPin } from 'lucide-react';
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
  const [isAdjustingPositions, setIsAdjustingPositions] = useState(false);
  const [draggingSectionId, setDraggingSectionId] = useState(null);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Background image state with persistence
  const [mapBgImage, setMapBgImage] = useState(() => {
    try {
      return localStorage.getItem('hydrosmart_map_bg_image') || '/images/hydro-bg.jpg';
    } catch (e) {
      return '/images/hydro-bg.jpg';
    }
  });

  const [editForm, setEditForm] = useState({
    name: '',
    cropKey: 'lettuce',
    baseHealth: 90,
    area: '25 m²',
    lastWatered: '19/09/2024',
    fertPlanned: '20/09/2024 - Hi-Fos',
    plantedDate: '',
    stage: 'Seedling',
    x: 50,
    y: 50
  });

  const handleBgImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target.result;
        setMapBgImage(result);
        try {
          localStorage.setItem('hydrosmart_map_bg_image', result);
        } catch (err) {
          console.warn('Could not store map background image in localStorage:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetBgImage = () => {
    setMapBgImage('/images/hydro-bg.jpg');
    try {
      localStorage.removeItem('hydrosmart_map_bg_image');
    } catch (e) {}
  };

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
      plantedDate: activeSectionData.plantedDate || '',
      stage: activeSectionData.stage || 'Seedling',
      x: activeSectionData.x ?? 50,
      y: activeSectionData.y ?? 50
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
        plantedDate: editForm.plantedDate,
        stage: editForm.stage,
        x: Number(editForm.x),
        y: Number(editForm.y)
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
    setIsAdjustingPositions(false);
  };

  const handleAddSection = () => {
    const list = greenhouseSections && greenhouseSections.length > 0 ? greenhouseSections : GREENHOUSE_SECTIONS;
    const nextId = list.length > 0 ? Math.max(...list.map(s => s.id)) + 1 : 1;
    const newSection = {
      id: nextId,
      name: `Bay ${nextId}`,
      cropKey: 'lettuce',
      baseHealth: 90,
      area: '25 m²',
      lastWatered: new Date().toLocaleDateString('en-GB'),
      fertPlanned: 'Scheduled',
      centralHub: 'Pi Zero 2 W',
      sensorNode: 'ESP32',
      x: Math.round(20 + (nextId % 5) * 15),
      y: Math.round(30 + (nextId % 3) * 20)
    };

    if (setGreenhouseSections) {
      const updated = [...list, newSection];
      setGreenhouseSections(updated);
      try {
        localStorage.setItem('hydrosmart_greenhouse_sections', JSON.stringify(updated));
      } catch (e) {}
      setActiveSectionId(nextId);
      setIsAdjustingPositions(true);
    }
  };

  const handleDeleteSection = (id) => {
    const list = greenhouseSections && greenhouseSections.length > 0 ? greenhouseSections : GREENHOUSE_SECTIONS;
    if (list.length <= 1) return;
    if (setGreenhouseSections) {
      const updated = list.filter(s => s.id !== id);
      setGreenhouseSections(updated);
      try {
        localStorage.setItem('hydrosmart_greenhouse_sections', JSON.stringify(updated));
      } catch (e) {}
      if (activeSectionId === id) {
        setActiveSectionId(updated[0]?.id || null);
      }
    }
  };

  // Dragging handler for interactive hotspot placement
  const handleHotspotMouseDown = (e, sectionId) => {
    if (!isAdjustingPositions) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingSectionId(sectionId);
    setActiveSectionId(sectionId);

    const handleMouseMove = (moveEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      let xPct = Math.round(((moveEvent.clientX - rect.left) / rect.width) * 100);
      let yPct = Math.round(((moveEvent.clientY - rect.top) / rect.height) * 100);
      xPct = Math.max(3, Math.min(95, xPct));
      yPct = Math.max(4, Math.min(94, yPct));

      if (updateGreenhouseSection) {
        updateGreenhouseSection(sectionId, { x: xPct, y: yPct });
      }
    };

    const handleMouseUp = () => {
      setDraggingSectionId(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleCanvasClick = (e) => {
    if (!isAdjustingPositions || !activeSectionId || !canvasRef.current) return;
    // If clicking directly on empty canvas area, move selected pin there
    if (e.target.classList.contains('map-hotspot') || e.target.closest('.map-hotspot')) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    let yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    xPct = Math.max(3, Math.min(95, xPct));
    yPct = Math.max(4, Math.min(94, yPct));
    if (updateGreenhouseSection) {
      updateGreenhouseSection(activeSectionId, { x: xPct, y: yPct });
    }
  };

  const sectionsToRender = greenhouseSections && greenhouseSections.length > 0 ? greenhouseSections : GREENHOUSE_SECTIONS;
  const isCustomBg = mapBgImage !== '/images/hydro-bg.jpg';

  return (
    <div className="map-view-container fade-in">
      {/* Hidden File Input for Background Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleBgImageUpload}
        style={{ display: 'none' }}
      />

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
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleAddSection}
              title="Add a new greenhouse bay"
              style={{
                border: 'none', background: 'var(--primary-glow)', color: 'var(--primary)',
                borderRadius: '4px', padding: '2px 6px', cursor: 'pointer',
                fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px'
              }}
            >
              <Plus size={11} /> Add
            </button>
            <button
              onClick={handleResetSections}
              title="Reset layout to default"
              style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <RotateCcw size={11} /> Reset
            </button>
          </div>
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
                    <span style={{ marginLeft: '4px', opacity: 0.6 }}>({s.x || 50}%, {s.y || 50}%)</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`section-health-badge ${healthColor}`}>
                    {computedHealth}%
                  </span>
                  {sectionsToRender.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSection(s.id); }}
                      title="Delete this bay"
                      style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center Panel: Greenhouse Image Hotspots */}
      <div className="map-canvas-container">
        <div className="map-canvas-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <div className="drawer-title-group">
            <span className="drawer-title" style={{ fontSize: '15px' }}>Greenhouse Layout Map</span>
            <span className="drawer-subtitle">
              {isAdjustingPositions
                ? '📍 Click & drag markers to reposition them to match your physical greenhouse layout'
                : 'Click markers to overlay section parameters or edit section details'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Background Image Upload / Reset Buttons */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload your own greenhouse layout image"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                border: '1px solid var(--border-color)', background: 'var(--bg-panel)',
                color: 'var(--text-main)', cursor: 'pointer'
              }}
            >
              <Upload size={12} style={{ color: 'var(--primary)' }} />
              {isCustomBg ? 'Change Map Image' : 'Upload Map Image'}
            </button>

            {isCustomBg && (
              <button
                onClick={handleResetBgImage}
                title="Reset background image to default"
                style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  padding: '5px 8px', borderRadius: '6px', fontSize: '11px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-panel)',
                  color: 'var(--text-tertiary)', cursor: 'pointer'
                }}
              >
                <RotateCcw size={11} /> Reset Img
              </button>
            )}

            {/* Adjust Section Placement Mode Toggle */}
            <button
              onClick={() => setIsAdjustingPositions(!isAdjustingPositions)}
              title={isAdjustingPositions ? "Finish placement editing" : "Move & adjust section marker placement"}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                border: 'none', cursor: 'pointer',
                background: isAdjustingPositions ? 'var(--primary)' : 'var(--primary-glow)',
                color: isAdjustingPositions ? '#fff' : 'var(--primary)'
              }}
            >
              <Move size={12} />
              {isAdjustingPositions ? 'Done Moving' : 'Move Sections'}
            </button>
          </div>
        </div>

        {/* Position Adjustment Notification Bar */}
        {isAdjustingPositions && (
          <div style={{
            background: 'var(--primary-glow)',
            color: 'var(--primary)',
            padding: '7px 14px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Move size={13} />
              <b>Placement Mode Active:</b> Drag any bay marker directly on the image, or click to move selected bay #{activeSectionId || 1}.
            </span>
            <button
              onClick={() => setIsAdjustingPositions(false)}
              style={{
                border: 'none', background: 'var(--primary)', color: '#fff',
                borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        )}

        <div
          ref={canvasRef}
          className="map-canvas-view"
          onClick={handleCanvasClick}
          style={{
            cursor: isAdjustingPositions ? 'crosshair' : 'default',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <img
            src={mapBgImage}
            className="map-bg-image"
            alt="Greenhouse Map background"
            onError={(e) => {
              // Fallback if custom uploaded image has broken URL
              e.target.src = '/images/hydro-bg.jpg';
            }}
          />

          {sectionsToRender.map(s => {
            const computedHealth = s.health ?? (s.id === 4 ? 41 : (s.id === 2 || s.id === 7 ? 75 : s.baseHealth));
            const healthColor = getSectionHealthColor(computedHealth);
            const isDragging = draggingSectionId === s.id;
            const isSelected = activeSectionId === s.id;

            return (
              <div
                key={s.id}
                className={`map-hotspot ${isSelected ? 'active' : ''} health-${healthColor}`}
                style={{
                  left: `${s.x || 50}%`,
                  top: `${s.y || 50}%`,
                  cursor: isAdjustingPositions ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                  transform: isDragging ? 'scale(1.35)' : isSelected ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: isAdjustingPositions ? '0 0 10px rgba(16,185,129,0.7), 0 4px 12px rgba(0,0,0,0.3)' : undefined,
                  transition: isDragging ? 'none' : 'all 0.15s ease'
                }}
                onMouseDown={(e) => handleHotspotMouseDown(e, s.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSectionId(s.id);
                  if (!isAdjustingPositions) {
                    setIsEditingSection(false);
                  }
                }}
                title={isAdjustingPositions ? `Drag Bay ${s.id} to reposition` : `Bay ${s.id}: ${s.name}`}
              >
                {s.id}
                {(isSelected || isAdjustingPositions) && (
                  <span className="map-hotspot-label" style={{
                    background: isAdjustingPositions ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.85)'
                  }}>
                    {s.name} {isAdjustingPositions ? `(${s.x}%, ${s.y}%)` : ''}
                  </span>
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

                {/* Map Placement Coordinates (X and Y percentage sliders) */}
                <div style={{ background: 'var(--bg-card-hover)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={11} /> Map Coordinates Placement
                  </span>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span className="text-secondary">Horizontal X Position</span>
                      <b>{editForm.x}%</b>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="95"
                      value={editForm.x}
                      onChange={(e) => setEditForm(prev => ({ ...prev, x: Number(e.target.value) }))}
                      style={{ accentColor: 'var(--primary)', width: '100%', cursor: 'pointer' }}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span className="text-secondary">Vertical Y Position</span>
                      <b>{editForm.y}%</b>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="94"
                      value={editForm.y}
                      onChange={(e) => setEditForm(prev => ({ ...prev, y: Number(e.target.value) }))}
                      style={{ accentColor: 'var(--primary)', width: '100%', cursor: 'pointer' }}
                    />
                  </div>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Planting Date</span>
                  <input
                    type="date"
                    value={editForm.plantedDate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, plantedDate: e.target.value }))}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Growth Stage</span>
                  <select
                    value={editForm.stage}
                    onChange={(e) => setEditForm(prev => ({ ...prev, stage: e.target.value }))}
                    style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-main)', outline: 'none' }}
                  >
                    <option value="Seedling">Seedling</option>
                    <option value="Vegetative">Vegetative</option>
                    <option value="Flowering">Flowering</option>
                    <option value="Harvest Ready">Harvest Ready</option>
                  </select>
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
                  <span className="drawer-stat-label">Map Position</span>
                  <span className="drawer-stat-value" style={{ fontFamily: 'var(--font-mono)' }}>
                    X: {activeSectionData.x || 50}% • Y: {activeSectionData.y || 50}%
                  </span>
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

                {/* Planting Info */}
                {activeSectionData.plantedDate && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
                    <h4 style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Growing Schedule
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Planted Date</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {new Date(activeSectionData.plantedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Growth Stage</span>
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{activeSectionData.stage || 'Seedling'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
