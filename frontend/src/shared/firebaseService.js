// Firebase Realtime Database REST Integration Service
// Connects HydroSmart dashboard directly to Firebase Realtime Database
// via lightweight REST API without heavy SDK dependencies.

// User project ID: hydrosmart-sensor-data
export const DEFAULT_FIREBASE_DB_URL = "https://hydrosmart-sensor-data-default-rtdb.firebaseio.com";

// Check local storage for runtime configuration
export function getFirebaseUrl() {
  return localStorage.getItem('hydrosmart_firebase_url') || DEFAULT_FIREBASE_DB_URL;
}

export function setFirebaseUrl(url) {
  if (url) {
    localStorage.setItem('hydrosmart_firebase_url', url.trim());
  } else {
    localStorage.removeItem('hydrosmart_firebase_url');
  }
}

export function isFirebaseEnabled() {
  const stored = localStorage.getItem('hydrosmart_use_firebase');
  // Default to true if not set
  return stored !== null ? stored === 'true' : true;
}

export function setFirebaseEnabled(enabled) {
  localStorage.setItem('hydrosmart_use_firebase', String(Boolean(enabled)));
}

export const USE_FIREBASE = isFirebaseEnabled();

/**
 * Normalizes any sensor payload (from /sensor_readings or /telemetry or root)
 * into the HydroSmart standard sensors format:
 * { ph, ec, tds, waterTemp, airTemp, humidity, waterLevel }
 */
export function normalizeSensorReadings(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // If payload is nested, unwrap it
  let src = raw;
  if (raw.sensor_readings && typeof raw.sensor_readings === 'object') {
    src = raw.sensor_readings;
  } else if (raw.sensors && typeof raw.sensors === 'object') {
    src = raw.sensors;
  } else if (raw.telemetry && typeof raw.telemetry === 'object') {
    src = raw.telemetry.sensor_readings || raw.telemetry.sensors || raw.telemetry;
  }

  // Handle Firebase auto-generated push keys like { "-NxAbc...": { ... } }
  const keys = Object.keys(src);
  if (keys.length > 0 && typeof src[keys[0]] === 'object') {
    const hasDirectSensorKey = keys.some(k => /^(ph|tds|water|air|temp|humid)/i.test(k));
    if (!hasDirectSensorKey) {
      const lastKey = keys[keys.length - 1];
      src = src[lastKey];
    }
  }

  if (!src || typeof src !== 'object') return null;

  const findVal = (possibleKeys) => {
    for (const k of possibleKeys) {
      for (const srcKey of Object.keys(src)) {
        const cleanSrc = srcKey.toLowerCase().replace(/[\s_-]/g, '');
        const cleanTarget = k.toLowerCase().replace(/[\s_-]/g, '');
        if (cleanSrc === cleanTarget) {
          const num = parseFloat(src[srcKey]);
          if (!isNaN(num)) return num;
        }
      }
    }
    return null;
  };

  const rawPH = findVal(['pH', 'ph', 'ph_level', 'analog_ph', 'phSensor']);
  const rawTDS = findVal(['TDS', 'tds', 'tds_nutrients', 'ppm', 'ec_tds']);
  const rawEC = findVal(['EC', 'ec', 'electrical_conductivity']);
  const rawWaterTemp = findVal(['Water Temperature', 'water_temperature', 'waterTemperature', 'waterTemp', 'water_temp', 'temp_water', 'ds18b20']);
  const rawAirTemp = findVal(['Air Temperature', 'air_temperature', 'airTemperature', 'airTemp', 'air_temp', 'temp_air', 'dht22_temp']);
  const rawHumidity = findVal(['Humidity', 'humidity', 'air_humidity', 'relative_humidity', 'dht22_humidity']);
  const rawWaterLevel = findVal(['Water Level', 'water_level', 'waterLevel', 'tank_level', 'ultrasonic_level']);

  // If no identifiable sensor was found, return null
  if (rawPH === null && rawTDS === null && rawEC === null && rawWaterTemp === null && rawAirTemp === null && rawHumidity === null) {
    return null;
  }

  const ph = rawPH !== null ? Number(rawPH.toFixed(1)) : 6.2;
  const tds = rawTDS !== null ? Math.round(rawTDS) : (rawEC !== null ? Math.round(rawEC * 500) : 750);
  const ec = rawEC !== null ? Number(rawEC.toFixed(2)) : Number((tds / 500).toFixed(2));
  const waterTemp = rawWaterTemp !== null ? Number(rawWaterTemp.toFixed(1)) : 21.5;
  const airTemp = rawAirTemp !== null ? Number(rawAirTemp.toFixed(1)) : 24.5;
  const humidity = rawHumidity !== null ? Math.round(rawHumidity) : 62;
  const waterLevel = rawWaterLevel !== null ? Math.round(rawWaterLevel) : 85;

  return {
    ph,
    ec,
    tds,
    waterTemp,
    airTemp,
    humidity,
    waterLevel
  };
}

/**
 * Fetch live sensor telemetry from Firebase Realtime Database
 * Supports both /sensor_readings.json and /telemetry.json
 */
export async function getTelemetryFromFirebase() {
  const dbUrl = getFirebaseUrl().replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    let sensorReadingsData = null;
    let telemetryData = null;

    // 1. Try fetching from /sensor_readings.json
    try {
      const res = await fetch(`${dbUrl}/sensor_readings.json`, { signal: controller.signal });
      if (res.ok) {
        const json = await res.json();
        if (json) {
          sensorReadingsData = normalizeSensorReadings(json);
        }
      }
    } catch (e) { /* ignore individual request error */ }

    // 2. Try fetching from /telemetry.json
    try {
      const res = await fetch(`${dbUrl}/telemetry.json`, { signal: controller.signal });
      if (res.ok) {
        telemetryData = await res.json();
      }
    } catch (e) { /* ignore individual request error */ }

    clearTimeout(timeoutId);

    // If neither returned, fallback to root /.json
    if (!sensorReadingsData && !telemetryData) {
      try {
        const rootRes = await fetch(`${dbUrl}/.json`);
        if (rootRes.ok) {
          const rootData = await rootRes.json();
          if (rootData) {
            const normalizedRoot = normalizeSensorReadings(rootData);
            if (normalizedRoot) {
              return {
                sensors: normalizedRoot,
                energy: rootData.energy || createDefaultEnergy(),
                dosing: rootData.dosing || createDefaultDosing(),
                overrides: rootData.overrides || createDefaultOverrides(),
                activeCrop: rootData.activeCrop || 'lettuce',
                activeStage: rootData.activeStage || 'Vegetative'
              };
            }
          }
        }
      } catch (e) {}
      return null;
    }

    const result = telemetryData || {};

    // Merge or normalize sensors
    if (sensorReadingsData) {
      result.sensors = { ...(result.sensors || {}), ...sensorReadingsData };
    } else if (result.sensors) {
      result.sensors = normalizeSensorReadings(result.sensors);
    } else if (result.sensor_readings) {
      result.sensors = normalizeSensorReadings(result.sensor_readings);
    }

    // Ensure fallback energy, dosing, and overrides objects exist so UI never crashes
    if (!result.energy) result.energy = createDefaultEnergy();
    if (!result.dosing) result.dosing = createDefaultDosing();
    if (!result.overrides) result.overrides = createDefaultOverrides();
    if (!result.activeCrop) result.activeCrop = 'lettuce';
    if (!result.activeStage) result.activeStage = 'Vegetative';

    return result;
  } catch (error) {
    console.warn("[Firebase Service] Fallback to local simulator due to:", error.message);
    return null;
  }
}

function createDefaultEnergy() {
  return {
    batterySoC: 78,
    solarVoltage: 18.4,
    solarCurrent: 1250,
    solarPower: 23.0,
    loadVoltage: 12.1,
    loadCurrent: 890,
    loadPower: 10.8,
    gridActive: false,
    chargingState: 'solar',
    loadShedding: false,
    ina219: { busVoltage: 12.1, current: 890, power: 10.8, energyToday: 0.124 }
  };
}

function createDefaultDosing() {
  return {
    nutrientA_ml: 2.4,
    nutrientB_ml: 1.8,
    phUp_ml: 0.0,
    phDown_ml: 0.6,
    mlpConfidence: 94.2,
    lastInference: new Date().toISOString(),
    manualOverride: false
  };
}

function createDefaultOverrides() {
  return {
    waterPump: true,
    growLights: true,
    exhaustFan: false,
    dosingPumps: true
  };
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
 * Test Firebase Connection and detect sensor_readings
 */
export async function testFirebaseConnection(customUrl) {
  const dbUrl = (customUrl || getFirebaseUrl()).replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let sensorData = null;
    let telemetryData = null;

    try {
      const res = await fetch(`${dbUrl}/sensor_readings.json`, { signal: controller.signal });
      if (res.ok) sensorData = await res.json();
    } catch (e) {}

    try {
      const res = await fetch(`${dbUrl}/telemetry.json`, { signal: controller.signal });
      if (res.ok) telemetryData = await res.json();
    } catch (e) {}

    clearTimeout(timeoutId);

    const norm = normalizeSensorReadings(sensorData) || normalizeSensorReadings(telemetryData);
    if (norm) {
      return {
        ok: true,
        hasData: true,
        endpoint: sensorData ? '/sensor_readings.json' : '/telemetry.json',
        sensors: norm
      };
    }

    if (sensorData !== null || telemetryData !== null) {
      return { ok: true, hasData: false, message: "Connected, but sensor_readings is empty." };
    }

    // Check root /.json
    const rootRes = await fetch(`${dbUrl}/.json`);
    if (rootRes.ok) {
      const rootData = await rootRes.json();
      const normRoot = normalizeSensorReadings(rootData);
      return { ok: true, hasData: normRoot !== null, sensors: normRoot };
    }

    return { ok: false, error: `HTTP ${rootRes.status}: ${rootRes.statusText}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Seed sensor_readings specifically to Firebase Realtime Database
 */
export async function seedSensorReadingsToFirebase(customUrl, customReadings) {
  const dbUrl = (customUrl || getFirebaseUrl()).replace(/\/$/, "");
  const payload = customReadings || {
    "pH": 6.2,
    "TDS": 750,
    "Water Temperature": 21.5,
    "Air Temperature": 24.5,
    "Humidity": 62,
    "Water Level": 85,
    "timestamp": new Date().toISOString()
  };

  try {
    const response = await fetch(`${dbUrl}/sensor_readings.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      return { ok: true, data: await response.json() };
    }
    return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Seed or reset initial telemetry data structure to Firebase Realtime Database
 */
export async function seedFirebaseData(customUrl, customPayload) {
  const dbUrl = (customUrl || getFirebaseUrl()).replace(/\/$/, "");
  const payload = customPayload || {
    sensors: {
      ph: 6.2,
      ec: 1.5,
      tds: 750,
      waterTemp: 21.5,
      airTemp: 24.5,
      humidity: 62.0,
      waterLevel: 85
    },
    sensor_readings: {
      "pH": 6.2,
      "TDS": 750,
      "Water Temperature": 21.5,
      "Air Temperature": 24.5,
      "Humidity": 62,
      "Water Level": 85
    },
    energy: createDefaultEnergy(),
    dosing: createDefaultDosing(),
    overrides: createDefaultOverrides(),
    activeCrop: "lettuce",
    activeStage: "Vegetative",
    timestamp: Date.now()
  };

  try {
    const response = await fetch(`${dbUrl}/telemetry.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    // Also write to sensor_readings.json for instant compatibility
    await seedSensorReadingsToFirebase(dbUrl, payload.sensor_readings);

    if (response.ok) {
      return { ok: true, data: await response.json() };
    }
    return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
