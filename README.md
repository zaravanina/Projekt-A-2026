# Secure App – 2FA Magic Link + Vue Frontend

## Features

- User registration (bcrypt hashed passwords)
- 2FA login using one-time magic link via email
- One-time token validation with expiration
- Session-based authentication
- Vue frontend with router
- XSS sanitization demo using watcher
- Server-side sanitization before storage

## Tech Stack

- Express + TypeScript
- SQLite
- Vue 3 + Vite
- express-session
- Nodemailer
- bcrypt

## Run in development

From root:

npm install
npm run dev

Backend: http://localhost:3000  
Frontend: http://localhost:5173
