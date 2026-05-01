// State Management
const DEFAULT_STATE = {
    credits: 0,
    plant: {
        type: 'Sunflower',
        stage: 0, // 0: Seed, 1: Sprout, 2: Small Plant, 3: Bud, 4: Bloom, -1: Dead
        health: 100
    },
    schedules: [],
    collection: [], // Stores fully bloomed plants
    selectedTechnique: null,
    fileUploaded: false,
    user: { loggedIn: false, username: '', email: '', isAdmin: false },
    reviewSource: 'apollo', // 'file' or 'apollo'
    apolloTopic: '',
    apolloHistory: [],
    community: {
        activeGroup: 'general'
    }
};

let STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));

let PLANT_TYPES = [
    { name: 'Sunflower', emoji: '🌻' },
    { name: 'Rose', emoji: '🌹' },
    { name: 'Tulip', emoji: '🌷' },
    { name: 'Daisy', emoji: '🌼' },
    { name: 'Lily', emoji: '🪷' },
    { name: 'Cactus', emoji: '🌵' },
    { name: 'Birds of Paradise', emoji: '🦜' }, // Closest emoji
    { name: 'Bonsai Tree', emoji: '🪴' },
    { name: 'Hyacinth', emoji: '🪻' },
    { name: 'Sampaguita', emoji: '💮' }
];

const GROWTH_STAGES = ['🌱', '🌿', '🪴', '🌷', '']; // Last one is dynamic based on plant type

// DOM Elements
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('.nav-links a');
const creditCountEl = document.getElementById('credit-count');

// Garden Elements
const plantEmojiEl = document.getElementById('plant-emoji');
const plantNameEl = document.getElementById('plant-name');
const plantStatusEl = document.getElementById('plant-status');
const healthBarEl = document.getElementById('health-bar');
const btnWater = document.getElementById('btn-water');

// Schedule Elements
const scheduleForm = document.getElementById('schedule-form');
const allScheduleList = document.getElementById('all-schedule-list');
const upcomingList = document.getElementById('upcoming-list');

// Review Elements
const uploadZone = document.getElementById('upload-zone');
const fileUpload = document.getElementById('file-upload');
const fileName = document.getElementById('file-name');
const techniqueCards = document.querySelectorAll('.technique-card');
const btnStartReview = document.getElementById('btn-start-review');
const reviewSetup = document.getElementById('review-setup');
const activeSession = document.getElementById('active-session');
const timerDisplay = document.getElementById('timer-display');
const btnCompleteSession = document.getElementById('btn-complete-session');
const btnCancelSession = document.getElementById('btn-cancel-session');
const sessionTechniqueTitle = document.getElementById('session-technique-title');
const filePreviewContainer = document.getElementById('file-preview-container');

// Auth Elements
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const mainNav = document.getElementById('main-nav');
const mainContent = document.getElementById('main-content');
const loggedInUserEl = document.getElementById('logged-in-user');
const btnLogout = document.getElementById('btn-logout');

// Apollo Elements
const toggleBtns = document.querySelectorAll('.toggle-btn');
const apolloZone = document.getElementById('apollo-zone');
const apolloTopicInput = document.getElementById('apollo-topic');
const apolloContentContainer = document.getElementById('apollo-content-container');
const apolloLoading = document.getElementById('apollo-loading');

const fileApolloToggleContainer = document.getElementById('file-apollo-toggle-container');
const btnFileApolloOn = document.getElementById('btn-file-apollo-on');
const btnFileApolloOff = document.getElementById('btn-file-apollo-off');
const apolloChatHistory = document.getElementById('apollo-chat-history');
const apolloChatInputArea = document.getElementById('apollo-chat-input-area');
const apolloChatInput = document.getElementById('apollo-chat-input');
const btnSendApollo = document.getElementById('btn-send-apollo');


// Community Elements
const groupItems = document.querySelectorAll('.group-item');
const currentGroupName = document.getElementById('current-group-name');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnSendChat = document.getElementById('btn-send-chat');

let currentUploadedFile = null;

// Modal Elements
const plantModal = document.getElementById('plant-modal');
const plantGrid = document.getElementById('plant-grid');

// Admin Elements
const navAdmin = document.getElementById('nav-admin');
const adminTotalUsers = document.getElementById('admin-total-users');
const adminTotalCredits = document.getElementById('admin-total-credits');
const adminUsersList = document.getElementById('admin-users-list');
const adminSettingsForm = document.getElementById('admin-settings-form');
const newPlantName = document.getElementById('new-plant-name');
const newPlantEmoji = document.getElementById('new-plant-emoji');
const adminPlantsList = document.getElementById('admin-plants-list');

// Initialization
async function init() {
    try {
        const res = await fetch('/api/plants');
        if (res.ok) {
            const customPlants = await res.json();
            if (customPlants.length) PLANT_TYPES = PLANT_TYPES.concat(customPlants);
        }
    } catch(e) {}

    await loadState();
    setupEventListeners();
    
    if (!STATE.user || !STATE.user.loggedIn) {
        document.getElementById('view-auth').classList.add('active-view');
    } else {
        showMainApp();
    }

    checkSchedules();
    setInterval(checkSchedules, 30000); // Check every 30 seconds for precision
    populatePlantModal();

    // Alarm dismiss button
    document.getElementById('alarm-dismiss-btn').addEventListener('click', dismissAlarm);
}

function showMainApp() {
    document.getElementById('view-auth').classList.remove('active-view');
    mainNav.classList.remove('hidden');
    mainContent.classList.remove('hidden');
    loggedInUserEl.textContent = STATE.user.username;
    
    views.forEach(v => v.classList.remove('active-view'));
    document.getElementById('view-dashboard').classList.add('active-view');
    
    // Set Apollo as active by default in DOM
    document.getElementById('toggle-apollo').classList.add('active');
    document.getElementById('toggle-file').classList.remove('active');
    document.getElementById('apollo-zone').classList.remove('hidden');
    document.getElementById('upload-zone').classList.add('hidden');
    
    const adminItem = document.getElementById('nav-admin-item');
    if (adminItem) {
        if (STATE.user.isAdmin) {
            adminItem.classList.remove('hidden');
            renderAdminDashboard();
        } else {
            adminItem.classList.add('hidden');
        }
    }

    updateUI();
    renderChat();
}

async function loadState() {
    const activeEmail = localStorage.getItem('studyBloomActiveUser');
    if (activeEmail) {
        try {
            const res = await fetch(`/api/state/${activeEmail}`);
            const data = await res.json();
            if (data.success && data.state) {
                STATE = data.state;
                STATE.schedules.forEach(s => s.date = new Date(s.date));
                STATE.user.loggedIn = true;
            } else {
                STATE.user.loggedIn = false;
            }
        } catch(e) {
            STATE.user.loggedIn = false;
        }
    }
}

async function saveState() {
    if (STATE.user && STATE.user.email) {
        localStorage.setItem('studyBloomActiveUser', STATE.user.email);
        try {
            await fetch(`/api/state/${STATE.user.email}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(STATE)
            });
        } catch(e) {}
    }
}

// Navigation
function switchView(viewId) {
    views.forEach(v => v.classList.remove('active-view'));
    document.getElementById(`view-${viewId}`).classList.add('active-view');
    
    navLinks.forEach(l => l.classList.remove('active'));
    document.getElementById(`nav-${viewId}`).classList.add('active');
}

// Event Listeners
function setupEventListeners() {
    // Auth
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        if (username && email) {
            localStorage.setItem('studyBloomActiveUser', email);
            
            let isNewUser = false;
            try {
                const res = await fetch(`/api/state/${email}`);
                const data = await res.json();
                if (data.success && data.state) {
                    STATE = data.state;
                    STATE.schedules.forEach(s => s.date = new Date(s.date));
                } else {
                    STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));
                    isNewUser = true;
                }
            } catch(e) {
                STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));
                isNewUser = true;
            }
            
            STATE.user.loggedIn = true;
            STATE.user.username = username;
            STATE.user.email = email;
            STATE.user.isAdmin = (email === 'admin@studybloom.com');
            await saveState();
            showMainApp();
            
            if (isNewUser) {
                setTimeout(() => plantModal.classList.remove('hidden'), 100);
            }
        }
    });
    
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('studyBloomActiveUser');
        STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));
        location.reload();
    });

    // Settings are handled on backend now.

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = e.target.id.replace('nav-', '');
            switchView(viewId);
        });
    });

    btnWater.addEventListener('click', waterPlant);

    scheduleForm.addEventListener('submit', handleScheduleSubmit);
    
    // Source Toggle
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            STATE.reviewSource = btn.dataset.source;
            
            if (STATE.reviewSource === 'file') {
                uploadZone.classList.remove('hidden');
                apolloZone.classList.add('hidden');
            } else {
                uploadZone.classList.add('hidden');
                apolloZone.classList.remove('hidden');
            }
            checkReviewReady();
        });
    });
    
    apolloTopicInput.addEventListener('input', (e) => {
        STATE.apolloTopic = e.target.value.trim();
        checkReviewReady();
    });
    
    if (btnFileApolloOn) {
        btnFileApolloOn.addEventListener('click', () => {
            btnFileApolloOn.classList.add('active');
            btnFileApolloOff.classList.remove('active');
            STATE.apolloAssistance = true;
            apolloContentContainer.classList.remove('hidden');
            if (STATE.apolloHistory.length === 0) {
                initiateFileApolloSession();
            }
        });
    }
    if (btnFileApolloOff) {
        btnFileApolloOff.addEventListener('click', () => {
            btnFileApolloOff.classList.add('active');
            btnFileApolloOn.classList.remove('active');
            STATE.apolloAssistance = false;
            apolloContentContainer.classList.add('hidden');
        });
    }
    
    btnSendApollo.addEventListener('click', sendApolloFollowUp);
    apolloChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendApolloFollowUp();
    });
    
    // Community
    groupItems.forEach(item => {
        item.addEventListener('click', () => {
            groupItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            STATE.community.activeGroup = item.dataset.group;
            currentGroupName.textContent = item.textContent;
            renderChat();
        });
    });
    
    btnSendChat.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Upload zone
    uploadZone.addEventListener('click', () => fileUpload.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.borderColor = 'var(--primary)'; });
    uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = 'var(--glass-border)'; });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--glass-border)';
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    fileUpload.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileUpload(e.target.files[0]);
    });

    // Techniques
    techniqueCards.forEach(card => {
        card.addEventListener('click', () => {
            techniqueCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            STATE.selectedTechnique = card.dataset.technique;
            checkReviewReady();
        });
    });

    btnStartReview.addEventListener('click', startReviewSession);
    btnCompleteSession.addEventListener('click', completeReviewSession);
    btnCancelSession.addEventListener('click', cancelReviewSession);
}

// Gamification Logic
function updateUI() {
    creditCountEl.textContent = STATE.credits;
    
    // Plant UI
    if (STATE.plant.stage === -1) {
        plantEmojiEl.textContent = '🥀';
        plantNameEl.textContent = 'Dead Plant';
        plantStatusEl.textContent = 'Oh no! You missed too many reviews.';
        plantStatusEl.style.color = 'var(--danger)';
        btnWater.disabled = true;
        healthBarEl.style.width = '0%';
        healthBarEl.style.backgroundColor = 'var(--danger)';
        
        // Show modal to pick a new plant after 3 seconds of mourning
        setTimeout(() => plantModal.classList.remove('hidden'), 3000);
    } else {
        const typeObj = PLANT_TYPES.find(p => p.name === STATE.plant.type) || PLANT_TYPES[0];
        if (STATE.plant.stage === 4) {
            plantEmojiEl.textContent = typeObj.emoji;
            plantNameEl.textContent = `Fully Bloomed ${STATE.plant.type}!`;
            btnWater.textContent = 'Choose New Plant';
            btnWater.onclick = () => plantModal.classList.remove('hidden');
        } else {
            plantEmojiEl.textContent = GROWTH_STAGES[STATE.plant.stage];
            plantNameEl.textContent = `${STATE.plant.type} (Stage ${STATE.plant.stage + 1}/5)`;
            btnWater.textContent = `Water Plant (Cost: 1 💧)`;
            btnWater.onclick = waterPlant;
            btnWater.disabled = STATE.credits < 1;
        }

        healthBarEl.style.width = `${STATE.plant.health}%`;
        healthBarEl.style.backgroundColor = STATE.plant.health > 50 ? 'var(--success)' : 'var(--danger)';
        plantStatusEl.textContent = `Health: ${Math.round(STATE.plant.health)}%`;
        plantStatusEl.style.color = 'var(--text-muted)';
    }

    renderSchedules();
    renderCollection();
}

function waterPlant() {
    if (STATE.credits >= 1 && STATE.plant.stage >= 0 && STATE.plant.stage < 4) {
        STATE.credits -= 1;
        STATE.plant.stage += 1;
        STATE.plant.health = Math.min(100, STATE.plant.health + 20); // Heal a bit when watered
        
        // Animation
        plantEmojiEl.classList.add('animate-grow');
        setTimeout(() => plantEmojiEl.classList.remove('animate-grow'), 500);

        saveState();
        updateUI();

        if (STATE.plant.stage === 4) {
            setTimeout(() => {
                alert(`Congratulations! Your ${STATE.plant.type} has fully bloomed!`);
            }, 600);
        }
    }
}

function populatePlantModal() {
    plantGrid.innerHTML = '';
    PLANT_TYPES.forEach(pt => {
        const div = document.createElement('div');
        div.className = 'plant-option';
        div.innerHTML = `<span class="emoji">${pt.emoji}</span><span>${pt.name}</span>`;
        div.onclick = () => selectNewPlant(pt.name);
        plantGrid.appendChild(div);
    });
}

function selectNewPlant(typeName) {
    // If current plant fully bloomed, add it to the collection
    if (STATE.plant.stage === 4) {
        if (!STATE.collection) STATE.collection = [];
        STATE.collection.push({
            name: STATE.plant.type,
            emoji: (PLANT_TYPES.find(p => p.name === STATE.plant.type) || PLANT_TYPES[0]).emoji,
            grownAt: new Date().toISOString()
        });
    }
    STATE.plant = {
        type: typeName,
        stage: 0,
        health: 100
    };
    plantModal.classList.add('hidden');
    saveState();
    updateUI();
    switchView('dashboard');
}

function renderCollection() {
    const container = document.getElementById('greenhouse-grid');
    const countEl = document.getElementById('greenhouse-count');
    const emptyEl = document.getElementById('greenhouse-empty');
    if (!container) return;

    const collection = STATE.collection || [];
    countEl.textContent = collection.length;

    if (collection.length === 0) {
        emptyEl.classList.remove('hidden');
        container.innerHTML = '';
        return;
    }

    emptyEl.classList.add('hidden');

    // Group by plant name
    const grouped = {};
    collection.forEach(p => {
        if (!grouped[p.name]) grouped[p.name] = { emoji: p.emoji, count: 0 };
        grouped[p.name].count++;
    });

    container.innerHTML = '';
    Object.entries(grouped).forEach(([name, data]) => {
        const card = document.createElement('div');
        card.className = 'collection-card';
        card.innerHTML = `
            <div class="collection-emoji">${data.emoji}</div>
            <div class="collection-name">${name}</div>
            <div class="collection-count">x${data.count}</div>
        `;
        container.appendChild(card);
    });
}

// Schedule Logic
function handleScheduleSubmit(e) {
    e.preventDefault();
    const subject = document.getElementById('subject').value;
    const dateInput = document.getElementById('review-date').value;
    
    if (subject && dateInput) {
        STATE.schedules.push({
            id: Date.now(),
            subject,
            date: new Date(dateInput),
            completed: false,
            missed: false
        });
        
        // Sort by date
        STATE.schedules.sort((a, b) => a.date - b.date);
        
        document.getElementById('subject').value = '';
        document.getElementById('review-date').value = '';
        
        saveState();
        updateUI();
        alert('Review scheduled successfully!');
    }
}

function renderSchedules() {
    allScheduleList.innerHTML = '';
    upcomingList.innerHTML = '';
    
    const now = new Date();
    
    if (STATE.schedules.length === 0) {
        allScheduleList.innerHTML = '<li class="empty-state">No schedules yet.</li>';
        upcomingList.innerHTML = '<li class="empty-state">No upcoming reviews. Schedule one!</li>';
        return;
    }

    let upcomingCount = 0;

    STATE.schedules.forEach(schedule => {
        const isPast = schedule.date < now;
        const li = document.createElement('li');
        
        let statusTag = '';
        if (schedule.completed) statusTag = '<span style="color:var(--success)">✅ Completed</span>';
        else if (schedule.missed) statusTag = '<span style="color:var(--danger)">❌ Missed</span>';
        else if (isPast) statusTag = '<span style="color:var(--danger)">⚠️ Overdue</span>';
        else statusTag = '<span style="color:var(--text-muted)">⏳ Upcoming</span>';

        li.innerHTML = `
            <div>
                <strong>${schedule.subject}</strong><br>
                <small>${schedule.date.toLocaleString()}</small>
            </div>
            <div>${statusTag}</div>
        `;
        
        allScheduleList.appendChild(li);

        // Add to upcoming if not completed/missed
        if (!schedule.completed && !schedule.missed && upcomingCount < 3) {
            const upLi = document.createElement('li');
            upLi.innerHTML = `
                <div>
                    <strong>${schedule.subject}</strong><br>
                    <small>${schedule.date.toLocaleString()}</small>
                </div>
            `;
            upcomingList.appendChild(upLi);
            upcomingCount++;
        }
    });

    if (upcomingCount === 0) {
        upcomingList.innerHTML = '<li class="empty-state">No pending reviews.</li>';
    }
}

// Tracks which schedule IDs have already shown a 5-min warning
const _alarmShown = new Set();
// Tracks which schedule IDs have already triggered the auto-redirect
const _autoRedirected = new Set();

function checkSchedules() {
    if (!STATE.user || !STATE.user.loggedIn) return;

    const now = new Date();
    let healthLost = false;

    STATE.schedules.forEach(schedule => {
        if (!schedule.completed && !schedule.missed) {
            const diffMs   = schedule.date - now;          // positive = future
            const diffMins = diffMs / (1000 * 60);
            const diffHours = -diffMs / (1000 * 60 * 60); // positive = past

            // ── 5-minute warning alarm ──────────────────────────────────
            if (diffMins > 0 && diffMins <= 5 && !_alarmShown.has(schedule.id)) {
                _alarmShown.add(schedule.id);
                showScheduleAlarm(schedule, Math.ceil(diffMins));
            }

            // ── Auto-redirect when session time arrives ─────────────────
            if (diffMins <= 0 && diffMins > -2 && !_autoRedirected.has(schedule.id)) {
                _autoRedirected.add(schedule.id);
                autoStartScheduledReview(schedule);
            }

            // ── Miss penalty: 36 hours overdue ──────────────────────────
            if (STATE.plant.stage !== -1 && STATE.plant.stage !== 4) {
                if (diffHours >= 36) {
                    schedule.missed = true;
                    STATE.plant.health -= 25;
                    healthLost = true;
                }
            }
        }
    });

    if (healthLost) {
        if (STATE.plant.health <= 0) {
            STATE.plant.health = 0;
            STATE.plant.stage = -1;
        }
        saveState();
        updateUI();
    }
}

// Show the animated alarm toast
function showScheduleAlarm(schedule, minsLeft) {
    const alarm     = document.getElementById('schedule-alarm');
    const titleEl   = document.getElementById('alarm-title');
    const subjectEl = document.getElementById('alarm-subject');
    const timeEl    = document.getElementById('alarm-time');

    titleEl.textContent   = '⏰ Review Starting Soon!';
    subjectEl.textContent = schedule.subject;
    timeEl.textContent    = `Starting in ${minsLeft} minute${minsLeft !== 1 ? 's' : ''}`;

    alarm.classList.remove('hidden', 'alarm-leaving');

    // Play a gentle beep using Web Audio API
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    } catch(e) {}

    // Wire up Go Study button for this specific schedule
    const goBtn = document.getElementById('alarm-go-btn');
    goBtn.onclick = () => {
        dismissAlarm();
        autoStartScheduledReview(schedule);
    };
}

function dismissAlarm() {
    const alarm = document.getElementById('schedule-alarm');
    alarm.classList.add('alarm-leaving');
    setTimeout(() => alarm.classList.add('hidden'), 300);
}

// Redirect to Review tab and pre-load Apollo with the schedule's subject
function autoStartScheduledReview(schedule) {
    // Switch to the review view
    switchView('review');

    // Set Apollo as the review source
    STATE.reviewSource = 'apollo';
    STATE.apolloTopic  = schedule.subject;

    // Update the toggle UI
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    const apolloToggle = document.getElementById('toggle-apollo');
    if (apolloToggle) apolloToggle.classList.add('active');

    // Show Apollo zone, hide file zone
    document.getElementById('apollo-zone').classList.remove('hidden');
    document.getElementById('upload-zone').classList.add('hidden');

    // Pre-fill the topic input
    const topicInput = document.getElementById('apollo-topic');
    if (topicInput) topicInput.value = schedule.subject;

    // Auto-select Pomodoro if no technique chosen yet
    if (!STATE.selectedTechnique) {
        STATE.selectedTechnique = 'pomodoro';
        document.querySelectorAll('.technique-card').forEach(c => c.classList.remove('selected'));
        const pomCard = document.querySelector('.technique-card[data-technique="pomodoro"]');
        if (pomCard) pomCard.classList.add('selected');
    }

    checkReviewReady();

    // Show a brief banner inside the review page
    const header = document.querySelector('#view-review header p');
    if (header) {
        header.innerHTML = `<span style="color:#f59e0b;font-weight:700;">📅 Scheduled review for <em>${schedule.subject}</em> is starting now!</span>`;
        setTimeout(() => { header.innerHTML = 'Upload your material, choose a technique, and earn credits.'; }, 8000);
    }
    
    // Auto-start the session to immediately trigger Apollo
    setTimeout(() => {
        if (!btnStartReview.classList.contains('disabled')) {
            startReviewSession();
        }
    }, 500);
}

// Review Session Logic
function handleFileUpload(file) {
    STATE.fileUploaded = true;
    currentUploadedFile = file;
    fileName.textContent = `Attached: ${file.name}`;
    checkReviewReady();
}

function checkReviewReady() {
    const isSourceReady = STATE.reviewSource === 'file' ? STATE.fileUploaded : (STATE.apolloTopic && STATE.apolloTopic.length > 0);
    
    if (isSourceReady && STATE.selectedTechnique) {
        btnStartReview.classList.remove('disabled');
    } else {
        btnStartReview.classList.add('disabled');
    }
}

let sessionInterval;
let sessionSeconds = 25 * 60; // 25 minutes
let sessionStartSeconds = 25 * 60; // Track total at start
let sessionAutoCompleted = false; // Whether timer ran out naturally

function startReviewSession() {
    if (btnStartReview.classList.contains('disabled')) return;
    
    reviewSetup.classList.add('hidden');
    activeSession.classList.remove('hidden');
    
    const techName = document.querySelector(`.technique-card[data-technique="${STATE.selectedTechnique}"] h4`).textContent;
    sessionTechniqueTitle.textContent = `Active: ${techName}`;
    
    // Render file or Apollo preview
    if (STATE.reviewSource === 'file' && currentUploadedFile) {
        filePreviewContainer.classList.remove('hidden');
        fileApolloToggleContainer.classList.remove('hidden');
        
        // Reset Apollo UI for file source
        STATE.apolloHistory = [];
        STATE.apolloAssistance = true; // Default to ON
        btnFileApolloOn.classList.add('active');
        btnFileApolloOff.classList.remove('active');
        apolloContentContainer.classList.remove('hidden');
        
        initiateFileApolloSession(techName);

        filePreviewContainer.innerHTML = ''; // Clear previous
        
        const type = currentUploadedFile.type;
        if (type.startsWith('image/') || type === 'application/pdf') {
            const el = document.createElement(type.startsWith('image/') ? 'img' : 'iframe');
            el.src = URL.createObjectURL(currentUploadedFile);
            filePreviewContainer.appendChild(el);
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                const pre = document.createElement('pre');
                pre.textContent = e.target.result;
                filePreviewContainer.appendChild(pre);
            };
            if (type.startsWith('text/') || currentUploadedFile.name.endsWith('.md')) {
                reader.readAsText(currentUploadedFile);
            } else {
                 filePreviewContainer.innerHTML = `<p>Preview not supported for this file type.</p>`;
            }
        }
    } else if (STATE.reviewSource === 'apollo') {
        filePreviewContainer.classList.add('hidden');
        apolloContentContainer.classList.remove('hidden');
        apolloLoading.classList.remove('hidden');
        apolloChatHistory.classList.add('hidden');
        apolloChatInputArea.classList.add('hidden');
        
        STATE.apolloHistory = [];
        const prompt = `You are Apollo, an expert study tutor. The user wants to study "${STATE.apolloTopic}" using the "${techName}" technique. Provide a highly educational synthesis consisting of 3 core concepts, an analogy, and a mini-quiz. Use HTML formatting like <h3> and <strong> and <ul> for structure.`;
        
        callGeminiAPI(prompt, []).then(response => {
            apolloLoading.classList.add('hidden');
            apolloChatHistory.classList.remove('hidden');
            apolloChatInputArea.classList.remove('hidden');
            
            STATE.apolloHistory.push({ role: 'user', parts: [{ text: prompt }] });
            STATE.apolloHistory.push({ role: 'model', parts: [{ text: response }] });
            
            renderApolloChat();
        });
    }
    
    sessionSeconds = 25 * 60; // Reset
    sessionStartSeconds = sessionSeconds;
    sessionAutoCompleted = false;
    updateTimerDisplay();
    
    sessionInterval = setInterval(() => {
        sessionSeconds--;
        updateTimerDisplay();
        if (sessionSeconds <= 0) {
            clearInterval(sessionInterval);
            sessionAutoCompleted = true;
            alert("⏰ Session complete! You studied the full time and earned 5 bonus credits! 💧💧💧💧💧");
            completeReviewSession();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(sessionSeconds / 60).toString().padStart(2, '0');
    const s = (sessionSeconds % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;
}

function completeReviewSession() {
    clearInterval(sessionInterval);

    let creditsEarned = 0;

    if (sessionAutoCompleted) {
        // Full timer bonus: 5 credits
        creditsEarned = 5;
    } else {
        // Partial: 1 credit per 5 minutes studied (minimum 5 minutes)
        const secondsStudied = sessionStartSeconds - sessionSeconds;
        creditsEarned = Math.floor(secondsStudied / (5 * 60));
    }

    if (creditsEarned > 0) {
        STATE.credits += creditsEarned;
    } else {
        alert('You need to study for at least 5 minutes to earn credits!');
    }

    // Mark earliest pending schedule as completed
    const pending = STATE.schedules.find(s => !s.completed && !s.missed);
    if (pending) {
        pending.completed = true;
    }

    saveState();
    updateUI();
    
    resetReviewView();
    switchView('dashboard');
    
    // Confetti effect could go here
}

function cancelReviewSession() {
    if(confirm('Are you sure you want to cancel? You will not earn credits.')) {
        clearInterval(sessionInterval);
        resetReviewView();
    }
}

function resetReviewView() {
    reviewSetup.classList.remove('hidden');
    activeSession.classList.add('hidden');
    fileApolloToggleContainer.classList.add('hidden');
    
    const el = filePreviewContainer.querySelector('img, iframe');
    if (el && el.src.startsWith('blob:')) {
        URL.revokeObjectURL(el.src);
    }
    filePreviewContainer.innerHTML = '';
    
    apolloContentContainer.classList.add('hidden');
    apolloChatHistory.innerHTML = '';
}

// Apollo API & Chat Logic
async function callGeminiAPI(prompt, history) {
    const endpoint = `/api/apollo`;
    const contents = [...history, { role: 'user', parts: [{ text: prompt }] }];
    
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data.text;
    } catch (err) {
        return `<strong>API Error:</strong> ${err.message}`;
    }
}

function renderApolloChat() {
    apolloChatHistory.innerHTML = '';
    // Skip the first user message (system prompt) when displaying
    STATE.apolloHistory.forEach((msg, index) => {
        if (index === 0 && msg.role === 'user') return;
        
        const div = document.createElement('div');
        const isSelf = msg.role === 'user';
        div.className = `message ${isSelf ? 'self' : 'other'}`;
        
        let formattedText = msg.parts[0].text;
        if (!isSelf && !formattedText.includes('<h')) {
             formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        }
        
        div.innerHTML = `
            <div class="message-sender">${isSelf ? STATE.user.username : 'Apollo AI'}</div>
            <div class="message-text">${formattedText}</div>
        `;
        apolloChatHistory.appendChild(div);
    });
    apolloChatHistory.scrollTop = apolloChatHistory.scrollHeight;
}

function sendApolloFollowUp() {
    const text = apolloChatInput.value.trim();
    if (!text) return;
    apolloChatInput.value = '';
    
    // Add user message to UI immediately
    STATE.apolloHistory.push({ role: 'user', parts: [{ text }] });
    renderApolloChat();
    
    // Add a loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message other';
    loadingDiv.innerHTML = `<div class="message-sender">Apollo AI</div><div class="message-text"><span class="spinner">⏳</span> Thinking...</div>`;
    apolloChatHistory.appendChild(loadingDiv);
    apolloChatHistory.scrollTop = apolloChatHistory.scrollHeight;
    
    const historyForAPI = STATE.apolloHistory.slice(0, -1);
    
    callGeminiAPI(text, historyForAPI).then(response => {
        STATE.apolloHistory.push({ role: 'model', parts: [{ text: response }] });
        renderApolloChat();
    });
}

// Community Logic
async function renderChat() {
    if (!STATE.community || !STATE.community.activeGroup) return;
    try {
        const res = await fetch('/api/chat');
        const globalChat = await res.json();
        const messages = globalChat[STATE.community.activeGroup] || [];
        
        chatMessages.innerHTML = '';
        messages.forEach(msg => {
            const div = document.createElement('div');
            const isSelf = STATE.user && msg.sender === STATE.user.username;
            div.className = `message ${isSelf ? 'self' : 'other'}`;
            div.innerHTML = `
                <div class="message-sender">${msg.sender}</div>
                <div class="message-text">${msg.text}</div>
            `;
            chatMessages.appendChild(div);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch(e) {}
}

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (text && STATE.user && STATE.user.loggedIn) {
        const group = STATE.community.activeGroup;
        chatInput.value = '';
        try {
            await fetch(`/api/chat/${group}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender: STATE.user.username, text: text })
            });
            renderChat();
        } catch(e) {}
    }
}

// Run app
init();

// Admin Logic
function renderAdminDashboard() {
    if (!adminUsersList) return;
    let totalUsers = 0;
    let totalCredits = 0;
    adminUsersList.innerHTML = '';

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('studyBloomState_')) {
            totalUsers++;
            const userState = JSON.parse(localStorage.getItem(key));
            totalCredits += userState.credits || 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${userState.user.username}</td>
                <td>${userState.user.email}</td>
                <td>${userState.credits}</td>
                <td>${userState.plant.type} (${Math.round(userState.plant.health)}%)</td>
                <td>
                    <button class="btn btn-warning small-btn" onclick="resetUserProgress('${userState.user.email}')">Reset</button>
                    <button class="btn danger-btn small-btn" onclick="deleteUser('${userState.user.email}')">Delete</button>
                </td>
            `;
            adminUsersList.appendChild(tr);
        }
    }

    adminTotalUsers.textContent = totalUsers;
    adminTotalCredits.textContent = totalCredits;
    renderAdminPlants();
}

window.resetUserProgress = function(email) {
    if(confirm(`Reset progress for ${email}?`)) {
        const key = `studyBloomState_${email}`;
        const userState = JSON.parse(localStorage.getItem(key));
        userState.credits = 0;
        userState.plant = { type: PLANT_TYPES[0].name, stage: 0, health: 100 };
        localStorage.setItem(key, JSON.stringify(userState));
        renderAdminDashboard();
        if (STATE.user.email === email) {
            STATE = userState;
            updateUI();
        }
    }
};

window.deleteUser = function(email) {
    if(confirm(`Delete user ${email}?`)) {
        localStorage.removeItem(`studyBloomState_${email}`);
        if (STATE.user.email === email) {
            btnLogout.click();
        } else {
            renderAdminDashboard();
        }
    }
};

function renderAdminPlants() {
    if (!adminPlantsList) return;
    adminPlantsList.innerHTML = '';
    PLANT_TYPES.forEach(pt => {
        const div = document.createElement('div');
        div.className = 'plant-option';
        div.innerHTML = `<span class="emoji">${pt.emoji}</span><span>${pt.name}</span>`;
        adminPlantsList.appendChild(div);
    });
}

if (adminSettingsForm) {
    adminSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = newPlantName.value.trim();
        const emoji = newPlantEmoji.value.trim();
        if (name && emoji) {
            PLANT_TYPES.push({ name, emoji });
            const customPlants = PLANT_TYPES.filter(pt => !['Sunflower', 'Rose', 'Tulip', 'Daisy', 'Lily', 'Cactus', 'Birds of Paradise', 'Bonsai Tree', 'Hyacinth', 'Sampaguita'].includes(pt.name));
            localStorage.setItem('studyBloomCustomPlants', JSON.stringify(customPlants));
            newPlantName.value = '';
            newPlantEmoji.value = '';
            renderAdminPlants();
            populatePlantModal();
            alert(`Added new plant: ${name} ${emoji}`);
        }
    });
}


function initiateFileApolloSession(techName) {
    if(!techName) techName = document.querySelector(`.technique-card[data-technique="${STATE.selectedTechnique}"] h4`).textContent;
    apolloLoading.classList.remove('hidden');
    apolloChatHistory.classList.add('hidden');
    apolloChatInputArea.classList.add('hidden');
    
    const prompt = `You are Apollo, an expert study tutor. The user is studying a file named "${currentUploadedFile.name}" using the "${techName}" technique. Since you cannot read the file directly right now, please act as a general tutor for the topics they might bring up, ask them to summarize what they are reading, and help them stick to their technique. Use HTML formatting.`;
    
    callGeminiAPI(prompt, []).then(response => {
        apolloLoading.classList.add('hidden');
        apolloChatHistory.classList.remove('hidden');
        apolloChatInputArea.classList.remove('hidden');
        
        STATE.apolloHistory.push({ role: 'user', parts: [{ text: prompt }] });
        STATE.apolloHistory.push({ role: 'model', parts: [{ text: response }] });
        
        renderApolloChat();
    });
}
