const express = require('express');
const router = express.Router();
const logbookEndorsementController = require('../../controllers/LaboratoryController/logbookEndorsementController');

router.get('/lookup', logbookEndorsementController.getPatientDetails);
router.get('/', logbookEndorsementController.getAllLogbookEndorsements);
router.post('/', logbookEndorsementController.createLogbookEndorsement);
router.put('/:id', logbookEndorsementController.updateLogbookEndorsement);
router.get('/stats/category', logbookEndorsementController.getCategoryStats);
router.get('/stats/mnemonic', logbookEndorsementController.getMnemonicStats);

module.exports = router;