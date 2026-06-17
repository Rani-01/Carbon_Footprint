/**
 * EcoTrace Carbon Footprint Calculator Utilities
 * 
 * This module defines the carbon emission coefficients (in kg CO2e)
 * and calculation functions for baseline and logged activity metrics.
 * 
 * Supports both browser (global/ES6) and Node.js (CommonJS) environments.
 */

// Core Carbon Coefficients (kg CO2e)
const COEFFICIENTS = {
  // Daily baseline components (kg CO2e/day)
  diet: {
    vegan: 1.5,
    vegetarian: 2.5,
    flexitarian: 3.8,
    carnivore: 5.8
  },
  transit: {
    walking_biking: 0.0,
    public_transit: 0.8, // 20km average at 0.04 kg/km
    electric_vehicle: 1.0, // 20km average at 0.05 kg/km
    petrol_diesel_car: 4.0 // 20km average at 0.20 kg/km
  },
  housing: {
    studio_apartment: 2.0,
    medium_house: 4.5,
    large_house: 7.0
  },
  countryMultipliers: {
    usa: 1.2,
    eu: 0.9,
    india: 1.1,
    other: 1.0
  },

  // Logged activity factors (kg CO2e per unit)
  activities: {
    transport: {
      car_petrol: 0.20,      // per km
      bus_train: 0.04,       // per km
      carpool: 0.10,         // per km
      walking_biking: 0.0    // per km (saves 0.20 per km relative to driving)
    },
    food: {
      meat: 2.0,             // per meal
      vegetarian: 0.8,       // per meal
      vegan: 0.4             // per meal
    },
    energy: {
      electricity: 0.45,     // per kWh
      heating_cooling: 1.5   // per hour
    },
    consumption: {
      new_item: 5.0          // per purchased clothing/item
    }
  },

  // Quick Action savings (kg CO2e avoided)
  quickActions: {
    plant_based_meal: -1.2,   // Avoided meat meal (2.0 - 0.8)
    public_transit_swap: -1.6, // Swap 10km drive (2.0) with bus (0.4)
    unplug_appliances: -0.5,  // Standby power saved
    reusable_bag_mug: -0.2    // Avoided plastic/paper single-use
  }
};

/**
 * Calculates the initial daily baseline carbon footprint based on onboarding context.
 * 
 * Formula: (diet + transit + housing) * countryMultiplier
 * 
 * @param {Object} context 
 * @param {string} context.dietType - 'vegan', 'vegetarian', 'flexitarian', 'carnivore'
 * @param {string} context.transitMode - 'walking_biking', 'public_transit', 'electric_vehicle', 'petrol_diesel_car'
 * @param {string} context.housingSize - 'studio_apartment', 'medium_house', 'large_house'
 * @param {string} context.country - 'usa', 'eu', 'india', 'other'
 * @returns {number} Initial daily baseline emissions in kg CO2e
 */
function calculateDailyBaseline(context) {
  const dietVal = context && context.dietType && COEFFICIENTS.diet[context.dietType] !== undefined
    ? COEFFICIENTS.diet[context.dietType] 
    : COEFFICIENTS.diet.carnivore;
    
  const transitVal = context && context.transitMode && COEFFICIENTS.transit[context.transitMode] !== undefined
    ? COEFFICIENTS.transit[context.transitMode] 
    : COEFFICIENTS.transit.petrol_diesel_car;
    
  const housingVal = context && context.housingSize && COEFFICIENTS.housing[context.housingSize] !== undefined
    ? COEFFICIENTS.housing[context.housingSize] 
    : COEFFICIENTS.housing.medium_house;
    
  const multiplierVal = context && context.country && COEFFICIENTS.countryMultipliers[context.country] !== undefined
    ? COEFFICIENTS.countryMultipliers[context.country] 
    : COEFFICIENTS.countryMultipliers.other;

  const rawBaseline = dietVal + transitVal + housingVal;
  return parseFloat((rawBaseline * multiplierVal).toFixed(2));
}

/**
 * Calculates the carbon footprint of a logged activity.
 * 
 * @param {string} category - 'transport', 'food', 'energy', 'consumption'
 * @param {string} type - specific type within the category
 * @param {number} value - numeric input (km, meals, kWh, items, hours)
 * @returns {number} Carbon footprint in kg CO2e
 */
function calculateActivityEmissions(category, type, value) {
  if (value < 0) return 0;
  
  const categoryFactors = COEFFICIENTS.activities[category];
  if (!categoryFactors) return 0;
  
  const factor = categoryFactors[type];
  if (factor === undefined) return 0;
  
  return parseFloat((factor * value).toFixed(2));
}

/**
 * Calculates the savings from a quick action or challenge.
 * 
 * @param {string} actionKey - Key from COEFFICIENTS.quickActions
 * @returns {number} Carbon saved in kg CO2e (negative value)
 */
function getQuickActionSavings(actionKey) {
  return COEFFICIENTS.quickActions[actionKey] || 0;
}

// Export module logic for both Node and Browser
const Calculator = {
  COEFFICIENTS,
  calculateDailyBaseline,
  calculateActivityEmissions,
  getQuickActionSavings
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculator;
} else {
  window.Calculator = Calculator;
}
