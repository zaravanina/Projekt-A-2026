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

## Environment variables

Create your own .env file in the backend folder.

A template is provided as:
backend/env.copy.txt

Copy it and rename it to:
backend/.env

Then fill in your own values:
SESSION_SECRET=your_session_secret
BASE_URL=http://localhost:3000
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:5173

### Notes

    •	SESSION_SECRET can be any long random string.
    •	EMAIL_USER and EMAIL_PASS are used for sending the magic login link.
    •	EMAIL_PASS should be a Gmail App Password (not your real Gmail password).
    •	The .env file is ignored by git and must not be committed.
