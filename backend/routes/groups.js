const express = require("express");
const crypto = require("crypto");
const { pool } = require("../db");
const { round, groupBalances, suggestPayments, isMember, statusOf } = require("../helpers");
const { nameOf, notify, notifyGroup, listRecurring } = require("../services");

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
    await notifyGroup(group.id, req.userId, {
      type: "member",
      message: `${await nameOf(req.userId)} joined "${group.name}"`,
    });
    res.json({ id: group.id, name: group.name });
  } catch (err) {
    next(err);
  }
});

// Everything the group details page shows
router.get("/:id", async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    const me = req.userId;

    const [[group]] = await pool.query(
      `SELECT id, name, kind, theme, invite_code AS inviteCode, created_by AS createdBy,
              DATE_FORMAT(created_at, '%Y-%m-%d') AS createdOn
       FROM expense_groups WHERE id = ?`,
      [groupId]
    );
    if (!group) return res.status(404).json({ error: "Group not found." });
    if (!(await isMember(groupId, me))) return res.status(403).json({ error: "You're not in that group." });

    // members with their own balance
    const [memberRows] = await pool.query(
      `SELECT u.id, u.name, u.username, u.initials FROM users u
       JOIN group_members m ON m.user_id = u.id WHERE m.group_id = ? ORDER BY u.name`,
      [groupId]
    );
    const balances = await groupBalances(groupId);
    const byId = {};
    const members = memberRows.map((m) => {
      const balance = balances[m.id] || 0;
      const member = { ...m, balance, status: statusOf(balance), isCreator: m.id === group.createdBy, isMe: m.id === me };
      byId[m.id] = member;
      return member;
    });

    // who pays whom to settle the group
    const payments = suggestPayments(balances)
      .filter((p) => byId[p.from] && byId[p.to])
      .map((p) => ({
        groupId,
        groupName: group.name,
        from: byId[p.from],
        to: byId[p.to],
        amount: p.amount,
        direction: p.from === me ? "pay" : p.to === me ? "receive" : "other",
      }));

    // expenses of this group, with your share of each
    const [expenseRows] = await pool.query(
      `SELECT e.id, e.title, e.amount, e.category, e.created_at AS createdAt,
              DATE_FORMAT(e.created_at, '%Y-%m-%d') AS date, e.paid_by AS paidById,
              u.name AS paidByName, e.recurring_id AS recurringId, COALESCE(s.share, 0) AS yourShare
       FROM expenses e
       JOIN users u ON u.id = e.paid_by
       LEFT JOIN expense_splits s ON s.expense_id = e.id AND s.user_id = ?
       WHERE e.group_id = ?
       ORDER BY e.created_at DESC, e.id DESC`,
      [me, groupId]
    );
    const expenses = expenseRows.map((e) => ({
      ...e,
      amount: Number(e.amount),
      yourShare: Number(e.yourShare),
      paidByMe: e.paidById === me,
      isRecurring: !!e.recurringId,
    }));

    const totalSpent = round(expenses.reduce((sum, e) => sum + e.amount, 0));
    const perCategory = {};
    expenses.forEach((e) => (perCategory[e.category] = (perCategory[e.category] || 0) + e.amount));
    const byCategory = Object.entries(perCategory)
      .map(([category, t]) => ({
        category,
        total: round(t),
        percent: totalSpent ? Math.round((t / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // recent payments inside this group
    const [historyRows] = await pool.query(
      `SELECT s.id, s.amount, s.created_at AS createdAt, s.from_user AS fromId, f.name AS fromName, t.name AS toName
       FROM settlements s
       JOIN users f ON f.id = s.from_user
       JOIN users t ON t.id = s.to_user
       WHERE s.group_id = ?
       ORDER BY s.created_at DESC, s.id DESC LIMIT 10`,
      [groupId]
    );
    const history = historyRows.map((h) => ({
      id: h.id,
      amount: Number(h.amount),
      createdAt: h.createdAt,
      text: h.fromId === me ? `You paid ${h.toName}` : `${h.fromName} paid ${h.toName}`,
    }));

    const recurring = await listRecurring("r.group_id = ?", [groupId], me);

    const myBalance = balances[me] || 0;
    const canLeave = Math.abs(myBalance) <= 0.009;

    res.json({
      id: group.id,
      name: group.name,
      kind: group.kind,
      theme: group.theme,
      inviteCode: group.inviteCode,
      createdOn: group.createdOn,
      isCreator: group.createdBy === me,
      balance: myBalance,
      status: statusOf(myBalance),
      canLeave,
      leaveHint: canLeave ? "" : "Settle up your balance in this group before you leave.",
      totalSpent,
      members,
      payments,
      expenses,
      byCategory,
      history,
      recurring,
    });
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

    const [[group]] = await pool.query("SELECT name FROM expense_groups WHERE id = ?", [groupId]);
    const who = await nameOf(req.userId);
    await notify([user.id], { type: "member", message: `${who} added you to "${group.name}"`, groupId });
    const [others] = await pool.query("SELECT user_id FROM group_members WHERE group_id = ?", [groupId]);
    await notify(
      others.map((m) => m.user_id).filter((id) => id !== req.userId && id !== user.id),
      { type: "member", message: `${who} added ${user.name.split(" ")[0]} to "${group.name}"`, groupId }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Leave a group. Only allowed once your balance is settled.
router.post("/:id/leave", async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    if (!(await isMember(groupId, req.userId))) {
      return res.status(400).json({ error: "You're not in that group." });
    }

    const balance = (await groupBalances(groupId))[req.userId] || 0;
    if (Math.abs(balance) > 0.009) {
      return res.status(400).json({ error: "Settle up your balance in this group before you leave." });
    }

    const [[group]] = await pool.query("SELECT name, created_by FROM expense_groups WHERE id = ?", [groupId]);
    const who = await nameOf(req.userId);

    await pool.query("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", [groupId, req.userId]);
    await pool.query("DELETE FROM recurring_expenses WHERE group_id = ? AND created_by = ?", [groupId, req.userId]);

    const [left] = await pool.query("SELECT user_id FROM group_members WHERE group_id = ? ORDER BY user_id", [groupId]);
    if (!left.length) {
      await pool.query("DELETE FROM expense_groups WHERE id = ?", [groupId]); // last person left
      return res.json({ ok: true, deleted: true });
    }
    if (group.created_by === req.userId) {
      await pool.query("UPDATE expense_groups SET created_by = ? WHERE id = ?", [left[0].user_id, groupId]);
    }
    await notify(left.map((m) => m.user_id), { type: "member", message: `${who} left "${group.name}"`, groupId });
    res.json({ ok: true, deleted: false });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [[group]] = await pool.query("SELECT name, created_by FROM expense_groups WHERE id = ?", [req.params.id]);
    if (!group) return res.status(404).json({ error: "Group not found." });
    if (group.created_by !== req.userId) return res.status(403).json({ error: "Only the creator can delete a group." });

    await notifyGroup(Number(req.params.id), req.userId, {
      type: "member",
      message: `${await nameOf(req.userId)} deleted the group "${group.name}"`,
    });
    await pool.query("DELETE FROM expense_groups WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.groupsForUser = groupsForUser;