const express = require('express');
const router = express.Router();
const cmsUrgentController = require('../../controllers/FollowupController/cmsUrgentController');

router.get('/patient-results', cmsUrgentController.getPatientResultTable);
router.get('/patient-disorder-results', cmsUrgentController.getPatientDisorderResultTable);

module.exports = router;