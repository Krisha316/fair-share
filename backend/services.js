const { pool } = require("./db");
const { round, isMember } = require("./helpers");

// First name of a user, for messages like "Aarav added ..."
async function nameOf(userId) {
  const [[u]] = await pool.query("SELECT name FROM users WHERE id = ?", [userId]);
  return u ? u.name.split(" ")[0] : "Someone";
}

// A failed notification must never break the action that caused it
async function notify(userIds, { type, message, amount = null, groupId = null }) {
  try {
    for (const id of [...new Set(userIds)]) {
      await pool.query(
        "INSERT INTO notifications (user_id, type, message, amount, group_id) VALUES (?, ?, ?, ?, ?)",
        [id, type, message, amount, groupId]
      );
    }
  } catch (err) {
    console.error("Notification failed:", err.message);
  }
}

async function notifyGroup(groupId, exceptUserId, data) {
  const [members] = await pool.query("SELECT user_id FROM group_members WHERE group_id = ?", [groupId]);
  const ids = members.map((m) => m.user_id).filter((id) => id !== exceptUserId);
  await notify(ids, { ...data, groupId });
}

// Equal split in paise so the shares always add up to the exact amount
function splitShares(amount, count) {
  const totalPaise = Math.round(amount * 100);
  const base = Math.floor(totalPaise / count);
  const extra = totalPaise - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < extra ? 1 : 0)) / 100);
}

// Creates an expense (personal when groupId is empty, otherwise split equally between group members)
async function insertExpense({ userId, groupId, title, amount, category, createdAt, recurringId = null }) {
  const [result] = await pool.query(
    `INSERT INTO expenses (group_id, paid_by, title, amount, category, recurring_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
    [groupId || null, userId, title, round(amount), category, recurringId, createdAt || null]
  );
  if (groupId) {
    const [members] = await pool.query("SELECT user_id FROM group_members WHERE group_id = ?", [groupId]);
    const shares = splitShares(amount, members.length);
    for (let i = 0; i < members.length; i++) {
      await pool.query("INSERT INTO expense_splits (expense_id, user_id, share) VALUES (?, ?, ?)", [
        result.insertId, members[i].user_id, shares[i],
      ]);
    }
  }
  return result.insertId;
}

// ---------- Recurring payments ----------

const STEP = { weekly: "INTERVAL 7 DAY", monthly: "INTERVAL 1 MONTH" };

const dueText = (days, active) =>
  !active ? "Paused" : days <= 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`;

// whereSql filters recurring_expenses (alias r)
async function listRecurring(whereSql, params, userId) {
  const [rows] = await pool.query(
    `SELECT r.id, r.title, r.amount, r.category, r.frequency, r.active,
            r.created_by AS createdById, u.name AS createdByName,
            r.group_id AS groupId, g.name AS groupName,
            DATE_FORMAT(r.next_due, '%Y-%m-%d') AS nextDue,
            DATEDIFF(r.next_due, CURDATE()) AS daysUntilDue,
            (SELECT COUNT(*) FROM expenses e WHERE e.recurring_id = r.id) AS timesPaid,
            (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.recurring_id = r.id) AS totalPaid
     FROM recurring_expenses r
     JOIN users u ON u.id = r.created_by
     LEFT JOIN expense_groups g ON g.id = r.group_id
     WHERE ${whereSql}
     ORDER BY r.active DESC, r.next_due`,
    params
  );
  return rows.map((r) => {
    const days = Number(r.daysUntilDue);
    const active = !!r.active;
    return {
      ...r,
      amount: Number(r.amount),
      totalPaid: Number(r.totalPaid),
      timesPaid: Number(r.timesPaid),
      active,
      daysUntilDue: days,
      dueText: dueText(days, active),
      type: r.groupId ? "group" : "personal",
      createdByMe: r.createdById === userId,
    };
  });
}

// Turns every due recurring payment into a real expense, then moves its next due date forward
let running = false;
async function processRecurring() {
  if (running) return;
  running = true;
  try {
    const [rows] = await pool.query(
      `SELECT id, group_id, created_by, title, amount, category, frequency,
              DATE_FORMAT(next_due, '%Y-%m-%d') AS due
       FROM recurring_expenses WHERE active = 1 AND next_due <= CURDATE()`
    );

    for (const r of rows) {
      let due = r.due;
      for (let i = 0; i < 60; i++) {
        // if the payer left the group, stop this payment
        if (r.group_id && !(await isMember(r.group_id, r.created_by))) {
          await pool.query("UPDATE recurring_expenses SET active = 0 WHERE id = ?", [r.id]);
          break;
        }

        await insertExpense({
          userId: r.created_by,
          groupId: r.group_id,
          title: r.title,
          amount: Number(r.amount),
          category: r.category,
          createdAt: `${due} 12:00:00`,
          recurringId: r.id,
        });

        const message = `Recurring payment "${r.title}" was added`;
        if (r.group_id) {
          await notifyGroup(r.group_id, null, { type: "recurring", message, amount: Number(r.amount) });
        } else {
          await notify([r.created_by], { type: "recurring", message, amount: Number(r.amount) });
        }

        await pool.query(
          `UPDATE recurring_expenses SET next_due = DATE_ADD(next_due, ${STEP[r.frequency] || STEP.monthly}) WHERE id = ?`,
          [r.id]
        );
        const [[next]] = await pool.query(
          "SELECT DATE_FORMAT(next_due, '%Y-%m-%d') AS due, next_due <= CURDATE() AS isDue FROM recurring_expenses WHERE id = ?",
          [r.id]
        );
        if (!next.isDue) break;
        due = next.due;
      }
    }
  } finally {
    running = false;
  }
}

module.exports = {
  nameOf,
  notify,
  notifyGroup,
  splitShares,
  insertExpense,
  listRecurring,
  processRecurring,
};