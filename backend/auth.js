function requireAuth(req, res, next) {
    const id = Number(req.headers["x-user-id"]);
    if (!id) return res.status(401).json({ error: "Please log in again." });
    req.userId = id;
    next();
  }
  
  module.exports = { requireAuth };