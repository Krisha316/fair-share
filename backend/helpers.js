const { pool } = require("./db");

const round = (n) => Math.round(n * 100) / 100;

const CATEGORIES = ["food", "travel", "rent", "shopping", "bills", "entertainment", "health", "other"];

// "owed" = others owe you, "owes" = you owe others, "even" = settled
const statusOf = (n) => (n > 0.009 ? "owed" : n < -0.009 ? "owes" : "even");

// Everyone's balance in one group: positive = is owed money, negative = owes money
async function groupBalances(groupId) {
  const [members] = await pool.query("SELECT user_id FROM group_members WHERE group_id = ?", [groupId]);
  const balances = {};
  members.forEach((m) => (balances[m.user_id] = 0));

  const [paid] = await pool.query(
    "SELECT paid_by AS id, SUM(amount) AS total FROM expenses WHERE group_id = ? GROUP BY paid_by",
    [groupId]
  );
  const [owed] = await pool.query(
    `SELECT s.user_id AS id, SUM(s.share) AS total FROM expense_splits s
     JOIN expenses e ON e.id = s.expense_id WHERE e.group_id = ? GROUP BY s.user_id`,
    [groupId]
  );
  const [sent] = await pool.query(
    "SELECT from_user AS id, SUM(amount) AS total FROM settlements WHERE group_id = ? GROUP BY from_user",
    [groupId]
  );
  const [received] = await pool.query(
    "SELECT to_user AS id, SUM(amount) AS total FROM settlements WHERE group_id = ? GROUP BY to_user",
    [groupId]
  );

  const add = (rows, sign) =>
    rows.forEach((r) => (balances[r.id] = (balances[r.id] || 0) + sign * Number(r.total)));
  add(paid, 1);
  add(owed, -1);
  add(sent, 1);
  add(received, -1);

  Object.keys(balances).forEach((id) => (balances[id] = round(balances[id])));
  return balances;
}

// Fewest payments needed to make everyone even
function suggestPayments(balances) {
  const givers = [];
  const takers = [];
  Object.entries(balances).forEach(([id, b]) => {
    if (b < -0.009) givers.push({ id: Number(id), left: -b });
    if (b > 0.009) takers.push({ id: Number(id), left: b });
  });

  const payments = [];
  let i = 0;
  let j = 0;
  while (i < givers.length && j < takers.length) {
    const amount = round(Math.min(givers[i].left, takers[j].left));
    if (amount > 0) payments.push({ from: givers[i].id, to: takers[j].id, amount });
    givers[i].left = round(givers[i].left - amount);
    takers[j].left = round(takers[j].left - amount);
    if (givers[i].left <= 0.009) i++;
    if (takers[j].left <= 0.009) j++;
  }
  return payments;
}

async function isMember(groupId, userId) {
  const [rows] = await pool.query(
    "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?",
    [groupId, userId]
  );
  return rows.length > 0;
}

// Every suggested payment that involves this user, across all their groups
async function settlementsForUser(userId) {
  const [groups] = await pool.query(
    `SELECT g.id, g.name FROM expense_groups g
     JOIN group_members m ON m.group_id = g.id WHERE m.user_id = ?`,
    [userId]
  );

  const found = [];
  for (const g of groups) {
    const payments = suggestPayments(await groupBalances(g.id));
    payments
      .filter((p) => p.from === userId || p.to === userId)
      .forEach((p) => found.push({ groupId: g.id, groupName: g.name, ...p }));
  }

  const ids = [...new Set(found.flatMap((p) => [p.from, p.to]))];
  const byId = {};
  if (ids.length) {
    const [users] = await pool.query("SELECT id, name, initials, username FROM users WHERE id IN (?)", [ids]);
    users.forEach((u) => (byId[u.id] = u));
  }

  return found.map((p) => ({
    groupId: p.groupId,
    groupName: p.groupName,
    from: byId[p.from],
    to: byId[p.to],
    amount: p.amount,
    direction: p.from === userId ? "pay" : "receive",
  }));
}

// Expenses this user can see: their personal ones + all expenses of their groups
async function listExpenses(userId, { type = "all", category = "all", limit } = {}) {
  const where = [
    "((e.group_id IS NULL AND e.paid_by = ?) OR e.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?))",
  ];
  const params = [userId, userId];
  if (type === "personal") where.push("e.group_id IS NULL");
  if (type === "group") where.push("e.group_id IS NOT NULL");
  if (category !== "all") {
    where.push("e.category = ?");
    params.push(category);
  }

  const [rows] = await pool.query(
    `SELECT e.id, e.title, e.amount, e.category, e.created_at AS createdAt, e.paid_by AS paidById,
            u.name AS paidByName, e.group_id AS groupId, g.name AS groupName
     FROM expenses e
     JOIN users u ON u.id = e.paid_by
     LEFT JOIN expense_groups g ON g.id = e.group_id
     WHERE ${where.join(" AND ")}
     ORDER BY e.created_at DESC, e.id DESC ${limit ? "LIMIT " + Number(limit) : ""}`,
    params
  );

  return rows.map((r) => ({
    ...r,
    amount: Number(r.amount),
    paidByMe: r.paidById === userId,
    type: r.groupId ? "group" : "personal",
  }));
}

// Net money between two people across all shared group expenses. Positive = they owe me.
async function pairBalance(me, other) {
  const total = async (sql, params) => {
    const [[row]] = await pool.query(sql, params);
    return Number(row.total);
  };
  const splitSql = `SELECT COALESCE(SUM(s.share), 0) AS total FROM expense_splits s
                    JOIN expenses e ON e.id = s.expense_id WHERE e.paid_by = ? AND s.user_id = ?`;
  const settleSql = "SELECT COALESCE(SUM(amount), 0) AS total FROM settlements WHERE from_user = ? AND to_user = ?";

  const theyOweMe = await total(splitSql, [me, other]);
  const iOweThem = await total(splitSql, [other, me]);
  const iPaidThem = await total(settleSql, [me, other]);
  const theyPaidMe = await total(settleSql, [other, me]);
  return round(theyOweMe - iOweThem - theyPaidMe + iPaidThem);
}

module.exports = {
  round,
  CATEGORIES,
  statusOf,
  groupBalances,
  suggestPayments,
  isMember,
  settlementsForUser,
  listExpenses,
  pairBalance,
};