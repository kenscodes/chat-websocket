const $ = (sel) => document.querySelector(sel);
const onboarding = $('#onboarding');
const usernameInput = $('#usernameInput');
const startBtn = $('#startBtn');
const messagesEl = $('#messages');
const msgInput = $('#msgInput');
const sendBtn = $('#sendBtn');
const attachBtn = $('#attachBtn');
const attachMenu = $('#attachMenu');
const fileInput = $('#fileInput');
const statusDot = $('#statusDot');
const statusText = $('#statusText');
const typingEl = $('#typingIndicator');
const myRoleBadge = $('#myRoleBadge');
const userSelect = $('#userSelect');
const togglePartnerRoleBtn = $('#togglePartnerRole');

let ws = null;
let myUser = null;
let onlineUsers = new Map();
let typingTimeout = null;
let lastTypingSent = 0;
let currentAttachType = 'document';
let sessionId = sessionStorage.getItem('chat_session_id');
let storedUsername = sessionStorage.getItem('chat_username');
let myRole = 'write';

if (sessionId && storedUsername) {
  onboarding.style.display = 'none';
  connect(storedUsername);
}

usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startBtn.click();
});

startBtn.addEventListener('click', () => {
  const name = usernameInput.value.trim() || `Stranger_${Math.floor(Math.random() * 9999)}`;
  onboarding.style.animation = 'none';
  onboarding.offsetHeight;
  onboarding.style.animation = 'fadeIn 0.3s ease reverse forwards';
  setTimeout(() => {
    onboarding.style.display = 'none';
    connect(name);
  }, 300);
});

function connect(username) {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protocol}://${location.host}`);

  ws.onopen = () => {
    if (sessionId) {
      ws.send(JSON.stringify({ type: 'reconnect', sessionId, username }));
    } else {
      ws.send(JSON.stringify({ type: 'set_username', username }));
    }
    sessionStorage.setItem('chat_username', username);
    setStatus('waiting', 'Connecting…');
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleServerMessage(msg);
  };

  ws.onclose = () => {
    setStatus('offline', 'Reconnecting…');
    msgInput.disabled = true;
    sendBtn.disabled = true;
    addSystemMessage('Connection lost — reconnecting…', 'disconnected');
    setTimeout(() => {
      if (storedUsername || username) {
        connect(storedUsername || username);
      }
    }, 1000);
  };
}

function handleServerMessage(msg) {
  switch (msg.type) {
    case 'system':
      handleSystemEvent(msg);
      break;

    case 'text':
      if (!msg.self) showTypingIndicator(false);
      addChatMessage(msg.content, msg.self, msg.from, msg.timestamp);
      break;

    case 'image':
      addMediaMessage('image', msg.content, msg.self, msg.from, msg.timestamp, msg.mimeType);
      break;

    case 'audio':
      addMediaMessage('audio', msg.content, msg.self, msg.from, msg.timestamp, msg.mimeType);
      break;

    case 'document':
      addFileMessage(msg.fileName || 'File', msg.content, msg.self, msg.from, msg.timestamp);
      break;

    case 'typing':
      showTypingIndicator(msg.isTyping, msg.from);
      break;

    case 'error':
      addSystemMessage(msg.message, 'error');
      break;
  }
}

function handleSystemEvent(msg) {
  if (msg.usersOnline !== undefined) {
    setStatus('online', `${msg.usersOnline} users online`);
  }

  // Helper to sync local user state if our ID was targeted
  if (msg.user && myUser && msg.user.id === myUser.id) {
    myRole = msg.user.role;
  }

  switch (msg.event) {
    case 'connected':
    case 'reconnected':
      myUser = msg.user;
      myRole = msg.user.role;
      if (msg.sessionId) {
        sessionId = msg.sessionId;
        sessionStorage.setItem('chat_session_id', sessionId);
      }
      if (msg.allUsers) {
        onlineUsers.clear();
        msg.allUsers.forEach(u => {
          if (u.id !== myUser.id) onlineUsers.set(u.id, u);
        });
      }
      msgInput.disabled = myRole === 'read';
      sendBtn.disabled = myRole === 'read';
      msgInput.placeholder = myRole === 'read' ? 'Read-only mode…' : 'Type a message…';
      updateToolbar();
      addSystemMessage(msg.message, 'matched');
      break;

    case 'user_joined':
    case 'username_changed':
    case 'user_role_changed':
      if (msg.user && myUser && msg.user.id !== myUser.id) {
        onlineUsers.set(msg.user.id, msg.user);
      }
      updateToolbar();
      addSystemMessage(msg.message);
      break;

    case 'user_left':
      if (msg.user) onlineUsers.delete(msg.user.id);
      updateToolbar();
      addSystemMessage(msg.message, 'disconnected');
      break;

    case 'role_changed':
      myRole = msg.role;
      updateToolbar();
      addSystemMessage(msg.message);
      msgInput.disabled = myRole === 'read';
      sendBtn.disabled = myRole === 'read';
      msgInput.placeholder = myRole === 'read' ? 'Read-only mode…' : 'Type a message…';
      break;

    case 'username_set':
      myUser = msg.user;
      break;

    default:
      if (msg.message) addSystemMessage(msg.message);
  }
}

function setStatus(state, text) {
  statusDot.className = 'status-dot ' + state;
  statusText.textContent = text;
}

function addSystemMessage(text, className = '') {
  const el = document.createElement('div');
  el.className = `msg system ${className}`;
  el.textContent = text;
  messagesEl.insertBefore(el, typingEl);
  scrollToBottom();
}

function attachNameLabel(el, isSelf, from) {
  if (!isSelf && from && from.username) {
    const nameEl = document.createElement('div');
    nameEl.style.fontSize = '11px';
    nameEl.style.color = 'var(--accent, #6c63ff)';
    nameEl.style.marginBottom = '2px';
    nameEl.style.fontWeight = '600';
    nameEl.textContent = from.username;
    el.appendChild(nameEl);
  }
}

function addChatMessage(content, isSelf, from, timestamp) {
  const el = document.createElement('div');
  el.className = `msg ${isSelf ? 'self' : 'other'}`;
  attachNameLabel(el, isSelf, from);

  const textEl = document.createElement('div');
  textEl.textContent = content;
  el.appendChild(textEl);

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = formatTime(timestamp);
  el.appendChild(timeEl);

  messagesEl.insertBefore(el, typingEl);
  scrollToBottom();
}

function addMediaMessage(type, content, isSelf, from, timestamp, mimeType) {
  const el = document.createElement('div');
  el.className = `msg ${isSelf ? 'self' : 'other'}`;
  attachNameLabel(el, isSelf, from);

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'msg-media';

  if (type === 'image') {
    const img = document.createElement('img');
    img.src = content;
    img.alt = 'Image';
    img.addEventListener('click', () => openLightbox(content));
    mediaWrap.appendChild(img);
  } else if (type === 'audio') {
    const audioWrap = document.createElement('div');
    audioWrap.className = 'msg-audio-wrap';

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = content;
    audioWrap.appendChild(audio);

    const dl = document.createElement('a');
    dl.className = 'msg-audio-download';
    dl.href = content;
    dl.download = 'audio';
    dl.textContent = '⬇ Save audio';
    audioWrap.appendChild(dl);
    mediaWrap.appendChild(audioWrap);
  }

  el.appendChild(mediaWrap);

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = formatTime(timestamp);
  el.appendChild(timeEl);

  messagesEl.insertBefore(el, typingEl);
  scrollToBottom();
}

function addFileMessage(fileName, content, isSelf, from, timestamp) {
  const el = document.createElement('div');
  el.className = `msg ${isSelf ? 'self' : 'other'}`;
  attachNameLabel(el, isSelf, from);

  const link = document.createElement('a');
  link.href = content;
  link.download = fileName;
  link.target = '_blank';
  link.style.textDecoration = 'none';
  link.style.color = 'inherit';

  const fileEl = document.createElement('div');
  fileEl.className = 'msg-file';
  fileEl.style.cursor = 'pointer';
  fileEl.innerHTML = `
 <span class="msg-file-icon"></span>
    <div>
      <div class="msg-file-name">${escapeHtml(fileName)}</div>
      <div class="msg-file-size">Tap to download</div>
    </div>
    <span style="margin-left:auto; font-size:18px; opacity:0.5;">⬇</span>
  `;
  link.appendChild(fileEl);
  el.appendChild(link);

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = formatTime(timestamp);
  el.appendChild(timeEl);

  messagesEl.insertBefore(el, typingEl);
  scrollToBottom();
}

let savedStatus = null;
function showTypingIndicator(show, from) {
  typingEl.classList.toggle('visible', show);
  if (show) {
    const label = typingEl.querySelector('.typing-label');
    label.textContent = from && from.username ? `${from.username} is typing` : 'typing';
    if (!savedStatus) savedStatus = statusText.textContent;
    statusText.textContent = 'typing…';
    scrollToBottom();
  } else {
    if (savedStatus) {
      statusText.textContent = savedStatus;
      savedStatus = null;
    }
  }
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !ws || ws.readyState !== 1) return;

  ws.send(JSON.stringify({ type: 'text', content: text }));
  msgInput.value = '';
  msgInput.style.height = 'auto';
  ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';

  if (ws && ws.readyState === 1) {
    const now = Date.now();
    if (now - lastTypingSent > 1000) {
      ws.send(JSON.stringify({ type: 'typing', isTyping: true }));
      lastTypingSent = now;
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      ws.send(JSON.stringify({ type: 'typing', isTyping: false }));
    }, 2000);
  }
});

function updateToolbar() {
 const roleEmoji = { admin: ' Admin', write: '️ Write', read: ' Read' };
  myRoleBadge.textContent = roleEmoji[myRole] || myRole;
  myRoleBadge.style.color = myRole === 'admin' ? '#f59e0b' : myRole === 'read' ? '#ef4444' : '#22c55e';

  if (myRole === 'admin') {
    userSelect.style.display = '';
    togglePartnerRoleBtn.style.display = '';
    
    userSelect.innerHTML = '<option value="">-- Select User --</option>';
    onlineUsers.forEach((user) => {
      const opt = document.createElement('option');
      opt.value = user.id;
      opt.textContent = `${user.username} (${user.role})`;
      userSelect.appendChild(opt);
    });
  } else {
    userSelect.style.display = 'none';
    togglePartnerRoleBtn.style.display = 'none';
  }
}

userSelect.addEventListener('change', () => {
  if (!userSelect.value) return;
  const targetId = parseInt(userSelect.value);
  const targetUser = onlineUsers.get(targetId);
  if (targetUser) {
 const action = targetUser.role === 'read' ? ' Set Write' : ' Set Read-only';
    togglePartnerRoleBtn.textContent = action;
  }
});

togglePartnerRoleBtn.addEventListener('click', () => {
  if (ws && ws.readyState === 1 && myRole === 'admin' && userSelect.value) {
    const targetId = parseInt(userSelect.value);
    const targetUser = onlineUsers.get(targetId);
    if (!targetUser) return;
    const newRole = targetUser.role === 'read' ? 'write' : 'read';
    ws.send(JSON.stringify({ type: 'role', targetId, targetRole: newRole }));
  }
});

attachBtn.addEventListener('click', () => attachMenu.classList.toggle('visible'));

document.addEventListener('click', (e) => {
  if (!attachBtn.contains(e.target) && !attachMenu.contains(e.target)) {
    attachMenu.classList.remove('visible');
  }
});

document.querySelectorAll('.attach-option').forEach(opt => {
  opt.addEventListener('click', () => {
    currentAttachType = opt.dataset.type;
    attachMenu.classList.remove('visible');
    if (currentAttachType === 'image') fileInput.accept = 'image/*';
    else if (currentAttachType === 'audio') fileInput.accept = 'audio/*';
    else fileInput.accept = '*/*';
    fileInput.click();
  });
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file || !ws || ws.readyState !== 1) return;
  const reader = new FileReader();
  reader.onload = () => {
    ws.send(JSON.stringify({
      type: currentAttachType,
      content: reader.result,
      fileName: file.name,
      mimeType: file.type,
    }));
  };
  reader.readAsDataURL(file);
  fileInput.value = '';
});

const lightbox = $('#lightbox');
const lightboxImg = $('#lightboxImg');
const lightboxDownload = $('#lightboxDownload');
const lightboxClose = $('#lightboxClose');

function openLightbox(src) {
  lightboxImg.src = src;
  lightboxDownload.href = src;
  lightbox.classList.add('visible');
}

function closeLightbox() {
  lightbox.classList.remove('visible');
  lightboxImg.src = '';
}

lightboxClose.addEventListener('click', (e) => {
  e.stopPropagation();
  closeLightbox();
});
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});
