const express = require('express');
const router  = express.Router();
const autoMailerController = require('../../controllers/FollowupController/autoMailerReports');

/**
 * @route   GET /api/followup/auto-mailer/individual
 * @desc    Get G6PD individual report data for a single specimen
 * @query   labno  (required) - specimen / lab number
 * @access  Public
 */
router.get('/individual', autoMailerController.getIndividualReport);

/**
 * @route   GET /api/followup/auto-mailer/summary
 * @desc    Get G6PD summary report data for a date range
 * @query   dateFrom (required) - YYYY-MM-DD
 * @query   dateTo   (required) - YYYY-MM-DD
 * @access  Public
 */
router.get('/summary', autoMailerController.getSummaryReport);

/**
 * @route   POST /api/followup/auto-mailer/individual/generate
 * @desc    Generate the G6PD individual PDF via CrystalReports exe
 * @body    { labNo: string }
 * @access  Public
 */
router.post('/individual/generate', autoMailerController.generateIndividualG6PDReport);

/**
 * @route   POST /api/followup/auto-mailer/summary/generate
 * @desc    Generate the G6PD summary PDF via CrystalReports exe
 * @body    { dateFrom: 'YYYY-MM-DD', dateTo: 'YYYY-MM-DD' }
 * @access  Public
 */
router.post('/summary/generate', autoMailerController.generateSummaryG6PDReport);

/**
 * @route   GET /api/followup/auto-mailer/serve-report/:filename
 * @desc    Stream a generated G6PD PDF back to the client
 * @access  Public
 */
router.get('/serve-report/:filename', autoMailerController.serveG6PDReport);

module.exports = router;