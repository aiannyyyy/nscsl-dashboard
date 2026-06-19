const express = require('express');
const router  = express.Router();
const autoMailerController = require('../../controllers/FollowupController/autoMailerReports');

/**
 * @route   GET /api/followup/auto-mailer/individual
 * @desc    Get G6PD individual report for a single specimen
 * @query   labno  (required) - specimen / lab number
 * @access  Public
 */
router.get('/individual', autoMailerController.getIndividualReport);

/**
 * @route   GET /api/followup/auto-mailer/summary
 * @desc    Get G6PD summary report for a date range
 * @query   dateFrom (required) - YYYY-MM-DD
 * @query   dateTo   (required) - YYYY-MM-DD
 * @access  Public
 */
router.get('/summary', autoMailerController.getSummaryReport);

module.exports = router;