const express = require("express");
const { pool } = require("../db");
const {
  CATEGORIES, round, groupBalances, suggestPayments, isMember, listExpenses, settlementsForUser,
} = require("../helpers");
const { nameOf, notify, notifyGroup, splitShares, insertExpense } = require("../services");

const router = express.Router();

const validDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d));

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

// One expense, in the shape the edit form needs
router.get("/expenses/:id", async (req, res, next) => {
  try {
    const [[e]] = await pool.query(
      `SELECT e.id, e.title, e.amount, e.category, DATE_FORMAT(e.created_at, '%Y-%m-%d') AS date,
              e.paid_by AS paidById, e.group_id AS groupId, g.name AS groupName
       FROM expenses e LEFT JOIN expense_groups g ON g.id = e.group_id
       WHERE e.id = ?`,
      [req.params.id]
    );
    const visible = e && (e.groupId ? await isMember(e.groupId, req.userId) : e.paidById === req.userId);
    if (!visible) return res.status(404).json({ error: "Expense not found." });

    res.json({
      id: e.id,
      title: e.title,
      amount: Number(e.amount),
      category: e.category,
      date: e.date,
      groupId: e.groupId,
      groupName: e.groupName,
      type: e.groupId ? "group" : "personal",
      paidByMe: e.paidById === req.userId,
    });
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
    if (date && !validDate(date)) {
      return res.status(400).json({ error: "Date must look like 2026-10-31." });
    }
    if (type === "group") {
      if (!groupId) return res.status(400).json({ error: "Choose a group." });
      if (!(await isMember(groupId, req.userId))) {
        return res.status(403).json({ error: "You are not in that group." });
      }
    }

    const id = await insertExpense({
      userId: req.userId,
      groupId: type === "group" ? groupId : null,
      title: title.trim(),
      amount,
      category,
      createdAt: date ? `${date} 12:00:00` : null,
    });

    if (type === "group") {
      await notifyGroup(groupId, req.userId, {
        type: "expense",
        message: `${await nameOf(req.userId)} added "${title.trim()}"`,
        amount: round(amount),
      });
    }
    res.json({ id });
  } catch (err) {
    next(err);
  }
});

// Edit title, amount, category or date (send only what changed). Only the person who paid can edit.
// Changing the amount of a group expense re-splits it equally between the same people.
router.put("/expenses/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [[expense]] = await pool.query("SELECT * FROM expenses WHERE id = ?", [id]);
    if (!expense) return res.status(404).json({ error: "Expense not found." });
    if (expense.paid_by !== req.userId) {
      return res.status(403).json({ error: "Only the person who paid can edit this expense." });
    }

    const updates = {};
    if (req.body.title !== undefined) {
      if (!String(req.body.title).trim()) return res.status(400).json({ error: "Title can't be empty." });
      updates.title = String(req.body.title).trim();
    }
    if (req.body.amount !== undefined) {
      const amount = Number(req.body.amount);
      if (!(amount > 0)) return res.status(400).json({ error: "Enter a valid amount." });
      updates.amount = round(amount);
    }
    if (req.body.category !== undefined) {
      if (!CATEGORIES.includes(req.body.category)) return res.status(400).json({ error: "Unknown category." });
      updates.category = req.body.category;
    }
    if (req.body.date !== undefined) {
      if (!validDate(req.body.date)) return res.status(400).json({ error: "Date must look like 2026-10-31." });
      updates.created_at = `${req.body.date} 12:00:00`;
    }
    if (!Object.keys(updates).length) return res.status(400).json({ error: "Nothing to update." });

    await pool.query("UPDATE expenses SET ? WHERE id = ?", [updates, id]);

    if (updates.amount !== undefined && expense.group_id) {
      const [people] = await pool.query("SELECT user_id FROM expense_splits WHERE expense_id = ? ORDER BY user_id", [id]);
      const shares = splitShares(updates.amount, people.length);
      for (let i = 0; i < people.length; i++) {
        await pool.query("UPDATE expense_splits SET share = ? WHERE expense_id = ? AND user_id = ?", [
          shares[i], id, people[i].user_id,
        ]);
      }
    }

    if (expense.group_id) {
      await notifyGroup(expense.group_id, req.userId, {
        type: "expense",
        message: `${await nameOf(req.userId)} edited "${updates.title || expense.title}"`,
        amount: updates.amount ?? Number(expense.amount),
      });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/expenses/:id", async (req, res, next) => {
  try {
    const [[expense]] = await pool.query("SELECT paid_by, group_id, title, amount FROM expenses WHERE id = ?", [req.params.id]);
    if (!expense) return res.status(404).json({ error: "Expense not found." });
    if (expense.paid_by !== req.userId) {
      return res.status(403).json({ error: "Only the person who paid can delete this expense." });
    }
    await pool.query("DELETE FROM expenses WHERE id = ?", [req.params.id]);

    if (expense.group_id) {
      await notifyGroup(expense.group_id, req.userId, {
        type: "expense",
        message: `${await nameOf(req.userId)} deleted "${expense.title}"`,
        amount: Number(expense.amount),
      });
    }
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

    const who = await nameOf(req.userId);
    const iPaid = req.userId === fromUser;
    await notify([iPaid ? toUser : fromUser], {
      type: "settlement",
      message: iPaid ? `${who} paid you` : `${who} confirmed they received your payment`,
      amount: round(amount),
      groupId,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;