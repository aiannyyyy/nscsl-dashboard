const express = require('express');
const router  = express.Router();
const {
    getCumulativeAnnualCensus,
    getCumulativeAnnualCensusScreened,
    getCumulativeAnnualCensusInitial,
} = require('../../controllers/LaboratoryController/cumulativeAnnualCencusController');

/**
 * @route   GET /api/laboratory/cumulative-annual-census
 * @desc    Total received samples — SPECTYPEs: 20, 2, 3, 4, 5, 87
 */
router.get('/', getCumulativeAnnualCensus);

/**
 * @route   GET /api/laboratory/cumulative-annual-census/screened
 * @desc    Initial sample screened — SPECTYPEs: 20, 2, 3, 4, 87
 */
router.get('/screened', getCumulativeAnnualCensusScreened);

/**
 * @route   GET /api/laboratory/cumulative-annual-census/initial
 * @desc    Total sample initial — SPECTYPE: 20
 */
router.get('/initial', getCumulativeAnnualCensusInitial);

module.exports = router;