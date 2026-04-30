# Global WebSocket Group Chat 💬

A lightweight, zero-dependency Global Group Chat server built with Node.js and WebSockets (`ws`). 

This project was originally an Omegle-style 1-to-1 matchmaking system but has been fully refactored into a scalable, persistent Global Room where multiple users can broadcast messages and media simultaneously.

## Features ✨
- **Zero-Dependency Backend:** Built purely on native Node.js `http` and `fs`, with `ws` being the only external package.
- **Global Broadcasts:** Instant routing for Chat Messages, Typing Indicators, and File Envelopes.
- **Media Support:** Seamlessly send Images, Documents, and Audio files encoded as base64 envelopes.
- **Role-Based Permissions:** The first user to join is designated the `admin`. They can selectively mute (`read-only`) or unmute other connected users instantly.
- **Admin Succession:** If the current Admin disconnects, the server automatically promotes the oldest connected `write` user to the new Admin role so the room is never orphaned.
- **Session Persistence:** When users disconnect (e.g., refreshing the page or dropping cellular coverage), they have a 15-second grace period to reconnect before their session is permanently purged and the room is notified.

## Local Development 🚀

1. Ensure you have [Node.js](https://nodejs.org/en/) installed (v18+ recommended).
2. Clone the repository and install the single WebSocket dependency:
   ```bash
   npm install
   ```
3. Boot the server locally:
   ```bash
   npm start
   ```
4. Open `http://localhost:3000` in multiple browser windows or tabs to simulate your Global Room.

## Free Deployment (Render.com) ☁️

This architecture is deliberately lightweight so it functions perfectly on the [Render.com free tier](https://render.com/).

1. Push this code to a GitHub repository.
2. Sign in to Render and create a **New Web Service**.
3. Connect your GitHub repository.
4. Input the following configuration settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **Deploy**. That's it!

> **Note:** Because this runs on a free service, Render will spin the server down after 15 minutes of inactivity. The first user to navigate to the link after it falls asleep may face a ~30-second delay while the container spins back up.

## Architecture & Modularity 🏗️
The backend embraces standard Node.js module separation for code clarity:
- `server.js`: Thin entry script bridging the HTTP static server to the WebSocket upgrader.
- `src/config.js`: Centralized ports, MIME types, and timer variables.
- `src/state.js`: Thread-safe encapsulation for the `sessions` Map and Admin succession logic.
- `src/messaging.js`: Business logic routing payloads to users and executing Admin commands.
