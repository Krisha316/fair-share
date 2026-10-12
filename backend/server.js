require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { requireAuth } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/groups", requireAuth, require("./routes/groups"));
app.use("/api/friends", requireAuth, require("./routes/friends"));
app.use("/api/dashboard", requireAuth, require("./routes/dashboard"));
app.use("/api", requireAuth, require("./routes/money"));

// Any error inside a route ends up here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`FairShare API running on http://localhost:${PORT}`));