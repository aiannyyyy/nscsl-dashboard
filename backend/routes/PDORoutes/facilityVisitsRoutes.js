const express = require('express');
const router = express.Router();
const { upload } = require('../../config');
const facilityVisitsController = require('../../controllers/PDOController/facilityVisitsController');

// Multer error handler wrapper
const handleUpload = (req, res, next) => {
    upload.array('attachments', 50)(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({
                error: 'File upload failed',
                message: err.message
            });
        }
        next();
    });
};

router.get('/lookup-facility', facilityVisitsController.getFacilityByCode);
router.get('/facility-status-count', facilityVisitsController.getStatusCount);
router.get('/facilities-by-status/:status', facilityVisitsController.getFacilitiesByStatus);
router.get('/', facilityVisitsController.getAllVisits);

router.post('/', handleUpload, facilityVisitsController.createVisit);
router.put('/:id', handleUpload, facilityVisitsController.updateVisit);
router.delete('/:id', facilityVisitsController.deleteVisit);
router.patch('/:id/status', facilityVisitsController.updateStatus);

module.exports = router;