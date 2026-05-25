const express    = require('express');
const router     = express.Router();
const nsfController = require('../../controllers/PDOController/nsfFacilitiesController');

// ── Summary & Stats ───────────────────────────────────────────────────────────
router.get('/summary/trend',   nsfController.getNSFSummaryTrend);       // ← must be before /:id
router.get('/summary',         nsfController.getNSFSummaryCards);
router.get('/distribution',    nsfController.getNSFStatusDistribution);
router.get('/provinces',       nsfController.getNSFProvinces);

// ── Reactivation ──────────────────────────────────────────────────────────────
router.get('/reactivation/logs', nsfController.getNSFReactivationLogs); // ← before /reactivation
router.get('/reactivation',      nsfController.getNSFReactivationStatus);

// ── Facilities CRUD ───────────────────────────────────────────────────────────
router.get('/',    nsfController.getAllNSFFacilities);
router.get('/:id', nsfController.getNSFFacilityById);
router.post('/',   nsfController.addNSFFacility);
router.put('/:id', nsfController.updateNSFFacility);
router.delete('/:id', nsfController.deleteNSFFacility);

module.exports = router;