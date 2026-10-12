require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { requireAuth } = require("./auth");
const { processRecurring } = require("./services");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/groups", requireAuth, require("./routes/groups"));
app.use("/api/friends", requireAuth, require("./routes/friends"));
app.use("/api/dashboard", requireAuth, require("./routes/dashboard"));
app.use("/api/notifications", requireAuth, require("./routes/notifications"));
app.use("/api/recurring", requireAuth, require("./routes/recurring"));
app.use("/api", requireAuth, require("./routes/money"));

// Any error inside a route ends up here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`FairShare API running on http://localhost:${PORT}`);

  // Create any recurring expenses that are due, now and then every hour
  const run = () => processRecurring().catch((err) => console.error("Recurring failed:", err.message));
  run();
  setInterval(run, 60 * 60 * 1000);
});