import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
  getRecurringSeriesById,
  updateRecurringSeries,
  deleteRecurringSeries,
  getAllRecurringSeries,
} from "../services/seriesService";
import logger from "../config/logger";

const router = express.Router();

// Protect all series routes
router.use(protect);

// GET /api/series/:id - Get a single recurring series by ID
router.get("/:id", async (req, res) => {
  const seriesId = req.params.id;
  const userId = req.user!.id; // User ID from protect middleware

  try {
    const series = await getRecurringSeriesById(seriesId, userId);

    if (!series) {
      return res
        .status(404)
        .json({ message: "Recurring series not found or access denied." });
    }

    res.json(series);
  } catch (error) {
    logger.error(`Error in GET /api/series/${seriesId}:`, error);
    res.status(500).json({ message: "Failed to fetch recurring series." });
  }
});

// PUT /api/series/:id - Update a recurring series by ID
router.put("/:id", async (req, res) => {
  const seriesId = req.params.id;
  const userId = req.user!.id; // User ID from protect middleware
  const updateData = req.body; // Data to update the series

  // TODO: Add input validation for updateData

  try {
    const updatedSeries = await updateRecurringSeries(
      seriesId,
      userId,
      updateData
    );

    if (!updatedSeries) {
      return res
        .status(404)
        .json({ message: "Recurring series not found or access denied." });
    }

    res.json(updatedSeries);
  } catch (error) {
    logger.error(`Error in PUT /api/series/${seriesId}:`, error);
    res.status(500).json({ message: "Failed to update recurring series." });
  }
});

// DELETE /api/series/:id - Delete a recurring series by ID (Optional based on plan)
// Note: The plan mentions auto-deletion when no instances remain.
// This endpoint is for manual deletion if needed.
router.delete("/:id", async (req, res) => {
  const seriesId = req.params.id;
  const userId = req.user!.id; // User ID from protect middleware

  try {
    const deleted = await deleteRecurringSeries(seriesId, userId);

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Recurring series not found or access denied." });
    }

    res.json({ message: "Recurring series deleted successfully." });
  } catch (error) {
    logger.error(`Error in DELETE /api/series/${seriesId}:`, error);
    res.status(500).json({ message: "Failed to delete recurring series." });
  }
});

// GET /api/series - Get all recurring series for the authenticated user (Optional based on plan)
router.get("/", async (req, res) => {
  const userId = req.user!.id; // User ID from protect middleware

  try {
    const series = await getAllRecurringSeries(userId);
    res.json(series);
  } catch (error) {
    logger.error(`Error in GET /api/series:`, error);
    res.status(500).json({ message: "Failed to fetch recurring series list." });
  }
});

export default router;
