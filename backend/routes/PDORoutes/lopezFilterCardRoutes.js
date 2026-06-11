const express = require('express');
const router = express.Router();
const lopezFilterCardController = require('../../controllers/PDOController/lopezFilterCardController');

router.get('/lopez-purchased-filter-cards',     lopezFilterCardController.getLopezPurchasedFilterCards);
router.get('/calabarzon-purchased-filter-cards', lopezFilterCardController.getCalabarzOnPurchasedFilterCards);

module.exports = router;