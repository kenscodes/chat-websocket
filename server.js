/**
 * ============================================================
 *  WEBSOCKET CHAT SERVER — Global Group Chat (Modular)
 * ============================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

// Modular Imports
const config = require('./src/config');
const state = require('./src/state');
const messaging = require('./src/messaging');

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'public', filePath);
  const ext = path.extname(filePath);
  const contentType = config.MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let sessionId = null;

  ws.on('message', function firstMessage(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'reconnect' && msg.sessionId && state.getSession(msg.sessionId)) {
      sessionId = msg.sessionId;
      const session = state.getSession(sessionId);

      if (session.disconnectTimer) {
        clearTimeout(session.disconnectTimer);
        session.disconnectTimer = null;
      }
      session.ws = ws;
      if (msg.username) session.username = msg.username.slice(0, 20);

      console.log(`[↻] User #${session.id} reconnected (${session.username})`);

      messaging.send(ws, {
        type: 'system', event: 'reconnected',
        sessionId: session.sessionId,
        user: { id: session.id, username: session.username, role: session.role },
        message: 'Reconnected!',
        usersOnline: state.getActiveUserCount(),
        allUsers: state.getActiveUsersList()
      });

      messaging.broadcast({
        type: 'system', event: 'user_joined',
        user: { id: session.id, username: session.username, role: session.role },
        message: `${session.username} reconnected!`,
        usersOnline: state.getActiveUserCount()
      }, sessionId);

      ws.removeListener('message', firstMessage);
      ws.on('message', (rawMsg) => messaging.handleMessage(sessionId, rawMsg));
      
    } else {
      sessionId = crypto.randomUUID();
      const isFirst = state.getAllSessions().size === 0;
      
      const session = {
        id: state.getNextId(),
        sessionId,
        username: (msg.username || `Stranger_${Math.floor(Math.random() * 9999)}`).slice(0, 20),
        role: isFirst ? 'admin' : 'write',
        ws,
        disconnectTimer: null,
      };
      
      state.addSession(sessionId, session);

      console.log(`[+] User #${session.id} connected (${session.username}) [${sessionId.slice(0, 8)}] - Role: ${session.role}`);

      messaging.send(ws, {
        type: 'system', event: 'connected',
        sessionId,
        user: { id: session.id, username: session.username, role: session.role },
        message: 'Connected to Global Chat!',
        usersOnline: state.getActiveUserCount(),
        allUsers: state.getActiveUsersList()
      });

      messaging.broadcast({
        type: 'system', event: 'user_joined',
        user: { id: session.id, username: session.username, role: session.role },
        message: `${session.username} joined the chat!`,
        usersOnline: state.getActiveUserCount()
      }, sessionId);

      ws.removeListener('message', firstMessage);
      ws.on('message', (rawMsg) => messaging.handleMessage(sessionId, rawMsg));
    }
  });

  ws.on('close', () => { if (sessionId) handleDisconnect(sessionId); });
  ws.on('error', () => { if (sessionId) handleDisconnect(sessionId); });
});

function handleDisconnect(sessionId) {
  const session = state.getSession(sessionId);
  if (!session) return;

  session.ws = null;
  console.log(`[~] User #${session.id} disconnected — grace period started (${config.RECONNECT_GRACE_MS / 1000}s)`);

  session.disconnectTimer = setTimeout(() => {
 console.log(`[] User #${session.id} did not reconnect — session expired`);
    
    const wasAdmin = session.role === 'admin';
    state.deleteSession(sessionId);

    if (wasAdmin && state.getAllSessions().size > 0) {
      const nextAdmin = state.getOldestSession();
      if (nextAdmin) {
        nextAdmin.role = 'admin';
 console.log(`[] User #${nextAdmin.id} promoted to admin (succession)`);
        
        if (nextAdmin.ws) {
          messaging.send(nextAdmin.ws, {
            type: 'system', event: 'role_changed',
            role: 'admin',
            message: 'You are now the admin (previous admin left).'
          });
        }
        
        messaging.broadcast({
          type: 'system', event: 'user_role_changed',
          user: { id: nextAdmin.id, username: nextAdmin.username, role: nextAdmin.role },
          message: `${nextAdmin.username} was promoted to admin.`
        }, nextAdmin.sessionId);
      }
    }

    if (state.getAllSessions().size > 0) {
      messaging.broadcast({
        type: 'system', event: 'user_left',
        user: { id: session.id, username: session.username },
        message: `${session.username} has disconnected.`,
        usersOnline: state.getActiveUserCount()
      });
    }

  }, config.RECONNECT_GRACE_MS);
}

server.listen(config.PORT, () => {
 console.log(`\n Global Group Chat server running at http://localhost:${config.PORT}\n`);
});
