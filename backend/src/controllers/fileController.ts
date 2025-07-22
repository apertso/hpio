// backend/src/controllers/fileController.ts
import { Request, Response, NextFunction } from "express";
import {
  getPaymentFileInfo,
  deleteFileFromFS,
  detachFileFromPayment,
} from "../services/fileService";
import db from "../models";
import logger from "../config/logger";
import path from "path";
import { config } from "../config/appConfig";

// Controller for handling file upload
export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Multer middleware has already processed the file and it's available in req.file
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const paymentId = req.params.paymentId;
  // TODO: Get userId from authenticated user
  const userId = (req as any).user?.id; // Assuming user is attached to req by auth middleware

  if (!userId) {
    // This should ideally be handled by authentication middleware, but adding a check here
    logger.error("User ID not found in request during file upload.");
    // Clean up the uploaded file if user is not identified
    await deleteFileFromFS(userId, paymentId, req.file.filename);
    return res.status(401).send("Unauthorized.");
  }

  try {
    // Find the payment to link the file
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId, // Ensure the payment belongs to the user
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found or does not belong to user ${userId} for paymentId ${paymentId}`
      );
      // Clean up the uploaded file if payment is not found or unauthorized
      await deleteFileFromFS(userId, paymentId, req.file.filename);
      return res.status(404).send("Payment not found or access denied.");
    }

    // Save file metadata to the Payment model
    // The relative path is the path from the upload directory root
    const relativePath = path.relative(config.uploadDir, req.file.path);

    // Assuming the Payment model has fields like fileName, filePath, fileMimeType, fileSize
    // TODO: Ensure these fields exist in your Payment model definition
    payment.fileName = req.file.originalname;
    payment.filePath = relativePath;
    payment.fileMimeType = req.file.mimetype;
    payment.fileSize = req.file.size;
    payment.uploadedAt = new Date(); // Add a timestamp for upload

    await payment.save();

    logger.info(
      `File uploaded and linked to payment ${paymentId} by user ${userId}`
    );

    res.status(200).send({
      message: "File uploaded and linked successfully.",
      file: {
        fileName: req.file.originalname,
        filePath: relativePath,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    logger.error(
      `Error linking file to payment ${paymentId} for user ${userId}:`,
      error
    );
    // Clean up the uploaded file in case of database error
    await deleteFileFromFS(userId, paymentId, req.file.filename);
    res.status(500).send("Error processing file upload.");
  }
};

// Controller for safely retrieving a file
export const getFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const paymentId = req.params.paymentId;
  const userId = (req as any).user?.id; // Assuming user is attached to req by auth middleware

  if (!userId) {
    return res.status(401).send("Unauthorized.");
  }

  try {
    const fileInfo = await getPaymentFileInfo(paymentId, userId);

    if (!fileInfo) {
      logger.warn(
        `File not found for payment ${paymentId} or payment does not belong to user ${userId}`
      );
      return res.status(404).send("File not found or access denied.");
    }

    // Serve the file
    res.sendFile(path.resolve(fileInfo.fullPath), (err) => {
      if (err) {
        logger.error(`Error sending file ${fileInfo.fullPath}:`, err);
        // If the error is that the file doesn't exist, send 404
        if ((err as any).code === "ENOENT") {
          res.status(404).send("File not found.");
        } else {
          // For other errors, send 500
          res.status(500).send("Error retrieving file.");
        }
      }
    });
  } catch (error) {
    logger.error(
      `Error retrieving file for payment ${paymentId} for user ${userId}:`,
      error
    );
    res.status(500).send("Error retrieving file.");
  }
};

// Controller for handling file deletion
export const deleteFileСtrl = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const paymentId = req.params.paymentId;
  const userId = (req as any).user?.id; // Assuming user is attached to req by auth middleware

  if (!userId) {
    logger.error("User ID not found in request during file deletion.");
    return res.status(401).send("Unauthorized.");
  }

  try {
    // detachFileFromPayment handles DB and FS deletion.
    await detachFileFromPayment(paymentId, userId);

    logger.info(`File detached for payment ${paymentId} by user ${userId}.`);

    res.status(200).send({ message: "File deleted successfully." });
  } catch (error) {
    logger.error(
      `Error deleting file for payment ${paymentId} for user ${userId}:`,
      error
    );
    res.status(500).send("Error deleting file.");
  }
};
