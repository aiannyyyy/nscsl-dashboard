const express = require('express');
const router = express.Router();
const logbookEndorsementController = require('../../controllers/LaboratoryController/logbookEndorsementController');
const authMiddleware = require('../../middleware/authMiddleware');

router.get('/lookup', logbookEndorsementController.getPatientDetails);
router.get('/', logbookEndorsementController.getAllLogbookEndorsements);
router.post('/', logbookEndorsementController.createLogbookEndorsement);
router.patch(
  '/:id/team-captain-approve',
  authMiddleware,
  logbookEndorsementController.approveTeamCaptain
);
router.patch(
  '/:id/lab-qa-approve',
  authMiddleware,
  logbookEndorsementController.approveLabQa
);
router.put('/:id', logbookEndorsementController.updateLogbookEndorsement);
router.get('/stats/category', logbookEndorsementController.getCategoryStats);
router.get('/stats/mnemonic', logbookEndorsementController.getMnemonicStats);

module.exports = router;