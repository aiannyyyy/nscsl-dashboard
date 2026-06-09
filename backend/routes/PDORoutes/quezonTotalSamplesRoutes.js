const express = require("express");
const router = express.Router();

const {
  getTotalSamplesQuezon,
  getTotalSamplesNearbyLopez,
} = require("../../controllers/PDOController/quezonTotalSamplesController");

// GET /api/samples/quezon?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
router.get("/quezon", getTotalSamplesQuezon);

// GET /api/samples/nearby-lopez?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
router.get("/nearby-lopez", getTotalSamplesNearbyLopez);

module.exports = router;