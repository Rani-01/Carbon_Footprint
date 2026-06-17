/**
 * EcoTrace Unit Tests
 * 
 * Verifies carbon calculation utilities using the standard Node.js assertion library.
 */

const assert = require('assert');
const Calculator = require('../js/calculator.js');

console.log('Starting EcoTrace Carbon Calculator Tests...\n');

try {
  // Test 1: Onboarding Baseline Calculations
  console.log('Test 1: Onboarding Daily Baseline Calculations');
  
  // Case A: Ideal Low Carbon (Vegan, Walking/Biking, Studio, EU multiplier 0.9)
  // Expected: (1.5 + 0.0 + 2.0) * 0.9 = 3.5 * 0.9 = 3.15
  const lowCarbonContext = {
    dietType: 'vegan',
    transitMode: 'walking_biking',
    housingSize: 'studio_apartment',
    country: 'eu'
  };
  const lowCarbonBaseline = Calculator.calculateDailyBaseline(lowCarbonContext);
  assert.strictEqual(lowCarbonBaseline, 3.15, `Expected 3.15, got ${lowCarbonBaseline}`);
  console.log('✔ Case A: Low-Carbon baseline is correct (3.15 kg CO2e)');

  // Case B: High Carbon (Carnivore, Petrol Car, Large House, USA multiplier 1.2)
  // Expected: (5.8 + 4.0 + 7.0) * 1.2 = 16.8 * 1.2 = 20.16
  const highCarbonContext = {
    dietType: 'carnivore',
    transitMode: 'petrol_diesel_car',
    housingSize: 'large_house',
    country: 'usa'
  };
  const highCarbonBaseline = Calculator.calculateDailyBaseline(highCarbonContext);
  assert.strictEqual(highCarbonBaseline, 20.16, `Expected 20.16, got ${highCarbonBaseline}`);
  console.log('✔ Case B: High-Carbon baseline is correct (20.16 kg CO2e)');

  // Case C: Average/Default Multipliers
  // Expected: (3.8 + 0.8 + 4.5) * 1.0 = 9.1 * 1.0 = 9.1
  const avgContext = {
    dietType: 'flexitarian',
    transitMode: 'public_transit',
    housingSize: 'medium_house',
    country: 'other'
  };
  const avgBaseline = Calculator.calculateDailyBaseline(avgContext);
  assert.strictEqual(avgBaseline, 9.1, `Expected 9.1, got ${avgBaseline}`);
  console.log('✔ Case C: Average baseline is correct (9.1 kg CO2e)');


  // Test 2: Activity Log Calculations
  console.log('\nTest 2: Daily Logged Activities Emissions');

  // Case A: Driving petrol car for 15 km (factor: 0.20/km)
  // Expected: 15 * 0.20 = 3.0
  const transportEmissions = Calculator.calculateActivityEmissions('transport', 'car_petrol', 15);
  assert.strictEqual(transportEmissions, 3.0, `Expected 3.0, got ${transportEmissions}`);
  console.log('✔ Transport Case: 15 km driving is correct (3.0 kg CO2e)');

  // Case B: 3 meat meals logged (factor: 2.0/meal)
  // Expected: 3 * 2.0 = 6.0
  const foodEmissions = Calculator.calculateActivityEmissions('food', 'meat', 3);
  assert.strictEqual(foodEmissions, 6.0, `Expected 6.0, got ${foodEmissions}`);
  console.log('✔ Food Case: 3 meat meals is correct (6.0 kg CO2e)');

  // Case C: Electricity usage of 12 kWh (factor: 0.45/kWh)
  // Expected: 12 * 0.45 = 5.4
  const energyEmissions = Calculator.calculateActivityEmissions('energy', 'electricity', 12);
  assert.strictEqual(energyEmissions, 5.4, `Expected 5.4, got ${energyEmissions}`);
  console.log('✔ Energy Case: 12 kWh electricity is correct (5.4 kg CO2e)');

  // Case D: Purchasing 2 new items (factor: 5.0/item)
  // Expected: 2 * 5.0 = 10.0
  const consumptionEmissions = Calculator.calculateActivityEmissions('consumption', 'new_item', 2);
  assert.strictEqual(consumptionEmissions, 10.0, `Expected 10.0, got ${consumptionEmissions}`);
  console.log('✔ Consumption Case: 2 new items is correct (10.0 kg CO2e)');

  // Case E: Invalid or negative values
  assert.strictEqual(Calculator.calculateActivityEmissions('transport', 'car_petrol', -10), 0);
  assert.strictEqual(Calculator.calculateActivityEmissions('unknown', 'car_petrol', 10), 0);
  assert.strictEqual(Calculator.calculateActivityEmissions('transport', 'spaceships', 10), 0);
  console.log('✔ Edge Cases: Negative values and invalid keys handled correctly');


  // Test 3: Quick Action Savings
  console.log('\nTest 3: Quick Action Carbon Savings');
  
  // Case A: Plant-based meal swap
  const plantMealSaving = Calculator.getQuickActionSavings('plant_based_meal');
  assert.strictEqual(plantMealSaving, -1.2, `Expected -1.2, got ${plantMealSaving}`);
  console.log('✔ Quick Action Case A: Plant-based meal savings correct (-1.2 kg CO2e)');

  // Case B: Public transit swap
  const transitSwapSaving = Calculator.getQuickActionSavings('public_transit_swap');
  assert.strictEqual(transitSwapSaving, -1.6, `Expected -1.6, got ${transitSwapSaving}`);
  console.log('✔ Quick Action Case B: Public transit swap savings correct (-1.6 kg CO2e)');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Carbon calculations are verified and accurate.');
} catch (error) {
  console.error('\n❌ TEST SUITE FAILED!');
  console.error(error);
  process.exit(1);
}
