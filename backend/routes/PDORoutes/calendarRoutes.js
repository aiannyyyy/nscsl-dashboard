const express = require("express");
const router = express.Router();
const calendarController = require("../../controllers/PDOController/calendarController");

// Get all events
router.get("/", calendarController.getEvents);

// Get all users (participant picker) — must be before /:id
router.get("/users", calendarController.getUsers);

// Create event
router.post("/", calendarController.createEvent);

// Update event
router.put("/:id", calendarController.updateEvent);

// Delete event
router.delete("/:id", calendarController.deleteEvent);

module.exports = router;