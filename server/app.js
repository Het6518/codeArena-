const express = require("express");
const cors = require("cors");

const challengeRoutes = require("./routes/challengeRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/challenges", challengeRoutes);

module.exports = app;