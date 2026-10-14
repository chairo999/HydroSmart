// Firebase Realtime Database REST Integration Service
// Connects HydroSmart dashboard directly to Firebase Realtime Database
// via lightweight REST API without heavy SDK dependencies.

// Actual User Firebase Project RTDB URL (asia-southeast1)
export const DEFAULT_FIREBASE_DB_URL = "https://hydrosmart-sensor-data-default-rtdb.asia-southeast1.firebasedatabase.app";

// Check local storage for runtime configuration
export function getFirebaseUrl() {
  const url = localStorage.getItem('hydrosmart_firebase_url');
  if (!url || url.includes('hydrosmart-sensor-data-default-rtdb.firebaseio.com')) {
    // Migrate to the correct asia-southeast1 regional database URL
    return DEFAULT_FIREBASE_DB_URL;
  }
  return url;
}

export function setFirebaseUrl(url) {
  try {
    localStorage.setItem('hydrosmart_firebase_url', url);
  } catch (e) {}
}

export function isFirebaseEnabled() {
  const stored = localStorage.getItem('hydrosmart_use_firebase');
  // Enable by default when Firebase RTDB is present, or respect user preference
  return stored !== null ? stored === 'true' : true;
}

export function setFirebaseEnabled(enabled) {
  try {
    localStorage.setItem('hydrosmart_use_firebase', String(enabled));
  } catch (e) {}
}

export const USE_FIREBASE = isFirebaseEnabled();

/**
 * Fetch the complete live telemetry payload from Firebase Realtime Database.
 * Automatically inspects the actual database schema:
 * - /sensor_readings (real-time TDS_ppm, pH, Water_Temp_C, Water_Level_cm)
 * - /system_kpi (CPU_Pct, RAM_Pct, Uptime_Hours, Active_Crop)
 * - /pump_events (real peristaltic dosing activities — derives per-pump timestamps)
 * - /telemetry (fallbacks/overrides)
 */
export async function getTelemetryFromFirebase() {
  const dbUrl = getFirebaseUrl().replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // Fetch all primary data sources in parallel
    const [shallowRes, kpiRes, telemetryRes, pumpEventsRes] = await Promise.all([
      fetch(`${dbUrl}/sensor_readings.json?shallow=true`, { signal: controller.signal }).catch(() => null),
      fetch(`${dbUrl}/system_kpi.json?shallow=true`,      { signal: controller.signal }).catch(() => null),
      fetch(`${dbUrl}/telemetry.json`,                    { signal: controller.signal }).catch(() => null),
      fetch(`${dbUrl}/pump_events.json`,                  { signal: controller.signal }).catch(() => null)
    ]);
    clearTimeout(timeoutId);

    let latestReading = null;
    let latestKpi = null;
    let telemetryTree = null;

    if (telemetryRes && telemetryRes.ok) {
      telemetryTree = await telemetryRes.json().catch(() => null);
    }

    // 1. Parse latest real-time sensor reading and previous reading (to compare pH change)
    let previousReading = null;
    if (shallowRes && shallowRes.ok) {
      const shallowKeysObj = await shallowRes.json().catch(() => null);
      if (shallowKeysObj && typeof shallowKeysObj === 'object') {
        const sortedKeys = Object.keys(shallowKeysObj).sort();
        const latestKey = sortedKeys[sortedKeys.length - 1];
        const prevKey = sortedKeys.length > 1 ? sortedKeys[sortedKeys.length - 2] : null;

        if (latestKey) {
          const fetchPromises = [
            fetch(`${dbUrl}/sensor_readings/${latestKey}.json`).then(r => r.ok ? r.json() : null).catch(() => null)
          ];
          if (prevKey) {
            fetchPromises.push(
              fetch(`${dbUrl}/sensor_readings/${prevKey}.json`).then(r => r.ok ? r.json() : null).catch(() => null)
            );
          }
          const [latestJson, prevJson] = await Promise.all(fetchPromises);
          latestReading = latestJson;
          previousReading = prevJson;
        }
      }
    }

    // 2. Parse latest system KPI
    if (kpiRes && kpiRes.ok) {
      const kpiKeysObj = await kpiRes.json().catch(() => null);
      if (kpiKeysObj && typeof kpiKeysObj === 'object') {
        const sortedKpiKeys = Object.keys(kpiKeysObj).sort();
        const latestKpiKey = sortedKpiKeys[sortedKpiKeys.length - 1];
        if (latestKpiKey) {
          const kpiDataRes = await fetch(`${dbUrl}/system_kpi/${latestKpiKey}.json`);
          if (kpiDataRes.ok) {
            latestKpi = await kpiDataRes.json().catch(() => null);
          }
        }
      }
    }

    // 3. Parse pump events — derive independent per-pump last-activated timestamps
    //    This fixes the bug where pH Down was always assumed, by using actual pump records.
    let pumpTimestamps = { nutrientA: null, nutrientB: null, phUp: null, phDown: null };
    let pumpingLogs = [];

    if (pumpEventsRes && pumpEventsRes.ok) {
      try {
        const pumpEventsData = await pumpEventsRes.json().catch(() => null);
        if (pumpEventsData && typeof pumpEventsData === 'object') {
          const allKeys = Object.keys(pumpEventsData).sort(); // chronological
          const latestPerPump = {};

          const pumpMeta = {
            ph_up:      { label: 'pH-Up',     type: 'ph',       direction: 'up'   },
            ph_down:    { label: 'pH-Down',    type: 'ph',       direction: 'down' },
            nutrient_a: { label: 'Nutrient A', type: 'nutrient', direction: null   },
            nutrient_b: { label: 'Nutrient B', type: 'nutrient', direction: null   }
          };

          for (const key of allKeys) {
            const ev = pumpEventsData[key];
            if (!ev || !ev.Pump) continue;

            // Parse event timestamp from Date + Start_Time fields (local PH time +08:00)
            let eventTs = null;
            if (ev.Date && ev.Start_Time) {
              const isoStr = `${ev.Date}T${ev.Start_Time}+08:00`;
              const d = new Date(isoStr);
              if (!isNaN(d.getTime())) eventTs = d.getTime();
            }
            if (!eventTs) {
              // Fallback: parse from key prefix "YYYY-MM-DD_HH-mm-ss-mmm_pump"
              const m = key.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})/);
              if (m) {
                const isoStr = `${m[1]}T${m[2]}:${m[3]}:${m[4]}+08:00`;
                const d = new Date(isoStr);
                if (!isNaN(d.getTime())) eventTs = d.getTime();
              }
            }
            if (!eventTs) continue;

            const pump = ev.Pump;
            if (!latestPerPump[pump] || eventTs > latestPerPump[pump].ts) {
              latestPerPump[pump] = { ts: eventTs };
            }

            const meta = pumpMeta[pump] || { label: pump, type: 'nutrient', direction: null };
            pumpingLogs.push({
              id: `firebase-${key}`,
              timestamp: eventTs,
              pump,
              pumpLabel: meta.label,
              type: meta.type,
              direction: meta.direction,
              dosage: ev.Approx_mL != null ? `${ev.Approx_mL} mL` : `${ev.Requested_mL ?? '?'} mL`,
              approx_ml: ev.Approx_mL ?? ev.Requested_mL ?? 0,
              action: meta.type === 'ph'
                ? (meta.direction === 'up' ? 'pH Up Applied' : 'pH Down Applied')
                : `${meta.label} Dosed`,
              details: ev.Reason || `${meta.label} activated`,
              pH: ev.pH,
              tds: ev.TDS_ppm
            });
          }

          // Sort newest first
          pumpingLogs.sort((a, b) => b.timestamp - a.timestamp);

          // Extract independent per-pump timestamps
          if (latestPerPump['ph_up'])      pumpTimestamps.phUp      = new Date(latestPerPump['ph_up'].ts).toISOString();
          if (latestPerPump['ph_down'])    pumpTimestamps.phDown    = new Date(latestPerPump['ph_down'].ts).toISOString();
          if (latestPerPump['nutrient_a']) pumpTimestamps.nutrientA = new Date(latestPerPump['nutrient_a'].ts).toISOString();
          if (latestPerPump['nutrient_b']) pumpTimestamps.nutrientB = new Date(latestPerPump['nutrient_b'].ts).toISOString();
        }
      } catch (e) {
        // pump events parse failed — pumpTimestamps stays null
      }
    }

    // Fallback baseline sensor readings if Firebase data not available
    const baselineSensors = telemetryTree?.sensors || {
      ph: 6.2, ec: 1.5, tds: 750,
      waterTemp: 22.0, airTemp: 26.5, humidity: 64, waterLevel: 82
    };

    // Map Firebase schema → Dashboard parameters
    // CRITICAL: Preserve full decimal precision — never round sensor values!
    const mappedSensors = {
      ph:        latestReading?.pH            !== undefined ? Number(latestReading.pH)            : baselineSensors.ph,
      prevPh:    previousReading?.pH        !== undefined ? Number(previousReading.pH)        : undefined,
      tds:       latestReading?.TDS_ppm       !== undefined ? Number(latestReading.TDS_ppm)       : (baselineSensors.tds || (baselineSensors.ec || 1.5) * 500),
      ec:        latestReading?.TDS_ppm       !== undefined ? Number((latestReading.TDS_ppm / 500).toFixed(4)) : (baselineSensors.ec || 1.5),
      waterTemp: latestReading?.Water_Temp_C  !== undefined ? Number(latestReading.Water_Temp_C)  : baselineSensors.waterTemp,
      // Use raw Water_Level_cm directly in cm
      waterLevel: latestReading?.Water_Level_cm !== undefined ? Number(latestReading.Water_Level_cm) : baselineSensors.waterLevel,
      airTemp:  baselineSensors.airTemp  || 26.5,
      humidity: baselineSensors.humidity || 64
    };

    // Map system KPI → energy
    const mappedEnergy = telemetryTree?.energy || {
      batterySoC: latestKpi?.RAM_Pct ? Math.round(100 - latestKpi.RAM_Pct * 0.4) : 84,
      solarVoltage: 18.2, solarCurrent: 1450, solarPower: 26.4,
      loadVoltage: 12.0, loadCurrent: 820, loadPower: 9.8,
      gridActive: false, chargingState: "solar", loadShedding: false,
      ina219: { busVoltage: 12.0, current: 820, power: 9.8, energyToday: 0.145 }
    };

    // Determine active crop from KPI or telemetry tree
    let activeCrop = "lettuce";
    if (latestKpi?.Active_Crop) {
      const c = latestKpi.Active_Crop.toLowerCase();
      if (c.includes("spinach")) activeCrop = "spinach";
      else if (c.includes("pechay")) activeCrop = "pechay";
      else if (c.includes("basil")) activeCrop = "basil";
    } else if (telemetryTree?.activeCrop) {
      activeCrop = telemetryTree.activeCrop;
    }

    // Build dosing object with real per-pump timestamps from Firebase pump_events
    const dosingBase = telemetryTree?.dosing || {
      nutrientA_ml: 2.4, nutrientB_ml: 1.8, phUp_ml: 0.0, phDown_ml: 0.6,
      mlpConfidence: 94.2, lastInference: new Date().toISOString(), manualOverride: false
    };

    return {
      sensors: mappedSensors,
      energy: mappedEnergy,
      dosing: {
        ...dosingBase,
        lastPumped: {
          nutrientA: pumpTimestamps.nutrientA || dosingBase.lastPumped?.nutrientA || new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          nutrientB: pumpTimestamps.nutrientB || dosingBase.lastPumped?.nutrientB || new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          phUp:      pumpTimestamps.phUp      || dosingBase.lastPumped?.phUp      || new Date(Date.now() - 135 * 60 * 1000).toISOString(),
          phDown:    pumpTimestamps.phDown    || dosingBase.lastPumped?.phDown    || new Date(Date.now() - 38 * 60 * 1000).toISOString()
        }
      },
      overrides: telemetryTree?.overrides || {
        waterPump: true, growLights: true, exhaustFan: false, dosingPumps: true
      },
      activeCrop,
      activeStage: telemetryTree?.activeStage || "Vegetative",
      // Real pump event logs from Firebase — newest first
      pumpingLogs,
      // Per-pump ISO timestamps — for independent tile timestamps
      pumpTimestamps
    };
  } catch (error) {
    console.warn("[Firebase Service] Fallback to local simulator due to:", error.message);
    return null;
  }
}

/**
 * Fetch historical or latest pump events from Firebase /pump_events
 */
export async function getPumpEventsFromFirebase(limit = 10) {
  const dbUrl = getFirebaseUrl().replace(/\/$/, "");
  try {
    const shallowRes = await fetch(`${dbUrl}/pump_events.json?shallow=true`);
    if (!shallowRes.ok) return [];
    const keysObj = await shallowRes.json();
    if (!keysObj || typeof keysObj !== 'object') return [];

    const sortedKeys = Object.keys(keysObj).sort().slice(-limit).reverse();
    const eventPromises = sortedKeys.map(async (key) => {
      try {
        const res = await fetch(`${dbUrl}/pump_events/${key}.json`);
        if (res.ok) {
          const item = await res.json();
          return { key, ...item };
        }
      } catch (e) {}
      return null;
    });

    const results = await Promise.all(eventPromises);
    return results.filter(Boolean);
  } catch (e) {
    return [];
  }
}

/**
 * Update a physical hardware override relay state in Firebase
 */
export async function updateOverrideInFirebase(device, state) {
  if (!isFirebaseEnabled()) return { success: true };
  const dbUrl = getFirebaseUrl().replace(/\/$/, "");
  try {
    const response = await fetch(`${dbUrl}/telemetry/overrides.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [device]: state })
    });
    if (!response.ok) throw new Error("Firebase RTDB override update failed");
    return await response.json();
  } catch (error) {
    console.error(`[Firebase Service] Error updating override for ${device}:`, error);
    return null;
  }
}

/**
 * Set the active crop and growth stage in Firebase Realtime Database
 */
export async function selectCropInFirebase(crop, stage) {
  if (!isFirebaseEnabled()) return { success: true };
  const dbUrl = getFirebaseUrl().replace(/\/$/, "");
  try {
    const response = await fetch(`${dbUrl}/telemetry.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeCrop: crop, activeStage: stage })
    });
    if (!response.ok) throw new Error("Firebase RTDB crop selection failed");
    return await response.json();
  } catch (error) {
    console.error("[Firebase Service] Error setting crop profile:", error);
    return null;
  }
}

/**
 * Seed initial baseline telemetry tree to Firebase Realtime Database
 */
export async function seedFirebaseData(customUrl) {
  const dbUrl = (customUrl || getFirebaseUrl()).replace(/\/$/, "");
  const payload = {
    sensors: {
      ph: 6.2, ec: 1.5, tds: 750,
      waterTemp: 22.0, airTemp: 26.5, humidity: 64, waterLevel: 82
    },
    energy: {
      batterySoC: 84, solarVoltage: 18.2, solarCurrent: 1450, solarPower: 26.4,
      loadVoltage: 12.0, loadCurrent: 820, loadPower: 9.8,
      gridActive: false, chargingState: "solar", loadShedding: false,
      ina219: { busVoltage: 12.0, current: 820, power: 9.8, energyToday: 0.145 }
    },
    dosing: {
      nutrientA_ml: 2.4, nutrientB_ml: 1.8, phUp_ml: 0.0, phDown_ml: 0.5,
      mlpConfidence: 95.1, lastInference: new Date().toISOString(), manualOverride: false
    },
    overrides: {
      waterPump: true, growLights: true, exhaustFan: false, dosingPumps: true
    },
    activeCrop: "lettuce",
    activeStage: "Vegetative"
  };

  try {
    const res = await fetch(`${dbUrl}/telemetry.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return { ok: true, data: payload };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Test Firebase Connection
 */
export async function testFirebaseConnection(customUrl) {
  const dbUrl = (customUrl || getFirebaseUrl()).replace(/\/$/, "");
  try {
    const response = await fetch(`${dbUrl}/sensor_readings.json?shallow=true`);
    if (response.ok) {
      const shallowKeys = await response.json();
      const keys = shallowKeys ? Object.keys(shallowKeys) : [];
      let latest = null;
      if (keys.length > 0) {
        const sorted = keys.sort();
        const latestKey = sorted[sorted.length - 1];
        const latestRes = await fetch(`${dbUrl}/sensor_readings/${latestKey}.json`);
        if (latestRes.ok) {
          latest = await latestRes.json();
        }
      }
      return {
        ok: true,
        hasData: keys.length > 0,
        count: keys.length,
        // Preserve raw decimals here too
        sensors: latest ? {
          ph: latest.pH,
          tds: latest.TDS_ppm,
          waterTemp: latest.Water_Temp_C,
          waterLevel: latest.Water_Level_cm
        } : null
      };
    }
    return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
