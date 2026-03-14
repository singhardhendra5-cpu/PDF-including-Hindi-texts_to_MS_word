import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { createConversion, getConversionById, getUserConversions, updateConversionStatus, deleteConversion } from "../db";
import type { InsertConversion } from "../../drizzle/schema";
import { convertPDF, validatePDF, getFileSize } from "../pdf-processor";
import { storagePut, storageGet } from "../storage";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const TEMP_DIR = "/tmp/pdf-conversions";

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const conversionRouter = router({
  /**
   * Upload PDF and start conversion
   */
  uploadAndConvert: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileData: z.string(), // Base64 encoded file data
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate file name
        if (!input.fileName.toLowerCase().endsWith(".pdf")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File must be a PDF",
          });
        }

        // Decode base64 and create temporary file
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const tempPdfPath = path.join(TEMP_DIR, `${nanoid()}.pdf`);
        fs.writeFileSync(tempPdfPath, fileBuffer);

        // Validate PDF
        const validation = validatePDF(tempPdfPath, 16);
        if (!validation.valid) {
          fs.unlinkSync(tempPdfPath);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.error || "Invalid PDF file",
          });
        }

        // Get file size
        const fileSize = getFileSize(tempPdfPath);

        // Upload original PDF to S3
        const originalFileKey = `conversions/${ctx.user.id}/${nanoid()}-original.pdf`;
        const { url: originalFileUrl } = await storagePut(originalFileKey, fileBuffer, "application/pdf");

        // Create database record
        const conversionData: InsertConversion = {
    userId: ctx.user.id,
    originalFileName: input.fileName,
    convertedFileName: input.fileName.replace(".pdf", ".docx"),
    originalFileKey,
    convertedFileKey: "", // Will be updated after conversion
    originalFileUrl,
    convertedFileUrl: "", // Will be updated after conversion
    fileSize,
    status: "pending",
  };
  const conversionRecord = await createConversion(conversionData);

  // Get the inserted ID from the result
  const conversionId = (conversionRecord as any).insertId || (conversionRecord as any)[0]?.id || 0;

  // Start conversion in background
        processConversion(conversionId, tempPdfPath, ctx.user.id).catch((error) => {
          console.error("Background conversion error:", error);
          updateConversionStatus(conversionId, "failed", {
            errorMessage: error instanceof Error ? error.message : String(error),
          }).catch(console.error);
        });

        return {
          conversionId,
          status: "pending",
          message: "Conversion started",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }),

  /**
   * Get conversion status
   */
  getStatus: protectedProcedure
    .input(z.object({ conversionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const conversion = await getConversionById(input.conversionId);

      if (!conversion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversion not found",
        });
      }

      if (conversion.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return {
        id: conversion.id,
        status: conversion.status,
        originalFileName: conversion.originalFileName,
        convertedFileName: conversion.convertedFileName,
        convertedFileUrl: conversion.convertedFileUrl,
        errorMessage: conversion.errorMessage,
        pageCount: conversion.pageCount,
        processingTimeMs: conversion.processingTimeMs,
        createdAt: conversion.createdAt,
      };
    }),

  /**
   * Get user's conversion history
   */
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const conversions = await getUserConversions(ctx.user.id);

    return conversions.map((c) => ({
      id: c.id,
      originalFileName: c.originalFileName,
      convertedFileName: c.convertedFileName,
      status: c.status,
      fileSize: c.fileSize,
      pageCount: c.pageCount,
      processingTimeMs: c.processingTimeMs,
      convertedFileUrl: c.convertedFileUrl,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }),

  /**
   * Download converted document
   */
  getDownloadUrl: protectedProcedure
    .input(z.object({ conversionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const conversion = await getConversionById(input.conversionId);

      if (!conversion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversion not found",
        });
      }

      if (conversion.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      if (conversion.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Conversion is not completed",
        });
      }

      // Get presigned URL
      const { url } = await storageGet(conversion.convertedFileKey);

      return {
        downloadUrl: url,
        fileName: conversion.convertedFileName,
      };
    }),

  /**
   * Delete conversion record
   */
  delete: protectedProcedure
    .input(z.object({ conversionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const conversion = await getConversionById(input.conversionId);

      if (!conversion) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversion not found",
        });
      }

      if (conversion.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      await deleteConversion(input.conversionId);

      return { success: true };
    }),
});

/**
 * Background conversion processing
 */
async function processConversion(conversionId: number, pdfPath: string, userId: number) {
  const startTime = Date.now();

  try {
    // Update status to processing
    await updateConversionStatus(conversionId, "processing");

    // Generate output path
    const outputPath = path.join(TEMP_DIR, `${nanoid()}.docx`);

    // Convert PDF
    const result = await convertPDF(pdfPath, outputPath);

    if (!result.success) {
      throw new Error(result.error || "Conversion failed");
    }

    // Read converted file
    const fileBuffer = fs.readFileSync(outputPath);

    // Upload to S3
    const convertedFileKey = `conversions/${userId}/${nanoid()}-converted.docx`;
    const { url: convertedFileUrl } = await storagePut(
      convertedFileKey,
      fileBuffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    // Calculate processing time
    const processingTimeMs = Date.now() - startTime;

    // Update conversion record
    await updateConversionStatus(conversionId, "completed", {
      convertedFileKey,
      convertedFileUrl,
      pageCount: result.pageCount,
      isPdfNative: result.isNative ? 1 : 0,
      processingTimeMs,
    });

    // Cleanup temporary files
    try {
      fs.unlinkSync(pdfPath);
      fs.unlinkSync(outputPath);
    } catch {
      // Ignore cleanup errors
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateConversionStatus(conversionId, "failed", {
      errorMessage,
    });

    // Cleanup temporary files
    try {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
