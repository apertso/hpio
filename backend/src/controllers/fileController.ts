// backend/src/controllers/fileController.ts
import { Request, Response, NextFunction } from "express";
import { getFilePath, deleteFile } from "../services/fileService";
import db from "../models";
import logger from "../config/logger";
import path from "path";
import { config } from "../config/config";

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
    await deleteFile(req.file.path);
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
      await deleteFile(req.file.path);
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
    await deleteFile(req.file.path);
    res.status(500).send("Error processing file upload.");
  }
};

// Controller for safely retrieving a file
export const getFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const paymentId = req.params.paymentId; // Assuming fileId in route is actually paymentId
  // TODO: Get userId from authenticated user
  const userId = (req as any).user?.id; // Assuming user is attached to req by auth middleware

  if (!userId) {
    return res.status(401).send("Unauthorized.");
  }

  try {
    // Find the payment to get file metadata and check ownership
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId, // Ensure the payment belongs to the user
      },
    });

    if (!payment || !payment.filePath) {
      logger.warn(
        `File not found for payment ${paymentId} or payment does not belong to user ${userId}`
      );
      return res.status(404).send("File not found or access denied.");
    }

    // Use the file service to get the absolute path (which includes access check logic)
    // Note: The getFilePath function in fileService.ts needs to be updated
    // to actually perform the access check based on userId and the file's associated payment.
    // For now, it just returns the path if the file exists.
    // TODO: Implement proper access control in getFilePath or here.
    const absoluteFilePath = await getFilePath(payment.filePath, userId);

    if (!absoluteFilePath) {
      logger.warn(
        `File not found at expected path for payment ${paymentId}: ${payment.filePath}`
      );
      return res.status(404).send("File not found.");
    }

    // Serve the file
    res.sendFile(path.resolve(absoluteFilePath), (err) => {
      if (err) {
        logger.error(`Error sending file ${absoluteFilePath}:`, err);
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
    // Find the payment to get file metadata and check ownership
    const payment = await db.Payment.findOne({
      where: {
        id: paymentId,
        userId: userId, // Ensure the payment belongs to the user
      },
    });

    if (!payment) {
      logger.warn(
        `Payment not found or does not belong to user ${userId} for paymentId ${paymentId} for deletion.`
      );
      return res.status(404).send("Payment not found or access denied.");
    }

    // Check if a file is attached
    if (!payment.filePath) {
      logger.warn(`No file attached to payment ${paymentId} for deletion.`);
      return res.status(404).send("No file attached to this payment.");
    }

    // Construct the absolute path to the file
    const absoluteFilePath = path.join(config.uploadDir, payment.filePath);

    // Delete the file from the file system
    await deleteFile(absoluteFilePath);

    // Clear file metadata from the payment record in the database
    payment.filePath = null;
    payment.fileName = null; // Clear fileName as well
    payment.fileMimeType = null;
    payment.fileSize = null;
    payment.uploadedAt = null;

    await payment.save();

    logger.info(
      `File deleted for payment ${paymentId} by user ${userId}. Metadata cleared.`
    );

    res.status(200).send({ message: "File deleted successfully." });
  } catch (error) {
    logger.error(
      `Error deleting file for payment ${paymentId} for user ${userId}:`,
      error
    );
    res.status(500).send("Error deleting file.");
  }
};
