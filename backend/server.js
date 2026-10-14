const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
//  HYDROSMART — IoT Hybrid Solar-Grid Hydroponics System
//  Backend Telemetry Simulator & API Server (Thesis Base)
// ═══════════════════════════════════════════════════════════════

// --- Crop Profile Presets (Re-based on Thesis Table 2) ---
const cropProfiles = {
  lettuce: {
    name: 'Lettuce',
    targets: { 
      ph: { min: 5.5, max: 6.5, optimal: 6.0 }, 
      ec: { min: 1.2, max: 1.8, optimal: 1.5 }, // EC in mS/cm
      tds: { min: 600, max: 900, optimal: 750 }, // TDS Nutrients in ppm (mg/L)
      temp: { min: 18, max: 24, optimal: 21 }, 
      humidity: { min: 50, max: 70, optimal: 60 } 
    },
    stages: ['Seedling', 'Vegetative', 'Harvest']
  },
  pechay: {
    name: 'Pechay',
    targets: { 
      ph: { min: 6.0, max: 7.0, optimal: 6.5 }, 
      ec: { min: 1.5, max: 2.0, optimal: 1.8 }, // EC in mS/cm
      tds: { min: 750, max: 1000, optimal: 900 }, // TDS Nutrients in ppm (mg/L)
      temp: { min: 20, max: 30, optimal: 25 }, 
      humidity: { min: 60, max: 80, optimal: 70 } 
    },
    stages: ['Seedling', 'Vegetative', 'Harvest']
  },
  spinach: {
    name: 'Spinach',
    targets: { 
      ph: { min: 5.5, max: 6.6, optimal: 6.0 }, 
      ec: { min: 1.8, max: 2.3, optimal: 2.1 }, // EC in mS/cm
      tds: { min: 900, max: 1150, optimal: 1050 }, // TDS Nutrients in ppm (mg/L)
      temp: { min: 15, max: 24, optimal: 20 }, 
      humidity: { min: 45, max: 65, optimal: 55 } 
    },
    stages: ['Seedling', 'Vegetative', 'Harvest']
  },
  basil: {
    name: 'Basil',
    targets: {
      ph: { min: 5.5, max: 6.5, optimal: 6.0 },
      ec: { min: 1.0, max: 1.6, optimal: 1.4 },
      tds: { min: 500, max: 800, optimal: 700 },
      temp: { min: 20, max: 28, optimal: 24 },
      humidity: { min: 50, max: 70, optimal: 60 }
    },
    stages: ['Seedling', 'Vegetative', 'Harvest']
  }
};

// --- Active State ---
let activeCrop = 'lettuce';
let activeStage = 'Vegetative';

// --- Sensor Telemetry (Re-based on Thesis Sensors: DHT22, DS18B20, pH, TDS/EC, Ultrasonic) ---
// Decimal precision preserved (no unnecessary Math.round)
let sensors = {
  ph: 6.20,            // Analog pH Sensor
  ec: 1.50,            // Analog EC Sensor (mS/cm)
  tds: 750.00,         // TDS Nutrients (ppm / mg/L)
  waterTemp: 21.50,    // DS18B20 Water Temperature
  airTemp: 24.50,      // DHT22 Air Temperature
  humidity: 62.00,     // DHT22 Humidity
  waterLevel: 85.00    // Ultrasonic Tank Level (%) or cm
};

// --- Energy System (100W Solar + Battery + Grid Scheduler) ---
let energy = {
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
  // Relay Prioritization Load Scheduling
  pumpPriority: ['Water Pump', 'Grow Lights', 'Exhaust Fan', 'Peristaltic Pumps'],
  // INA219 Current/Voltage/Power Sensor readings
  ina219: {
    busVoltage: 12.1,      // V (bus voltage at load)
    shuntVoltage: 89.0,    // mV (across shunt resistor)
    current: 890,          // mA
    power: 10.8,           // W
    energyToday: 0.124     // kWh consumed today
  }
};

// --- MLP Dosing Outputs (Nutrient A/B, pH Up/Down peristaltics) ---
// Tracks independent lastPumped timestamps for each nutrient and pH solution
let dosing = {
  nutrientA_ml: 2.4,
  nutrientB_ml: 1.8,
  phUp_ml: 0.0,
  phDown_ml: 0.6,
  mlpConfidence: 94.2,
  lastInference: new Date().toISOString(),
  manualOverride: false,
  lastPumped: {
    nutrientA: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    nutrientB: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    phUp: new Date(Date.now() - 135 * 60 * 1000).toISOString(),
    phDown: new Date(Date.now() - 38 * 60 * 1000).toISOString()
  }
};

// --- Hardware Relay Overrides ---
let overrides = {
  waterPump: true,
  growLights: true,
  exhaustFan: false,
  dosingPumps: true // nutrient peristaltic relays
};

// --- Historical Sensor Logs (Append-only: never overwrite or delete previous readings) ---
let sensorLogs = [];

// --- Historical Pumping Activity Logs (Append-only: tracks true pump activations) ---
let pumpingLogs = [];

function initHistoricalLogs() {
  const now = Date.now();
  // Seed past 24 hourly sensor readings with precise decimals
  for (let i = 24; i >= 0; i--) {
    const t = new Date(now - i * 3600 * 1000);
    const ec = +(1.2 + (Math.sin(i) * 0.3) + 0.3).toFixed(2);
    const ph = +(5.8 + (Math.cos(i) * 0.4) + 0.3).toFixed(2);
    const tds = +(ec * 500).toFixed(2);
    const waterTemp = +(21.0 + Math.sin(i * 0.5) * 2.5).toFixed(2);
    const airTemp = +(24.0 + Math.cos(i * 0.5) * 3.5).toFixed(2);
    const humidity = +(60.0 + Math.sin(i) * 8.0).toFixed(2);
    const waterLevel = +(82.0 + Math.cos(i) * 5.0).toFixed(2);

    sensorLogs.push({
      id: `sensor-init-${i}`,
      timestamp: t.getTime(),
      date: t.toISOString().slice(0, 10),
      time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ph,
      ec,
      tds,
      waterTemp,
      airTemp,
      humidity,
      waterLevel
    });
  }

  // Seed pumping activity logs with distinct historical pump events
  pumpingLogs = [
    {
      id: 'pump-init-1',
      timestamp: now - 38 * 60 * 1000,
      pump: 'ph_down',
      pumpLabel: 'pH-Down',
      type: 'ph',
      direction: 'down',
      dosage: '0.6 mL',
      approx_ml: 0.6,
      action: 'pH Down Applied',
      details: 'pH 6.80 above target optimal 6.00 (-0.6 mL dosed)',
      pH: 6.80,
      tds: 750.00
    },
    {
      id: 'pump-init-2',
      timestamp: now - 12 * 60 * 1000,
      pump: 'nutrient_b',
      pumpLabel: 'Nutrient B',
      type: 'nutrient',
      direction: null,
      dosage: '1.8 mL',
      approx_ml: 1.8,
      action: 'Nutrient B Dosed',
      details: 'Replenishment cycle: Monitored at 695.00 ppm (Target: 750 ppm)',
      pH: 6.20,
      tds: 695.00
    },
    {
      id: 'pump-init-3',
      timestamp: now - 12 * 60 * 1000,
      pump: 'nutrient_a',
      pumpLabel: 'Nutrient A',
      type: 'nutrient',
      direction: null,
      dosage: '2.4 mL',
      approx_ml: 2.4,
      action: 'Nutrient A Dosed',
      details: 'Automated TDS Nutrients Dosing: 695.00 ppm (Target: 750 ppm)',
      pH: 6.20,
      tds: 695.00
    },
    {
      id: 'pump-init-4',
      timestamp: now - 135 * 60 * 1000,
      pump: 'ph_up',
      pumpLabel: 'pH-Up',
      type: 'ph',
      direction: 'up',
      dosage: '0.8 mL',
      approx_ml: 0.8,
      action: 'pH Up Applied',
      details: 'pH 5.40 below target optimal 6.00 (+0.8 mL dosed)',
      pH: 5.40,
      tds: 745.00
    }
  ];
}
initHistoricalLogs();

// --- Historical Data for Charts ---
let history = [];
function initHistory() {
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600 * 1000);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const ec = +(1.1 + Math.random() * 0.8).toFixed(2);
    history.push({
      time: timeStr,
      ph: +(5.8 + Math.random() * 0.6).toFixed(2),
      ec: ec,
      tds: +(ec * 500).toFixed(2),
      waterTemp: +(20 + Math.random() * 3).toFixed(2),
      airTemp: +(22 + Math.random() * 4).toFixed(2),
      waterLevel: +(80 + Math.random() * 10).toFixed(2),
      batterySoC: Math.round(60 + Math.random() * 30),
      solarPower: +(15 + Math.random() * 15).toFixed(1)
    });
  }
}
initHistory();

// ═══════════════════════════════════════════════════════════════
//  LIVE SIMULATION LOOP (3-second intervals)
// ═══════════════════════════════════════════════════════════════
setInterval(() => {
  const profile = cropProfiles[activeCrop];
  const targets = profile.targets;

  // Sensor fluctuation — preserve full decimal precision
  sensors.ph = +Math.max(4.5, Math.min(8.5, sensors.ph + (Math.random() - 0.5) * 0.04)).toFixed(2);
  sensors.ec = +Math.max(0.4, Math.min(3.2, sensors.ec + (Math.random() - 0.5) * 0.03)).toFixed(2);
  sensors.tds = +(sensors.ec * 500).toFixed(2); // Preserve exact decimals
  sensors.waterTemp = +Math.max(15, Math.min(35, sensors.waterTemp + (Math.random() - 0.5) * 0.1)).toFixed(2);
  sensors.airTemp = +Math.max(15, Math.min(38, sensors.airTemp + (Math.random() - 0.5) * 0.15)).toFixed(2);
  sensors.humidity = +Math.max(30, Math.min(95, sensors.humidity + (Math.random() - 0.5) * 0.8)).toFixed(2);
  sensors.waterLevel = +Math.max(40, Math.min(100, sensors.waterLevel + (Math.random() - 0.5) * 0.4)).toFixed(2);

  // Energy simulation (100W Solar panels limit)
  const hour = new Date().getHours();
  const isDaylight = hour >= 6 && hour <= 18;

  if (isDaylight) {
    energy.solarVoltage = +(16 + Math.random() * 4).toFixed(1);
    energy.solarCurrent = Math.round(600 + Math.random() * 1000); // Solar mA
    energy.solarPower = +(energy.solarVoltage * energy.solarCurrent / 1000).toFixed(1); // W (under 100W)
    energy.chargingState = 'solar';
    energy.batterySoC = Math.min(100, energy.batterySoC + (Math.random() > 0.6 ? 0.3 : 0));
  } else {
    energy.solarVoltage = +(0.1 + Math.random() * 0.3).toFixed(1);
    energy.solarCurrent = Math.round(Math.random() * 10);
    energy.solarPower = +(energy.solarVoltage * energy.solarCurrent / 1000).toFixed(2);
    energy.chargingState = energy.batterySoC < 30 ? 'grid' : 'battery';
    energy.batterySoC = Math.max(5, energy.batterySoC - (Math.random() > 0.5 ? 0.2 : 0));
  }

  energy.batterySoC = +energy.batterySoC.toFixed(1);
  energy.loadVoltage = +(11.6 + Math.random() * 0.8).toFixed(1);
  energy.loadCurrent = Math.round(500 + Math.random() * 400);
  energy.loadPower = +(energy.loadVoltage * energy.loadCurrent / 1000).toFixed(1);
  energy.gridActive = energy.chargingState === 'grid';
  energy.loadShedding = energy.batterySoC < 25;

  // INA219 live readings (mirrors load telemetry with shunt voltage detail)
  energy.ina219.busVoltage = energy.loadVoltage;
  energy.ina219.shuntVoltage = +(energy.loadCurrent * 0.1).toFixed(1);  // 0.1Ω shunt
  energy.ina219.current = energy.loadCurrent;
  energy.ina219.power = energy.loadPower;
  energy.ina219.energyToday = +(energy.ina219.energyToday + energy.loadPower / (1000 * 1200)).toFixed(4);

  // MLP dosing recalculation (simulated)
  if (!dosing.manualOverride) {
    const phError = targets.ph.optimal - sensors.ph;
    const ecError = targets.ec.optimal - sensors.ec;

    dosing.nutrientA_ml = +Math.max(0, (ecError * 3.0 + 1.2 + Math.random() * 0.2)).toFixed(1);
    dosing.nutrientB_ml = +Math.max(0, (ecError * 2.0 + 0.8 + Math.random() * 0.15)).toFixed(1);
    dosing.phUp_ml = phError > 0.1 ? +(phError * 1.0 + Math.random() * 0.15).toFixed(1) : 0;
    dosing.phDown_ml = phError < -0.1 ? +(Math.abs(phError) * 0.8 + Math.random() * 0.1).toFixed(1) : 0;
    dosing.mlpConfidence = +(89 + Math.random() * 9).toFixed(1);
    dosing.lastInference = new Date().toISOString();

    // Occasional simulated peristaltic pump activation event:
    // Update ONLY the timestamp of the specific pump that was actually activated!
    if (Math.random() < 0.08) {
      const nowTs = Date.now();
      const nowIso = new Date(nowTs).toISOString();

      if (dosing.phUp_ml > 0 && Math.random() > 0.5) {
        // pH-UP pump actually activated
        dosing.lastPumped.phUp = nowIso;
        pumpingLogs.unshift({
          id: `pump-${nowTs}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: nowTs,
          pump: 'ph_up',
          pumpLabel: 'pH-Up',
          type: 'ph',
          direction: 'up',
          dosage: `${dosing.phUp_ml} mL`,
          approx_ml: dosing.phUp_ml,
          action: 'pH Up Applied',
          details: `pH ${sensors.ph} below optimal target ${targets.ph.optimal} (+${dosing.phUp_ml} mL dosed)`,
          pH: sensors.ph,
          tds: sensors.tds
        });
      } else if (dosing.phDown_ml > 0 && Math.random() > 0.5) {
        // pH-DOWN pump actually activated
        dosing.lastPumped.phDown = nowIso;
        pumpingLogs.unshift({
          id: `pump-${nowTs}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: nowTs,
          pump: 'ph_down',
          pumpLabel: 'pH-Down',
          type: 'ph',
          direction: 'down',
          dosage: `${dosing.phDown_ml} mL`,
          approx_ml: dosing.phDown_ml,
          action: 'pH Down Applied',
          details: `pH ${sensors.ph} above optimal target ${targets.ph.optimal} (-${dosing.phDown_ml} mL dosed)`,
          pH: sensors.ph,
          tds: sensors.tds
        });
      } else if (dosing.nutrientA_ml > 0 && Math.random() > 0.6) {
        // Nutrient A pump actually activated
        dosing.lastPumped.nutrientA = nowIso;
        pumpingLogs.unshift({
          id: `pump-${nowTs}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: nowTs,
          pump: 'nutrient_a',
          pumpLabel: 'Nutrient A',
          type: 'nutrient',
          direction: null,
          dosage: `${dosing.nutrientA_ml} mL`,
          approx_ml: dosing.nutrientA_ml,
          action: 'Nutrient A Dosed',
          details: `TDS ${sensors.tds} ppm below target (A dosed +${dosing.nutrientA_ml} mL)`,
          pH: sensors.ph,
          tds: sensors.tds
        });
      } else if (dosing.nutrientB_ml > 0 && Math.random() > 0.6) {
        // Nutrient B pump actually activated
        dosing.lastPumped.nutrientB = nowIso;
        pumpingLogs.unshift({
          id: `pump-${nowTs}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: nowTs,
          pump: 'nutrient_b',
          pumpLabel: 'Nutrient B',
          type: 'nutrient',
          direction: null,
          dosage: `${dosing.nutrientB_ml} mL`,
          approx_ml: dosing.nutrientB_ml,
          action: 'Nutrient B Dosed',
          details: `TDS ${sensors.tds} ppm below target (B dosed +${dosing.nutrientB_ml} mL)`,
          pH: sensors.ph,
          tds: sensors.tds
        });
      }
    }
  }

  // Preserve historical sensor readings: append each reading without overwriting
  const nowTime = new Date();
  const timeStr = nowTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = nowTime.toISOString().slice(0, 10);
  
  sensorLogs.push({
    id: `sensor-${nowTime.getTime()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: nowTime.getTime(),
    date: dateStr,
    time: timeStr,
    ph: sensors.ph,
    ec: sensors.ec,
    tds: sensors.tds,
    waterTemp: sensors.waterTemp,
    airTemp: sensors.airTemp,
    humidity: sensors.humidity,
    waterLevel: sensors.waterLevel
  });

  // Chart history
  if (Math.random() > 0.85) {
    history.push({
      time: timeStr.slice(0, 5),
      ph: sensors.ph,
      ec: sensors.ec,
      tds: sensors.tds,
      waterTemp: sensors.waterTemp,
      airTemp: sensors.airTemp,
      waterLevel: sensors.waterLevel,
      batterySoC: energy.batterySoC,
      solarPower: energy.solarPower
    });
    if (history.length > 50) history.shift();
  }
}, 3000);

// ═══════════════════════════════════════════════════════════════
//  REST API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET full system state including sensor and pumping logs
app.get('/api/telemetry', (req, res) => {
  res.json({
    sensors,
    energy,
    dosing,
    overrides,
    activeCrop,
    activeStage,
    cropProfile: cropProfiles[activeCrop],
    history,
    pumpingLogs: pumpingLogs.slice(0, 50),
    sensorLogs: sensorLogs.slice(-100).reverse() // newest accessible first
  });
});

// GET all historical sensor logs (chronological or newest first)
app.get('/api/sensor-logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const order = req.query.order || 'desc'; // 'desc' = newest first
  const logs = order === 'desc' 
    ? [...sensorLogs].reverse().slice(0, limit) 
    : sensorLogs.slice(-limit);
  res.json({
    total: sensorLogs.length,
    returned: logs.length,
    logs
  });
});

// GET all historical pumping logs
app.get('/api/pumping-logs', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json({
    total: pumpingLogs.length,
    returned: Math.min(limit, pumpingLogs.length),
    logs: pumpingLogs.slice(0, limit)
  });
});

// POST manually trigger a pump activation (for testing/verification)
app.post('/api/dosing/trigger-pump', (req, res) => {
  const { pump, amount } = req.body; // 'nutrientA' | 'nutrientB' | 'phUp' | 'phDown'
  const pumpMapping = {
    nutrientA: { key: 'nutrient_a', label: 'Nutrient A', type: 'nutrient', direction: null, action: 'Nutrient A Dosed' },
    nutrientB: { key: 'nutrient_b', label: 'Nutrient B', type: 'nutrient', direction: null, action: 'Nutrient B Dosed' },
    phUp: { key: 'ph_up', label: 'pH-Up', type: 'ph', direction: 'up', action: 'pH Up Applied' },
    phDown: { key: 'ph_down', label: 'pH-Down', type: 'ph', direction: 'down', action: 'pH Down Applied' }
  };

  if (!pumpMapping[pump]) {
    return res.status(400).json({ error: 'Invalid pump. Must be nutrientA, nutrientB, phUp, or phDown.' });
  }

  const nowTs = Date.now();
  const nowIso = new Date(nowTs).toISOString();
  
  // Update ONLY the timestamp for this specific pump
  dosing.lastPumped[pump] = nowIso;

  const info = pumpMapping[pump];
  const dosedAmount = amount || 1.5;

  pumpingLogs.unshift({
    id: `pump-manual-${nowTs}`,
    timestamp: nowTs,
    pump: info.key,
    pumpLabel: info.label,
    type: info.type,
    direction: info.direction,
    dosage: `${dosedAmount} mL`,
    approx_ml: dosedAmount,
    action: info.action,
    details: `Manual trigger of ${info.label}: ${dosedAmount} mL applied`,
    pH: sensors.ph,
    tds: sensors.tds
  });

  console.log(`[HydroSmart] Pump '${info.label}' triggered manually at ${nowIso}.`);
  res.json({ success: true, pump, lastPumped: dosing.lastPumped, log: pumpingLogs[0] });
});

// GET all crop profiles
app.get('/api/crop-profiles', (req, res) => {
  res.json(cropProfiles);
});

// POST select crop profile
app.post('/api/crop-profile', (req, res) => {
  const { crop, stage } = req.body;
  if (cropProfiles[crop]) {
    activeCrop = crop;
    if (stage) activeStage = stage;
    console.log(`[HydroSmart] Crop profile set to: ${cropProfiles[crop].name} (${activeStage})`);
    res.json({ success: true, activeCrop, activeStage, cropProfile: cropProfiles[crop] });
  } else {
    res.status(400).json({ error: 'Invalid crop profile' });
  }
});

// POST hardware override
app.post('/api/override', (req, res) => {
  const { device, state } = req.body;
  if (overrides.hasOwnProperty(device)) {
    overrides[device] = !!state;
    console.log(`[HydroSmart] Override '${device}' → ${overrides[device]}`);
    res.json({ success: true, overrides });
  } else {
    res.status(400).json({ error: 'Invalid device' });
  }
});

// POST dosing manual override toggle
app.post('/api/dosing/override', (req, res) => {
  const { manualOverride } = req.body;
  dosing.manualOverride = !!manualOverride;
  console.log(`[HydroSmart] MLP dosing manual override: ${dosing.manualOverride}`);
  res.json({ success: true, dosing });
});

const path = require('path');

// Serve static assets in production (React/Vite build folder is sibling to backend folder)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback all other routes to frontend SPA router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start
app.listen(PORT, () => {
  console.log(`═══════════════════════════════════════════════`);
  console.log(`  HYDROSMART Backend — Port ${PORT}`);
  console.log(`  IoT Off-Grid Hybrid Solar-Grid Hydroponics`);
  console.log(`═══════════════════════════════════════════════`);
});
