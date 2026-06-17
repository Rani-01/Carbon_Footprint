/**
 * EcoTrace Smart AI Assistant Module
 * 
 * Simulates a context-aware eco-assistant. Analyzes user carbon footprint data,
 * handles custom queries, and offers contextual actionable recommendations.
 */

const ASSISTANT_NAME = "EcoTrace AI";

const GREETINGS = [
  "Hello! I am your EcoTrace Assistant. 🌿 How can I help you reduce your carbon footprint today?",
  "Hi there! Let's work together to green your routine. Check out your dashboard or ask me a question!",
  "Greetings! Ready to slash some CO2e today? Let me know what you want to focus on: Transport, Food, Energy, or Consumption."
];

/**
 * Returns a greeting message.
 */
function getGreeting() {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
}

/**
 * Analyzes the current dashboard metrics and returns a list of insights.
 * 
 * @param {Object} stats
 * @param {number} stats.baseline - Daily baseline emissions in kg CO2e
 * @param {number} stats.todayEmissions - Today's logged emissions in kg CO2e
 * @param {Object} stats.breakdown - Category breakdown { transport, food, energy, consumption }
 * @returns {string} Text analysis of user's current standing
 */
function generateDashboardInsight(stats) {
  if (!stats || !stats.baseline) {
    return "Complete the onboarding setup so I can analyze your daily baseline!";
  }

  const { baseline, todayEmissions, breakdown } = stats;
  const percentOfBaseline = Math.round((todayEmissions / baseline) * 100);

  let insight = `**Eco-Status Update:**\n`;
  insight += `Today's emissions are **${todayEmissions.toFixed(2)} kg CO2e**, which is **${percentOfBaseline}%** of your target baseline (**${baseline.toFixed(2)} kg CO2e**).\n\n`;

  // Find the highest emission category
  const categories = Object.keys(breakdown);
  let highestCategory = categories[0];
  let highestValue = breakdown[highestCategory] || 0;

  categories.forEach(cat => {
    if ((breakdown[cat] || 0) > highestValue) {
      highestCategory = cat;
      highestValue = breakdown[cat];
    }
  });

  if (todayEmissions === 0) {
    insight += "You haven't logged any activities yet today. Quick log your actions or enter custom logs to see your status!";
  } else if (todayEmissions > baseline) {
    insight += `⚠️ **Notice:** You are currently **above** your daily baseline. `;
    if (highestCategory === 'transport') {
      insight += `Your transport emissions (**${breakdown.transport.toFixed(2)} kg**) are the largest contributor. Can you swap a car ride for public transit or carpooling?`;
    } else if (highestCategory === 'food') {
      insight += `Food emissions (**${breakdown.food.toFixed(2)} kg**) are dominant today. Swapping a single meat dish for a plant-based alternative would shave off 1.2 to 1.6 kg of CO2e!`;
    } else if (highestCategory === 'energy') {
      insight += `Energy consumption (**${breakdown.energy.toFixed(2)} kg**) is running high. Try turning off devices at the plug or dialing down climate control.`;
    } else {
      insight += `Consumption is high (**${breakdown.consumption.toFixed(2)} kg**). Extending the life of your items and avoiding fast fashion is a major win.`;
    }
  } else {
    const savings = baseline - todayEmissions;
    insight += `🎉 **Awesome Work!** You are **${savings.toFixed(2)} kg CO2e** below your baseline! `;
    if (percentOfBaseline < 50) {
      insight += "You're doing exceptionally well—an elite carbon saver! Keep it up!";
    } else {
      insight += "You are on track to beat your daily footprint. Try to maintain this pace.";
    }
  }

  return insight;
}

/**
 * Evaluates a user chat message contextually using heuristic patterns.
 * 
 * @param {string} userMessage - Text input from user
 * @param {Object} stats - Current carbon metrics/stats
 * @returns {string} Response from assistant
 */
function processChatMessage(userMessage, stats = {}) {
  const query = userMessage.toLowerCase().trim();
  const breakdown = stats.breakdown || { transport: 0, food: 0, energy: 0, consumption: 0 };
  const baseline = stats.baseline || 10.0;
  const todayEmissions = stats.todayEmissions || 0;

  // 1. HELP / GENERAL INTENTS
  if (query.includes('help') || query.includes('what can you do') || query.includes('menu')) {
    return "I can analyze your footprint, answer environmental questions, and give customized reduction actions. Ask me things like:\n" +
           "- *'How can I reduce my food footprint?'*\n" +
           "- *'What is the carbon cost of driving a car?'*\n" +
           "- *'Summarize my day'*";
  }

  // 2. CONTEXTUAL SUMMARY REQUESTS
  if (query.includes('summary') || query.includes('status') || query.includes('how am i doing') || query.includes('report')) {
    return generateDashboardInsight(stats);
  }

  // 3. TRANSPORT TOPICS
  if (query.includes('transport') || query.includes('car') || query.includes('drive') || query.includes('bus') || query.includes('transit') || query.includes('bike') || query.includes('fly') || query.includes('flight')) {
    let response = "🚗 **Transit Insights:** Driving a typical petrol car emits about **0.20 kg CO2e/km**. In contrast, riding a train or bus emits only **0.04 kg CO2e/km**—an 80% reduction! \n\n";
    if (breakdown.transport > 0) {
      response += `Today, you logged **${breakdown.transport.toFixed(2)} kg CO2e** under transport. `;
      response += "If possible, try the *'Car-Free Commuter'* challenge today to drop this category to zero!";
    } else {
      response += "Currently, you have no transport emissions logged today. Fantastic job keeping your commute clean!";
    }
    return response;
  }

  // 4. FOOD TOPICS
  if (query.includes('food') || query.includes('eat') || query.includes('meat') || query.includes('diet') || query.includes('vegan') || query.includes('vegetarian') || query.includes('beef') || query.includes('chicken')) {
    let response = "🥗 **Food & Diet Insights:** The global food system accounts for nearly 26% of emissions. Specifically, animal products have high carbon intensity: \n" +
                   "- **Meat Meal:** ~2.0 kg CO2e\n" +
                   "- **Vegetarian Meal:** ~0.8 kg CO2e\n" +
                   "- **Vegan Meal:** ~0.4 kg CO2e\n\n";
    if (breakdown.food > 0) {
      response += `Your logged food emissions are **${breakdown.food.toFixed(2)} kg CO2e** today. `;
      response += "Try swapping one beef/pork dish with lentils, tofu, or veggies to save over 1.2 kg CO2e instantly!";
    } else {
      response += "You haven't logged any meals today. Logging a vegan or vegetarian meal is an easy way to build points!";
    }
    return response;
  }

  // 5. ENERGY TOPICS
  if (query.includes('energy') || query.includes('electricity') || query.includes('power') || query.includes('unplug') || query.includes('appliance') || query.includes('heat') || query.includes('ac') || query.includes('cool')) {
    let response = "⚡ **Energy & Utility Insights:** Grid electricity emissions vary, but average around **0.45 kg CO2e/kWh**. Standby power (vampire load) accounts for up to 10% of household energy. \n\n" +
                   "**Actionable Tips:**\n" +
                   "1. Dial your heating down (or AC up) by 1°C to reduce usage by 5-10%.\n" +
                   "2. Unplug power strips when going to bed.\n" +
                   "3. Run laundry at 30°C to cut heating energy by 60%.\n\n";
    if (breakdown.energy > 0) {
      response += `Your logged energy emissions are **${breakdown.energy.toFixed(2)} kg CO2e** today.`;
    }
    return response;
  }

  // 6. CONSUMPTION TOPICS
  if (query.includes('consumption') || query.includes('shop') || query.includes('buy') || query.includes('item') || query.includes('purchase') || query.includes('clothing') || query.includes('fast fashion') || query.includes('plastic')) {
    let response = "🛍️ **Consumption & Waste Insights:** Every new item carries embodied carbon from extraction, manufacture, and shipping. Buying a single new t-shirt emits ~5 kg CO2e, and a pair of jeans emits ~15-20 kg CO2e! \n\n" +
                   "**Actionable Tips:**\n" +
                   "1. Buy secondhand or swap clothes with friends.\n" +
                   "2. Focus on high-quality, durable items.\n" +
                   "3. Refuse single-use bags/cups. It saves plastic and saves **0.2 kg CO2e** per action.\n\n";
    if (breakdown.consumption > 0) {
      response += `Your logged consumption emissions are **${breakdown.consumption.toFixed(2)} kg CO2e** today.`;
    }
    return response;
  }

  // 7. HELLO & GREETINGS
  if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('greetings')) {
    return `Hey there! How's your eco-journey going? Your current baseline targets **${baseline.toFixed(2)} kg CO2e** per day. What are you looking to optimize right now?`;
  }

  // 8. BADGES & GAMIFICATION
  if (query.includes('badge') || query.includes('point') || query.includes('level') || query.includes('rank') || query.includes('challenge')) {
    return "🏆 **Gamification Info:** You earn points by completing Weekly Challenges (20-50 pts each) or quick eco-actions. Cumulative points unlock special badges like **Eco Seedling** 🌱 or **Eco Legend** 👑. Check the badges section on your dashboard to see what is unlocked!";
  }

  // 9. FALLBACK RESPONSES
  return "That is an interesting question! Did you know that if everyone shifted to a plant-forward diet and halved their car usage, we could cut global personal emissions by over 40%? \n\n" +
         "Ask me about **Transport, Food, Energy, or Consumption** for specific tips, or ask for a **'summary'** of your day!";
}

// Export for module/browser compatibility
const AiAssistant = {
  ASSISTANT_NAME,
  getGreeting,
  generateDashboardInsight,
  processChatMessage
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AiAssistant;
} else {
  window.AiAssistant = AiAssistant;
}
