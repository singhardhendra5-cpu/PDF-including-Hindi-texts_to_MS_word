import path from "path";
import { spawn, exec as execCallback } from "child_process";
import { promisify } from "util";
import os from "os";

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
  processingTimeMs?: number;
}

/**
 * Detect if PDF is native (has selectable text) or scanned
 */
export async function detectPDFType(pdfPath: string): Promise<PDFInfo> {
  try {
    // Use pdftotext to check if PDF has extractable text (faster with limited output)
    const { stdout } = await (exec as any)(`pdftotext -l 1 "${pdfPath}" - 2>/dev/null | head -c 100`);
    const hasText = stdout.trim().length > 0;

    // Get page count using pdfinfo
    const { stdout: infoOutput } = await (exec as any)(`pdfinfo "${pdfPath}" 2>/dev/null`);
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
 * Convert native PDF to Word using pdf2docx with optimizations
 */
export async function convertNativePDF(
  pdfPath: string,
  outputPath: string
): Promise<ConversionResult> {
  const startTime = Date.now();
  try {
    // Use Python to call pdf2docx with optimizations
    const pythonScript = `
import sys
from pdf2docx import convert

try:
    # Convert with layout preservation but faster processing
    convert("${pdfPath}", "${outputPath}", start=0, end=None)
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

    const result = await new Promise<ConversionResult>((resolve) => {
      const process = spawn("python3", ["-c", pythonScript], {
        timeout: 120000, // 2 minute timeout
      });
      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data: any) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data: any) => {
        stderr += data.toString();
      });

      process.on("close", (code: number) => {
        const processingTimeMs = Date.now() - startTime;
        if (code === 0 && stdout.includes("SUCCESS")) {
          resolve({
            success: true,
            wordDocPath: outputPath,
            processingTimeMs,
          });
        } else {
          resolve({
            success: false,
            error: stderr || "Failed to convert PDF",
            processingTimeMs,
          });
        }
      });

      process.on("error", (err: Error) => {
        const processingTimeMs = Date.now() - startTime;
        resolve({
          success: false,
          error: `Process error: ${err.message}`,
          processingTimeMs,
        });
      });
    });

    return result;
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    return {
      success: false,
      error: `Native PDF conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      processingTimeMs,
    };
  }
}

/**
 * Convert scanned PDF to Word using OCR with optimizations
 * - Processes pages in parallel
 * - Uses faster OCR settings
 * - Optimizes image processing
 */
export async function convertScannedPDF(
  pdfPath: string,
  outputPath: string,
  languages: string[] = ["hin", "eng"]
): Promise<ConversionResult> {
  const startTime = Date.now();
  try {
    // Use Python with optimized OCR pipeline
    const pythonScript = `
import sys
from pdf2image import convert_from_path
from PIL import Image
import pytesseract
from docx import Document
from docx.shared import Pt, Inches
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

try:
    # Convert PDF pages to images with optimization
    # Use lower DPI for faster processing (150 instead of 200)
    images = convert_from_path("${pdfPath}", dpi=150)
    
    # Create Word document
    doc = Document()
    doc_lock = threading.Lock()
    
    # Process pages in parallel for faster OCR
    lang_str = "+".join(${JSON.stringify(languages)})
    
    def process_page(page_num, image):
        try:
            # Optimize image for OCR
            # Resize if too large
            if image.width > 2000 or image.height > 2000:
                ratio = min(2000 / image.width, 2000 / image.height)
                new_size = (int(image.width * ratio), int(image.height * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Extract text using Tesseract with Hindi support
            # Use faster config
            text = pytesseract.image_to_string(
                image, 
                lang=lang_str,
                config='--psm 3 --oem 1'  # Faster OCR mode
            )
            
            return page_num, text
        except Exception as e:
            print(f"Error processing page {page_num}: {str(e)}", file=sys.stderr)
            return page_num, ""
    
    # Process pages in parallel (max 4 threads to avoid memory issues)
    results = {}
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(process_page, page_num, image): page_num 
            for page_num, image in enumerate(images, 1)
        }
        
        for future in as_completed(futures):
            page_num, text = future.result()
            results[page_num] = text
    
    # Add pages to document in order
    for page_num in sorted(results.keys()):
        text = results[page_num]
        
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
      const pythonProcess = spawn("python3", ["-c", pythonScript], {
        timeout: 300000, // 5 minute timeout for OCR
        env: { ...process.env, PYTHONUNBUFFERED: "1" },
      });
      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data: any) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data: any) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", (code: number) => {
        const processingTimeMs = Date.now() - startTime;
        if (code === 0 && stdout.includes("SUCCESS")) {
          resolve({
            success: true,
            wordDocPath: outputPath,
            processingTimeMs,
          });
        } else {
          resolve({
            success: false,
            error: stderr || "Failed to convert scanned PDF",
            processingTimeMs,
          });
        }
      });

      pythonProcess.on("error", (err: Error) => {
        const processingTimeMs = Date.now() - startTime;
        resolve({
          success: false,
          error: `Process error: ${err.message}`,
          processingTimeMs,
        });
      });
    });

    return result;
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    return {
      success: false,
      error: `Scanned PDF conversion failed: ${error instanceof Error ? error.message : String(error)}`,
      processingTimeMs,
    };
  }
}

/**
 * Main conversion function - detects PDF type and converts accordingly
 * with performance optimizations
 */
export async function convertPDF(
  pdfPath: string,
  outputPath: string,
  languages?: string[]
): Promise<ConversionResult> {
  try {
    // Detect PDF type
    const pdfInfo = await detectPDFType(pdfPath);

    // Choose conversion method based on PDF type
    if (pdfInfo.isNative) {
      // Native PDF - faster conversion
      return await convertNativePDF(pdfPath, outputPath);
    } else {
      // Scanned PDF - use OCR with optimizations
      return await convertScannedPDF(pdfPath, outputPath, languages);
    }
  } catch (error) {
    return {
      success: false,
      error: `PDF conversion failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validate PDF file
 */
export function validatePDF(
  filePath: string,
  maxSizeMB: number = 16
): { valid: boolean; error?: string } {
  try {
    const fs = require("fs");
    const stats = fs.statSync(filePath);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB > maxSizeMB) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate PDF: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get file size in MB
 */
export function getFileSize(filePath: string): number {
  try {
    const fs = require("fs");
    const stats = fs.statSync(filePath);
    return stats.size / (1024 * 1024);
  } catch {
    return 0;
  }
}

/**
 * Get file size in MB
 */
export function getFileSizeInMB(filePath: string): number {
  try {
    const stats = require("fs").statSync(filePath);
    return stats.size / (1024 * 1024);
  } catch {
    return 0;
  }
}
