const express = require("express");
const { pool } = require("../db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT n.id, n.type, n.message, n.amount, n.is_read AS isRead, n.created_at AS createdAt,
              n.group_id AS groupId, g.name AS groupName
       FROM notifications n
       LEFT JOIN expense_groups g ON g.id = n.group_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC, n.id DESC LIMIT 50`,
      [req.userId]
    );
    const [[unread]] = await pool.query(
      "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0",
      [req.userId]
    );
    res.json({
      notifications: rows.map((n) => ({
        ...n,
        amount: n.amount === null ? null : Number(n.amount),
        isRead: !!n.isRead,
      })),
      unreadCount: unread.n,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/unread-count", async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      "SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0",
      [req.userId]
    );
    res.json({ count: row.n });
  } catch (err) {
    next(err);
  }
});

router.put("/read-all", async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/read", async (req, res, next) => {
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Clear the whole feed
router.delete("/", async (req, res, next) => {
  try {
    await pool.query("DELETE FROM notifications WHERE user_id = ?", [req.userId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;