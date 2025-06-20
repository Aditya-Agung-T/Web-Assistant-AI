document.addEventListener('DOMContentLoaded', async () => {
    // State management
    let personas = {};
    let allChatHistories = {};
    let chatHistory = [];
    let selectedPersona = null;
    let currentPersonaId = null;

    // DOM Elements - dengan null checking
    const personaList = document.getElementById('persona-list');
    const chatHeader = document.getElementById('chat-header-title'); // Perbaikan: gunakan ID yang benar
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const partnerModeToggle = document.getElementById('partner-mode-toggle');
    const addPersonaBtn = document.getElementById('add-persona-btn');
    const welcomeMessage = document.querySelector('.welcome-message');
    const resetChatBtn = document.getElementById('reset-chat-btn');

    // Modal Form Elements - dengan fallback untuk mencegah error
    const modalOverlay = document.getElementById('persona-modal') || document.getElementById('persona-modal-overlay');
    const personaForm = document.getElementById('persona-form');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const personaNameInput = document.getElementById('persona-name');
    const personaPromptInput = document.getElementById('persona-prompt');

    // Mobile Elements
    const mobileToggle = document.getElementById('mobile-sidebar-toggle');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');

    // Mobile Sidebar Functions
    function showSidebar() {
        if (sidebar) sidebar.classList.add('show');
        if (overlay) overlay.classList.add('show');
    }

    function hideSidebar() {
        if (sidebar) sidebar.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
    }

    // Event Listeners dengan null checking
    if (mobileToggle) {
        mobileToggle.addEventListener('click', showSidebar);
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', hideSidebar);
    }

    if (overlay) {
        overlay.addEventListener('click', hideSidebar);
    }

    // Hide sidebar when persona is selected on mobile
    document.addEventListener('click', function(e) {
        if (e.target.closest('.persona-item') && window.innerWidth <= 768) {
            setTimeout(hideSidebar, 300);
        }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            hideSidebar();
        }
    });

    // Reset Chat Button
    if (resetChatBtn) {
        resetChatBtn.addEventListener('click', async () => {
            if (!currentPersonaId) return;
            
            if (confirm('Apakah Anda yakin ingin menghapus semua riwayat percakapan dengan persona ini?')) {
                try {
                    await fetch(`/delete-history/${currentPersonaId}`, { method: 'POST' });
                    allChatHistories[currentPersonaId] = [];
                    chatHistory = [];
                    if (chatBox) chatBox.innerHTML = '';
                    
                    const notificationRow = document.createElement('div');
                    notificationRow.className = 'welcome-message';
                    notificationRow.innerHTML = '<p>Riwayat percakapan telah dihapus. Mulai percakapan baru!</p>';
                    if (chatBox) chatBox.appendChild(notificationRow);
                } catch (error) {
                    console.error('Error resetting chat:', error);
                    alert('Gagal menghapus riwayat percakapan.');
                }
            }
        });
    }
    
    // Fungsi untuk mengambil data persona dari server
    async function loadPersonas() {
        try {
            const response = await fetch('/get-personas');
            if (!response.ok) throw new Error('Gagal mengambil data persona.');
            personas = await response.json();
            
            if (personaList) {
                personaList.innerHTML = '';
                Object.keys(personas).forEach(id => {
                    addPersonaToSidebar(id, personas[id]);
                    allChatHistories[id] = [];
                });
            }
        } catch (error) {
            console.error("Error loading personas:", error);
            if (personaList) {
                personaList.innerHTML = '<li>Gagal memuat persona.</li>';
            }
        }
    }

    // Fungsi untuk menambahkan item persona ke sidebar
    function addPersonaToSidebar(id, persona) {
        if (!personaList) return;
        
        const listItem = document.createElement('li');
        listItem.className = 'persona-item';
        listItem.dataset.id = id;
        listItem.innerHTML = `
            <img src="${persona.avatar}" alt="${persona.name}">
            <div class="persona-info">
                <span>${persona.name}</span>
                <small title="${persona.displayRole}">${persona.displayRole}</small>
            </div>`;
        listItem.addEventListener('click', () => selectPersona(id));
        personaList.appendChild(listItem);
    }

    // Fungsi untuk memilih persona
    async function selectPersona(personaId) {
        if (!personas[personaId]) return;
        
        if (welcomeMessage) welcomeMessage.style.display = 'none';

        selectedPersona = personas[personaId];
        currentPersonaId = personaId;

        if (chatBox) {
            chatBox.innerHTML = '<div class="notification-message">Memuat riwayat percakapan...</div>';
        }

        try {
            const response = await fetch(`/get-history/${personaId}`);
            if (!response.ok) throw new Error('Gagal memuat riwayat.');
            
            const history = await response.json();
            allChatHistories[personaId] = history;
            chatHistory = allChatHistories[personaId];
            renderChatHistory(chatHistory);
        } catch (error) {
            console.error('Error fetching history:', error);
            if (chatBox) {
                chatBox.innerHTML = '<div class="notification-message" style="color: red;">Gagal memuat riwayat.</div>';
            }
            allChatHistories[personaId] = [];
            chatHistory = [];
        }

        if (chatHeader) {
            chatHeader.textContent = `Chat dengan ${selectedPersona.name}`;
        }
        if (userInput) {
            userInput.placeholder = `Kirim pesan ke ${selectedPersona.name}...`;
            userInput.disabled = false;
        }
        if (sendButton) {
            sendButton.disabled = false;
        }

        document.querySelectorAll('.persona-item').forEach(el => el.classList.remove('selected'));
        const selectedElement = document.querySelector(`.persona-item[data-id="${personaId}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
        
        partnerModeToggle.checked = selectedPersona.isPartner;
        userInput.focus();
    }

    // Fungsi untuk merender riwayat chat
    function renderChatHistory(history) {
        if (!chatBox) return;
        
        chatBox.innerHTML = '';
        history.forEach((message) => {
            if (!message || !message.role || !message.parts || !message.parts[0] || typeof message.parts[0].text === 'undefined') {
                return; 
            }
            const isUser = message.role === 'user';
            const sender = isUser ? 'user' : 'model';
            addMessageToUI(sender, message.parts[0].text, true);
        });
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Fungsi untuk menambah pesan ke UI
    function addMessageToUI(sender, text, isHistory = false) {
        if (!chatBox) return null;
        
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
            // Check if marked is available
            if (typeof marked !== 'undefined') {
                messageElement.innerHTML = marked.parse(text);
            } else {
                messageElement.innerHTML = text.replace(/\n/g, '<br>');
            }
            
            // Check if hljs is available
            if (typeof hljs !== 'undefined') {
                messageElement.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
            }
            addCopyButtons(messageElement);
        }
        
        messageRow.appendChild(avatar);
        messageRow.appendChild(messageElement);
        chatBox.appendChild(messageRow);
        
        if (!isHistory) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
        return messageElement;
    }
    
    // Fungsi untuk mengirim pesan
    const sendMessage = async () => {
        if (!selectedPersona || !userInput || userInput.disabled) return;
        const userMessage = userInput.value.trim();
        if (userMessage === '') return;
        
        addMessageToUI('user', userMessage);
        chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
        userInput.value = '';
        userInput.disabled = true;
        if (sendButton) sendButton.disabled = true;

        if (!chatBox) return;

        const loadingIndicatorRow = document.createElement('div');
        loadingIndicatorRow.id = 'loading-indicator';
        loadingIndicatorRow.classList.add('message-row', 'model-message-row');
        loadingIndicatorRow.innerHTML = `<img class="message-avatar" src="${selectedPersona.avatar}" alt="AI"><div class="message model-message">Sedang berpikir...</div>`;
        chatBox.appendChild(loadingIndicatorRow);
        chatBox.scrollTop = chatBox.scrollHeight;

        setTimeout(async () => {
            const indicatorContent = loadingIndicatorRow.querySelector('.model-message');
            if (indicatorContent) {
                indicatorContent.innerHTML = `Sedang mengetik <span class="typing-indicator"><span></span><span></span><span></span></span>`;
            }
            
            const basePrompt = selectedPersona.basePrompt;
            let modeInstructions = '';
            const isPartnerMode = partnerModeToggle.checked;

            if (isPartnerMode) {
                modeInstructions = `\n\nATURAN MODE PARTNER: Anda sekarang adalah 'partner project' yang proaktif dan kolaboratif. Jika permintaan pengguna bersifat luas atau merupakan ajakan untuk memulai proyek, tugas Anda adalah membantu pembuatan proyek tersebut. Mulailah dengan menyusun kerangka, arsitektur, atau langkah-langkah yang relevan dengan keahlian inti Anda. Jangan ragu untuk mengambil inisiatif dan tawarkan solusi yang relevan dengan proyek yang diminta.`;
            } else {
                modeInstructions = `\n\nATURAN MODE NORMAL: Anda berfungsi seperti dokumentasi interaktif. Sebelum menjawab, periksa permintaan pengguna. Jika permintaan itu bersifat luas atau merupakan ajakan untuk memulai proyek (contoh: "buatkan aplikasi"), maka jawaban Anda HARUS berupa penolakan sopan untuk memulai proyek dalam mode ini, dan Anda harus meminta pengguna untuk mengajukan pertanyaan teknis yang lebih konkret dan spesifik.`;
            }
            
            const roleEnforcer = `\n\nATURAN UNIVERSAL:
            1. Selalu patuhi peran inti Anda sebagai ${selectedPersona.displayRole}. Jika pengguna bertanya sesuatu yang jelas di luar lingkup keahlian Anda, tolak dengan sopan.
            2. Selalu gunakan format Markdown untuk daftar. Gunakan bullet points (diawali dengan \`*\` atau \`-\`) atau daftar bernomor (diawali dengan \`1.\`, \`2.\`) untuk menyajikan beberapa item atau opsi.
            3. ATURAN BAHASA (SANGAT PENTING): Anda wajib dan harus merespons HANYA dalam Bahasa Indonesia. Jangan pernah mencampur bahasa lain (seperti Inggris, Jepang, dll) dalam satu respons. Semua istilah teknis harus dijelaskan dalam Bahasa Indonesia.`;

            const finalSystemPrompt = basePrompt + modeInstructions + roleEnforcer;
            const payload = {
                prompt: finalSystemPrompt,
                history: chatHistory,
                persona_id_str: currentPersonaId
            };

            try {
                const response = await fetch('/get-response', {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                const aiMessage = data.response;
                
                loadingIndicatorRow.remove();
                
                const aiMessageElement = addMessageToUI('model', aiMessage);
                chatHistory.push({ role: 'model', parts: [{ text: aiMessage }] });
                if (typeof hljs !== 'undefined' && aiMessageElement) {
                    aiMessageElement.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
                }
                if (aiMessageElement) {
                    addCopyButtons(aiMessageElement);
                }
            } catch (error) {
                console.error('Error:', error);
                loadingIndicatorRow.remove();
                addMessageToUI('model', 'Maaf, terjadi masalah koneksi.');
            } finally {
                if (userInput) userInput.disabled = false;
                if (sendButton) sendButton.disabled = false;
                if (userInput) userInput.focus();
            }
        }, 1200);
    };

    // --- EVENT LISTENERS dengan null checking ---
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    if (userInput) {
        userInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    if (addPersonaBtn && modalOverlay) {
        addPersonaBtn.addEventListener('click', () => {
            if (personaForm) personaForm.reset();
            modalOverlay.style.display = 'flex';
        });
    }

    if (modalCancelBtn && modalOverlay) {
        modalCancelBtn.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
    }

    if (personaForm) {
        personaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!personaNameInput || !personaPromptInput) return;
            
            const name = personaNameInput.value.trim();
            const userDescription = personaPromptInput.value.trim(); 
            if (!name || !userDescription) return;

            if (modalSaveBtn) {
                modalSaveBtn.disabled = true;
                modalSaveBtn.textContent = 'Membangun AI...';
            }
            
            try {
                const [summaryData, promptData] = await Promise.all([
                    fetch('/summarize-role', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ description: userDescription })
                    }).then(res => res.json()),
                    fetch('/generate-prompt', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ description: userDescription })
                    }).then(res => res.json())
                ]);
                
                const newPersonaData = {
                    name: name,
                    avatar: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`,
                    displayRole: summaryData.short_role,
                    basePrompt: `Nama Anda adalah ${name}. ${promptData.nuanced_prompt}`
                };

                const response = await fetch('/save-persona', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newPersonaData)
                });
                const savedPersona = await response.json();

                personas[savedPersona.persona_id_str] = savedPersona;
                addPersonaToSidebar(savedPersona.persona_id_str, savedPersona);
                
                if (modalOverlay) modalOverlay.style.display = 'none';
                selectPersona(savedPersona.persona_id_str);

            } catch (error) {
                console.error('Error saat membuat persona:', error);
                alert('Gagal membuat persona. Silakan coba lagi.');
            } finally {
                if (modalSaveBtn) {
                    modalSaveBtn.disabled = false;
                    modalSaveBtn.textContent = 'Simpan';
                }
            }
        });
    }
    
    // --- PERBAIKAN LOGIKA TOGGLE MODE PARTNER (TANPA KONFIRMASI) ---
    partnerModeToggle.addEventListener('change', async (event) => {
        if (!selectedPersona) return;

        const isChecked = event.target.checked;
        const personaIdStr = selectedPersona.persona_id_str;
        const originalCheckedState = !isChecked; // Keadaan sebelum di-klik

        // Langsung tampilkan pesan "resetting"
        chatBox.innerHTML = '<div class="notification-message">Menyimpan mode & mereset percakapan...</div>';
        
        try {
            // 1. Update mode partner di server
            await fetch('/update-persona-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    persona_id_str: personaIdStr,
                    is_partner_mode: isChecked
                })
            });
            
            // 2. Hapus riwayat di server
            await fetch(`/delete-history/${currentPersonaId}`, { method: 'POST' });

            // 3. Update state di frontend setelah semua berhasil
            selectedPersona.isPartner = isChecked;
            personas[currentPersonaId].isPartner = isChecked;
            
            allChatHistories[currentPersonaId] = [];
            chatHistory = [];
            renderChatHistory(chatHistory); // Ini akan membersihkan chatbox

            // Tampilkan notifikasi sukses
            const mode = isChecked ? 'diaktifkan' : 'dinonaktifkan';
            const notificationRow = document.createElement('div');
            notificationRow.className = 'welcome-message';
            notificationRow.innerHTML = `<p>Mode Partner telah <b>${mode}</b> dan riwayat percakapan dihapus.</p>`;
            chatBox.appendChild(notificationRow);

        } catch (error) {
            console.error('Gagal memproses perubahan mode partner:', error);
            alert('Terjadi kesalahan saat mengganti mode.');
            // Jika terjadi error, kembalikan semuanya ke state semula
            event.target.checked = originalCheckedState;
            selectPersona(currentPersonaId); // Muat ulang untuk konsistensi
        } finally {
            userInput.focus();
        }
    });

    // Fungsi utilitas
    function addCopyButtons(container) {
        if (!container) return;
        
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
                    setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
                });
            });
            block.appendChild(copyButton);
        });
    }

    // Inisialisasi Awal
    await loadPersonas();
});