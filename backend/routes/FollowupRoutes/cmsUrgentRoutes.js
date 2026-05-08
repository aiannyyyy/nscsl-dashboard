const express = require('express');
const router = express.Router();
const cmsUrgentController = require('../../controllers/FollowupController/cmsUrgentController');

router.get('/patient-results', cmsUrgentController.getPatientResultTable);

module.exports = router;