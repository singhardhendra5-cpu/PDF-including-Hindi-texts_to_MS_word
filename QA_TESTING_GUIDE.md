# QA Testing Guide - PDF to Word Converter

This document provides comprehensive testing procedures for the PDF to Word converter application with Hindi support.

## Test Environment Setup

### Prerequisites
- Node.js 22+
- pnpm package manager
- Python 3.8+
- Tesseract OCR with Hindi language support
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation
```bash
pnpm install
sudo apt-get install tesseract-ocr tesseract-ocr-hin poppler-utils
sudo pip3 install pdf2docx pytesseract pdf2image python-docx pillow
pnpm dev
```

## Test Categories

### 1. File Upload & Validation Tests

#### 1.1 Valid PDF Upload
- **Test**: Upload a valid PDF file (< 16MB)
- **Expected**: File accepted, upload starts immediately
- **Verification**: Progress indicator shows "Uploading..." stage

#### 1.2 File Size Validation
- **Test A**: Upload PDF exactly 16MB
  - **Expected**: File accepted
- **Test B**: Upload PDF > 16MB
  - **Expected**: Error message "File size exceeds 16MB limit"
- **Test C**: Upload PDF between 10-16MB
  - **Expected**: Warning toast "Large file detected"

#### 1.3 File Format Validation
- **Test A**: Upload non-PDF file (e.g., .txt, .docx, .jpg)
  - **Expected**: Error "Please select a PDF file"
- **Test B**: Upload file with .pdf extension but non-PDF content
  - **Expected**: Error during processing or conversion failure

#### 1.4 Drag and Drop
- **Test A**: Drag valid PDF onto upload area
  - **Expected**: File accepted, upload starts
- **Test B**: Drag non-PDF file onto upload area
  - **Expected**: Error message displayed
- **Test C**: Drag multiple files
  - **Expected**: Only first file processed

### 2. Conversion Pipeline Tests

#### 2.1 Native PDF Conversion
- **Test A**: Upload native English PDF
  - **Expected**: Conversion completes, Word document generated
  - **Verification**: Download document opens in Word/LibreOffice
- **Test B**: Upload native Hindi PDF
  - **Expected**: Hindi text preserved in output
  - **Verification**: Hindi characters readable in Word document
- **Test C**: Upload mixed language PDF (English + Hindi)
  - **Expected**: Both languages preserved correctly

#### 2.2 Scanned PDF Conversion (OCR)
- **Test A**: Upload scanned English PDF
  - **Expected**: OCR processes image, text extracted
  - **Verification**: Extracted text is editable in Word
- **Test B**: Upload scanned Hindi PDF
  - **Expected**: Hindi OCR processes successfully
  - **Verification**: Hindi text recognized and editable
- **Test C**: Upload low-quality scanned PDF
  - **Expected**: Conversion completes (may have lower accuracy)
  - **Verification**: Output is usable despite quality

#### 2.3 Conversion Progress
- **Test A**: Monitor progress stages
  - **Expected**: Upload → Processing → Completed stages show correctly
- **Test B**: Check estimated time accuracy
  - **Expected**: Estimated time within ±50% of actual time
- **Test C**: Large file conversion
  - **Expected**: Progress updates regularly, no timeout

### 3. Error Handling Tests

#### 3.1 Corrupted Files
- **Test A**: Upload corrupted PDF
  - **Expected**: Error message "Failed to process PDF"
  - **Verification**: User can retry or upload different file
- **Test B**: Upload empty PDF
  - **Expected**: Graceful error handling

#### 3.2 Network Errors
- **Test A**: Interrupt upload (throttle network)
  - **Expected**: Error message, retry option available
- **Test B**: Interrupt conversion (kill dev server)
  - **Expected**: Status shows "failed", user notified

#### 3.3 Retry Mechanism
- **Test A**: Failed conversion with retry
  - **Expected**: Retry button available (max 3 attempts)
- **Test B**: After 3 failed retries
  - **Expected**: "Maximum retry attempts reached" message

### 4. Download & History Tests

#### 4.1 Download Functionality
- **Test A**: Download completed conversion
  - **Expected**: .docx file downloads with correct name
- **Test B**: Open downloaded file in Word
  - **Expected**: File opens without errors
- **Test C**: Open downloaded file in LibreOffice
  - **Expected**: File opens and displays correctly

#### 4.2 Conversion History
- **Test A**: View history after conversion
  - **Expected**: Conversion appears in history with metadata
- **Test B**: History shows correct metadata
  - **Expected**: File size, page count, processing time display
- **Test C**: Search in history
  - **Expected**: Search filters conversions by filename
- **Test D**: Sort history
  - **Expected**: Can sort by date, size, or name
- **Test E**: Filter by status
  - **Expected**: Can filter completed/processing/failed

#### 4.3 Delete Functionality
- **Test A**: Delete conversion from history
  - **Expected**: Confirmation dialog appears
- **Test B**: Confirm delete
  - **Expected**: Conversion removed from history
- **Test C**: Cancel delete
  - **Expected**: Conversion remains in history

### 5. Accessibility Tests

#### 5.1 Keyboard Navigation
- **Test A**: Tab through all interactive elements
  - **Expected**: Logical tab order, no elements skipped
- **Test B**: Enter key on upload area
  - **Expected**: File picker opens
- **Test C**: Escape key during upload
  - **Expected**: Upload can be cancelled

#### 5.2 Screen Reader Compatibility
- **Test A**: Test with NVDA (Windows) or JAWS
  - **Expected**: All elements properly labeled
- **Test B**: Form labels announced correctly
  - **Expected**: Screen reader announces field purpose
- **Test C**: Error messages announced
  - **Expected**: Errors read immediately to user

#### 5.3 Color Contrast
- **Test A**: Check text contrast ratios
  - **Expected**: WCAG AA standard (4.5:1 for normal text)
- **Test B**: Test with color blindness simulator
  - **Expected**: UI remains usable for color-blind users

#### 5.4 Focus Indicators
- **Test A**: Tab through page
  - **Expected**: Clear focus ring visible on all elements
- **Test B**: Focus ring color
  - **Expected**: Sufficient contrast with background

### 6. Responsive Design Tests

#### 6.1 Mobile Devices (< 640px)
- **Test A**: iPhone 12 (390px width)
  - **Expected**: Layout adapts, no horizontal scroll
- **Test B**: Touch targets
  - **Expected**: All buttons ≥ 48px height
- **Test C**: Upload area
  - **Expected**: Drag-and-drop works on mobile

#### 6.2 Tablet Devices (640px - 1024px)
- **Test A**: iPad (768px width)
  - **Expected**: Layout optimized for tablet
- **Test B**: History table
  - **Expected**: Responsive table layout

#### 6.3 Desktop (> 1024px)
- **Test A**: Large screens (1920px+)
  - **Expected**: Content doesn't stretch excessively
- **Test B**: Multiple columns
  - **Expected**: Grid layout displays correctly

### 7. Browser Compatibility Tests

#### 7.1 Chrome/Chromium
- **Test A**: Upload and convert
  - **Expected**: Works without issues
- **Test B**: Download file
  - **Expected**: File downloads correctly

#### 7.2 Firefox
- **Test A**: All features
  - **Expected**: Works identically to Chrome
- **Test B**: File handling
  - **Expected**: Upload/download works

#### 7.3 Safari (macOS)
- **Test A**: Upload functionality
  - **Expected**: Works on Safari
- **Test B**: Word document download
  - **Expected**: Opens in Pages or Word

#### 7.4 Edge
- **Test A**: All features
  - **Expected**: Works without issues

### 8. Performance Tests

#### 8.1 Large File Processing
- **Test A**: 10MB PDF conversion time
  - **Expected**: Completes within 30 seconds
- **Test B**: 15MB PDF conversion time
  - **Expected**: Completes within 60 seconds
- **Test C**: Memory usage
  - **Expected**: No memory leaks during conversion

#### 8.2 Multiple Concurrent Uploads
- **Test A**: Upload 3 PDFs simultaneously
  - **Expected**: All process without interference
- **Test B**: UI responsiveness
  - **Expected**: No freezing or lag

#### 8.3 Network Performance
- **Test A**: Slow 3G network
  - **Expected**: Upload completes, may take longer
- **Test B**: High latency (500ms)
  - **Expected**: Conversion still works

### 9. Data Integrity Tests

#### 9.1 Conversion Accuracy
- **Test A**: Text extraction accuracy
  - **Expected**: > 95% accuracy for native PDFs
- **Test B**: Formatting preservation
  - **Expected**: Bold, italic, lists preserved
- **Test C**: Image handling
  - **Expected**: Images embedded in output document

#### 9.2 Hindi Text Handling
- **Test A**: Hindi characters preserved
  - **Expected**: Devanagari script displays correctly
- **Test B**: Hindi-English mixed text
  - **Expected**: Both scripts preserved
- **Test C**: Hindi OCR accuracy
  - **Expected**: > 85% accuracy for scanned Hindi text

### 10. Security Tests

#### 10.1 File Upload Security
- **Test A**: Upload file with malicious name
  - **Expected**: Filename sanitized
- **Test B**: Upload file with special characters
  - **Expected**: Handled correctly

#### 10.2 Session Security
- **Test A**: Logout and login
  - **Expected**: Session properly cleared
- **Test B**: Access history without login
  - **Expected**: Redirected to login page

## Test Execution Checklist

### Pre-Testing
- [ ] Environment properly configured
- [ ] All dependencies installed
- [ ] Dev server running
- [ ] Database connected
- [ ] S3 storage configured

### During Testing
- [ ] Document all findings
- [ ] Screenshot errors
- [ ] Note browser/OS versions
- [ ] Record timing information
- [ ] Test on multiple devices

### Post-Testing
- [ ] Compile test results
- [ ] Identify patterns in failures
- [ ] Create bug reports
- [ ] Prioritize fixes
- [ ] Retest after fixes

## Test Data

### Sample PDFs to Create
1. **English Native PDF**: Simple text document in English
2. **Hindi Native PDF**: Document with Hindi text
3. **Mixed Language PDF**: English and Hindi text
4. **Scanned English PDF**: Image-based PDF
5. **Scanned Hindi PDF**: Image-based PDF with Hindi text
6. **Complex Formatting PDF**: Tables, lists, images
7. **Large PDF**: 10+ pages
8. **Corrupted PDF**: Invalid PDF structure
9. **Empty PDF**: No content
10. **Multi-language PDF**: English, Hindi, and other scripts

## Bug Report Template

```
Title: [Brief description]
Severity: Critical / High / Medium / Low
Environment: Browser, OS, Device
Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]
Expected Result: [What should happen]
Actual Result: [What actually happened]
Screenshots: [Attach if applicable]
Console Errors: [Any JavaScript errors]
```

## Performance Benchmarks

| Metric | Target | Acceptable |
|--------|--------|-----------|
| Upload Speed (1MB) | < 2s | < 5s |
| Native PDF Conversion (1MB) | < 5s | < 10s |
| Scanned PDF OCR (1MB) | < 15s | < 30s |
| Page Load Time | < 2s | < 3s |
| History Load | < 1s | < 2s |

## Accessibility Standards

- **WCAG 2.1 Level AA** compliance target
- **Keyboard Navigation**: All features accessible
- **Screen Reader**: Compatible with NVDA, JAWS, VoiceOver
- **Color Contrast**: Minimum 4.5:1 for normal text
- **Focus Indicators**: Visible on all interactive elements

## Conclusion

This testing guide ensures comprehensive coverage of all application features, edge cases, and quality standards. Regular execution of these tests maintains product quality and user satisfaction.
