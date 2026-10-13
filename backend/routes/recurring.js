const express = require("express");
const { pool } = require("../db");
const { CATEGORIES, round, isMember } = require("../helpers");
const { nameOf, notifyGroup, listRecurring, processRecurring } = require("../services");

const router = express.Router();

const FREQUENCIES = ["weekly", "monthly"];

// Your personal recurring payments + those of your groups
router.get("/", async (req, res, next) => {
  try {
    await processRecurring();
    const items = await listRecurring(
      "((r.group_id IS NULL AND r.created_by = ?) OR r.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?))",
      [req.userId, req.userId],
      req.userId
    );
    const active = items.filter((i) => i.active);
    res.json({
      items,
      activeCount: active.length,
      dueSoonCount: active.filter((i) => i.daysUntilDue <= 7).length,
    });
  } catch (err) {
    next(err);
  }
});

// type "personal" or "group". startDate (optional) is the first due date, defaults to today.
router.post("/", async (req, res, next) => {
  try {
    const { type, groupId, title, frequency, startDate } = req.body;
    const amount = Number(req.body.amount);
    const category = CATEGORIES.includes(req.body.category) ? req.body.category : "other";

    if (!title?.trim() || !(amount > 0)) return res.status(400).json({ error: "Add a title and a valid amount." });
    if (!FREQUENCIES.includes(frequency)) return res.status(400).json({ error: "Choose weekly or monthly." });
    if (type !== "personal" && type !== "group") return res.status(400).json({ error: "Choose personal or group." });
    if (startDate && (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || isNaN(new Date(startDate)))) {
      return res.status(400).json({ error: "Date must look like 2026-10-31." });
    }
    if (type === "group") {
      if (!groupId) return res.status(400).json({ error: "Choose a group." });
      if (!(await isMember(groupId, req.userId))) return res.status(403).json({ error: "You are not in that group." });
    }

    const [result] = await pool.query(
      `INSERT INTO recurring_expenses (group_id, created_by, title, amount, category, frequency, next_due)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()))`,
      [type === "group" ? groupId : null, req.userId, title.trim(), round(amount), category, frequency, startDate || null]
    );

    if (type === "group") {
      await notifyGroup(groupId, req.userId, {
        type: "recurring",
        message: `${await nameOf(req.userId)} set up a ${frequency} payment "${title.trim()}"`,
        amount: round(amount),
      });
    }

    await processRecurring(); // creates the first expense right away if the start date has already arrived
    res.json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
});

// Pause or resume (only the person who created it)
router.put("/:id/toggle", async (req, res, next) => {
  try {
    const [[r]] = await pool.query("SELECT created_by, active FROM recurring_expenses WHERE id = ?", [req.params.id]);
    if (!r) return res.status(404).json({ error: "Recurring payment not found." });
    if (r.created_by !== req.userId) return res.status(403).json({ error: "Only the person who created it can change it." });

    const next = r.active ? 0 : 1;
    // when resuming, skip any dates that passed while it was paused
    await pool.query(
      "UPDATE recurring_expenses SET active = ?, next_due = IF(? = 1, GREATEST(next_due, CURDATE()), next_due) WHERE id = ?",
      [next, next, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const [[r]] = await pool.query("SELECT created_by FROM recurring_expenses WHERE id = ?", [req.params.id]);
    if (!r) return res.status(404).json({ error: "Recurring payment not found." });
    if (r.created_by !== req.userId) return res.status(403).json({ error: "Only the person who created it can delete it." });
    await pool.query("DELETE FROM recurring_expenses WHERE id = ?", [req.params.id]); // past expenses stay
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;