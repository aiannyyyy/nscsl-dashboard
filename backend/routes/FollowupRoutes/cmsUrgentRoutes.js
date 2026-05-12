const express = require('express');
const router = express.Router();
const cmsUrgentController = require('../../controllers/FollowupController/cmsUrgentController');

router.get('/patient-results', cmsUrgentController.getPatientResultTable);
router.get('/patient-disorder-results', cmsUrgentController.getPatientDisorderResultTable);

router.post('/generate-report', cmsUrgentController.generateCMSReport);
router.get('/serve-report/:filename', cmsUrgentController.serveCMSReport);

module.exports = router;