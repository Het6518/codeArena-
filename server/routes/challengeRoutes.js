const express = require("express");
const router = express.Router();

const {
    getChallenges
} = require("../controllers/challengeController");

router.get("/", getChallenges);

module.exports = router;