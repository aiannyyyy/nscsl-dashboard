const express = require('express');
const router = express.Router();
const logbookEndorsement = require('../../controllers/FollowupController/logbookEndorsementController');

// ── Static routes first (must come before /:id to avoid conflicts) ────────────
router.get('/stats/category',    logbookEndorsement.getCategoryStats);
router.get('/stats/mnemonic',    logbookEndorsement.getMnemonicStats);

// ── Archive (full list) before "/" catch-all naming conflicts ─────────────────
router.get('/recalled',          logbookEndorsement.getLogbookEndorsementsRecalledSection);

// ── Dynamic routes ─────────────────────────────────────────────────────────────
router.get('/',                  logbookEndorsement.getAllLogbookEndorsements);
router.put('/:id',               logbookEndorsement.updateLogbookEndorsement);
router.patch('/:id/done-recall', logbookEndorsement.doneRecallLogbookEndorsement);

module.exports = router;