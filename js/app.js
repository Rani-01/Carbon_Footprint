/**
 * EcoTrace Frontend Orchestrator
 * 
 * Manages UI rendering, state synchronization with localStorage, modal flows,
 * event routing, and integrates calculator, challenges, and AI assistant modules.
 */

// Global State
let state = {
  onboarding: null, // { dietType, transitMode, housingSize, country }
  logs: [],         // Array of { id, category, type, value, carbon, timestamp, label }
  points: 0,
  totalSavedCo2: 0.0,
  challenges: [],
  badges: [],
  chatHistory: []   // Array of { sender: 'user'|'ai', text: string }
};

// Helper: Get date string (YYYY-MM-DD)
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format date for display
function formatDate(dateStr) {
  const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateStr).toLocaleDateString('en-US', options);
}

// Toast Notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-500 transform translate-y-2 opacity-0 glass-panel ${
    type === 'success' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'
  }`;

  const icon = type === 'success' ? '🏆' : '✨';
  toast.innerHTML = `<span>${icon}</span><span class="text-sm font-medium">${message}</span>`;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Remove toast
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// Load state from LocalStorage
function loadState() {
  const onboarding = localStorage.getItem('ecotrace_onboarding');
  state.onboarding = onboarding ? JSON.parse(onboarding) : null;

  const logs = localStorage.getItem('ecotrace_logs');
  state.logs = logs ? JSON.parse(logs) : [];

  const points = localStorage.getItem('ecotrace_points');
  state.points = points ? parseInt(points, 10) : 0;

  const totalSaved = localStorage.getItem('ecotrace_total_saved_co2');
  state.totalSavedCo2 = totalSaved ? parseFloat(totalSaved) : 0.0;

  state.challenges = window.Challenges.getChallenges();
  state.badges = window.Challenges.getBadgesStatus();

  // Load chat history or set default
  const chat = localStorage.getItem('ecotrace_chat_history');
  if (chat) {
    state.chatHistory = JSON.parse(chat);
  } else {
    state.chatHistory = [
      { sender: 'ai', text: window.AiAssistant.getGreeting() }
    ];
  }
}

// Save state to LocalStorage
function saveState() {
  localStorage.setItem('ecotrace_onboarding', JSON.stringify(state.onboarding));
  localStorage.setItem('ecotrace_logs', JSON.stringify(state.logs));
  localStorage.setItem('ecotrace_points', state.points.toString());
  localStorage.setItem('ecotrace_total_saved_co2', state.totalSavedCo2.toString());
  localStorage.setItem('ecotrace_chat_history', JSON.stringify(state.chatHistory));
}

// Calculate Today's Stats
function getTodayStats() {
  const today = getTodayDateString();
  const todayLogs = state.logs.filter(log => log.timestamp.startsWith(today));
  
  const baseline = state.onboarding ? window.Calculator.calculateDailyBaseline(state.onboarding) : 10.0;

  // Group emissions by category
  const breakdown = { transport: 0, food: 0, energy: 0, consumption: 0 };
  let grossEmissions = 0;
  let quickSavings = 0;

  todayLogs.forEach(log => {
    if (log.carbon > 0) {
      breakdown[log.category] += log.carbon;
      grossEmissions += log.carbon;
    } else {
      // Negative entries are quick log savings
      quickSavings += Math.abs(log.carbon);
    }
  });

  // Challenges reduction logic (applied to today's net)
  let challengeSavings = 0;
  state.challenges.forEach(c => {
    if (c.completed) {
      challengeSavings += c.carbonSaving;
    }
  });

  const totalSavedToday = quickSavings + challengeSavings;
  const netEmissions = Math.max(0, grossEmissions - totalSavedToday);

  // Cumulative Stats for badge checks
  const totalLogs = state.logs.length;
  const completedChallenges = state.challenges.filter(c => c.completed).map(c => c.id);
  
  // Calculate historical baseline vs net to check days below target
  // (In production, group logs by date. For simplicity, check if net today is below target)
  const isBelowTargetToday = netEmissions < baseline;
  
  return {
    baseline,
    grossEmissions,
    todayEmissions: netEmissions,
    totalSavedToday,
    breakdown,
    totalLogs,
    challengesCompleted: completedChallenges,
    completedCount: completedChallenges.length,
    totalPoints: state.points,
    totalSavedCo2: state.totalSavedCo2,
    isBelowTargetToday
  };
}

// Update badges based on stats
function updateBadgesAndCheckUnlocks() {
  const stats = getTodayStats();
  
  // Helper: check how many entries are below target historically
  // Group logs by date
  const logsByDate = {};
  state.logs.forEach(log => {
    const dStr = log.timestamp.split('T')[0];
    if (!logsByDate[dStr]) logsByDate[dStr] = [];
    logsByDate[dStr].push(log);
  });
  
  let daysBelowTarget = 0;
  Object.keys(logsByDate).forEach(dStr => {
    let gross = 0;
    let saved = 0;
    logsByDate[dStr].forEach(l => {
      if (l.carbon > 0) gross += l.carbon;
      else saved += Math.abs(l.carbon);
    });
    // Add completed challenges savings
    let challengeSav = 0;
    state.challenges.forEach(c => {
      if (c.completed) challengeSav += c.carbonSaving;
    });
    const net = Math.max(0, gross - (saved + challengeSav));
    if (net < stats.baseline) daysBelowTarget++;
  });
  
  stats.daysBelowTarget = daysBelowTarget;

  const newlyUnlocked = window.Challenges.checkBadges(stats);
  if (newlyUnlocked.length > 0) {
    newlyUnlocked.forEach(badge => {
      showToast(`Unlocked Badge: ${badge.icon} ${badge.name}!`, 'badge');
    });
    // Refresh badges display
    state.badges = window.Challenges.getBadgesStatus();
    renderBadges();
  }
}

// Render Metrics Scoreboard
function renderMetrics() {
  const stats = getTodayStats();
  
  document.getElementById('metric-today-emissions').textContent = stats.todayEmissions.toFixed(1);
  document.getElementById('metric-baseline').textContent = stats.baseline.toFixed(1);
  document.getElementById('metric-saved-co2').textContent = stats.totalSavedToday.toFixed(1);
  document.getElementById('metric-points').textContent = state.points;

  // Budget progress bar
  const progressBar = document.getElementById('budget-progress-bar');
  const percent = Math.min(100, (stats.todayEmissions / stats.baseline) * 100);
  progressBar.style.width = `${percent}%`;

  const budgetText = document.getElementById('budget-progress-text');
  if (stats.todayEmissions > stats.baseline) {
    progressBar.className = "h-full bg-rose-500 rounded-full transition-all duration-500";
    budgetText.innerHTML = `⚠️ Exceeded baseline by <span class="font-bold">${(stats.todayEmissions - stats.baseline).toFixed(1)} kg CO2e</span>`;
  } else {
    progressBar.className = "h-full bg-emerald-500 rounded-full transition-all duration-500";
    budgetText.innerHTML = `Remaining daily allowance: <span class="font-bold">${(stats.baseline - stats.todayEmissions).toFixed(1)} kg CO2e</span>`;
  }
}

// Render Category Breakdown Cards
function renderCategoryBreakdown() {
  const stats = getTodayStats();
  const breakdown = stats.breakdown;

  const categories = [
    { id: 'transport', label: 'Transport', icon: '🚗', colorClass: 'bg-emerald-500', barId: 'cat-bar-transport', valId: 'cat-val-transport' },
    { id: 'food', label: 'Food', icon: '🥗', colorClass: 'bg-teal-500', barId: 'cat-bar-food', valId: 'cat-val-food' },
    { id: 'energy', label: 'Energy', icon: '⚡', colorClass: 'bg-cyan-500', barId: 'cat-bar-energy', valId: 'cat-val-energy' },
    { id: 'consumption', label: 'Consumption', icon: '🛍️', colorClass: 'bg-indigo-500', barId: 'cat-bar-consumption', valId: 'cat-val-consumption' }
  ];

  const totalGross = stats.grossEmissions || 1; // avoid divide by zero

  categories.forEach(cat => {
    const value = breakdown[cat.id] || 0;
    const percentage = Math.min(100, Math.round((value / totalGross) * 100));
    
    document.getElementById(cat.valId).textContent = `${value.toFixed(1)} kg`;
    const bar = document.getElementById(cat.barId);
    bar.style.width = stats.grossEmissions > 0 ? `${percentage}%` : '0%';
  });
}

// Render Logged Activity History
function renderLogList() {
  const logListElement = document.getElementById('log-list');
  logListElement.innerHTML = '';

  const today = getTodayDateString();
  const todayLogs = state.logs
    .filter(log => log.timestamp.startsWith(today))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (todayLogs.length === 0) {
    logListElement.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-sm">
        No activities logged for today yet. Use the quick actions or form below to log.
      </div>
    `;
    return;
  }

  todayLogs.forEach(log => {
    const isSaving = log.carbon < 0;
    const item = document.createElement('div');
    item.className = "flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/30 text-sm";
    
    let icon = '📝';
    if (log.category === 'transport') icon = '🚗';
    if (log.category === 'food') icon = '🥗';
    if (log.category === 'energy') icon = '⚡';
    if (log.category === 'consumption') icon = '🛍️';

    item.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-lg">${icon}</span>
        <div>
          <div class="font-medium text-slate-200">${log.label}</div>
          <div class="text-xs text-slate-500">${formatDate(log.timestamp)}</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="font-bold ${isSaving ? 'text-emerald-400' : 'text-slate-300'}">
          ${isSaving ? '-' : '+'}${Math.abs(log.carbon).toFixed(2)} kg CO2e
        </span>
        <button onclick="deleteLog('${log.id}')" aria-label="Delete entry" class="text-slate-500 hover:text-rose-400 transition-colors">
          <i class="fas fa-trash-alt text-xs"></i>
        </button>
      </div>
    `;
    logListElement.appendChild(item);
  });
}

// Render Weekly Challenges Roadmap
function renderChallenges() {
  const challengeContainer = document.getElementById('challenge-list');
  challengeContainer.innerHTML = '';

  state.challenges.forEach(c => {
    const card = document.createElement('div');
    card.className = `flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
      c.completed 
        ? 'bg-emerald-950/20 border-emerald-500/30' 
        : 'bg-slate-900/30 border-slate-800 hover:border-emerald-500/20'
    }`;

    card.innerHTML = `
      <div class="mb-3 md:mb-0">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            c.category === 'transport' ? 'bg-emerald-500/10 text-emerald-400' :
            c.category === 'food' ? 'bg-teal-500/10 text-teal-400' :
            c.category === 'energy' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-indigo-500/10 text-indigo-400'
          }">${c.category}</span>
          <span class="text-xs text-amber-400 font-semibold">+${c.points} pts</span>
          <span class="text-xs text-emerald-400 font-semibold">-${c.carbonSaving} kg CO2e</span>
        </div>
        <h4 class="font-semibold text-slate-200 mt-1 text-sm md:text-base">${c.title}</h4>
        <p class="text-xs text-slate-400 mt-0.5">${c.description}</p>
      </div>
      <div>
        <button onclick="handleChallengeToggle('${c.id}')" 
          aria-pressed="${c.completed}"
          class="w-full md:w-auto px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border ${
            c.completed 
              ? 'bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-600' 
              : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-emerald-500/40 hover:bg-slate-700'
          }">
          ${c.completed ? '✓ Completed' : 'Complete Challenge'}
        </button>
      </div>
    `;
    challengeContainer.appendChild(card);
  });
}

// Render Gamified Badges
function renderBadges() {
  const badgeContainer = document.getElementById('badge-list');
  badgeContainer.innerHTML = '';

  state.badges.forEach(badge => {
    const item = document.createElement('div');
    item.className = `flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
      badge.unlocked 
        ? 'bg-slate-900/50 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
        : 'bg-slate-950/20 border-slate-900 opacity-40 filter grayscale'
    }`;

    item.innerHTML = `
      <span class="text-3xl mb-2 filter drop-shadow-md select-none">${badge.icon}</span>
      <h5 class="text-xs font-bold text-slate-200 truncate w-full">${badge.name}</h5>
      <p class="text-[9px] text-slate-400 mt-1 leading-snug">${badge.description}</p>
      ${badge.unlocked ? '<span class="text-[8px] font-bold text-emerald-400 mt-2 uppercase tracking-wide">Unlocked</span>' : '<span class="text-[8px] font-bold text-slate-500 mt-2 uppercase tracking-wide">Locked</span>'}
    `;
    badgeContainer.appendChild(item);
  });
}

// Render Chat Messages
function renderChat() {
  const chatWindow = document.getElementById('chat-window');
  chatWindow.innerHTML = '';

  state.chatHistory.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `flex flex-col max-w-[85%] rounded-2xl p-3 text-sm ${
      msg.sender === 'user'
        ? 'bg-emerald-600 text-white self-end rounded-tr-none'
        : 'bg-slate-800/80 text-slate-200 border border-slate-700 self-start rounded-tl-none'
    }`;
    
    // Support basic markdown inside bubble (specifically bold/lists)
    let formattedText = msg.text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');

    bubble.innerHTML = `
      <div class="text-[10px] text-emerald-300 font-semibold mb-1 uppercase tracking-wider">${msg.sender === 'user' ? 'You' : 'Eco Assistant'}</div>
      <div class="leading-relaxed">${formattedText}</div>
    `;
    chatWindow.appendChild(bubble);
  });

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Trigger Simulated AI Typing Indicator
function showAiTypingIndicator() {
  const chatWindow = document.getElementById('chat-window');
  
  const indicator = document.createElement('div');
  indicator.id = 'ai-typing-indicator';
  indicator.className = 'flex items-center gap-1 bg-slate-800/80 border border-slate-700 p-3 rounded-2xl rounded-tl-none self-start max-w-[80%]';
  indicator.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  
  chatWindow.appendChild(indicator);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeAiTypingIndicator() {
  const ind = document.getElementById('ai-typing-indicator');
  if (ind) ind.remove();
}

// Core Handlers
window.handleChallengeToggle = function(id) {
  const { challenges, justCompleted, challenge } = window.Challenges.toggleChallenge(id);
  state.challenges = challenges;

  if (justCompleted) {
    state.points += challenge.points;
    state.totalSavedCo2 += challenge.carbonSaving;
    showToast(`Completed Challenge! +${challenge.points} Points`, 'success');
  } else {
    state.points = Math.max(0, state.points - challenge.points);
    state.totalSavedCo2 = Math.max(0.0, state.totalSavedCo2 - challenge.carbonSaving);
  }

  saveState();
  refreshUI();
};

window.deleteLog = function(id) {
  const index = state.logs.findIndex(log => log.id === id);
  if (index !== -1) {
    const deleted = state.logs[index];
    state.logs.splice(index, 1);
    
    // If it was a quick log, reverse the points/savings
    if (deleted.carbon < 0) {
      state.points = Math.max(0, state.points - 10);
      state.totalSavedCo2 = Math.max(0.0, state.totalSavedCo2 - Math.abs(deleted.carbon));
    }
    
    saveState();
    refreshUI();
    showToast("Activity deleted successfully", "success");
  }
};

window.quickLogAction = function(actionKey, actionLabel) {
  const saving = window.Calculator.getQuickActionSavings(actionKey);
  const newLog = {
    id: 'quick_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    category: actionKey.includes('meal') ? 'food' : actionKey.includes('transit') ? 'transport' : actionKey.includes('appliances') ? 'energy' : 'consumption',
    type: actionKey,
    label: actionLabel,
    value: 1,
    carbon: saving, // negative represents savings
    timestamp: new Date().toISOString()
  };

  state.logs.push(newLog);
  state.points += 10; // +10 points for quick eco action
  state.totalSavedCo2 += Math.abs(saving);

  saveState();
  refreshUI();
  showToast(`Logged Quick Action! Saved ${Math.abs(saving)} kg CO2e (+10 pts)`, 'success');
};

// Handle Form Logging
function setupLogForm() {
  const categorySelect = document.getElementById('log-category');
  const typeSelect = document.getElementById('log-type');
  const valueInput = document.getElementById('log-value');
  const unitText = document.getElementById('log-unit-text');
  const logForm = document.getElementById('log-activity-form');

  // Sub-category maps
  const typeOptions = {
    transport: [
      { value: 'car_petrol', label: 'Driving Petrol Car (km)', unit: 'km' },
      { value: 'bus_train', label: 'Riding Bus/Train (km)', unit: 'km' },
      { value: 'carpool', label: 'Carpooling (km)', unit: 'km' }
    ],
    food: [
      { value: 'meat', label: 'Meat Meal', unit: 'meals' },
      { value: 'vegetarian', label: 'Vegetarian Meal', unit: 'meals' },
      { value: 'vegan', label: 'Vegan Meal', unit: 'meals' }
    ],
    energy: [
      { value: 'electricity', label: 'Electricity Usage (kWh)', unit: 'kWh' },
      { value: 'heating_cooling', label: 'Heating/Cooling (Hours)', unit: 'Hours' }
    ],
    consumption: [
      { value: 'new_item', label: 'Buying New Item', unit: 'items' }
    ]
  };

  function updateTypes() {
    const cat = categorySelect.value;
    typeSelect.innerHTML = '';
    const options = typeOptions[cat] || [];
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      typeSelect.appendChild(el);
    });
    if (options.length > 0) {
      unitText.textContent = options[0].unit;
    }
  }

  categorySelect.addEventListener('change', updateTypes);
  typeSelect.addEventListener('change', () => {
    const selectedOpt = typeOptions[categorySelect.value].find(opt => opt.value === typeSelect.value);
    if (selectedOpt) unitText.textContent = selectedOpt.unit;
  });

  // Initial populate
  updateTypes();

  logForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = categorySelect.value;
    const type = typeSelect.value;
    const value = parseFloat(valueInput.value);

    if (isNaN(value) || value <= 0) {
      showToast("Please enter a valid positive value", "alert");
      return;
    }

    const carbon = window.Calculator.calculateActivityEmissions(cat, type, value);
    const selectedOpt = typeOptions[cat].find(o => o.value === type);
    const label = `${selectedOpt.label.split(' (')[0]}: ${value} ${selectedOpt.unit}`;

    const newLog = {
      id: 'log_' + Date.now(),
      category: cat,
      type: type,
      label: label,
      value: value,
      carbon: carbon,
      timestamp: new Date().toISOString()
    };

    state.logs.push(newLog);
    state.points += 5; // +5 points for custom logging

    saveState();
    refreshUI();
    
    valueInput.value = '';
    showToast(`Logged activity: +${carbon.toFixed(2)} kg CO2e`, 'success');
  });
}

// Handle AI Chat Submits
function setupChatForm() {
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    state.chatHistory.push({ sender: 'user', text: text });
    chatInput.value = '';
    renderChat();

    // Show simulated thinking
    showAiTypingIndicator();

    setTimeout(() => {
      removeAiTypingIndicator();
      const stats = getTodayStats();
      const aiResponse = window.AiAssistant.processChatMessage(text, stats);
      
      state.chatHistory.push({ sender: 'ai', text: aiResponse });
      saveState();
      renderChat();
    }, 1000);
  });
}

// Onboarding Modal Flow
function setupOnboarding() {
  const modal = document.getElementById('onboarding-modal');
  
  if (state.onboarding) {
    modal.classList.add('hidden');
    return;
  }

  // Open modal
  modal.classList.remove('hidden');

  let currentStep = 1;
  const steps = [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3'),
    document.getElementById('step-4')
  ];
  const stepIndicators = [
    document.getElementById('ind-step-1'),
    document.getElementById('ind-step-2'),
    document.getElementById('ind-step-3'),
    document.getElementById('ind-step-4')
  ];

  function showStep(stepNum) {
    steps.forEach((step, idx) => {
      if (idx + 1 === stepNum) {
        step.classList.remove('hidden');
      } else {
        step.classList.add('hidden');
      }
    });

    stepIndicators.forEach((ind, idx) => {
      if (idx + 1 <= stepNum) {
        ind.className = "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-emerald-500 text-slate-950 transition-all";
      } else {
        ind.className = "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-slate-800 text-slate-400 transition-all";
      }
    });

    // Handle button visibility
    const prevBtn = document.getElementById('prev-step-btn');
    const nextBtn = document.getElementById('next-step-btn');
    const submitBtn = document.getElementById('submit-onboarding-btn');

    if (stepNum === 1) {
      prevBtn.classList.add('invisible');
    } else {
      prevBtn.classList.remove('invisible');
    }

    if (stepNum === 4) {
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }
  }

  document.getElementById('next-step-btn').addEventListener('click', () => {
    currentStep = Math.min(4, currentStep + 1);
    showStep(currentStep);
  });

  document.getElementById('prev-step-btn').addEventListener('click', () => {
    currentStep = Math.max(1, currentStep - 1);
    showStep(currentStep);
  });

  document.getElementById('onboarding-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const dietType = document.querySelector('input[name="dietType"]:checked').value;
    const transitMode = document.querySelector('input[name="transitMode"]:checked').value;
    const housingSize = document.querySelector('input[name="housingSize"]:checked').value;
    const country = document.getElementById('onboarding-country').value;

    state.onboarding = { dietType, transitMode, housingSize, country };
    state.points = 100; // Starter points!
    
    saveState();
    modal.classList.add('hidden');
    
    // Refresh UI
    refreshUI();
    showToast("Onboarding complete! Welcome to EcoTrace (+100 points!)", 'success');
  });

  showStep(currentStep);
}

// Reset Dashboard Data
window.resetDashboardData = function() {
  if (confirm("Are you sure you want to reset your EcoTrace data? This will clear all onboarding selections, activity logs, points, and challenges.")) {
    localStorage.clear();
    state = {
      onboarding: null,
      logs: [],
      points: 0,
      totalSavedCo2: 0.0,
      challenges: [],
      badges: [],
      chatHistory: [
        { sender: 'ai', text: window.AiAssistant.getGreeting() }
      ]
    };
    saveState();
    location.reload();
  }
};

// UI Refresh Orchestration
function refreshUI() {
  renderMetrics();
  renderCategoryBreakdown();
  renderLogList();
  renderChallenges();
  renderBadges();
  renderChat();
  updateBadgesAndCheckUnlocks();
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupOnboarding();
  setupLogForm();
  setupChatForm();
  refreshUI();
});
