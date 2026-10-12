const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { requireAuth } = require("../auth");
const { round } = require("../helpers");

const router = express.Router();

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const CURRENCIES = ["INR", "USD", "EUR", "GBP"];

const makeInitials = (name) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const cleanUsername = (value) => String(value || "").trim().toLowerCase().replace(/^@/, "");

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  initials: u.initials,
  email: u.email,
  currency: u.currency,
  monthlyBudget: Number(u.monthly_budget),
});

router.post("/register", async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();
    const username = cleanUsername(req.body.username);

    if (!name?.trim() || !email || !username || !password) {
      return res.status(400).json({ error: "Name, username, email and password are required." });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: "Username must be 3-20 characters: lowercase letters, numbers or underscore." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const [emailRows] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (emailRows.length) return res.status(400).json({ error: "That email is already registered." });
    const [nameRows] = await pool.query("SELECT id FROM users WHERE username = ?", [username]);
    if (nameRows.length) return res.status(400).json({ error: "That username is already taken." });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, username, initials, email, password) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), username, makeInitials(name), email, hash]
    );
    const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// "email" can be an email address or a username
router.post("/login", async (req, res, next) => {
  try {
    const identifier = cleanUsername(req.body.email);
    const [[user]] = await pool.query("SELECT * FROM users WHERE email = ? OR username = ?", [identifier, identifier]);
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password))) {
      return res.status(400).json({ error: "Wrong email/username or password." });
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
    if (!user) return res.status(401).json({ error: "Please log in again." });
    const [[g]] = await pool.query("SELECT COUNT(*) AS n FROM group_members WHERE user_id = ?", [req.userId]);
    const [[e]] = await pool.query("SELECT COUNT(*) AS n FROM expenses WHERE paid_by = ?", [req.userId]);
    const [[f]] = await pool.query("SELECT COUNT(*) AS n FROM friendships WHERE user_id = ?", [req.userId]);
    res.json({ ...publicUser(user), groupCount: g.n, expenseCount: e.n, friendCount: f.n });
  } catch (err) {
    next(err);
  }
});

// Update any of: name, username, currency, monthlyBudget (send only what changed)
router.put("/me", requireAuth, async (req, res, next) => {
  try {
    const { name, currency, monthlyBudget } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({ error: "Name can't be empty." });
      updates.name = String(name).trim();
      updates.initials = makeInitials(String(name));
    }
    if (req.body.username !== undefined) {
      const username = cleanUsername(req.body.username);
      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({ error: "Username must be 3-20 characters: lowercase letters, numbers or underscore." });
      }
      const [taken] = await pool.query("SELECT id FROM users WHERE username = ? AND id <> ?", [username, req.userId]);
      if (taken.length) return res.status(400).json({ error: "That username is already taken." });
      updates.username = username;
    }
    if (currency !== undefined) {
      if (!CURRENCIES.includes(currency)) return res.status(400).json({ error: "Unsupported currency." });
      updates.currency = currency;
    }
    if (monthlyBudget !== undefined) {
      const budget = Number(monthlyBudget || 0);
      if (!(budget >= 0)) return res.status(400).json({ error: "Budget must be 0 or more." });
      updates.monthly_budget = round(budget);
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Nothing to update." });

    await pool.query("UPDATE users SET ? WHERE id = ?", [updates, req.userId]);
    const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

router.put("/password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [req.userId]);
    if (!user || !(await bcrypt.compare(currentPassword || "", user.password))) {
      return res.status(400).json({ error: "Current password is wrong." });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [await bcrypt.hash(newPassword, 10), req.userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;