// public/js/chatbot.js — Cohere-backed ResQBot client
const chatbotToggle = document.getElementById("chatbot-toggle");
const chatbotWindow = document.getElementById("chatbot-window");
const chatbotClose = document.getElementById("chatbot-close");
const chatbotSend = document.getElementById("chatbot-send");
const chatbotInput = document.getElementById("chatbot-user-input");
const chatbotMessages = document.getElementById("chatbot-messages");

function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

function appendMessage(sender, html) {
  const msgDiv = document.createElement("div");
  msgDiv.className = sender === "bot" ? "bot-msg" : "user-msg";
  msgDiv.innerHTML = html;
  chatbotMessages.appendChild(msgDiv);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function showTypingIndicator() {
  const typing = document.createElement('div');
  typing.className = 'bot-msg typing';
  typing.id = '__bot_typing';
  typing.innerHTML = '<span class="dot">•</span><span class="dot">•</span><span class="dot">•</span>';
  chatbotMessages.appendChild(typing);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  return typing;
}

function removeTypingIndicator() {
  const el = document.getElementById('__bot_typing');
  if (el) el.remove();
}

async function sendMessage() {
  const text = (chatbotInput.value || '').trim();
  if (!text) return;
  appendMessage('user', escapeHtml(text));
  chatbotInput.value = '';
  showTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();
    removeTypingIndicator();

    if (!res.ok) {
      const err = data && data.error ? data.error : 'Server error';
      appendMessage('bot',`⚠ ${escapeHtml(err)}`);
      return;
    }

    const reply = data.reply || "Sorry, I couldn't produce an answer right now.";
    // reply may contain newlines — convert to safe HTML
    const html = escapeHtml(reply).replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    appendMessage('bot', html);
  } catch (err) {
    removeTypingIndicator();
    appendMessage('bot', '⚠ Error: Failed to contact server.');
    console.error('Chatbot sendMessage error:', err);
  }
}

/* Events */
chatbotToggle.addEventListener("click", () => {
  if (!chatbotWindow) return;
  chatbotWindow.classList.toggle("hidden");
  if (!chatbotWindow.classList.contains('hidden')) {
    setTimeout(() => chatbotInput.focus(), 120);
  }
});
chatbotClose.addEventListener("click", () => chatbotWindow.classList.add("hidden"));
chatbotSend.addEventListener("click", sendMessage);
chatbotInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

/* Init welcome */
(function initWelcome() {
  const existing = chatbotMessages && chatbotMessages.querySelector('.bot-msg');
  if (!existing) {
    appendMessage('bot', "Hi there! 👋 I'm <b>ResQBot</b> — your friendly guide. Ask me about donating, volunteering, listings or safety.");
 }
})();