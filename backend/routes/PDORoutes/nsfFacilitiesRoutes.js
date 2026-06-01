const express       = require('express');
const router        = express.Router();
const nsfController = require('../../controllers/PDOController/nsfFacilitiesController');

// ── Summary & Stats ───────────────────────────────────────────────────────────
router.get('/summary/trend',  nsfController.getNSFSummaryTrend);
router.get('/summary',        nsfController.getNSFSummaryCards);
router.get('/distribution',   nsfController.getNSFStatusDistribution);
router.get('/provinces',      nsfController.getNSFProvinces);

// ── Reactivation ──────────────────────────────────────────────────────────────
router.get('/reactivation/logs',       nsfController.getNSFReactivationLogs);
router.get('/reactivation/by-province', nsfController.getNSFReactivatedByProvince);
router.get('/reactivation',            nsfController.getNSFReactivationStatus);
router.post('/sync-reactivation',      nsfController.syncReactivationStatus);

// ── Last Sample Sent ──────────────────────────────────────────────────────────
// ⚠️  MUST be before '/:id' — otherwise Express matches 'last-sample-sent' as an id param
router.get('/last-sample-sent',        nsfController.getLastSampleSent);
router.post('/sync-last-sample-sent',  nsfController.syncLastSampleSent);

// ── Facilities CRUD ───────────────────────────────────────────────────────────
router.get('/',       nsfController.getAllNSFFacilities);
router.get('/:id',    nsfController.getNSFFacilityById);
router.post('/',      nsfController.addNSFFacility);
router.put('/:id',    nsfController.updateNSFFacility);
router.delete('/:id', nsfController.deleteNSFFacility);

module.exports = router;