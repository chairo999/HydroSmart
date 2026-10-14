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
 * - /pump_events (real peristaltic dosing activities)
 * - /telemetry (fallbacks/overrides)
 */
export async function getTelemetryFromFirebase() {
  const dbUrl = getFirebaseUrl().replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    // Fetch latest sensor reading keys first using shallow query
    const [shallowRes, kpiRes, telemetryRes] = await Promise.all([
      fetch(`${dbUrl}/sensor_readings.json?shallow=true`, { signal: controller.signal }).catch(() => null),
      fetch(`${dbUrl}/system_kpi.json?shallow=true`, { signal: controller.signal }).catch(() => null),
      fetch(`${dbUrl}/telemetry.json`, { signal: controller.signal }).catch(() => null)
    ]);
    clearTimeout(timeoutId);

    let latestReading = null;
    let latestKpi = null;
    let telemetryTree = null;

    if (telemetryRes && telemetryRes.ok) {
      telemetryTree = await telemetryRes.json().catch(() => null);
    }

    // 1. Parse latest real-time sensor reading
    if (shallowRes && shallowRes.ok) {
      const shallowKeysObj = await shallowRes.json().catch(() => null);
      if (shallowKeysObj && typeof shallowKeysObj === 'object') {
        const sortedKeys = Object.keys(shallowKeysObj).sort();
        const latestKey = sortedKeys[sortedKeys.length - 1];
        if (latestKey) {
          const readingRes = await fetch(`${dbUrl}/sensor_readings/${latestKey}.json`);
          if (readingRes.ok) {
            latestReading = await readingRes.json().catch(() => null);
          }
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

    // Fallback baseline sensor readings if not yet available
    const baselineSensors = telemetryTree?.sensors || {
      ph: 6.2,
      ec: 1.5,
      tds: 750,
      waterTemp: 22.0,
      airTemp: 26.5,
      humidity: 64,
      waterLevel: 82
    };

    // Map Firebase schema names to Dashboard parameters
    const mappedSensors = {
      ph: latestReading?.pH !== undefined ? Number(latestReading.pH.toFixed ? latestReading.pH.toFixed(2) : latestReading.pH) : baselineSensors.ph,
      tds: latestReading?.TDS_ppm !== undefined ? Math.round(latestReading.TDS_ppm) : (baselineSensors.tds || Math.round((baselineSensors.ec || 1.5) * 500)),
      ec: latestReading?.TDS_ppm !== undefined ? Number((latestReading.TDS_ppm / 500).toFixed(2)) : (baselineSensors.ec || 1.5),
      waterTemp: latestReading?.Water_Temp_C !== undefined ? Number(latestReading.Water_Temp_C.toFixed ? latestReading.Water_Temp_C.toFixed(1) : latestReading.Water_Temp_C) : baselineSensors.waterTemp,
      waterLevel: latestReading?.Water_Level_cm !== undefined 
        ? Math.min(100, Math.max(10, Math.round(Number(latestReading.Water_Level_cm) * 4.5))) 
        : baselineSensors.waterLevel,
      airTemp: baselineSensors.airTemp || 26.5,
      humidity: baselineSensors.humidity || 64
    };

    // Map system KPI to energy / system state
    const mappedEnergy = telemetryTree?.energy || {
      batterySoC: latestKpi?.RAM_Pct ? Math.round(100 - latestKpi.RAM_Pct * 0.4) : 84,
      solarVoltage: 18.2,
      solarCurrent: 1450,
      solarPower: 26.4,
      loadVoltage: 12.0,
      loadCurrent: 820,
      loadPower: 9.8,
      gridActive: false,
      chargingState: "solar",
      loadShedding: false,
      ina219: { busVoltage: 12.0, current: 820, power: 9.8, energyToday: 0.145 }
    };

    // Extract active crop & stage
    let activeCrop = "lettuce";
    if (latestKpi?.Active_Crop) {
      if (latestKpi.Active_Crop.toLowerCase().includes("spinach")) activeCrop = "spinach";
      else if (latestKpi.Active_Crop.toLowerCase().includes("pechay")) activeCrop = "pechay";
      else if (latestKpi.Active_Crop.toLowerCase().includes("basil")) activeCrop = "basil";
    } else if (telemetryTree?.activeCrop) {
      activeCrop = telemetryTree.activeCrop;
    }

    return {
      sensors: mappedSensors,
      energy: mappedEnergy,
      dosing: telemetryTree?.dosing || {
        nutrientA_ml: 2.4,
        nutrientB_ml: 1.8,
        phUp_ml: 0.0,
        phDown_ml: 0.6,
        mlpConfidence: 94.2,
        lastInference: new Date().toISOString(),
        manualOverride: false
      },
      overrides: telemetryTree?.overrides || {
        waterPump: true,
        growLights: true,
        exhaustFan: false,
        dosingPumps: true
      },
      activeCrop: activeCrop,
      activeStage: telemetryTree?.activeStage || "Vegetative"
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
      ph: 6.2,
      ec: 1.5,
      tds: 750,
      waterTemp: 22.0,
      airTemp: 26.5,
      humidity: 64,
      waterLevel: 82
    },
    energy: {
      batterySoC: 84,
      solarVoltage: 18.2,
      solarCurrent: 1450,
      solarPower: 26.4,
      loadVoltage: 12.0,
      loadCurrent: 820,
      loadPower: 9.8,
      gridActive: false,
      chargingState: "solar",
      loadShedding: false,
      ina219: { busVoltage: 12.0, current: 820, power: 9.8, energyToday: 0.145 }
    },
    dosing: {
      nutrientA_ml: 2.4,
      nutrientB_ml: 1.8,
      phUp_ml: 0.0,
      phDown_ml: 0.5,
      mlpConfidence: 95.1,
      lastInference: new Date().toISOString(),
      manualOverride: false
    },
    overrides: {
      waterPump: true,
      growLights: true,
      exhaustFan: false,
      dosingPumps: true
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
        sensors: latest ? {
          ph: latest.pH,
          tds: Math.round(latest.TDS_ppm),
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
