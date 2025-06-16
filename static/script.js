const personas = {
    'emil': {
        name: 'Emil',
        avatar: 'https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Emil',
        displayRole: 'Programmer Web & AI',
        basePrompt: 'Nama Anda adalah Emil. Peran utama Anda adalah sebagai sumber daya teknis ahli. Anda dapat memberikan penjelasan, panduan arsitektur, dan contoh kode untuk pertanyaan teknis terkait pengembangan web dan AI.',
        isPartner: false 
    },
    'anton': {
        name: 'Anton',
        avatar: 'https://api.dicebear.com/8.x/initials/svg?seed=Anton',
        displayRole: 'Analis Politik Kritis',
        basePrompt: 'Nama Anda adalah Anton. Peran utama Anda adalah sebagai analis politik yang kritis dan objektif. Anda selalu memberikan jawaban yang seimbang dari berbagai sudut pandang dan data.',
        isPartner: false
    }
};
    
const personaSelector = document.getElementById('persona-selector');
const chatContainer = document.getElementById('chat-container');
const chatHeader = document.getElementById('chat-header');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const partnerModeToggle = document.getElementById('partner-mode-toggle');
let allChatHistories = {};
let chatHistory = [];
let selectedPersona = null;
let currentPersonaId = null;
const modalOverlay = document.getElementById('persona-modal-overlay');
const personaForm = document.getElementById('persona-form');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');
const personaNameInput = document.getElementById('persona-name');
const personaPromptInput = document.getElementById('persona-prompt');

function renderChatHistory(history) {
    chatBox.innerHTML = '';
    history.forEach((message, index) => {
        try {
            if (!message || !message.role || !message.parts || !message.parts[0] || typeof message.parts[0].text === 'undefined') {
                console.error(`Skipping malformed message at index ${index}:`, message);
                return; 
            }
            const isUser = message.role === 'user';
            const sender = isUser ? 'user' : 'model';
            const text = message.parts[0].text;
            
            const messageRow = document.createElement('div');
            messageRow.classList.add('message-row', `${sender}-message-row`);
            
            const avatar = document.createElement('img');
            avatar.classList.add('message-avatar');
            avatar.src = sender === 'model' ? selectedPersona.avatar : 'https://api.dicebear.com/8.x/adventurer-neutral/svg?seed=User';
            
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', `${sender}-message`);
            
            if (sender === 'user') {
                messageElement.textContent = text;
            } else {
                messageElement.innerHTML = marked.parse(text);
                messageElement.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
                addCopyButtons(messageElement);
            }
            
            messageRow.appendChild(avatar);
            messageRow.appendChild(messageElement);
            chatBox.appendChild(messageRow);
        } catch (error) {
            console.error(`Failed to render message at index ${index}:`, message, error);
        }
    });
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function selectPersona(personaId) {
    if (!personas[personaId]) return;
    selectedPersona = personas[personaId];
    currentPersonaId = personaId;

    // Tampilkan loading atau bersihkan chatbox lama
    chatBox.innerHTML = '<div class="notification-message">Memuat riwayat percakapan...</div>';

    try {
        // Panggil endpoint baru kita
        const response = await fetch(`/get-history/${personaId}`);
        if (!response.ok) {
            throw new Error('Gagal memuat riwayat.');
        }
        const history = await response.json();
        
        // Simpan ke state lokal dan render
        allChatHistories[personaId] = history;
        chatHistory = allChatHistories[personaId];
        renderChatHistory(chatHistory);

    } catch (error) {
        console.error('Error fetching history:', error);
        chatBox.innerHTML = '<div class="notification-message" style="color: red;">Gagal memuat riwayat.</div>';
        allChatHistories[personaId] = []; // Reset jika gagal
        chatHistory = [];
    }
    chatHistory = allChatHistories[personaId];
    renderChatHistory(chatHistory);
    chatHeader.textContent = `Chat dengan ${selectedPersona.name}`;
    userInput.placeholder = `Kirim pesan ke ${selectedPersona.name}...`;
    userInput.disabled = false;
    sendButton.disabled = false;
    document.querySelectorAll('.persona-option').forEach(el => el.classList.remove('selected'));
    const selectedElement = document.querySelector(`.persona-option[data-id="${personaId}"]`);
    if (selectedElement) {
        selectedElement.classList.add('selected');
    }
    partnerModeToggle.checked = selectedPersona.isPartner;
    userInput.focus();
}

function addMessageToUI(sender, text) {
    const messageRow = document.createElement('div');
    messageRow.classList.add('message-row', `${sender}-message-row`);
    const avatar = document.createElement('img');
    avatar.classList.add('message-avatar');
    avatar.src = sender === 'model' ? selectedPersona.avatar : 'https://api.dicebear.com/8.x/adventurer-neutral/svg?seed=User';
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    if (sender === 'user') {
        messageElement.textContent = text;
    } else {
        messageElement.innerHTML = marked.parse(text);
    }
    messageRow.appendChild(avatar);
    messageRow.appendChild(messageElement);
    chatBox.appendChild(messageRow);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageElement;
}

function addPersonaOptionToUI(id, persona) {
    const option = document.createElement('div');
    option.className = 'persona-option';
    option.dataset.id = id;
    option.innerHTML = `<img src="${persona.avatar}" alt="${persona.name}"><span>${persona.name}</span><small class="persona-role" title="${persona.displayRole}">${persona.displayRole}</small>`;
    option.addEventListener('click', () => selectPersona(id));
    const addBtnContainer = document.getElementById('add-persona-btn-container');
    if (addBtnContainer) {
        personaSelector.insertBefore(option, addBtnContainer);
    } else {
        personaSelector.appendChild(option);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Baris yang menyembunyikan chat container TELAH DIHAPUS DARI SINI.
    
    Object.keys(personas).forEach(id => {
        addPersonaOptionToUI(id, personas[id]);
        allChatHistories[id] = [];
    });

    const addBtnContainer = document.createElement('div');
    addBtnContainer.id = 'add-persona-btn-container';
    addBtnContainer.className = 'persona-option';
    const addBtn = document.createElement('button');
    addBtn.id = 'add-persona-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Buat Persona Baru';
    addBtnContainer.appendChild(addBtn);
    personaSelector.appendChild(addBtnContainer);
    
    addBtn.addEventListener('click', () => {
        modalOverlay.style.display = 'flex';
    });
});

modalCancelBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'none';
});

personaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = personaNameInput.value.trim();
    const userDescription = personaPromptInput.value.trim(); 
    if (!name || !userDescription) return;
    modalSaveBtn.disabled = true;
    modalSaveBtn.textContent = 'Membangun AI...';
    try {
        const [summaryData, promptData] = await Promise.all([
            fetch('/summarize-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: userDescription })
            }).then(res => res.json()),
            fetch('/generate-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: userDescription })
            }).then(res => res.json())
        ]);
        
        const shortRole = summaryData.short_role;
        const nuancedPrompt = promptData.nuanced_prompt;
        const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        const newPersona = {
            name: name,
            avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`,
            displayRole: shortRole,
            basePrompt: `Nama Anda adalah ${name}. ${nuancedPrompt}`,
            isPartner: false
        };
        personas[id] = newPersona;
        allChatHistories[id] = [];
        addPersonaOptionToUI(id, newPersona);
        personaNameInput.value = '';
        personaPromptInput.value = '';
        modalOverlay.style.display = 'none';
        selectPersona(id);
    } catch (error) {
        console.error('Error saat membuat persona:', error);
        alert('Gagal membuat persona. Silakan coba lagi.');
    } finally {
        modalSaveBtn.disabled = false;
        modalSaveBtn.textContent = 'Simpan';
    }
});

const sendMessage = async () => {
    if (!selectedPersona || userInput.disabled) return;
    const userMessage = userInput.value.trim();
    if (userMessage === '') return;
    
    addMessageToUI('user', userMessage);
    chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
    userInput.value = '';

    const basePrompt = selectedPersona.basePrompt;
    let modeInstructions = '';
    const isPartnerMode = partnerModeToggle.checked;

    if (isPartnerMode) {
        modeInstructions = `\n\nATURAN MODE PARTNER: Anda sekarang adalah 'partner proyek' yang proaktif dan kolaboratif. Jika pengguna mengajak membuat proyek, tugas Anda adalah membantu merencanakannya. Mulailah dengan menyusun kerangka, arsitektur, atau langkah-langkah awal yang relevan dengan keahlian inti Anda. Jangan ragu mengambil inisiatif.`;
    } else {
        modeInstructions = `\n\nATURAN MODE NORMAL: Anda berfungsi seperti dokumentasi interaktif. Sebelum menjawab, periksa permintaan pengguna. Jika permintaan itu bersifat luas atau merupakan ajakan untuk memulai proyek (contoh: "ayo buat aplikasi"), maka jawaban Anda HARUS berupa penolakan sopan untuk memulai proyek dalam mode ini, dan Anda harus meminta pengguna untuk mengajukan pertanyaan teknis yang lebih konkret dan spesifik.`;
    }
    
    const roleEnforcer = `\n\nATURAN UNIVERSAL: Selalu patuhi peran inti Anda sebagai ${selectedPersona.displayRole}. Jika pengguna bertanya sesuatu yang jelas di luar lingkup keahlian Anda, tolak dengan sopan.`;
    
    const finalSystemPrompt = basePrompt + modeInstructions + roleEnforcer;

    const payload = {
        prompt: finalSystemPrompt,
        history: chatHistory,
        persona_id: currentPersonaId // Tambahkan baris ini
    };

    userInput.disabled = true;
    sendButton.disabled = true;
    const loadingIndicatorRow = document.createElement('div');
    loadingIndicatorRow.id = 'loading-indicator';
    loadingIndicatorRow.classList.add('message-row', 'ai-message-row');
    loadingIndicatorRow.innerHTML = `<img class="message-avatar" src="${selectedPersona.avatar}" alt="AI"><div class="message ai-message typing-indicator"><span></span><span></span><span></span></div>`;
    chatBox.appendChild(loadingIndicatorRow);
    chatBox.scrollTop = chatBox.scrollHeight;
    try {
        const response = await fetch('/get-response', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const aiMessage = data.response;
        
        loadingIndicatorRow.remove();
        
        const aiMessageElement = addMessageToUI('model', aiMessage);
        chatHistory.push({ role: 'model', parts: [{ text: aiMessage }] });
        aiMessageElement.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
        addCopyButtons(aiMessageElement);
    } catch (error) {
        console.error('Error:', error);
        loadingIndicatorRow.remove();
        addMessageToUI('model', 'Maaf, terjadi masalah koneksi.');
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.focus();
    }
};

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});
    
partnerModeToggle.addEventListener('change', () => {
    if (!selectedPersona) return; 

    selectedPersona.isPartner = partnerModeToggle.checked;

    const historyToReset = allChatHistories[currentPersonaId];
    if (historyToReset) {
        historyToReset.length = 0; 
    }
    
    renderChatHistory(chatHistory);

    const mode = partnerModeToggle.checked ? 'diaktifkan' : 'dinonaktifkan';
    const notificationRow = document.createElement('div');
    notificationRow.className = 'notification-message';
    notificationRow.textContent = `Mode Partner telah ${mode}. Konteks percakapan di-reset, silakan mulai topik baru.`;
    chatBox.appendChild(notificationRow);
    userInput.focus();
});

function addCopyButtons(container) {
    const codeBlocks = container.querySelectorAll('pre');
    codeBlocks.forEach(block => {
        const codeElement = block.querySelector('code');
        if (!codeElement) return;
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-btn';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(codeElement.innerText).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 2000);
            }).catch(err => {
                console.error('Gagal menyalin kode: ', err);
            });
        });
        block.appendChild(copyButton);
    });
}