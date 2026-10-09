import React, { useState, useEffect, useCallback } from 'react';
import { Home, Compass, Cpu, Activity, Settings } from 'lucide-react';
import { GREENHOUSE_SECTIONS } from '../shared/constants';
import {
  USE_FIREBASE, getTelemetryFromFirebase, updateOverrideInFirebase, selectCropInFirebase
} from '../shared/firebaseService';

// Import Tab Components
import OverviewTab from '../components/dashboard/OverviewTab';
import MapTab from '../components/dashboard/MapTab';
import MonitorTab from '../components/dashboard/MonitorTab';
import GrowthTab from '../components/dashboard/GrowthTab';
import SettingsTab from '../components/dashboard/SettingsTab';

const fallbackCropProfiles = {
  lettuce: { phMin: 5.5, phMax: 6.5, ecMin: 1.2, ecMax: 1.8, tempMin: 18, tempMax: 24, ratioA: 2.0, ratioB: 2.0 },
  pechay: { phMin: 6.0, phMax: 7.0, ecMin: 1.5, ecMax: 2.5, tempMin: 20, tempMax: 30, ratioA: 2.5, ratioB: 2.5 },
  spinach: { phMin: 6.0, phMax: 6.8, ecMin: 1.8, ecMax: 2.3, tempMin: 15, tempMax: 20, ratioA: 1.8, ratioB: 1.8 }
};

export default function DesktopDashboard() {
  // --- System Live State (Fetched from Backend API) ---
  const [sensors, setSensors] = useState({
    ph: 6.2, ec: 1.5, waterTemp: 21.5, airTemp: 24.5, humidity: 62, waterLevel: 85
  });
  const [energy, setEnergy] = useState({
    batterySoC: 78, solarVoltage: 18.4, solarCurrent: 1250, solarPower: 23.0,
    loadVoltage: 12.1, loadCurrent: 890, loadPower: 10.8, gridActive: false,
    chargingState: 'solar', loadShedding: false, ina219: { busVoltage: 12.1, current: 890, power: 10.8, energyToday: 0.124 }
  });
  const [dosing, setDosing] = useState({
    nutrientA_ml: 2.4, nutrientB_ml: 1.8, phUp_ml: 0.0, phDown_ml: 0.6,
    mlpConfidence: 94.2, lastInference: new Date().toISOString(), manualOverride: false
  });
  const [overrides, setOverrides] = useState({
    waterPump: true, growLights: true, exhaustFan: false, dosingPumps: true
  });
  const [activeCrop, setActiveCrop] = useState('lettuce');
  const [activeStage, setActiveStage] = useState('Vegetative');
  const [cropProfile, setCropProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(true);

  // --- Scheduler & Settings Integration (from Mobile) ---
  const [selectedCropTab, setSelectedCropTab] = useState('lettuce');
  const [wateringDays, setWateringDays] = useState({
    M: true, T: false, W: true, T2: false, F: true, S: false, S2: false
  });
  const [wateringMode, setWateringMode] = useState('scheduled'); // 'auto', 'scheduled', 'manual'
  const [waterVolume, setWaterVolume] = useState(1500); // volume in mL
  const [wateringSlots, setWateringSlots] = useState([
    { id: 1, name: 'Morning Cycle', time: '07:00', duration: 15, volume: 1500, active: true },
    { id: 2, name: 'Evening Cycle', time: '17:00', duration: 15, volume: 1500, active: true }
  ]);
  const [isWateringNow, setIsWateringNow] = useState(false);
  const [manualTimeLeft, setManualTimeLeft] = useState(0);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [energySaver, setEnergySaver] = useState(false);
  const [dashboardTheme, setDashboardTheme] = useState(() => {
    return localStorage.getItem('hydrosmart_theme') || 'light';
  });

  const handleThemeChange = (newTheme) => {
    setDashboardTheme(newTheme);
    localStorage.setItem('hydrosmart_theme', newTheme);
  };

  // --- Dynamic Greenhouse Sections State (User Editable) ---
  const [greenhouseSections, setGreenhouseSections] = useState(() => {
    try {
      const saved = localStorage.getItem('hydrosmart_greenhouse_sections');
      return saved ? JSON.parse(saved) : GREENHOUSE_SECTIONS;
    } catch (e) {
      return GREENHOUSE_SECTIONS;
    }
  });

  const updateGreenhouseSection = (id, updatedFields) => {
    setGreenhouseSections(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updatedFields } : s);
      try {
        localStorage.setItem('hydrosmart_greenhouse_sections', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // --- Editable Owner Info States ---
  const [ownerName, setOwnerName] = useState(' Rene Baterbonia');
  const [ownerRole, setOwnerRole] = useState('Owner & Smart Farm Lead');
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [ownerAvatar, setOwnerAvatar] = useState('/images/cat1.jpg');
  const [ownerPhone, setOwnerPhone] = useState('+63 917 123 4567');
  const [ownerEmail, setOwnerEmail] = useState('rene.baterbonia@gmail.com');
  const [farmLocation, setFarmLocation] = useState('Muntinlupa City, Philippines');

  // --- UI Presentation State ---
  const [desktopTab, setDesktopTab] = useState('overview'); // 'overview' or 'map'

  // Selected Greenhouse Section
  const [activeSectionId, setActiveSectionId] = useState(3);

  // Dynamic Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Helper to determine if task scheduled time has passed
  const checkIsTaskTimePassed = (timeStr, now = new Date()) => {
    if (!timeStr) return false;
    try {
      const parts = timeStr.split('-');
      const endStr = (parts[parts.length - 1] || parts[0]).trim();
      const match = endStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return false;
      let [_, hStr, mStr, meridiem] = match;
      let hours = parseInt(hStr, 10);
      const minutes = parseInt(mStr, 10);
      if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;

      const targetTime = new Date(now);
      targetTime.setHours(hours, minutes, 0, 0);
      return now.getTime() >= targetTime.getTime();
    } catch (e) {
      return false;
    }
  };

  // Initial Task checklist state (with auto-completed check)
  const [tasks, setTasks] = useState(() => {
    const initialList = [
      { id: 1, title: 'pH Probe Calibration', desc: 'Recalibrate sensor using pH 4.01 and 7.00 solutions', time: '07:00 AM - 07:30 AM', completed: false },
      { id: 2, title: 'Fertilizing', desc: 'Apply organic fertilizer to base of plants. Quantity: 50g per plant', time: '08:00 AM - 08:30 AM', completed: true },
      { id: 3, title: 'Plant Inspection', desc: 'Check leaves for any signs of pests or yellowing', time: '10:00 AM - 11:00 AM', completed: false },
      { id: 4, title: 'Soil Aeration', desc: 'Loosen soil around the roots', time: '02:00 PM - 03:00 PM', completed: false }
    ];
    const now = new Date();
    return initialList.map(task => {
      const passed = checkIsTaskTimePassed(task.time, now);
      return {
        ...task,
        completed: passed ? true : task.completed,
        autoCompleted: passed
      };
    });
  });

  // Automatically update and check off completed tasks as time passes
  useEffect(() => {
    setTasks(prevTasks => {
      let changed = false;
      const nextTasks = prevTasks.map(t => {
        const passed = checkIsTaskTimePassed(t.time, currentTime);
        if (passed && !t.completed) {
          changed = true;
          return { ...t, completed: true, autoCompleted: true };
        }
        return t;
      });
      return changed ? nextTasks : prevTasks;
    });
  }, [currentTime]);

  // --- Clock Trigger ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- API Polling ---
  const fetchData = useCallback(async () => {
    try {
      let data;
      if (USE_FIREBASE) {
        data = await getTelemetryFromFirebase();
        if (!data) throw new Error("Could not retrieve telemetry from Firebase Realtime Database");
      } else {
        const res = await fetch('/api/telemetry');
        data = await res.json();
      }
      setSensors(data.sensors);
      setEnergy(data.energy);
      setDosing(data.dosing);
      setOverrides(data.overrides);
      setActiveCrop(data.activeCrop);
      setActiveStage(data.activeStage);
      setCropProfile(data.cropProfile || fallbackCropProfiles[data.activeCrop || 'lettuce']);
      setHistory(data.history || []);
      setConnected(true);
    } catch (e) {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2500);
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- API Interactive Actions ---
  const selectCrop = async (crop) => {
    try {
      if (USE_FIREBASE) {
        await selectCropInFirebase(crop, activeStage);
      } else {
        await fetch('/api/crop-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crop, stage: activeStage })
        });
      }
      setActiveCrop(crop);
    } catch (e) { /* swallow */ }
  };

  // --- Watering Scheduler Actions ---
  const addWateringSlot = () => {
    const nextId = wateringSlots.length > 0 ? Math.max(...wateringSlots.map(s => s.id)) + 1 : 1;
    const newSlot = {
      id: nextId,
      name: `Cycle ${nextId}`,
      time: '12:00',
      duration: 10,
      volume: 1000,
      active: true
    };
    setWateringSlots([...wateringSlots, newSlot]);
  };

  const updateSlotField = (id, field, value) => {
    setWateringSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const deleteWateringSlot = (id) => {
    setWateringSlots(prev => prev.filter(s => s.id !== id));
  };

  const triggerManualWater = async () => {
    setIsWateringNow(true);
    setManualTimeLeft(10);

    // Turn ON physical ESP32 pump relay
    try {
      if (USE_FIREBASE) {
        await updateOverrideInFirebase('waterPump', true);
      } else {
        await fetch('/api/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device: 'waterPump', state: true })
        });
      }
      setOverrides(prev => ({ ...prev, waterPump: true }));
    } catch (e) {
      console.error("Failed to turn on water pump:", e);
    }
  };

  useEffect(() => {
    if (manualTimeLeft <= 0) return;

    const interval = setInterval(async () => {
      setManualTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsWateringNow(false);
          // Turn OFF physical pump
          if (USE_FIREBASE) {
            updateOverrideInFirebase('waterPump', false).then(() => {
              setOverrides(prevOverrides => ({ ...prevOverrides, waterPump: false }));
            }).catch(err => console.error("Failed to turn off water pump:", err));
          } else {
            fetch('/api/override', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ device: 'waterPump', state: false })
            }).then(() => {
              setOverrides(prevOverrides => ({ ...prevOverrides, waterPump: false }));
            }).catch(err => console.error("Failed to turn off water pump:", err));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [manualTimeLeft]);

  const getNextWateringText = () => {
    if (wateringMode === 'auto') {
      return 'Automatic (Sensor Controlled)';
    }
    if (wateringMode === 'manual') {
      return 'Manual Overrides Enabled';
    }

    const activeSlots = wateringSlots.filter(s => s.active);
    if (activeSlots.length === 0) return 'No cycles scheduled';

    const sorted = [...activeSlots].sort((a, b) => a.time.localeCompare(b.time));
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let nextSlot = sorted.find(s => s.time.localeCompare(currentHourMin) > 0);
    let isTomorrow = false;

    if (!nextSlot) {
      nextSlot = sorted[0];
      isTomorrow = true;
    }

    const [h, m] = nextSlot.time.split(':').map(Number);
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const timeStr = `${displayHour}:${String(m).padStart(2, '0')} ${ampm}`;

    return `${isTomorrow ? 'Tomorrow' : 'Today'} at ${timeStr} (${nextSlot.volume}mL)`;
  };

  // --- UI Helpers ---
  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const getCompletedTasksCount = () => tasks.filter(t => t.completed).length;

  const getSectionHealthColor = (health) => {
    if (health >= 90) return 'good';
    if (health >= 70) return 'warning';
    return 'critical';
  };

  const getSectionSensors = (sectionId) => {
    const seed = sectionId * 1.5;
    const ecVal = +(sensors.ec + (Math.cos(seed) * 0.1)).toFixed(2);
    const tdsVal = Math.round(ecVal * 500);
    return {
      ph: +(sensors.ph + (Math.sin(seed) * 0.15)).toFixed(1),
      ec: ecVal,
      tds: tdsVal,
      humidity: Math.round(sensors.humidity + (Math.cos(seed) * 4)),
      waterLevel: Math.round(sensors.waterLevel + (Math.sin(seed * 2) * 3)),
      temperature: +(sensors.waterTemp + (Math.cos(seed * 1.5) * 1.2)).toFixed(1)
    };
  };

  const activeSectionData = greenhouseSections.find(s => s.id === activeSectionId) || greenhouseSections[0];
  const activeSectionSensors = activeSectionData ? getSectionSensors(activeSectionData.id) : null;

  return (
    <div className={`app-container ${dashboardTheme === 'dark' ? 'phone-dark-mode' : ''}`}>
      {/* ── HEADER ── */}
      <header className="app-header">
        <div className="header-left">
          <img src="/logo.png" alt="Hydrosmart Logo" style={{ height: '46px', width: 'auto', marginRight: '8px', objectFit: 'contain' }} />
          <h1 className="brand-name">HydroSmart</h1>
        </div>

        <div className="header-right">
          <div className="system-status-indicator">
            <div className="status-indicator-dot" />
            <span>{connected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </span>
        </div>
      </header>

      {/* ── DESKTOP DASHBOARD MODE ── */}
      <div className="desktop-layout">
        {/* Sidebar */}
        <nav className="desktop-sidebar">
          <button
            className={`sidebar-nav-item ${desktopTab === 'overview' ? 'active' : ''}`}
            onClick={() => setDesktopTab('overview')}
            title="Overview Dashboard"
          >
            <Home size={20} />
          </button>
          <button
            className={`sidebar-nav-item ${desktopTab === 'map' ? 'active' : ''}`}
            onClick={() => setDesktopTab('map')}
            title="Greenhouse Section Map"
          >
            <Compass size={20} />
          </button>
          <div className="sidebar-divider" />
          <button
            className={`sidebar-nav-item ${desktopTab === 'monitor' ? 'active' : ''}`}
            onClick={() => setDesktopTab('monitor')}
            title="Watering & Device Monitor"
          >
            <Cpu size={20} />
          </button>
          <button
            className={`sidebar-nav-item ${desktopTab === 'growth' ? 'active' : ''}`}
            onClick={() => setDesktopTab('growth')}
            title="Analytics & Growth Track"
          >
            <Activity size={20} />
          </button>
          <button
            className={`sidebar-nav-item ${desktopTab === 'settings' ? 'active' : ''}`}
            onClick={() => setDesktopTab('settings')}
            title="Settings & Calibrations"
          >
            <Settings size={20} />
          </button>
        </nav>

        {/* Content Pane */}
        <main className="desktop-content">
          {/* VIEW: OVERVIEW TAB */}
          {desktopTab === 'overview' && (
            <OverviewTab
              sensors={sensors}
              energy={energy}
              dosing={dosing}
              activeCrop={activeCrop}
              activeStage={activeStage}
              selectCrop={selectCrop}
              cropProfile={cropProfile}
              tasks={tasks}
              toggleTask={toggleTask}
              getCompletedTasksCount={getCompletedTasksCount}
              fetchData={fetchData}
              currentTime={currentTime}
              farmLocation={farmLocation}
              setDesktopTab={setDesktopTab}
            />
          )}

          {/* VIEW: GREENHOUSE MAP TAB */}
          {desktopTab === 'map' && (
            <MapTab
              activeSectionId={activeSectionId}
              setActiveSectionId={setActiveSectionId}
              activeSectionData={activeSectionData}
              activeSectionSensors={activeSectionSensors}
              getSectionHealthColor={getSectionHealthColor}
              greenhouseSections={greenhouseSections}
              updateGreenhouseSection={updateGreenhouseSection}
              setGreenhouseSections={setGreenhouseSections}
            />
          )}

          {/* VIEW: MONITOR TAB */}
          {desktopTab === 'monitor' && (
            <MonitorTab
              selectedCropTab={selectedCropTab}
              setSelectedCropTab={setSelectedCropTab}
              selectCrop={selectCrop}
              activeStage={activeStage}
              cropProfile={cropProfile}
              wateringMode={wateringMode}
              setWateringMode={setWateringMode}
              wateringDays={wateringDays}
              setWateringDays={setWateringDays}
              waterVolume={waterVolume}
              setWaterVolume={setWaterVolume}
              wateringSlots={wateringSlots}
              addWateringSlot={addWateringSlot}
              updateSlotField={updateSlotField}
              deleteWateringSlot={deleteWateringSlot}
              isWateringNow={isWateringNow}
              manualTimeLeft={manualTimeLeft}
              triggerManualWater={triggerManualWater}
              getNextWateringText={getNextWateringText}
            />
          )}

          {/* VIEW: GROWTH TAB */}
          {desktopTab === 'growth' && (
            <GrowthTab
              selectedCropTab={selectedCropTab}
              activeStage={activeStage}
              cropProfile={cropProfile}
            />
          )}

          {/* VIEW: SETTINGS TAB */}
          {desktopTab === 'settings' && (
            <SettingsTab
              ownerName={ownerName}
              setOwnerName={setOwnerName}
              ownerRole={ownerRole}
              setOwnerRole={setOwnerRole}
              isEditingOwner={isEditingOwner}
              setIsEditingOwner={setIsEditingOwner}
              ownerAvatar={ownerAvatar}
              setOwnerAvatar={setOwnerAvatar}
              ownerPhone={ownerPhone}
              setOwnerPhone={setOwnerPhone}
              ownerEmail={ownerEmail}
              setOwnerEmail={setOwnerEmail}
              farmLocation={farmLocation}
              setFarmLocation={setFarmLocation}
              dashboardTheme={dashboardTheme}
              setDashboardTheme={handleThemeChange}
              criticalAlerts={criticalAlerts}
              setCriticalAlerts={setCriticalAlerts}
              energySaver={energySaver}
              setEnergySaver={setEnergySaver}
              dosing={dosing}
              sensors={sensors}
            />
          )}
        </main>
      </div>
    </div>
  );
}
