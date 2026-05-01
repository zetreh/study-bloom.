import sys

with open('c:\\Study Grow\\app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace init
old_init = """function init() {
    const customPlants = localStorage.getItem('studyBloomCustomPlants');
    if (customPlants) {
        PLANT_TYPES = PLANT_TYPES.concat(JSON.parse(customPlants));
    }

    loadState();"""
new_init = """async function init() {
    try {
        const res = await fetch('/api/plants');
        if (res.ok) {
            const customPlants = await res.json();
            if (customPlants.length) PLANT_TYPES = PLANT_TYPES.concat(customPlants);
        }
    } catch(e) {}

    await loadState();"""
content = content.replace(old_init, new_init)

# 2. Replace loadState
old_loadState = """function loadState() {
    const activeEmail = localStorage.getItem('studyBloomActiveUser');
    if (activeEmail) {
        const saved = localStorage.getItem(`studyBloomState_${activeEmail}`);
        if (saved) {
            STATE = JSON.parse(saved);
            STATE.schedules.forEach(s => s.date = new Date(s.date));
            STATE.user.loggedIn = true;
        } else {
            localStorage.removeItem('studyBloomActiveUser');
            STATE.user.loggedIn = false;
        }
    }
}"""
new_loadState = """async function loadState() {
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
}"""
content = content.replace(old_loadState, new_loadState)

# 3. Replace saveState
old_saveState = """function saveState() {
    if (STATE.user && STATE.user.email) {
        localStorage.setItem(`studyBloomState_${STATE.user.email}`, JSON.stringify(STATE));
    }
}"""
new_saveState = """async function saveState() {
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
}"""
content = content.replace(old_saveState, new_saveState)

# 4. Replace Auth Form Event Listener
old_auth = """    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        if (username && email) {
            localStorage.setItem('studyBloomActiveUser', email);
            
            let isNewUser = false;
            const saved = localStorage.getItem(`studyBloomState_${email}`);
            if (saved) {
                STATE = JSON.parse(saved);
                STATE.schedules.forEach(s => s.date = new Date(s.date));
            } else {
                STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));
                isNewUser = true;
            }
            
            STATE.user.loggedIn = true;
            STATE.user.username = username;
            STATE.user.email = email;
            STATE.user.isAdmin = (email === 'admin@studybloom.com');
            saveState();
            showMainApp();
            
            if (isNewUser) {
                setTimeout(() => plantModal.classList.remove('hidden'), 100);
            }
        }
    });"""
new_auth = """    authForm.addEventListener('submit', async (e) => {
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
    });"""
content = content.replace(old_auth, new_auth)

# 5. Remove Settings Form listener
old_settings = """    // Settings logic restored for frontend-only architecture
    const settingsForm = document.getElementById('settings-form');
    const geminiApiKeyInput = document.getElementById('gemini-api-key');

    if (settingsForm) {
        // Load existing key
        const savedKey = localStorage.getItem('studyBloomGeminiKey');
        if (savedKey) {
            geminiApiKeyInput.value = savedKey;
        }

        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const key = geminiApiKeyInput.value.trim();
            if (key) {
                localStorage.setItem('studyBloomGeminiKey', key);
                alert('API Key saved successfully!');
            } else {
                localStorage.removeItem('studyBloomGeminiKey');
                alert('API Key removed.');
            }
        });
    }"""
new_settings = """    // Settings are handled on backend now."""
content = content.replace(old_settings, new_settings)

# 6. Replace callGeminiAPI
old_gemini = """async function callGeminiAPI(prompt, history) {
    const apiKey = localStorage.getItem('studyBloomGeminiKey');
    if (!apiKey) {
        return "<strong>Error:</strong> Please configure your Gemini API Key in Settings first.";
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const contents = [...history, { role: 'user', parts: [{ text: prompt }] }];
    
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    } catch (err) {
        return `<strong>API Error:</strong> ${err.message}`;
    }
}"""
new_gemini = """async function callGeminiAPI(prompt, history) {
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
}"""
content = content.replace(old_gemini, new_gemini)

# 7. Replace Chat Logic
old_chat = """// Global Chat Logic
function getGlobalChat() {
    const savedChat = localStorage.getItem('studyBloomGlobalChat');
    if (savedChat) return JSON.parse(savedChat);
    const defaultChat = {
        'general': [{ sender: 'System', text: 'Welcome to General Chat! Share your notes here.' }],
        'biology': [{ sender: 'System', text: 'Biology study group active.' }],
        'history': [{ sender: 'System', text: 'Discuss history timelines here.' }],
        'programming': [{ sender: 'System', text: 'Share your code snippets!' }]
    };
    localStorage.setItem('studyBloomGlobalChat', JSON.stringify(defaultChat));
    return defaultChat;
}

function saveGlobalChat(chatObj) {
    localStorage.setItem('studyBloomGlobalChat', JSON.stringify(chatObj));
}

// Community Logic
function renderChat() {
    if (!STATE.community || !STATE.community.activeGroup) return;
    const globalChat = getGlobalChat();
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
}

function sendChatMessage() {
    const text = chatInput.value.trim();
    if (text && STATE.user && STATE.user.loggedIn) {
        const group = STATE.community.activeGroup;
        const globalChat = getGlobalChat();
        if (!globalChat[group]) globalChat[group] = [];
        
        globalChat[group].push({
            sender: STATE.user.username,
            text: text
        });
        chatInput.value = '';
        saveGlobalChat(globalChat);
        renderChat();
    }
}"""
new_chat = """// Community Logic
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
}"""
content = content.replace(old_chat, new_chat)

with open('c:\\Study Grow\\app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done with basic sync replacements.')
