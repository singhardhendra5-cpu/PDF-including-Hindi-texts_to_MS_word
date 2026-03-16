import { describe, it, expect } from "vitest";
import { validatePDF, getFileSize } from "./pdf-processor";
import fs from "fs";
import path from "path";

describe("PDF Processor", () => {
  describe("validatePDF", () => {
    it("should reject non-existent files", () => {
      const result = validatePDF("/nonexistent/file.pdf");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Failed to validate");
    });

    it("should accept non-PDF files (no extension validation)", () => {
      // Create a temporary non-PDF file
      const tempFile = path.join("/tmp", `test-${Date.now()}.txt`);
      fs.writeFileSync(tempFile, "This is not a PDF");

      try {
        const result = validatePDF(tempFile);
        expect(result.valid).toBe(true); // Size validation only, no extension check
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });

    it("should accept valid PDF files", () => {
      // Create a minimal valid PDF file
      const pdfContent = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/Resources<<>>>>endobj xref 0 4 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n trailer<</Size 4/Root 1 0 R>>startxref 190 %%EOF"
      );
      const tempFile = path.join("/tmp", `test-${Date.now()}.pdf`);
      fs.writeFileSync(tempFile, pdfContent);

      try {
        const result = validatePDF(tempFile, 16);
        expect(result.valid).toBe(true);
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });

    it("should reject files exceeding size limit", () => {
      // Create a PDF file larger than the limit
      const pdfContent = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/Resources<<>>>>endobj xref 0 4 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n trailer<</Size 4/Root 1 0 R>>startxref 190 %%EOF"
      );
      const tempFile = path.join("/tmp", `large-${Date.now()}.pdf`);
      fs.writeFileSync(tempFile, pdfContent);

      try {
        const result = validatePDF(tempFile, 0.0001); // 0.0001 MB limit
        expect(result.valid).toBe(false);
        expect(result.error).toContain("exceeds");
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });
  });

  describe("getFileSize", () => {
    it("should return 0 for non-existent files", () => {
      const size = getFileSize("/nonexistent/file.pdf");
      expect(size).toBe(0);
    });

    it("should return correct file size in MB", () => {
      const content = "test content";
      const tempFile = path.join("/tmp", `size-test-${Date.now()}.txt`);
      fs.writeFileSync(tempFile, content);

      try {
        const size = getFileSize(tempFile);
        const expectedSizeMB = content.length / (1024 * 1024);
        expect(size).toBeCloseTo(expectedSizeMB, 8);
      } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      }
    });
  });
});
