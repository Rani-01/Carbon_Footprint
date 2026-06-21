/**
 * EcoTrace Unit Tests
 * Verifies carbon calculation utilities using the standard Node.js assertion library.
 */

const assert = require('assert');

// Core Carbon Coefficients copied explicitly for isolated engine validation
const COEFFICIENTS = {
  diet: { vegan: 1.5, vegetarian: 2.5, flexitarian: 3.8, carnivore: 5.8 },
  transit: { walking_biking: 0.0, public_transit: 0.8, electric_vehicle: 1.0, petrol_diesel_car: 4.0 },
  housing: { studio_apartment: 2.0, medium_house: 4.5, large_house: 7.0 },
  countryMultipliers: { usa: 1.2, eu: 0.9, india: 1.1, other: 1.0 },
  activities: {
    transport: { car_petrol: 0.20, bus_train: 0.04, carpool: 0.10, walking_biking: 0.0 },
    food: { meat: 2.0, vegetarian: 0.8, vegan: 0.4 },
    energy: { electricity: 0.45, heating_cooling: 1.5 },
    consumption: { new_item: 5.0 }
  },
  quickActions: { plant_based_meal: -1.2, public_transit_swap: -1.6, unplug_appliances: -0.5, reusable_bag_mug: -0.2 }
};

function calculateDailyBaseline(context) {
  const dietVal = context && context.dietType && COEFFICIENTS.diet[context.dietType] !== undefined ? COEFFICIENTS.diet[context.dietType] : COEFFICIENTS.diet.carnivore;
  const transitVal = context && context.transitMode && COEFFICIENTS.transit[context.transitMode] !== undefined ? COEFFICIENTS.transit[context.transitMode] : COEFFICIENTS.transit.petrol_diesel_car;
  const housingVal = context && context.housingSize && COEFFICIENTS.housing[context.housingSize] !== undefined ? COEFFICIENTS.housing[context.housingSize] : COEFFICIENTS.housing.medium_house;
  const multiplierVal = context && context.country && COEFFICIENTS.countryMultipliers[context.country] !== undefined ? COEFFICIENTS.countryMultipliers[context.country] : COEFFICIENTS.countryMultipliers.other;
  return parseFloat(((dietVal + transitVal + housingVal) * multiplierVal).toFixed(2));
}

function calculateActivityEmissions(category, type, value) {
  if (value < 0 || isNaN(value)) return 0;
  const categoryFactors = COEFFICIENTS.activities[category];
  if (!categoryFactors) return 0;
  const factor = categoryFactors[type];
  return factor === undefined ? 0 : parseFloat((factor * value).toFixed(2));
}

function getQuickActionSavings(actionKey) {
  return COEFFICIENTS.quickActions[actionKey] || 0;
}

console.log('Starting EcoTrace Carbon Calculator Isolation Tests...\n');

try {
  // Test 1: Onboarding Daily Baseline Calculations
  console.log('Test 1: Onboarding Daily Baseline Calculations');
  
  const lowCarbonBaseline = calculateDailyBaseline({ dietType: 'vegan', transitMode: 'walking_biking', housingSize: 'studio_apartment', country: 'eu' });
  assert.strictEqual(lowCarbonBaseline, 3.15);
  console.log('✔ Case A: Low-Carbon baseline matches (3.15 kg CO2e)');

  const highCarbonBaseline = calculateDailyBaseline({ dietType: 'carnivore', transitMode: 'petrol_diesel_car', housingSize: 'large_house', country: 'usa' });
  assert.strictEqual(highCarbonBaseline, 20.16);
  console.log('✔ Case B: High-Carbon baseline matches (20.16 kg CO2e)');

  const emptyBaseline = calculateDailyBaseline({});
  assert.ok(emptyBaseline > 0);
  console.log('✔ Case C: Empty context fallback safely evaluated');

  // Test 2: Activity Log Calculations
  console.log('\nTest 2: Daily Logged Activities Emissions');

  assert.strictEqual(calculateActivityEmissions('transport', 'car_petrol', 15), 3.0);
  assert.strictEqual(calculateActivityEmissions('food', 'meat', 3), 6.0);
  assert.strictEqual(calculateActivityEmissions('energy', 'electricity', 12), 5.4);
  assert.strictEqual(calculateActivityEmissions('food', 'vegan', 0), 0);
  assert.strictEqual(calculateActivityEmissions('transport', 'car_petrol', -10), 0);
  assert.strictEqual(calculateActivityEmissions('unknown', 'car_petrol', 10), 0);
  console.log('✔ All standard activity emission calculations and boundary limits verified');

  // Test 3: Quick Action Savings
  console.log('\nTest 3: Quick Action Carbon Savings');
  
  assert.strictEqual(getQuickActionSavings('plant_based_meal'), -1.2);
  assert.strictEqual(getQuickActionSavings('public_transit_swap'), -1.6);
  assert.strictEqual(getQuickActionSavings('invalid_action'), 0);
  console.log('✔ Quick Action carbon calculation values mapped successfully');

  console.log('\n🎉 ALL ISOLATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ TEST SUITE RUNTIME EXCEPTION!');
  console.error(error);
  process.exit(1);
}