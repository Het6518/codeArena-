require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const problemRoutes = require('./routes/problemRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const testCaseRoutes = require('./routes/testCaseRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/problems/:problemId/testcases', testCaseRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/testcases', testCaseRoutes);

module.exports = app;
