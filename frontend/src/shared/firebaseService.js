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
  try {
    localStorage.setItem('hydrosmart_firebase_url', url);
  } catch (e) {}
}

export function isFirebaseEnabled() {
  const stored = localStorage.getItem('hydrosmart_use_firebase');
  // Disabled by default unless explicitly configured, so local simulator works seamlessly
  return stored !== null ? stored === 'true' : false;
}

export function setFirebaseEnabled(enabled) {
  try {
    localStorage.setItem('hydrosmart_use_firebase', String(enabled));
  } catch (e) {}
}

export const USE_FIREBASE = isFirebaseEnabled();

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
 * Fetch the complete live telemetry payload from Firebase Realtime Database
 */
export async function getTelemetryFromFirebase() {
  const dbUrl = getFirebaseUrl().replace(/\/$/, "");
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${dbUrl}/telemetry.json`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Firebase RTDB fetch failed: ${response.statusText}`);
    const data = await response.json();
    if (!data) return null;

    // Ensure TDS Nutrients field exists in sensors
    if (data.sensors) {
      if (!data.sensors.tds && data.sensors.ec) {
        data.sensors.tds = Math.round(data.sensors.ec * 500);
      }
    }

    return data;
  } catch (error) {
    console.warn("[Firebase Service] Fallback to local simulator due to:", error.message);
    return null;
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
 * Test Firebase Connection
 */
export async function testFirebaseConnection(customUrl) {
  const dbUrl = (customUrl || getFirebaseUrl()).replace(/\/$/, "");
  try {
    const response = await fetch(`${dbUrl}/telemetry.json`);
    if (response.ok) {
      const data = await response.json();
      return { ok: true, hasData: data !== null, data };
    }
    return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
