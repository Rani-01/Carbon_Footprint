/**
 * EcoTrace Challenges & Gamification Module
 * 
 * Manages weekly challenges, completion states, badge unlocks, and score point tallies.
 */

const DEFAULT_CHALLENGES = [
  {
    id: 'car_free_day',
    title: 'Car-Free Commuter',
    description: 'Walk, cycle, or use public transit for all travel today.',
    category: 'transport',
    carbonSaving: 4.0, // kg CO2e saved vs standard driving
    points: 50,
    completed: false
  },
  {
    id: 'meatless_monday',
    title: 'Plant-Based Feast',
    description: 'Eat 100% vegan or vegetarian meals for the entire day.',
    category: 'food',
    carbonSaving: 3.5, // kg CO2e saved vs average meat diet
    points: 40,
    completed: false
  },
  {
    id: 'unplug_standby',
    title: 'Phantom Power Slayer',
    description: 'Unplug chargers and appliances when not in use for a full day.',
    category: 'energy',
    carbonSaving: 1.0, // kg CO2e saved
    points: 20,
    completed: false
  },
  {
    id: 'local_shopper',
    title: 'Zero-Waste / Reusable Day',
    description: 'Avoid buying new plastics, and use reusable bags/mugs all day.',
    category: 'consumption',
    carbonSaving: 1.5, // kg CO2e saved
    points: 30,
    completed: false
  },
  {
    id: 'low_temp_wash',
    title: 'Cold Wash Campaign',
    description: 'Wash laundry in cold water (30°C or below) and air-dry it.',
    category: 'energy',
    carbonSaving: 2.2, // kg CO2e saved
    points: 35,
    completed: false
  }
];

const BADGES = [
  {
    id: 'first_step',
    name: 'Eco Seedling',
    description: 'Log your first daily carbon entry or complete your first challenge.',
    icon: '🌱',
    criteria: (stats) => stats.totalLogs > 0 || stats.completedCount > 0
  },
  {
    id: 'carbon_clipper',
    name: 'Carbon Clipper',
    description: 'Successfully stay below your target emissions for 3 entries.',
    icon: '✂️',
    criteria: (stats) => stats.daysBelowTarget >= 3
  },
  {
    id: 'transit_champion',
    name: 'Transit Champ',
    description: 'Complete the Car-Free Commuter challenge.',
    icon: '🚲',
    criteria: (stats) => stats.challengesCompleted.includes('car_free_day')
  },
  {
    id: 'green_gourmet',
    name: 'Green Gourmet',
    description: 'Complete the Plant-Based Feast challenge.',
    icon: '🥗',
    criteria: (stats) => stats.challengesCompleted.includes('meatless_monday')
  },
  {
    id: 'eco_warrior',
    name: 'Eco Warrior',
    description: 'Tally up 200 carbon reduction points.',
    icon: '🛡️',
    criteria: (stats) => stats.totalPoints >= 200
  },
  {
    id: 'eco_legend',
    name: 'Eco Legend',
    description: 'Reduce your overall carbon footprint by 50 kg CO2e in total savings.',
    icon: '👑',
    criteria: (stats) => stats.totalSavedCo2 >= 50.0
  }
];

/**
 * Initializes and retrieves user challenges from localStorage or sets defaults.
 */
function getChallenges() {
  const stored = localStorage.getItem('ecotrace_challenges');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse challenges, resetting to default', e);
    }
  }
  saveChallenges(DEFAULT_CHALLENGES);
  return DEFAULT_CHALLENGES;
}

/**
 * Saves challenges list to localStorage.
 */
function saveChallenges(challenges) {
  localStorage.setItem('ecotrace_challenges', JSON.stringify(challenges));
}

/**
 * Toggles a challenge completion state.
 * @param {string} id - Challenge ID
 * @returns {Object} Updated challenges list and whether state changed
 */
function toggleChallenge(id) {
  const challenges = getChallenges();
  const challenge = challenges.find(c => c.id === id);
  let justCompleted = false;

  if (challenge) {
    challenge.completed = !challenge.completed;
    justCompleted = challenge.completed;
    saveChallenges(challenges);
  }

  return { challenges, justCompleted, challenge };
}

/**
 * Checks stats and returns newly unlocked badges.
 * @param {Object} stats - User's cumulative stats
 * @returns {Array} List of unlocked badge objects
 */
function checkBadges(stats) {
  const currentUnlocked = JSON.parse(localStorage.getItem('ecotrace_unlocked_badges') || '[]');
  const newlyUnlocked = [];

  BADGES.forEach(badge => {
    if (!currentUnlocked.includes(badge.id)) {
      if (badge.criteria(stats)) {
        newlyUnlocked.push(badge);
        currentUnlocked.push(badge.id);
      }
    }
  });

  if (newlyUnlocked.length > 0) {
    localStorage.setItem('ecotrace_unlocked_badges', JSON.stringify(currentUnlocked));
  }

  return newlyUnlocked;
}

/**
 * Gets all badge requirements and unlock states.
 * @returns {Array} List of badge objects with an 'unlocked' boolean field
 */
function getBadgesStatus() {
  const unlockedIds = JSON.parse(localStorage.getItem('ecotrace_unlocked_badges') || '[]');
  return BADGES.map(badge => ({
    ...badge,
    unlocked: unlockedIds.includes(badge.id)
  }));
}

// Export for module/browser compatibility
const Challenges = {
  getChallenges,
  saveChallenges,
  toggleChallenge,
  checkBadges,
  getBadgesStatus
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Challenges;
} else {
  window.Challenges = Challenges;
}
