const express = require("express");
const router = express.Router();
const calendarController = require("../../controllers/PDOController/calendarController");
const verifyToken = require("../../middleware/authMiddleware");

router.get("/",              verifyToken, calendarController.getEvents);
router.get("/users",         verifyToken, calendarController.getUsers);
router.get("/check-reminders", verifyToken, calendarController.checkReminders); // ← must be before /:id
router.post("/",             verifyToken, calendarController.createEvent);
router.put("/:id",           verifyToken, calendarController.updateEvent);
router.delete("/:id",        verifyToken, calendarController.deleteEvent);

module.exports = router;