import fs from "fs";
import path from "path";
import { spawn, exec as execCallback } from "child_process";
import { promisify } from "util";

const exec = promisify(execCallback);

interface PDFInfo {
  pageCount: number;
  isNative: boolean;
  hasSelectableText: boolean;
}

interface ConversionResult {
  success: boolean;
  wordDocPath?: string;
  pageCount?: number;
  isNative?: boolean;
  error?: string;
}

/**
 * Detect if PDF is native (has selectable text) or scanned
 */
export async function detectPDFType(pdfPath: string): Promise<PDFInfo> {
  try {
    // Use pdftotext to check if PDF has extractable text
    const { stdout } = await (exec as any)(`pdftotext "${pdfPath}" - | head -c 100`);
    const hasText = stdout.trim().length > 0;

    // Get page count using pdfinfo
    const { stdout: infoOutput } = await (exec as any)(`pdfinfo "${pdfPath}"`);
    const pageMatch = infoOutput.match(/Pages:\s*(\d+)/);
    const pageCount = pageMatch ? parseInt(pageMatch[1], 10) : 0;

    return {
      pageCount,
      isNative: hasText,
      hasSelectableText: hasText,
    };
  } catch (error) {
    console.error("Error detecting PDF type:", error);
    return {
      pageCount: 0,
      isNative: false,
      hasSelectableText: false,
    };
  }
}

/**
 * Convert native PDF to Word using pdf2docx
 */
export async function convertNativePDF(
  pdfPath: string,
  outputPath: string
): Promise<ConversionResult> {
  try {
    // Use Python to call pdf2docx
    const pythonScript = `
import sys
from pdf2docx import convert

try:
    convert("${pdfPath}", "${outputPath}")
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

    const result = await new Promise<ConversionResult>((resolve) => {
      const process = spawn("python3", ["-c", pythonScript]);
      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0 && stdout.includes("SUCCESS")) {
          resolve({
            success: true,
            wordDocPath: outputPath,
          });
        } else {
          resolve({
            success: false,
            error: stderr || "Failed to convert PDF",
          });
        }
      });
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Native PDF conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Convert scanned PDF to Word using OCR
 */
export async function convertScannedPDF(
  pdfPath: string,
  outputPath: string,
  languages: string[] = ["hin", "eng"]
): Promise<ConversionResult> {
  try {
    // Use Python with pytesseract and pdf2image
    const pythonScript = `
import sys
from pdf2image import convert_from_path
from PIL import Image
import pytesseract
from docx import Document
from docx.shared import Pt, Inches
import os

try:
    # Convert PDF pages to images
    images = convert_from_path("${pdfPath}")
    
    # Create Word document
    doc = Document()
    
    # Process each page
    for page_num, image in enumerate(images, 1):
        # Extract text using Tesseract with Hindi support
        lang_str = "+".join(${JSON.stringify(languages)})
        text = pytesseract.image_to_string(image, lang=lang_str)
        
        # Add text to document
        if text.strip():
            p = doc.add_paragraph(text)
            p.paragraph_format.line_spacing = 1.15
        
        # Add page break (except for last page)
        if page_num < len(images):
            doc.add_page_break()
    
    # Save document
    doc.save("${outputPath}")
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

    const result = await new Promise<ConversionResult>((resolve) => {
      const process = spawn("python3", ["-c", pythonScript]);
      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0 && stdout.includes("SUCCESS")) {
          resolve({
            success: true,
            wordDocPath: outputPath,
          });
        } else {
          resolve({
            success: false,
            error: stderr || "Failed to convert scanned PDF",
          });
        }
      });
    });

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Scanned PDF conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Main conversion function - detects PDF type and converts accordingly
 */
export async function convertPDF(
  pdfPath: string,
  outputPath: string
): Promise<ConversionResult> {
  try {
    // Validate input file
    if (!fs.existsSync(pdfPath)) {
      return {
        success: false,
        error: "PDF file not found",
      };
    }

    // Detect PDF type
    const pdfInfo = await detectPDFType(pdfPath);

    if (!pdfInfo.pageCount) {
      return {
        success: false,
        error: "Unable to read PDF file or invalid PDF",
      };
    }

    // Convert based on PDF type
    let result: ConversionResult;

    if (pdfInfo.isNative) {
      result = await convertNativePDF(pdfPath, outputPath);
    } else {
      result = await convertScannedPDF(pdfPath, outputPath);
    }

    if (result.success) {
      result.pageCount = pdfInfo.pageCount;
      result.isNative = pdfInfo.isNative;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `PDF conversion error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Validate PDF file
 */
export function validatePDF(filePath: string, maxSizeMB: number = 16): { valid: boolean; error?: string } {
  // Check file exists
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: "File not found" };
  }

  // Check file extension
  if (!filePath.toLowerCase().endsWith(".pdf")) {
    return { valid: false, error: "File must be a PDF" };
  }

  // Check file size
  const fileSizeBytes = getFileSize(filePath);
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  if (fileSizeMB > maxSizeMB) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  // Check if file is actually a PDF (magic bytes)
  try {
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    const magicBytes = buffer.toString("utf8", 0, 4) || "";
    if (!magicBytes.startsWith("%PDF")) {
      return { valid: false, error: "File is not a valid PDF" };
    }
  } catch {
    return { valid: false, error: "Unable to validate PDF file" };
  }

  return { valid: true };
}
