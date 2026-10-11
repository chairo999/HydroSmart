import React, { useState, useEffect, useMemo } from 'react';
import {
  Leaf, Thermometer, Sun, Droplet, Wind, Zap, Cpu, RefreshCw, Check, ChevronRight, Activity, Clock,
  ArrowUp, ArrowDown, ExternalLink, X, FileText, CheckCircle2, Search, Calendar, ChevronLeft,
  Moon, AlertCircle, Info, Sparkles, Sprout
} from 'lucide-react';
import { CROP_IMAGES, CROP_SPECIES, CROP_DETAILS, GREENHOUSE_SECTIONS, formatShortDate } from '../../shared/constants';

export default function OverviewTab({
  sensors,
  energy,
  dosing,
  activeCrop,
  activeStage,
  selectCrop,
  cropProfile,
  fetchData,
  currentTime,
  farmLocation = 'Muntinlupa City, Philippines',
  setDesktopTab,
  greenhouseSections = GREENHOUSE_SECTIONS,
  updateGreenhouseSection
}) {
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');

  // Muntinlupa City Weather State (Dynamic Day / Night & Forecast)
  const [weatherData, setWeatherData] = useState({
    temp: Math.round(sensors.airTemp || 28),
    high: 33,
    low: 24,
    condition: 'Partly Cloudy',
    humidity: sensors.humidity || 75,
    isDay: true,
    sunrise: '05:46 AM',
    sunset: '05:38 PM',
    lastUpdated: new Date()
  });

  // Harvest Calendar State
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
  const [cropCalendarFilter, setCropCalendarFilter] = useState('all');

  const currentTDS = sensors.tds || Math.round(sensors.ec * 500);
  const minTDS = Math.round((cropProfile?.targets?.ec?.min || 1.2) * 500);
  const maxTDS = Math.round((cropProfile?.targets?.ec?.max || 1.8) * 500);
  const targetTDS = Math.round((cropProfile?.targets?.ec?.optimal || 1.5) * 500);
  const targetPH = cropProfile?.targets?.ph?.optimal || 6.0;

  // Real-Time Muntinlupa City Weather with Day/Night Calculation
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=14.4081&longitude=121.0415&current=temperature_2m,relative_humidity_2m,is_day,weather_code&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=Asia%2FManila'
        );
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.current) {
            const current = json.current;
            const daily = json.daily || {};
            const isDayTime = current.is_day === 1;

            const formatTimeOnly = (isoStr) => {
              if (!isoStr) return '';
              const d = new Date(isoStr);
              return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
            };

            const weatherCodeMap = {
              0: 'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
              45: 'Foggy', 48: 'Depositing Rime Fog',
              51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
              61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
              80: 'Rain Showers', 95: 'Thunderstorm'
            };

            setWeatherData({
              temp: Math.round(current.temperature_2m),
              high: daily.temperature_2m_max?.[0] ? Math.round(daily.temperature_2m_max[0]) : 33,
              low: daily.temperature_2m_min?.[0] ? Math.round(daily.temperature_2m_min[0]) : 24,
              condition: weatherCodeMap[current.weather_code] || (isDayTime ? 'Sunny' : 'Clear Night'),
              humidity: current.relative_humidity_2m || sensors.humidity || 75,
              isDay: isDayTime,
              sunrise: formatTimeOnly(daily.sunrise?.[0]) || '05:46 AM',
              sunset: formatTimeOnly(daily.sunset?.[0]) || '05:38 PM',
              lastUpdated: new Date()
            });
          }
        }
      } catch (e) {
        // Fallback using Manila local clock
        const manilaHour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })).getHours();
        const isDayTime = manilaHour >= 6 && manilaHour < 18;
        if (isMounted) {
          setWeatherData(prev => ({
            ...prev,
            temp: Math.round(sensors.airTemp || 28),
            isDay: isDayTime
          }));
        }
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 180000); // 3 mins refresh
    return () => { isMounted = false; clearInterval(interval); };
  }, [sensors.airTemp, sensors.humidity]);

  // Relative timestamp calculator
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

  // Active Cultivated Crops from Greenhouse Configuration
  const sectionsList = greenhouseSections && greenhouseSections.length > 0 ? greenhouseSections : GREENHOUSE_SECTIONS;
  const uniqueCultivatedCrops = useMemo(() => {
    const set = new Set(sectionsList.map(s => s.cropKey));
    return Array.from(set);
  }, [sectionsList]);

  // Multi-Crop Harvest Calculations
  const cropSchedules = useMemo(() => {
    const now = currentTime || new Date();
    return sectionsList.map(bay => {
      const details = CROP_DETAILS[bay.cropKey] || {
        name: bay.cropKey.charAt(0).toUpperCase() + bay.cropKey.slice(1),
        maturityDays: 30,
        milestones: []
      };

      if (!bay.plantedDate) {
        return {
          ...bay,
          cropName: details.name,
          details,
          hasValidSchedule: false,
          statusMessage: 'Planted date not set — harvest date cannot yet be calculated'
        };
      }

      const planted = new Date(bay.plantedDate);
      if (isNaN(planted.getTime())) {
        return {
          ...bay,
          cropName: details.name,
          details,
          hasValidSchedule: false,
          statusMessage: 'Invalid planting date — harvest date cannot yet be calculated'
        };
      }

      const maturityDays = details.maturityDays || 30;
      const expectedHarvestDate = new Date(planted.getTime() + maturityDays * 86400000);
      const daysElapsed = Math.max(0, Math.floor((now.getTime() - planted.getTime()) / 86400000));
      const daysRemaining = Math.max(0, Math.ceil((expectedHarvestDate.getTime() - now.getTime()) / 86400000));
      const progressPct = Math.min(100, Math.max(0, Math.round((daysElapsed / maturityDays) * 100)));

      // Current Growth Milestone
      let currentMilestone = 'Early Seedling';
      if (details.milestones && details.milestones.length > 0) {
        for (const m of details.milestones) {
          if (daysElapsed >= m.day) {
            currentMilestone = m.label;
          }
        }
      }

      // Stage label
      let currentStage = bay.stage || (daysRemaining === 0 ? 'Harvest Ready' : progressPct > 35 ? 'Vegetative' : 'Seedling');

      return {
        ...bay,
        cropName: details.name,
        details,
        hasValidSchedule: true,
        plantedDateFormatted: planted.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        expectedHarvestDateFormatted: expectedHarvestDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
        expectedHarvestDate,
        daysElapsed,
        daysRemaining,
        maturityDays,
        progressPct,
        currentMilestone,
        currentStage,
        isHarvestReady: daysRemaining === 0
      };
    });
  }, [sectionsList, currentTime]);

  // Find the soonest harvest
  const nextScheduledHarvest = useMemo(() => {
    const valid = cropSchedules.filter(c => c.hasValidSchedule && c.daysRemaining > 0);
    if (valid.length === 0) return null;
    return valid.sort((a, b) => a.daysRemaining - b.daysRemaining)[0];
  }, [cropSchedules]);

  // Operational Logs
  const allSystemLogs = [
    {
      id: 'log-1',
      timestamp: currentTime.getTime() - 15000,
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
      timestamp: currentTime.getTime() - 12 * 60 * 1000,
      pump: 'Nutrient A & B',
      type: 'nutrient',
      dosage: `${dosing.nutrientA_ml || 2.4} mL (A) + ${dosing.nutrientB_ml || 1.8} mL (B)`,
      action: 'Automated TDS Nutrients Dosing',
      details: `Triggered by live TDS reading: ${currentTDS} ppm (Target: ${targetTDS} ppm / mg/L)`
    },
    {
      id: 'log-3',
      timestamp: currentTime.getTime() - 2 * 3600 * 1000 - 15 * 60 * 1000,
      pump: 'Nutrient B',
      type: 'nutrient',
      dosage: '1.8 mL',
      action: 'Nutrient B Calibration Top-up',
      details: `Replenishment cycle: Monitored at ${Math.max(300, currentTDS - 55)} ppm (Target: ${targetTDS} ppm)`
    },
    {
      id: 'log-4',
      timestamp: currentTime.getTime() - 5 * 3600 * 1000 - 10 * 60 * 1000,
      pump: 'pH-Up',
      type: 'ph',
      dosage: '1.0 mL',
      action: 'pH Up Applied',
      details: 'pH Up Applied: Previous pH 5.4 → Current pH 6.1 (+0.7)',
      direction: 'up'
    },
    {
      id: 'log-5',
      timestamp: currentTime.getTime() - 11 * 3600 * 1000,
      pump: 'Nutrient A',
      type: 'nutrient',
      dosage: '2.0 mL',
      action: 'Nutrient A Scheduled Cycle',
      details: 'Morning vegetative nutrient boost: 680 ppm'
    },
    {
      id: 'log-6',
      timestamp: currentTime.getTime() - 17 * 3600 * 1000,
      pump: 'pH-Down',
      type: 'ph',
      dosage: '0.8 mL',
      action: 'pH Down Applied',
      details: 'pH Down Applied: Previous pH 7.2 → Current pH 6.5 (-0.7)',
      direction: 'down'
    },
    {
      id: 'log-7',
      timestamp: currentTime.getTime() - 24 * 3600 * 1000,
      pump: 'Nutrient A & B',
      type: 'nutrient',
      dosage: '3.0 mL (A) + 3.0 mL (B)',
      action: 'System Startup Baseline Dosing',
      details: 'Initial reservoir batch charge at system power-on'
    }
  ];

  const latestLog = allSystemLogs[0];
  const latestPHLog = allSystemLogs.find(l => l.type === 'ph');
  const isExpectedIncrease = latestPHLog ? latestPHLog.direction === 'up' : Number(sensors.ph) < targetPH;

  // Manila Date Formatter
  const manilaDateString = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Manila'
  }).format(currentTime || new Date());

  // Harvest Calendar Month Navigation
  const monthYearLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };
  const resetToCurrentMonth = () => {
    setCalendarMonth(new Date());
    setSelectedCalendarDate(null);
  };

  // Generate calendar days for viewed month
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      // Find harvests on this specific day
      const harvestsOnDay = cropSchedules.filter(c => {
        if (!c.hasValidSchedule) return false;
        const h = c.expectedHarvestDate;
        return h.getFullYear() === year && h.getMonth() === month && h.getDate() === d;
      });

      days.push({
        dayNumber: d,
        dateObj,
        isCurrentMonth: true,
        harvests: harvestsOnDay,
        isToday: dateObj.toDateString() === (currentTime || new Date()).toDateString()
      });
    }
    return days;
  }, [calendarMonth, cropSchedules, currentTime]);

  return (
    <>
      <div className="dashboard-redesign-grid fade-in">
        {/* LEFT COLUMN */}
        <div className="dashboard-redesign-col">
          {/* Notification Banner (Reflects Multi-Crop System) */}
          <div className="dashboard-notification-banner">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="notif-banner-badge-container">
                <span className="notif-banner-days">
                  {nextScheduledHarvest ? nextScheduledHarvest.daysRemaining : 14}
                </span>
                <span className="notif-banner-days-lbl">Days</span>
              </div>
              <div className="notif-banner-divider" />
              <span className="notif-banner-text">
                NFT circulation active for <b>{uniqueCultivatedCrops.length} cultivated crops</b> ({uniqueCultivatedCrops.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}). {nextScheduledHarvest ? `Earliest harvest: ${nextScheduledHarvest.cropName} in ${nextScheduledHarvest.daysRemaining} days.` : 'Harvest tracking enabled.'}
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
                <span className="hotspot-badge" title="Water Temperature Sensor"><Thermometer size={14} /></span>
                <span className="hotspot-label">Water Temp</span>
                <div className="hotspot-connector" />
              </div>
              <div className="floating-hotspot light-hotspot">
                <span className="hotspot-badge" title="TDS Nutrients Sensor Probe"><Activity size={14} /></span>
                <span className="hotspot-label">TDS Nutrients</span>
                <div className="hotspot-connector" />
              </div>
              <div className="floating-hotspot water-hotspot">
                <span className="hotspot-badge" title="Ultrasonic Water Level Sensor"><Droplet size={14} /></span>
                <span className="hotspot-label">Water Level</span>
                <div className="hotspot-connector" />
              </div>
              <div className="floating-hotspot air-hotspot">
                <span className="hotspot-badge" title="pH Sensor Probe"><Droplet size={14} /></span>
                <span className="hotspot-label">pH Probe</span>
                <div className="hotspot-connector" />
              </div>
            </div>

            <div className="hero-banner-content">
              <div className="hero-banner-title">
                Revolutionize Your Yield with Smart Hydroponics
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <button className="hero-banner-btn" onClick={() => setDesktopTab('map')}>
                  Greenhouse Map <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Suggested Crops Row (Now includes Basil) */}
          <div className="recommendation-section">
            <div className="recommendation-section-title-row">
              <h3 className="recommendation-section-title">
                Suggested Crops
              </h3>
              <a href="#see-all" className="recommendation-see-all" onClick={(e) => { e.preventDefault(); setDesktopTab('map'); }}>
                manage bays
              </a>
            </div>

            <div className="recommendations-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {['lettuce', 'pechay', 'spinach', 'basil'].map(crop => (
                <div
                  key={crop}
                  className={`recommendation-item-card ${activeCrop === crop ? 'active' : ''}`}
                  onClick={() => selectCrop(crop)}
                  title={`View profile for ${crop}`}
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
              <span className="param-info">Crops showing robust root structure and stable absorption</span>
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
              <span className="param-info">DS18B20 Submersible Thermal Probe</span>
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
              <span className="param-info">Ultrasonic Reservoir Tank Level Sensor</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="dashboard-redesign-col">
          {/* Weather Widget (Muntinlupa City with Dynamic Day / Night) */}
          <div className="panel-card weather-widget" style={{ padding: '20px' }}>
            <div className="weather-header" style={{ alignItems: 'flex-start' }}>
              <div className="drawer-title-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="weather-location" style={{ fontSize: '15px' }}>{farmLocation}</span>
                </div>
                <span className="weather-date" style={{ color: 'var(--text-tertiary)' }}>{manilaDateString}</span>
              </div>

              {/* Dynamic Day / Night Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.4px',
                background: weatherData.isDay ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                color: weatherData.isDay ? '#d97706' : '#6366f1',
                border: `1px solid ${weatherData.isDay ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
              }}>
                {weatherData.isDay ? <Sun size={13} /> : <Moon size={13} />}
                <span>{weatherData.isDay ? 'DAY' : 'NIGHT'}</span>
              </div>
            </div>

            <div className="weather-main" style={{ marginTop: '14px', alignItems: 'center' }}>
              <div className="weather-temp-container">
                <span className="weather-temp">{weatherData.temp}</span>
                <span className="weather-temp-unit">°C</span>
              </div>
              <div className="weather-icon-desc">
                <div className="weather-desc" style={{ fontWeight: 700 }}>{weatherData.condition}</div>
                <div className="weather-minmax">
                  High: {weatherData.high}°C &nbsp;•&nbsp; Low: {weatherData.low}°C
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {weatherData.isDay ? `🌅 Sunrise: ${weatherData.sunrise} • Sunset: ${weatherData.sunset}` : `🌙 Night Cycle • Sunrise: ${weatherData.sunrise}`}
                </div>
              </div>
            </div>

            {/* Multi-Crop Cultivation Summary (Replaced single crop banner) */}
            <div style={{
              background: 'var(--bg-card-hover)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginTop: '14px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                  Multi-Crop Cultivation
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                  {uniqueCultivatedCrops.length} Active Varieties across {sectionsList.length} Bays
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {uniqueCultivatedCrops.map(crop => (
                  <span
                    key={crop}
                    style={{
                      fontSize: '11px',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border-color)',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)'
                    }}
                    title={crop}
                  >
                    {crop.charAt(0).toUpperCase() + crop.slice(1)}
                  </span>
                ))}
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

            {/* 4 Peristaltic Pump Tiles */}
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

            {/* Dosing and Pumping Activity Logs Card */}
            <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Latest Pumping Activity Log
                </span>
                <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} /> {formatRelativeTime(latestLog.timestamp, currentTime)}
                </span>
              </div>

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
                title="Click to view complete operational history"
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

          {/* ── CROP GROWTH & HARVEST CALENDAR (Replaced task checklist) ── */}
          <div className="panel-card" style={{ gap: '14px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="panel-card-title" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Calendar size={16} style={{ color: 'var(--primary)' }} />
                  <span>Crop Growth & Harvest Calendar</span>
                </div>
                <span className="panel-card-subtitle" style={{ margin: '2px 0 0 0' }}>
                  Calculated maturity dates & milestone schedules for multi-crop NFT bays
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={prevMonth}
                  style={{ border: 'none', background: 'var(--bg-panel)', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex', color: 'var(--text-main)' }}
                  title="Previous Month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={resetToCurrentMonth}
                  style={{ border: 'none', background: 'var(--bg-panel)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--primary)' }}
                  title="Return to current month"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  style={{ border: 'none', background: 'var(--bg-panel)', borderRadius: '6px', padding: '4px', cursor: 'pointer', display: 'flex', color: 'var(--text-main)' }}
                  title="Next Month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Month Navigator Header & Crop Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)' }}>
                {monthYearLabel}
              </span>

              {/* Crop Filter Tabs */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setCropCalendarFilter('all')}
                  style={{
                    border: 'none',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: cropCalendarFilter === 'all' ? 'var(--primary)' : 'var(--bg-panel)',
                    color: cropCalendarFilter === 'all' ? '#fff' : 'var(--text-secondary)'
                  }}
                >
                  All ({cropSchedules.length})
                </button>
                {['lettuce', 'pechay', 'spinach', 'basil'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCropCalendarFilter(c)}
                    style={{
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      background: cropCalendarFilter === c ? 'var(--primary)' : 'var(--bg-panel)',
                      color: cropCalendarFilter === c ? '#fff' : 'var(--text-secondary)'
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Day-by-Day Calendar Grid */}
            <div style={{
              background: 'var(--bg-card-hover)',
              borderRadius: '12px',
              padding: '10px',
              border: '1px solid var(--border-color)'
            }}>
              {/* Day of Week Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '6px' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)' }}>{d}</span>
                ))}
              </div>

              {/* Month Day Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {calendarDays.map((cell, idx) => {
                  if (!cell.isCurrentMonth) {
                    return <div key={idx} style={{ height: '36px', opacity: 0.2 }} />;
                  }

                  const hasHarvest = cell.harvests && cell.harvests.length > 0;
                  const filteredHarvests = hasHarvest ? (cropCalendarFilter === 'all' ? cell.harvests : cell.harvests.filter(h => h.cropKey === cropCalendarFilter)) : [];
                  const isHarvestDay = filteredHarvests.length > 0;
                  const isSelected = selectedCalendarDate && selectedCalendarDate.toDateString() === cell.dateObj.toDateString();

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedCalendarDate(isSelected ? null : cell.dateObj)}
                      style={{
                        height: '42px',
                        borderRadius: '8px',
                        padding: '3px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: isSelected
                          ? 'var(--primary-glow)'
                          : cell.isToday
                          ? 'rgba(59, 130, 246, 0.12)'
                          : isHarvestDay
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'var(--bg-card)',
                        border: isSelected
                          ? '2px solid var(--primary)'
                          : cell.isToday
                          ? '1px solid var(--blue)'
                          : isHarvestDay
                          ? '1px solid #10b981'
                          : '1px solid var(--border-color)',
                        transition: 'all 0.1s ease'
                      }}
                      title={isHarvestDay ? `Harvest Day: ${filteredHarvests.map(h => `${h.name} (${h.cropName})`).join(', ')}` : `Day ${cell.dayNumber}`}
                    >
                      <span style={{
                        fontSize: '11px',
                        fontWeight: cell.isToday || isHarvestDay ? 800 : 500,
                        color: isHarvestDay ? '#10b981' : cell.isToday ? 'var(--blue)' : 'var(--text-main)'
                      }}>
                        {cell.dayNumber}
                      </span>

                      {isHarvestDay && (
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px' }}>🌾</span>
                          {filteredHarvests.length > 1 && (
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981' }}>+{filteredHarvests.length}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Detail Banner */}
            {selectedCalendarDate && (
              <div style={{
                background: 'var(--bg-card-hover)',
                borderRadius: '8px',
                padding: '10px 14px',
                border: '1px solid var(--border-color)',
                fontSize: '11px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <b style={{ color: 'var(--text-main)' }}>
                    {selectedCalendarDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}:
                  </b>{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {cropSchedules.filter(c => c.hasValidSchedule && c.expectedHarvestDate.toDateString() === selectedCalendarDate.toDateString()).length > 0
                      ? `Harvest scheduled for ${cropSchedules.filter(c => c.hasValidSchedule && c.expectedHarvestDate.toDateString() === selectedCalendarDate.toDateString()).map(c => `${c.name} (${c.cropName})`).join(', ')}`
                      : 'No harvest scheduled for this date.'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedCalendarDate(null)}
                  style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Multi-Crop Cultivation Schedules List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
              {cropSchedules
                .filter(c => cropCalendarFilter === 'all' || c.cropKey === cropCalendarFilter)
                .map(crop => {
                  return (
                    <div
                      key={crop.id}
                      style={{
                        background: 'var(--bg-card-hover)',
                        borderRadius: '10px',
                        padding: '12px 14px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      {/* Crop & Bay Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px' }}>{CROP_DETAILS[crop.cropKey]?.emoji || '🌱'}</span>
                          <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-main)' }}>
                            {crop.name} • {crop.cropName}
                          </span>
                          <span style={{ fontSize: '10px', fontStyle: 'italic', color: 'var(--text-tertiary)' }}>
                            ({CROP_SPECIES[crop.cropKey]})
                          </span>
                        </div>

                        {/* Stage badge */}
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: crop.isHarvestReady
                            ? 'rgba(16,185,129,0.15)'
                            : crop.currentStage === 'Vegetative'
                            ? 'var(--primary-glow)'
                            : 'rgba(59,130,246,0.12)',
                          color: crop.isHarvestReady ? '#10b981' : 'var(--primary)'
                        }}>
                          {crop.isHarvestReady ? 'Ready for Harvest!' : crop.currentStage}
                        </span>
                      </div>

                      {crop.hasValidSchedule ? (
                        <>
                          {/* Progress Bar & Maturity Countdown */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                              <span style={{ color: 'var(--text-tertiary)' }}>
                                Day <b>{crop.daysElapsed}</b> of {crop.maturityDays} • <b>{crop.currentMilestone}</b>
                              </span>
                              <span style={{ fontWeight: 800, color: crop.isHarvestReady ? '#10b981' : 'var(--primary)' }}>
                                {crop.isHarvestReady ? 'Harvest Ready' : `${crop.daysRemaining} days remaining`}
                              </span>
                            </div>

                            <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${crop.progressPct}%`,
                                  height: '100%',
                                  background: crop.isHarvestReady ? '#10b981' : CROP_DETAILS[crop.cropKey]?.color || 'var(--primary)',
                                  borderRadius: '3px',
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </div>
                          </div>

                          {/* Key Date Information */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            <span>Planted: <b>{crop.plantedDateFormatted}</b></span>
                            <span>Target Harvest: <b style={{ color: 'var(--text-main)' }}>{crop.expectedHarvestDateFormatted}</b></span>
                          </div>
                        </>
                      ) : (
                        <div style={{
                          padding: '8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#ef4444',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <AlertCircle size={13} />
                          <span>{crop.statusMessage}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
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
    </>
  );
}
