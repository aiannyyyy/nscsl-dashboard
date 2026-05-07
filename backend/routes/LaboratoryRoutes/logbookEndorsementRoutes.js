const express = require('express');
const router = express.Router();
const logbookEndorsementController = require('../../controllers/LaboratoryController/logbookEndorsementController');
const authMiddleware = require('../../middleware/authMiddleware');

const { uploadEndorsementAttachments } = logbookEndorsementController;

router.get('/lookup', logbookEndorsementController.getPatientDetails);
router.get('/stats/category', logbookEndorsementController.getCategoryStats);
router.get('/stats/mnemonic', logbookEndorsementController.getMnemonicStats);
router.get('/', logbookEndorsementController.getAllLogbookEndorsements);

router.post(
  '/',
  uploadEndorsementAttachments,
  logbookEndorsementController.createLogbookEndorsement
);

router.put(
  '/:id',
  uploadEndorsementAttachments,
  logbookEndorsementController.updateLogbookEndorsement
);

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

module.exports = router;