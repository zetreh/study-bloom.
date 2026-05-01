const fs = require('fs');

let content = fs.readFileSync('c:\\Study Grow\\app.js', 'utf-8');

const replacements = [
  {
    // Add variables
    old: `const apolloChatHistory = document.getElementById('apollo-chat-history');`,
    new: `const fileApolloToggleContainer = document.getElementById('file-apollo-toggle-container');
const btnFileApolloOn = document.getElementById('btn-file-apollo-on');
const btnFileApolloOff = document.getElementById('btn-file-apollo-off');
const apolloChatHistory = document.getElementById('apollo-chat-history');`
  },
  {
    // Add event listeners for toggles
    old: `    apolloTopicInput.addEventListener('input', (e) => {
        STATE.apolloTopic = e.target.value.trim();
        checkReviewReady();
    });`,
    new: `    apolloTopicInput.addEventListener('input', (e) => {
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
    }`
  },
  {
    // Modify startReviewSession for file source
    old: `    // Render file or Apollo preview
    if (STATE.reviewSource === 'file' && currentUploadedFile) {
        filePreviewContainer.classList.remove('hidden');
        apolloContentContainer.classList.add('hidden');
        filePreviewContainer.innerHTML = ''; // Clear previous
        
        const type = currentUploadedFile.type;`,
    new: `    // Render file or Apollo preview
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
        
        const type = currentUploadedFile.type;`
  },
  {
    // Reset toggle in resetReviewView
    old: `function resetReviewView() {
    reviewSetup.classList.remove('hidden');
    activeSession.classList.add('hidden');`,
    new: `function resetReviewView() {
    reviewSetup.classList.remove('hidden');
    activeSession.classList.add('hidden');
    fileApolloToggleContainer.classList.add('hidden');`
  }
];

let replaced = true;
replacements.forEach((r, i) => {
    if (!content.includes(r.old)) {
        console.log("Could not find chunk " + i);
        replaced = false;
    }
    content = content.replace(r.old, r.new);
});

// Add initiateFileApolloSession function
if (!content.includes('function initiateFileApolloSession')) {
    const initiateFunc = `
function initiateFileApolloSession(techName) {
    if(!techName) techName = document.querySelector(\`.technique-card[data-technique="\${STATE.selectedTechnique}"] h4\`).textContent;
    apolloLoading.classList.remove('hidden');
    apolloChatHistory.classList.add('hidden');
    apolloChatInputArea.classList.add('hidden');
    
    const prompt = \`You are Apollo, an expert study tutor. The user is studying a file named "\${currentUploadedFile.name}" using the "\${techName}" technique. Since you cannot read the file directly right now, please act as a general tutor for the topics they might bring up, ask them to summarize what they are reading, and help them stick to their technique. Use HTML formatting.\`;
    
    callGeminiAPI(prompt, []).then(response => {
        apolloLoading.classList.add('hidden');
        apolloChatHistory.classList.remove('hidden');
        apolloChatInputArea.classList.remove('hidden');
        
        STATE.apolloHistory.push({ role: 'user', parts: [{ text: prompt }] });
        STATE.apolloHistory.push({ role: 'model', parts: [{ text: response }] });
        
        renderApolloChat();
    });
}
`;
    content += initiateFunc;
}

if (replaced) {
    fs.writeFileSync('c:\\Study Grow\\app.js', content, 'utf-8');
    console.log('Successfully added Apollo toggle logic.');
} else {
    console.log('Failed to add toggle logic.');
}
