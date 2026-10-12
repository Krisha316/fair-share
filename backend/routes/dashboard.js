const express = require("express");
const { pool } = require("../db");
const { round, statusOf, listExpenses, settlementsForUser } = require("../helpers");
const { groupsForUser } = require("./groups");

const router = express.Router();

const NET_MESSAGES = {
  owed: "You are owed money across your groups.",
  owes: "You owe money across your groups.",
  even: "You're all settled up.",
};

router.get("/", async (req, res, next) => {
  try {
    const uid = req.userId;

    const groups = await groupsForUser(uid);
    const netBalance = round(groups.reduce((sum, g) => sum + g.balance, 0));
    const netStatus = statusOf(netBalance);

    // "Your spending" this month = your personal expenses + your share of group expenses
    const thisMonth = "YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())";
    const [personal] = await pool.query(
      `SELECT DAY(created_at) AS day, SUM(amount) AS total, COUNT(*) AS count FROM expenses
       WHERE group_id IS NULL AND paid_by = ? AND ${thisMonth} GROUP BY DAY(created_at)`,
      [uid]
    );
    const [shared] = await pool.query(
      `SELECT DAY(e.created_at) AS day, SUM(s.share) AS total, COUNT(*) AS count
       FROM expense_splits s JOIN expenses e ON e.id = s.expense_id
       WHERE s.user_id = ? AND e.group_id IS NOT NULL
         AND YEAR(e.created_at) = YEAR(CURDATE()) AND MONTH(e.created_at) = MONTH(CURDATE())
       GROUP BY DAY(e.created_at)`,
      [uid]
    );

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daily = Array(daysInMonth).fill(0);
    let count = 0;
    [...personal, ...shared].forEach((r) => {
      daily[r.day - 1] += Number(r.total);
      count += Number(r.count);
    });
    const total = round(daily.reduce((a, b) => a + b, 0));
    const biggest = Math.max(...daily, 0);
    const chart = daily.map((amount, i) => ({
      day: i + 1,
      amount: round(amount),
      percent: biggest > 0 ? Math.max(3, Math.round((amount / biggest) * 100)) : 3,
    }));

    const [[me]] = await pool.query("SELECT monthly_budget FROM users WHERE id = ?", [uid]);
    const budgetAmount = Number(me.monthly_budget);
    const budget =
      budgetAmount > 0
        ? {
            amount: budgetAmount,
            spent: total,
            percent: Math.min(100, Math.round((total / budgetAmount) * 100)),
            remaining: round(Math.max(0, budgetAmount - total)),
            overBy: round(Math.max(0, total - budgetAmount)),
            over: total > budgetAmount,
          }
        : null;

    const settlements = await settlementsForUser(uid);

    res.json({
      netBalance,
      netStatus,
      netMessage: NET_MESSAGES[netStatus],
      groups,
      month: {
        label: now.toLocaleString("en-IN", { month: "short" }),
        total,
        count,
        daily: chart,
        budget,
      },
      latestExpenses: await listExpenses(uid, { limit: 4 }),
      settlements: settlements.slice(0, 3),
      settlementCount: settlements.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;