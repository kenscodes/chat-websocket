const state = require('./state');

function send(ws, data) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data, excludeSessionId = null) {
  const json = JSON.stringify(data);
  for (const [sid, session] of state.getAllSessions().entries()) {
    if (sid !== excludeSessionId && session.ws && session.ws.readyState === 1) {
      session.ws.send(json);
    }
  }
}

function handleMessage(sessionId, rawMsg) {
  let msg;
  const session = state.getSession(sessionId);

  try {
    msg = JSON.parse(rawMsg);
  } catch {
    if (session && session.ws) send(session.ws, { type: 'error', message: 'Invalid JSON' });
    return;
  }

  if (!session) return;

  switch (msg.type) {
    // ── Text / Media ──
    case 'text':
    case 'audio':
    case 'document':
    case 'image': {
      if (session.role === 'read') {
        return send(session.ws, { type: 'error', message: '🚫 Read-only users cannot send messages.' });
      }

      const envelope = {
        type: msg.type,
        from: { id: session.id, username: session.username, role: session.role },
        content: msg.content,
        timestamp: Date.now(),
      };
      if (msg.mimeType) envelope.mimeType = msg.mimeType;
      if (msg.fileName) envelope.fileName = msg.fileName;

      broadcast(envelope, sessionId);
      send(session.ws, { ...envelope, self: true });
      break;
    }

    // ── Typing Indicator ──
    case 'typing': {
      broadcast({
        type: 'typing',
        from: { id: session.id, username: session.username },
        isTyping: !!msg.isTyping,
      }, sessionId);
      break;
    }

    // ── Role Change (admin-only) ──
    case 'role': {
      if (session.role !== 'admin') {
        return send(session.ws, { type: 'error', message: '🚫 Only admins can change roles.' });
      }

      const targetId = msg.targetId;
      const targetRole = msg.targetRole;

      if (targetRole !== 'write' && targetRole !== 'read') {
        return send(session.ws, { type: 'error', message: 'Can only set users to write or read.' });
      }

      const targetSession = state.getSessionById(targetId);

      if (!targetSession) {
        return send(session.ws, { type: 'error', message: 'User not found.' });
      }

      if (targetSession.role === 'admin') {
        return send(session.ws, { type: 'error', message: "Cannot change an admin's role." });
      }

      targetSession.role = targetRole;

      if (targetSession.ws) {
        send(targetSession.ws, {
          type: 'system', event: 'role_changed',
          role: targetSession.role,
          message: `An admin changed your role to: ${targetSession.role}`
        });
      }

      broadcast({
        type: 'system', event: 'user_role_changed',
        user: { id: targetSession.id, username: targetSession.username, role: targetSession.role },
        message: `${targetSession.username} is now: ${targetSession.role}`
      });
      break;
    }

    case 'set_username': {
      if (msg.username && typeof msg.username === 'string') {
        const oldName = session.username;
        session.username = msg.username.slice(0, 20);
        
        send(session.ws, {
          type: 'system', event: 'username_set',
          user: { id: session.id, username: session.username, role: session.role },
          message: `Username set to ${session.username}`
        });
        
        broadcast({
          type: 'system', event: 'username_changed',
          user: { id: session.id, username: session.username, role: session.role },
          message: `${oldName} changed their name to ${session.username}`
        }, sessionId);
      }
      break;
    }

    default:
      send(session.ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
  }
}

module.exports = {
  send,
  broadcast,
  handleMessage
};
