import "dotenv/config";
import express from "express";
import session from "express-session";
import { db } from "./db";
import { newToken, sha256, nowMs } from "./auth";
import { sendMagicLink } from "./mail";
import bcrypt from "bcrypt";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

declare module "express-session" {
  interface SessionData {
    userId?: number;
    isAuthed?: boolean;
  }
}

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true hvis https
    },
  }),
);

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

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

// --- Middleware: kræv fuld login (2FA gennemført) ---
function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (req.session.userId && req.session.isAuthed) return next();
  res
    .status(401)
    .send(
      `<h1>401</h1><p>Du er ikke logget ind.</p><p><a href="/login">Gå til login</a></p>`,
    );
}

app.use(express.json());

app.get("/login", (req, res) => {
  res.send(`
    <h1>Login</h1>
    <p>Test-bruger: <b>test@example.com</b> / <b>password123</b></p>
    <form method="post" action="/login">
      <label>Email <input name="email" type="email" required /></label><br/>
      <label>Password <input name="password" type="password" required /></label><br/>
      <button type="submit">Login</button>
    </form>
  `);
});

app.post("/api/login", async (req, res) => {
  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password ?? "");

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
  } catch {}
  console.log("MAGIC LINK:", link);

  res.json({ ok: true });
});

app.get("/api/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, email, name, bio FROM users WHERE id = ?")
    .get(req.session.userId) as any;
  res.json({ user });
});

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

app.get("/api/session", (req, res) => {
  res.json({
    userId: req.session.userId ?? null,
    isAuthed: !!req.session.isAuthed,
  });
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

// Trin 2: klik på link -> server tjekker token + session + one-time + expiry
app.get("/magic/verify", (req, res) => {
  const token = String(req.query.token ?? "");
  if (!token) return res.status(400).send("Mangler token");

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

  if (!row) {
    return res.status(400).send("<p>Ugyldigt link.</p>");
  }

  if (row.used_at) {
    return res.status(400).send("<p>Linket er allerede brugt.</p>");
  }

  if (nowMs() > row.expires_at) {
    return res.status(400).send("<p>Linket er udløbet.</p>");
  }

  // “Rette bruger” check: samme session som startede login (samme browser cookie)
  if (row.session_id !== req.sessionID) {
    return res.status(403).send(`
      <p>Dette link blev genereret til en anden session/browser.</p>
      <p>Åbn linket i samme browser som du loggede ind med.</p>
    `);
  }

  // Markér som brugt (one-time)
  db.prepare("UPDATE login_links SET used_at = ? WHERE id = ?").run(
    nowMs(),
    row.id,
  );

  // Fuldfør login
  req.session.userId = row.user_id;
  req.session.isAuthed = true;

  res.redirect(`${FRONTEND_URL}/dashboard`);
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.send(`
    <h1>Dashboard</h1>
    <p>Du er logget ind med 2FA.</p>
    <p>userId=${req.session.userId}</p>
    <p><a href="/">Forside</a></p>
  `);
});

app.get("/", (req, res) => {
  res.send(`
    <h1>Magic Link 2FA demo</h1>
    <ul>
      <li><a href="/register">Register</a></li>
      <li><a href="/login">Login</a></li>
      <li><a href="/dashboard">Dashboard (kræver 2FA)</a></li>
      <li><form method="post" action="/logout"><button>Logout</button></form></li>
    </ul>
    <p>Session: userId=${req.session.userId ?? "none"}, isAuthed=${req.session.isAuthed ?? false}</p>
  `);
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

async function main() {
  await ensureTestUser();

  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
