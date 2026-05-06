const express = require('express');
const router = express.Router();
const followupSummaryCards = require('../../controllers/FollowupController/followupSummaryCardsController');

router.get('/total-count-per-month', followupSummaryCards.getTotalRecallPerMonth);

router.get('/total-count-per-day', followupSummaryCards.getTotalRecallPerDay);

router.get('/total-pending', followupSummaryCards.getTotalPendingWithinDay);

router.get('/average-recall-time', followupSummaryCards.getAverageRecallTime);

router.get('/nurse-recall-stats', followupSummaryCards.getNurseRecallStats);


module.exports = router;