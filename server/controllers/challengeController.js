const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/challenges.json");

const getChallenges = (req, res) => {
    const data = fs.readFileSync(filePath, "utf-8");

    const challenges = JSON.parse(data);

    res.json(challenges);
};

module.exports = {
    getChallenges
};