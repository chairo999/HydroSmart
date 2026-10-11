// Crop image mapping (reusing existing assets in public/images)
export const CROP_IMAGES = {
  lettuce: '/images/crop-lettuce.png',
  pechay: '/images/crop-pechay.png',
  spinach: '/images/crop-spinach.png',
  basil: '/images/crop-basil.png'
};

export const CROP_SPECIES = {
  lettuce: 'Lactuca sativa',
  pechay: 'Brassica rapa ssp. chinensis',
  spinach: 'Spinacia oleracea',
  basil: 'Ocimum basilicum'
};

export const CROP_EMOJI = {
  lettuce: '🥬',
  pechay: '🥬',
  spinach: '🌿',
  basil: '🌱'
};

export const SUPPORTED_CROPS = ['lettuce', 'pechay', 'spinach', 'basil'];

// Comprehensive Crop Cultivation & Maturity Details
export const CROP_DETAILS = {
  lettuce: {
    key: 'lettuce',
    name: 'Lettuce',
    species: 'Lactuca sativa',
    emoji: '🥬',
    image: '/images/crop-lettuce.png',
    maturityDays: 30,
    phRange: '5.5 - 6.5',
    tdsRange: '600 - 900 ppm',
    tempRange: '18°C - 24°C',
    color: '#10b981',
    milestones: [
      { day: 7, label: 'Seedling Cotyledon' },
      { day: 16, label: 'Vegetative Rosette' },
      { day: 24, label: 'Head Maturation' },
      { day: 30, label: 'Harvest Ready' }
    ]
  },
  pechay: {
    key: 'pechay',
    name: 'Pechay',
    species: 'Brassica rapa ssp. chinensis',
    emoji: '🥬',
    image: '/images/crop-pechay.png',
    maturityDays: 25,
    phRange: '6.0 - 7.0',
    tdsRange: '750 - 1000 ppm',
    tempRange: '20°C - 30°C',
    color: '#06b6d4',
    milestones: [
      { day: 5, label: 'Sprouting Emergence' },
      { day: 12, label: 'Foliage Expansion' },
      { day: 19, label: 'Petiole Development' },
      { day: 25, label: 'Harvest Ready' }
    ]
  },
  spinach: {
    key: 'spinach',
    name: 'Spinach',
    species: 'Spinacia oleracea',
    emoji: '🌿',
    image: '/images/crop-spinach.png',
    maturityDays: 35,
    phRange: '5.5 - 6.6',
    tdsRange: '900 - 1150 ppm',
    tempRange: '15°C - 24°C',
    color: '#f59e0b',
    milestones: [
      { day: 8, label: 'True Leaves' },
      { day: 18, label: 'Canopy Formation' },
      { day: 28, label: 'Mature Foliage' },
      { day: 35, label: 'Harvest Ready' }
    ]
  },
  basil: {
    key: 'basil',
    name: 'Basil',
    species: 'Ocimum basilicum',
    emoji: '🌱',
    image: '/images/crop-basil.png',
    maturityDays: 35,
    phRange: '5.5 - 6.5',
    tdsRange: '500 - 800 ppm',
    tempRange: '20°C - 28°C',
    color: '#8b5cf6',
    milestones: [
      { day: 7, label: 'Seedling Sprout' },
      { day: 17, label: 'Node Branching' },
      { day: 27, label: 'Aromatic Leaf Peak' },
      { day: 35, label: 'Harvest Ready' }
    ]
  }
};

// Static Greenhouse Bays Layout with Cultivation Dates and Stages
export const GREENHOUSE_SECTIONS = [
  { id: 1, name: 'Bay 1', cropKey: 'spinach', baseHealth: 98, x: 20, y: 30, area: '25 m²', plantedDate: '2026-09-22', stage: 'Vegetative' },
  { id: 2, name: 'Bay 2', cropKey: 'lettuce', baseHealth: 78, x: 40, y: 35, area: '28 m²', plantedDate: '2026-09-28', stage: 'Vegetative' },
  { id: 3, name: 'Bay 3', cropKey: 'basil', baseHealth: 94, x: 62, y: 35, area: '30 m²', plantedDate: '2026-10-02', stage: 'Seedling' },
  { id: 4, name: 'Bay 4', cropKey: 'pechay', baseHealth: 88, x: 73, y: 45, area: '22 m²', plantedDate: '2026-09-18', stage: 'Harvest' },
  { id: 5, name: 'Bay 5', cropKey: 'lettuce', baseHealth: 95, x: 35, y: 45, area: '32 m²', plantedDate: '2026-09-25', stage: 'Vegetative' },
  { id: 6, name: 'Bay 6', cropKey: 'spinach', baseHealth: 91, x: 44, y: 60, area: '24 m²', plantedDate: '2026-09-15', stage: 'Harvest' },
  { id: 7, name: 'Bay 7', cropKey: 'pechay', baseHealth: 73, x: 90, y: 60, area: '26 m²', plantedDate: '2026-10-01', stage: 'Vegetative' },
  { id: 8, name: 'Bay 8', cropKey: 'basil', baseHealth: 93, x: 35, y: 25, area: '35 m²', plantedDate: '2026-09-20', stage: 'Vegetative' }
];

// Helper to format dates cleanly in Asia/Manila context
export const formatShortDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Manila'
  });
};
