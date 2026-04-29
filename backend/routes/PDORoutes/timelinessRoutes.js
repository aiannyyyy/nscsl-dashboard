const express = require('express');
const router = express.Router();
const timelinessController = require('../../controllers/PDOController/timelinessController');

router.get('/', timelinessController.getTimelinessData);
router.get('/summary', timelinessController.getTimelinessDataNoCounty);
router.get('/monthly', timelinessController.getTimelinessDataMonthlySingle);

module.exports = router;