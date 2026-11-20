# Alzikrayat2 Extension (Project 4)

**Selected track: D — Real-Time WebSocket (Socket.io)**

Author: Khalid Mohammed Saleh Khalid — Student ID: 202011276367

This repository extends the Alzikrayat MERN photo-sharing app (Project 3) with real-time features built on Socket.io. All Project 3 features (register/login, upload, gallery, detail page, owner-only delete, comments) still work as before.

## Track and rationale
Alzikrayat is a social application: people look at the same photos and comment on them. Without real-time updates, a user must refresh the page to see new comments or photos. Socket.io (WebSocket) fixes this and demonstrates event-driven communication, rooms, and client cleanup.

## What was added
- Socket.io server attached to the Express HTTP server (`server/socket.js`).
- **Live comments:** a new comment appears instantly for every user viewing the same photo.
- **Room per photo:** each photo detail page joins the room `photo:<photoId>`, so comments reach only the people viewing that photo.
- **Live gallery (optional feature):** a new photo appears instantly in every open gallery, with a notification, and a deleted photo disappears.
- React connection through `useEffect`, with cleanup on unmount.
- "Live" badge on the comments section when the socket is connected.

## Socket events
| Event | Direction | Payload | Description |
|---|---|---|---|
| `photo:join` | client → server | photoId | Join the room of the photo being viewed |
| `photo:leave` | client → server | photoId | Leave that room |
| `comment:new` | server → room `photo:<id>` | comment (with author name) | Sent after a comment is saved |
| `photo:new` | server → all clients | photo (with owner name) | Sent after a photo is uploaded |
| `photo:deleted` | server → all clients | photoId | Sent after the owner deletes a photo |

## Design decisions
- **Writes stay on the protected REST API.** Comments and photos are created and deleted through the existing endpoints (JWT middleware, Joi validation, ownership check). The server broadcasts the result only **after** saving it. Clients cannot send comments through the socket, so authentication and validation cannot be bypassed.
- **Duplicate protection.** The author receives their own item from the REST response and from the socket event, so the client ignores items whose `_id` is already in the list.
- **Reconnection.** The client rejoins the photo room on every `connect` event, because rooms are lost when a connection drops.
- **Cleanup.** On unmount the client leaves the room, removes its listeners with `socket.off`, and disconnects.

## Tech stack
React, Vite, React Router, Axios, **socket.io-client** · Node.js, Express, Mongoose, **socket.io**, multer, Joi, bcryptjs, jsonwebtoken · MongoDB Atlas

## Prerequisites
- Node.js 18 or newer
- A MongoDB Atlas cluster (free M0 tier is enough)

## Setup and run

### 1. Backend
```bash
cd server
npm install
cp .env.example .env      # Windows PowerShell: copy .env.example .env
```
Fill in `.env`, then start the server:
```bash
npm run dev
```
The server (REST API and Socket.io) listens on http://localhost:5000.

### 2. Frontend
In a second terminal:
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173. Vite proxies `/api`, `/uploads`, and `/socket.io` (with WebSocket support) to port 5000.

## Environment variables (`server/.env`)
| Variable | Description |
|---|---|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string including the database name |
| `JWT_SECRET` | Long random string used to sign login tokens |

`.env` is excluded from Git and must never be committed.

## How to test the real-time features
1. Open the app in two different browsers (or one normal window and one Incognito window).
2. Register two users, one in each browser.
3. **Live comments:** open the same photo in both browsers (the "● Live" badge appears), write a comment in one browser, and watch it appear instantly in the other without a refresh.
4. **Rooms:** open a different photo in the second browser. Comments on the first photo must not appear there.
5. **Live gallery:** keep `/gallery` open in both browsers, upload a photo in the first one, and see it appear in the second with a notification. Delete it and see it disappear.

## Project structure (new and changed files)
server/
├── socket.js # Socket.io setup: rooms and join/leave events
├── server.js # HTTP server + Socket.io, io shared with controllers
└── controllers/
├── commentController.js # broadcasts comment:new to the photo room
└── photoController.js # broadcasts photo:new and photo:deleted
client/
├── vite.config.js # proxy for /socket.io (ws: true)
└── src/
├── socket.js # shared socket.io-client instance
└── pages/
├── PhotoDetail.jsx # joins the photo room, listens for comment:new
└── Gallery.jsx # listens for photo:new and photo:deleted

## REST API (unchanged from Project 3)
| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/login` | — |
| GET | `/api/photos` | — |
| GET | `/api/photos/:id` | — |
| POST | `/api/photos` | Bearer token |
| DELETE | `/api/photos/:id` | Bearer token (owner only) |
| POST | `/api/photos/:id/comments` | Bearer token |

## Security notes
- Passwords are hashed with bcrypt; sessions use JWT; secrets live in `.env`.
- Socket events cannot create, edit, or delete data. Only the validated REST API does.
- Uploads accept images only, with a 5 MB limit.

## Project 3
The original Project 3 version is in the repository `Khalid-Mohammed3/alzikrayat`.