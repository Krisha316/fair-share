const express = require("express");
const crypto = require("crypto");
const { pool } = require("../db");
const { groupBalances, isMember, statusOf } = require("../helpers");

const router = express.Router();

// Keeps generating codes until it finds one nobody else has
async function newInviteCode() {
  while (true) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
    const [rows] = await pool.query("SELECT 1 FROM expense_groups WHERE invite_code = ?", [code]);
    if (!rows.length) return code;
  }
}

// All groups of a user, with balance, status and member avatars
async function groupsForUser(userId) {
  const [groups] = await pool.query(
    `SELECT g.id, g.name, g.kind, g.theme, g.invite_code AS inviteCode
     FROM expense_groups g JOIN group_members m ON m.group_id = g.id
     WHERE m.user_id = ? ORDER BY g.created_at DESC, g.id DESC`,
    [userId]
  );

  for (const g of groups) {
    const [members] = await pool.query(
      `SELECT u.id, u.name, u.initials FROM users u
       JOIN group_members m ON m.user_id = u.id WHERE m.group_id = ?`,
      [g.id]
    );
    const balances = await groupBalances(g.id);
    g.balance = balances[userId] || 0;
    g.status = statusOf(g.balance);
    g.memberCount = members.length;
    g.members = members.slice(0, 4);
    g.extraMembers = Math.max(0, members.length - 4);
  }
  return groups;
}

router.get("/", async (req, res, next) => {
  try {
    res.json(await groupsForUser(req.userId));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, kind, theme } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Group name is required." });

    const [result] = await pool.query(
      "INSERT INTO expense_groups (name, kind, theme, invite_code, created_by) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), kind || "other", theme || "green", await newInviteCode(), req.userId]
    );
    await pool.query("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", [result.insertId, req.userId]);
    res.json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
});

// Join with an invite code. Fails clearly if the group doesn't exist.
router.post("/join", async (req, res, next) => {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Enter an invite code." });

    const [[group]] = await pool.query("SELECT id, name FROM expense_groups WHERE invite_code = ?", [code]);
    if (!group) return res.status(404).json({ error: "That group doesn't exist. Check the invite code and try again." });

    if (await isMember(group.id, req.userId)) {
      return res.status(400).json({ error: `You're already in "${group.name}".` });
    }
    await pool.query("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", [group.id, req.userId]);
    res.json({ id: group.id, name: group.name });
  } catch (err) {
    next(err);
  }
});

// Add someone to a group by username (you must already be in the group)
router.post("/:id/members", async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    if (!(await isMember(groupId, req.userId))) {
      return res.status(403).json({ error: "You're not in that group." });
    }
    const username = String(req.body.username || "").trim().toLowerCase().replace(/^@/, "");
    const [[user]] = await pool.query("SELECT id, name FROM users WHERE username = ?", [username]);
    if (!user) return res.status(404).json({ error: "No user found with that username." });
    if (await isMember(groupId, user.id)) {
      return res.status(400).json({ error: `${user.name} is already in this group.` });
    }
    await pool.query("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", [groupId, user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [[group]] = await pool.query("SELECT created_by FROM expense_groups WHERE id = ?", [req.params.id]);
    if (!group) return res.status(404).json({ error: "Group not found." });
    if (group.created_by !== req.userId) return res.status(403).json({ error: "Only the creator can delete a group." });
    await pool.query("DELETE FROM expense_groups WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.groupsForUser = groupsForUser;