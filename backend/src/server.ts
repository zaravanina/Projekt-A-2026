import "dotenv/config";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";

import { db } from "./db";
import { newToken, sha256, nowMs } from "./auth";
import { sendMagicLink } from "./mail";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAuthed?: boolean;
  }
}

const app = express();

// Config
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // set true behind HTTPS
    },
  }),
);

// Auth guard for protected endpoints
function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (req.session.userId && req.session.isAuthed) return next();
  return res.status(401).json({ error: "Not authenticated" });
}

async function ensureTestUser() {
  const email = "test@example.com";
  const password = "password123";

  const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
    | { id: number }
    | undefined;

  if (!row) {
    const password_hash = await bcrypt.hash(password, 12);
    db.prepare(
      "INSERT INTO users (email, password_hash, name, bio, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(email, password_hash, "Test User", "", Date.now());

    console.log("Seeded user:", { email, password });
  }
}

/* ---------- Pages - minimal frontend of the app ---------- */

app.get("/", (req, res) => {
  res.send(`
    <h1>Magic Link 2FA demo</h1>
    <ul>
      <li><a href="/register">Register</a></li>
      <li><a href="/login">Login</a></li>
      <li><form method="post" action="/logout"><button>Logout</button></form></li>
    </ul>
    <p>Session: userId=${req.session.userId ?? "none"}, isAuthed=${!!req.session.isAuthed}</p>
  `);
});

app.get("/login", (req, res) => {
  res.send(`
    <h1>Login</h1>
    <p>Test user: <b>test@example.com</b> / <b>password123</b></p>
    <p>(Vue login uses <code>/api/login</code>)</p>
    <form method="post" action="/api/login">
      <label>Email <input name="email" type="email" required /></label><br/>
      <label>Password <input name="password" type="password" required /></label><br/>
      <button type="submit">Send login link</button>
    </form>
  `);
});

app.get("/register", (req, res) => {
  res.send(`
    <h1>Register</h1>
    <form method="post" action="/register">
      <label>Email <input name="email" type="email" required /></label><br/>
      <label>Name <input name="name" type="text" /></label><br/>
      <label>Password <input name="password" type="password" required /></label><br/>
      <button type="submit">Create user</button>
    </form>
    <p>Password must be at least 8 characters.</p>
    <p><a href="/login">Back to login</a></p>
  `);
});

/* ---------- Auth + user management ---------- */

// Create user account (HTML form)
app.post("/register", async (req, res) => {
  const email = String(req.body.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(req.body.name ?? "").trim();
  const password = String(req.body.password ?? "");

  if (!email || !password)
    return res.status(400).send("Missing email/password");
  if (password.length < 8)
    return res.status(400).send("Password must be 8+ characters");

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) {
    return res
      .status(409)
      .send(
        `<p>Email already exists.</p><p><a href="/register">Try again</a></p>`,
      );
  }

  const password_hash = await bcrypt.hash(password, 12);

  db.prepare(
    `
    INSERT INTO users (email, password_hash, name, bio, created_at)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(email, password_hash, name || null, "", Date.now());

  res.send(`
    <h1>User created ✅</h1>
    <p>You can now <a href="/login">log in</a>.</p>
  `);
});

// Starts login: verifies credentials and sends one-time login link
app.post("/api/login", async (req, res) => {
  const email = String(req.body?.email ?? req.body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password ?? req.body.password ?? "");

  const user = db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(email) as
    | { id: number; email: string; password_hash: string }
    | undefined;

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  req.session.userId = user.id;
  req.session.isAuthed = false;

  const token = newToken(32);
  const tokenHash = sha256(token);
  const expiresAt = nowMs() + 10 * 60 * 1000;

  db.prepare(
    `
    INSERT INTO login_links (user_id, token_hash, session_id, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(user.id, tokenHash, req.sessionID, expiresAt, nowMs());

  const link = `${BASE_URL}/magic/verify?token=${token}`;

  try {
    await sendMagicLink(user.email, link);
  } catch {
    // email optional in dev
  }
  console.log("MAGIC LINK:", link);

  res.json({ ok: true });
});

// Completes login: validates token, one-time use, expiry, and session binding
app.get("/magic/verify", (req, res) => {
  const token = String(req.query.token ?? "");
  if (!token) return res.status(400).send("Missing token");

  const tokenHash = sha256(token);

  const row = db
    .prepare(
      `
      SELECT id, user_id, session_id, expires_at, used_at
      FROM login_links
      WHERE token_hash = ?
    `,
    )
    .get(tokenHash) as
    | {
        id: number;
        user_id: number;
        session_id: string;
        expires_at: number;
        used_at: number | null;
      }
    | undefined;

  if (!row) return res.status(400).send("Invalid link");
  if (row.used_at) return res.status(400).send("Link already used");
  if (nowMs() > row.expires_at) return res.status(400).send("Link expired");
  if (row.session_id !== req.sessionID)
    return res.status(403).send("Wrong browser session");

  db.prepare("UPDATE login_links SET used_at = ? WHERE id = ?").run(
    nowMs(),
    row.id,
  );

  req.session.userId = row.user_id;
  req.session.isAuthed = true;

  res.redirect(`${FRONTEND_URL}/dashboard`);
});

// Destroys session
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* ---------- Profile APIs ---------- */

// Returns auth state for frontend guards
app.get("/api/session", (req, res) => {
  res.json({
    userId: req.session.userId ?? null,
    isAuthed: !!req.session.isAuthed,
  });
});

// Returns current user profile
app.get("/api/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, email, name, bio FROM users WHERE id = ?")
    .get(req.session.userId) as any;

  res.json({ user });
});

// Updates current user profile (server sanitizes bio)
app.put("/api/me", requireAuth, (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const bioRaw = String(req.body?.bio ?? "");

  const bio = bioRaw
    .replace(/<\u0073cript\b[^>]*>[\s\S]*?<\/\u0073cript>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");

  db.prepare("UPDATE users SET name = ?, bio = ? WHERE id = ?").run(
    name || null,
    bio,
    req.session.userId,
  );

  res.json({ ok: true });
});

/* ---------- Startup ---------- */

async function main() {
  await ensureTestUser();

  app.listen(3000, () => {
    console.log("Backend running on http://localhost:3000");
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
