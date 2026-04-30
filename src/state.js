// Stores all active sessions
const sessions = new Map();
let nextId = 1;

function getNextId() {
  return nextId++;
}

function getSession(sessionId) {
  return sessions.get(sessionId);
}

function getSessionById(numericId) {
  for (const s of sessions.values()) {
    if (s.id === numericId) return s;
  }
  return null;
}

function addSession(sessionId, sessionData) {
  sessions.set(sessionId, sessionData);
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

function getAllSessions() {
  return sessions;
}

function getActiveUserCount() {
  let count = 0;
  for (const s of sessions.values()) {
    if (s.ws && s.ws.readyState === 1) count++;
  }
  return count;
}

function getActiveUsersList() {
  const list = [];
  for (const s of sessions.values()) {
    if (s.ws && s.ws.readyState === 1) {
      list.push({ id: s.id, username: s.username, role: s.role });
    }
  }
  return list;
}

function getOldestSession() {
  if (sessions.size === 0) return null;
  return sessions.values().next().value;
}

module.exports = {
  sessions,
  getNextId,
  getSession,
  getSessionById,
  addSession,
  deleteSession,
  getAllSessions,
  getActiveUserCount,
  getActiveUsersList,
  getOldestSession
};
