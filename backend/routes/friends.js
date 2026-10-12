const express = require("express");
const { pool } = require("../db");
const { pairBalance, statusOf } = require("../helpers");

const router = express.Router();

async function describeFriend(me, friend) {
  const balance = await pairBalance(me, friend.id);
  const status = statusOf(balance);
  const first = friend.name.split(" ")[0];
  const statusText =
    status === "owed" ? `${first} owes you` : status === "owes" ? `You owe ${first}` : "All settled up";
  return { ...friend, balance, status, statusText };
}

router.get("/", async (req, res, next) => {
  try {
    const [friends] = await pool.query(
      `SELECT u.id, u.name, u.username, u.initials FROM friendships f
       JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? ORDER BY u.name`,
      [req.userId]
    );
    const result = [];
    for (const f of friends) result.push(await describeFriend(req.userId, f));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Add a friend by username (friendship works both ways straight away)
router.post("/", async (req, res, next) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase().replace(/^@/, "");
    if (!username) return res.status(400).json({ error: "Enter a username." });

    const [[friend]] = await pool.query("SELECT id, name, username, initials FROM users WHERE username = ?", [username]);
    if (!friend) return res.status(404).json({ error: "No user found with that username." });
    if (friend.id === req.userId) return res.status(400).json({ error: "You can't add yourself." });

    const [existing] = await pool.query("SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?", [req.userId, friend.id]);
    if (existing.length) return res.status(400).json({ error: `${friend.name} is already your friend.` });

    await pool.query("INSERT INTO friendships (user_id, friend_id) VALUES (?, ?), (?, ?)", [
      req.userId, friend.id, friend.id, req.userId,
    ]);
    res.json(await describeFriend(req.userId, friend));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await pool.query(
      "DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
      [req.userId, req.params.id, req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;