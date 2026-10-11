// Firebase Realtime Database REST Integration Service
// Connects HydroSmart dashboard directly to Firebase Realtime Database
// via lightweight REST API without heavy SDK dependencies.

// User project ID: hydrosmart-sensor-data
export const DEFAULT_FIREBASE_DB_URL = "https://hydrosmart-sensor-data-default-rtdb.firebaseio.com";

// Check local storage for runtime configuration
export function getFirebaseUrl() {
  return localStorage.getItem('hydrosmart_firebase_url') || DEFAULT_FIREBASE_DB_URL;
}

export function isFirebaseEnabled() {
  const stored = localStorage.getItem('hydrosmart_use_firebase');
  // Enabled by default if user desires, or can be toggled
  return stored !== null ? stored === 'true' : true;
}

export const USE_FIREBASE = isFirebaseEnabled();

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
