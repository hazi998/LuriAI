// =========================================================
// 1. BÖLME DEĞERİ (Hassasiyet) & AYARLAR
// =========================================================
const TILT_SENSITIVITY = 400;

// =========================================================
// 2. OTURUM VE SOHBET GEÇMİŞİ YÖNETİMİ (LOCALSTORAGE)
// =========================================================
let sessions = JSON.parse(localStorage.getItem('luri_chat_sessions')) || [];
let activeSessionId = null;
let chatHistory = []; // O anki aktif oturumun Gemini API hafızası

const chatHistoryList = document.getElementById('chatHistoryList');
const newChatBtn = document.getElementById('newChatBtn');

document.addEventListener('DOMContentLoaded', () => {
    renderHistoryList();
    if (sessions.length > 0) {
        loadSession(sessions[0].id);
    } else {
        createNewChat();
    }
});

function createNewChat() {
    activeSessionId = Date.now().toString();
    chatHistory = [];

    const newSession = {
        id: activeSessionId,
        title: "Yeni Sohbet",
        htmlMessages: [], // Ekranda çizdirilen DOM HTML geçmişi
        apiHistory: []    // Gemini API'ye gönderilen geçmiş
    };

    sessions.unshift(newSession);
    saveSessionsToStorage();
    renderHistoryList();
    renderWelcomeMessage();
}

function loadSession(sessionId) {
    activeSessionId = sessionId;
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        chatHistory = session.apiHistory || [];
        messageContainer.innerHTML = '';

        if (session.htmlMessages && session.htmlMessages.length > 0) {
            session.htmlMessages.forEach(msgHtml => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = msgHtml;
                messageContainer.appendChild(tempDiv.firstElementChild);
            });
        } else {
            renderWelcomeMessage();
        }

        renderHistoryList();
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
}

function deleteSession(e, sessionId) {
    e.stopPropagation();
    sessions = sessions.filter(s => s.id !== sessionId);
    saveSessionsToStorage();

    if (activeSessionId === sessionId) {
        if (sessions.length > 0) {
            loadSession(sessions[0].id);
        } else {
            createNewChat();
        }
    } else {
        renderHistoryList();
    }
}

function renderHistoryList() {
    if (!chatHistoryList) return;
    chatHistoryList.innerHTML = '';

    sessions.forEach(session => {
        const li = document.createElement('li');
        li.className = session.id === activeSessionId ? 'active' : '';

        li.innerHTML = `
            <i class="fa-regular fa-message"></i>
            <span class="chat-title">${escapeHtml(session.title)}</span>
            <i class="fa-solid fa-trash delete-chat-btn" title="Sohbeti Sil"></i>
        `;

        li.addEventListener('click', () => loadSession(session.id));

        const deleteBtn = li.querySelector('.delete-chat-btn');
        deleteBtn.addEventListener('click', (e) => deleteSession(e, session.id));

        chatHistoryList.appendChild(li);
    });
}

function renderWelcomeMessage() {
    messageContainer.innerHTML = `
        <div class="message ai-message">
            <div class="avatar"><img src="images/favicon.png" width="24px" alt="Luri Avatar"></div>
            <div class="content">
                <p>Merhaba! Ben <strong>Luri AI</strong>. Sana bugün nasıl yardımcı olabilirim?</p>
            </div>
        </div>
    `;
}

function saveSessionsToStorage() {
    localStorage.setItem('luri_chat_sessions', JSON.stringify(sessions));
}

if (newChatBtn) {
    newChatBtn.addEventListener('click', createNewChat);
}

// =========================================================
// 3. 3D PARALLAX TILT EFEKTİ
// =========================================================
const appContainer = document.getElementById('appContainer');

if (appContainer) {
    document.addEventListener('mousemove', (e) => {
        const xAxis = (window.innerWidth / 2 - e.pageX) / TILT_SENSITIVITY;
        const yAxis = (window.innerHeight / 2 - e.pageY) / TILT_SENSITIVITY;

        appContainer.style.transform = `rotateY(${-xAxis}deg) rotateX(${yAxis}deg)`;
    });

    document.addEventListener('mouseleave', () => {
        appContainer.style.transition = 'transform 0.5s ease';
        appContainer.style.transform = `rotateY(0deg) rotateX(0deg)`;
    });

    document.addEventListener('mouseenter', () => {
        appContainer.style.transition = 'transform 0.1s ease-out';
    });
}

// =========================================================
// 4. GÖRSEL SEÇİMİ VE YÖNETİMİ
// =========================================================
const uploadBtn = document.getElementById('uploadBtn');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const removeImageBtn = document.getElementById('removeImageBtn');

let selectedImageData = null;

if (uploadBtn && imageInput) {
    uploadBtn.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            const base64String = event.target.result.split(',')[1];
            selectedImageData = {
                mime_type: file.type,
                data: base64String
            };

            imagePreview.src = event.target.result;
            if (imagePreviewContainer) imagePreviewContainer.style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
    });
}

if (removeImageBtn) {
    removeImageBtn.addEventListener('click', clearSelectedImage);
}

function clearSelectedImage() {
    selectedImageData = null;
    if (imageInput) imageInput.value = '';
    if (imagePreview) imagePreview.src = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
}

// =========================================================
// 5. CANLI YAPAY ZEKA SOHBET AKIŞI (GÜVENLİ SERVERLESS ENDPOINT)
// =========================================================
const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const messageContainer = document.getElementById('messageContainer');

async function sendMessage() {
    const text = userInput.value.trim();

    if (text === '' && !selectedImageData) return;

    let currentSession = sessions.find(s => s.id === activeSessionId);
    if (!currentSession) {
        createNewChat();
        currentSession = sessions.find(s => s.id === activeSessionId);
    }

    // 1. Kullanıcı mesajını ekrana ekle
    let userContentHtml = `<p>${escapeHtml(text)}</p>`;
    if (selectedImageData) {
        userContentHtml += `<img src="data:${selectedImageData.mime_type};base64,${selectedImageData.data}" class="message-image" alt="Yüklenen Görsel">`;
    }

    const userDiv = document.createElement('div');
    userDiv.className = 'message user-message';
    userDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-user"></i></div>
        <div class="content">${userContentHtml}</div>
    `;
    messageContainer.appendChild(userDiv);

    // 2. Oturum Başlığı Ayarla (İlk kullanıcı mesajında)
    if (!currentSession.htmlMessages || currentSession.htmlMessages.length === 0) {
        const rawTitle = text !== '' ? text : "Görsel Analizi";
        currentSession.title = rawTitle.length > 20 ? rawTitle.substring(0, 20) + '...' : rawTitle;
        renderHistoryList();
    }

    // 3. Gemini Hafızasına Ekle
    const userParts = [];
    if (text !== '') {
        userParts.push({ text: text });
    } else {
        userParts.push({ text: "Bu görseli analiz et ve açıkla." });
    }

    if (selectedImageData) {
        userParts.push({
            inline_data: {
                mime_type: selectedImageData.mime_type,
                data: selectedImageData.data
            }
        });
    }

    chatHistory.push({
        role: "user",
        parts: userParts
    });

    userInput.value = '';
    clearSelectedImage();
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // 4. Yükleniyor Mesajı
    const aiDiv = document.createElement('div');
    aiDiv.className = 'message ai-message';
    aiDiv.innerHTML = `
        <div class="avatar"><img src="images/favicon.png" width="24px" alt="Luri"></div>
        <div class="content"><p class="ai-text"><em>Luri düşünce akışını işliyor...</em></p></div>
    `;
    messageContainer.appendChild(aiDiv);
    messageContainer.scrollTop = messageContainer.scrollHeight;

    const aiTextElement = aiDiv.querySelector('.ai-text');

    // 5. API İsteği (Vercel gizli backend fonksiyonuna yönlendirildi)
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                history: chatHistory
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("API Hatası:", data);
            chatHistory.pop();

            if (response.status === 429) {
                const funMessages = [
                    "Biraz bekleyin lütfen, üstümü giyiniyorum! 👗✨",
                    "Ayy çok hızlı soruyorsunuz, duşumu alıp geliyorum! 🧼🚿",
                    "Azıcık durun, Luri yemeğini yiyip hemen geliyor! 🍕😋",
                    "Beynim biraz ısındı, 1 dakika mola veriyorum! ☕️🤖"
                ];
                aiTextElement.textContent = funMessages[Math.floor(Math.random() * funMessages.length)];
            } else {
                aiTextElement.textContent = `Hata (${response.status}): ${data.error || 'Bir sorun oluştu.'}`;
            }
        } else if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const aiReply = data.candidates[0].content.parts[0].text;

            chatHistory.push({
                role: "model",
                parts: [{ text: aiReply }]
            });

            aiTextElement.innerHTML = parseSimpleMarkdown(aiReply);
        } else {
            aiTextElement.textContent = "Geçerli bir yanıt alınamadı.";
        }
    } catch (error) {
        console.error("Bağlantı Hatası:", error);
        chatHistory.pop();
        aiTextElement.textContent = "Ağ bağlantı hatası oluştu.";
    }

    // 6. Oturumu Kaydet
    currentSession.apiHistory = chatHistory;

    // Mesaj container'ındaki tüm mesaj elementlerini array olarak kaydet
    const messageDivs = messageContainer.querySelectorAll('.message');
    currentSession.htmlMessages = Array.from(messageDivs).map(div => div.outerHTML);

    saveSessionsToStorage();
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseSimpleMarkdown(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

if (sendBtn && userInput) {
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// =========================================================
// 6. SOHBET İÇİ / DIŞI AKTARMA (EXPORT & IMPORT)
// =========================================================
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const fileInput = document.getElementById('fileInput');

if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        if (sessions.length === 0) {
            alert("Kaydedilecek sohbet bulunamadı!");
            return;
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `luri_tum_sohbetler_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });
}

if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            try {
                const importedSessions = JSON.parse(event.target.result);
                if (Array.isArray(importedSessions)) {
                    sessions = importedSessions;
                    saveSessionsToStorage();
                    renderHistoryList();
                    if (sessions.length > 0) loadSession(sessions[0].id);
                    alert("Tüm sohbetler başarıyla yüklendi!");
                } else {
                    alert("Geçersiz yedek formatı!");
                }
            } catch (err) {
                alert("Dosya okunurken bir hata oluştu!");
                console.error(err);
            }
        };
        reader.readAsText(file);
    });
}