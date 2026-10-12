const express = require("express");
const { pool } = require("../db");
const {
  CATEGORIES, round, groupBalances, suggestPayments, isMember, listExpenses, settlementsForUser,
} = require("../helpers");

const router = express.Router();

// ---------- Expenses ----------

// ?type=all|personal|group  &category=all|food|travel|...
router.get("/expenses", async (req, res, next) => {
  try {
    const type = ["personal", "group"].includes(req.query.type) ? req.query.type : "all";
    const category = CATEGORIES.includes(req.query.category) ? req.query.category : "all";
    const expenses = await listExpenses(req.userId, { type, category });

    const total = round(expenses.reduce((sum, e) => sum + e.amount, 0));
    const perCategory = {};
    expenses.forEach((e) => (perCategory[e.category] = (perCategory[e.category] || 0) + e.amount));
    const byCategory = Object.entries(perCategory)
      .map(([name, t]) => ({ category: name, total: round(t), percent: total ? Math.round((t / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    res.json({ expenses, total, byCategory });
  } catch (err) {
    next(err);
  }
});

// type "personal": only you. type "group": you paid, split equally between all group members.
router.post("/expenses", async (req, res, next) => {
  try {
    const { type, groupId, title, date } = req.body;
    const amount = Number(req.body.amount);
    const category = CATEGORIES.includes(req.body.category) ? req.body.category : "other";

    if (!title?.trim() || !(amount > 0)) {
      return res.status(400).json({ error: "Add a title and a valid amount." });
    }
    if (type !== "personal" && type !== "group") {
      return res.status(400).json({ error: "Choose personal or group expense." });
    }
    let createdAt = null;
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(new Date(date))) {
        return res.status(400).json({ error: "Date must look like 2026-10-31." });
      }
      createdAt = `${date} 12:00:00`;
    }

    if (type === "personal") {
      const [result] = await pool.query(
        "INSERT INTO expenses (group_id, paid_by, title, amount, category, created_at) VALUES (NULL, ?, ?, ?, ?, COALESCE(?, NOW()))",
        [req.userId, title.trim(), round(amount), category, createdAt]
      );
      return res.json({ id: result.insertId });
    }

    if (!groupId) return res.status(400).json({ error: "Choose a group." });
    if (!(await isMember(groupId, req.userId))) {
      return res.status(403).json({ error: "You are not in that group." });
    }

    const [members] = await pool.query("SELECT user_id FROM group_members WHERE group_id = ?", [groupId]);

    // split in paise so shares always add up to the exact amount
    const totalPaise = Math.round(amount * 100);
    const base = Math.floor(totalPaise / members.length);
    const extra = totalPaise - base * members.length;

    const [result] = await pool.query(
      "INSERT INTO expenses (group_id, paid_by, title, amount, category, created_at) VALUES (?, ?, ?, ?, ?, COALESCE(?, NOW()))",
      [groupId, req.userId, title.trim(), round(amount), category, createdAt]
    );
    for (let i = 0; i < members.length; i++) {
      const share = (base + (i < extra ? 1 : 0)) / 100;
      await pool.query("INSERT INTO expense_splits (expense_id, user_id, share) VALUES (?, ?, ?)", [
        result.insertId, members[i].user_id, share,
      ]);
    }
    res.json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
});

router.delete("/expenses/:id", async (req, res, next) => {
  try {
    const [[expense]] = await pool.query("SELECT paid_by FROM expenses WHERE id = ?", [req.params.id]);
    if (!expense) return res.status(404).json({ error: "Expense not found." });
    if (expense.paid_by !== req.userId) {
      return res.status(403).json({ error: "Only the person who paid can delete this expense." });
    }
    await pool.query("DELETE FROM expenses WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- Settlements ----------

// What you need to pay, what you'll receive, and past payments
router.get("/settlements", async (req, res, next) => {
  try {
    const all = await settlementsForUser(req.userId);
    const toPay = all.filter((p) => p.direction === "pay");
    const toReceive = all.filter((p) => p.direction === "receive");

    const [rows] = await pool.query(
      `SELECT s.id, s.amount, s.created_at AS createdAt, s.from_user AS fromId,
              g.name AS groupName, f.name AS fromName, t.name AS toName
       FROM settlements s
       JOIN expense_groups g ON g.id = s.group_id
       JOIN users f ON f.id = s.from_user
       JOIN users t ON t.id = s.to_user
       WHERE s.from_user = ? OR s.to_user = ?
       ORDER BY s.created_at DESC, s.id DESC LIMIT 20`,
      [req.userId, req.userId]
    );
    const history = rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      createdAt: r.createdAt,
      groupName: r.groupName,
      iPaid: r.fromId === req.userId,
      text: r.fromId === req.userId ? `You paid ${r.toName}` : `${r.fromName} paid you`,
    }));

    res.json({
      toPay,
      toReceive,
      totalToPay: round(toPay.reduce((s, p) => s + p.amount, 0)),
      totalToReceive: round(toReceive.reduce((s, p) => s + p.amount, 0)),
      history,
    });
  } catch (err) {
    next(err);
  }
});

// Record a payment. Either person can record it, and it must match something that is actually due.
router.post("/settlements", async (req, res, next) => {
  try {
    const groupId = Number(req.body.groupId);
    const fromUser = Number(req.body.fromUser);
    const toUser = Number(req.body.toUser);
    const amount = Number(req.body.amount);

    if (!groupId || !fromUser || !toUser || !(amount > 0)) {
      return res.status(400).json({ error: "Invalid payment." });
    }
    if (req.userId !== fromUser && req.userId !== toUser) {
      return res.status(403).json({ error: "You can only record your own payments." });
    }

    const due = suggestPayments(await groupBalances(groupId)).find((p) => p.from === fromUser && p.to === toUser);
    if (!due) return res.status(400).json({ error: "No payment is due between these two people." });
    if (amount > due.amount + 0.01) {
      return res.status(400).json({ error: `That is more than what's due (${due.amount}).` });
    }

    await pool.query(
      "INSERT INTO settlements (group_id, from_user, to_user, amount) VALUES (?, ?, ?, ?)",
      [groupId, fromUser, toUser, round(amount)]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;