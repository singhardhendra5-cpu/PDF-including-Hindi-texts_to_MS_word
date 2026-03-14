# PDF to Word Converter with Hindi Support

A modern web application that converts PDF files to Microsoft Word documents with comprehensive support for Hindi text and scanned PDFs using OCR.

## 🌟 Features

### ✨ Easy Upload
- Drag-and-drop interface for PDF files
- Support for files up to 16MB
- Real-time file validation

### 🎯 Hindi Text Support
- Automatic OCR for scanned PDFs using Tesseract
- Hindi language recognition with Unicode support
- Handles mixed language documents (English + Hindi)

### 📄 Smart Conversion
- Detects native vs scanned PDFs automatically
- Preserves formatting, layout, and images
- Generates editable Microsoft Word (.docx) documents

### 📊 Conversion History
- Track all past conversions with timestamps
- View file metadata (size, page count, processing time)
- Download previously converted documents
- Delete conversion records

### 🎨 Elegant Design
- Modern gradient UI with responsive layout
- Real-time progress tracking with visual stages
- Smooth animations and transitions
- Mobile-friendly interface

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- tRPC for type-safe API
- Tesseract OCR with Hindi language data
- pdf2docx for native PDF conversion
- pytesseract for scanned PDF OCR
- MySQL/TiDB database
- AWS S3 for file storage

**Frontend:**
- React 19 with TypeScript
- Tailwind CSS 4 for styling
- Shadcn/ui components
- Wouter for routing
- Sonner for notifications

## 📦 Installation

### Prerequisites
- Node.js 22+
- pnpm package manager
- Python 3.8+
- Tesseract OCR with Hindi language data

### Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Install system dependencies (Linux/Ubuntu):**
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-hin poppler-utils
sudo pip3 install pdf2docx pytesseract pdf2image python-docx pillow
```

3. **Configure environment variables:**
Create a `.env.local` file with:
```
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=your_oauth_server
VITE_OAUTH_PORTAL_URL=your_oauth_portal
BUILT_IN_FORGE_API_URL=your_forge_api_url
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_key
VITE_FRONTEND_FORGE_API_URL=your_frontend_api_url
```

4. **Set up database:**
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

5. **Start development server:**
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## 🚀 Usage

### Converting a PDF

1. **Upload**: Drag and drop a PDF or click to browse
2. **Validate**: File is checked for format and size
3. **Process**: Conversion happens automatically
4. **Download**: Get your Word document when ready

### Viewing History

- Click "History" button to see all conversions
- View file metadata and conversion status
- Download completed conversions
- Delete records as needed

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components (Home, History)
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # tRPC client setup
│   │   └── App.tsx        # Main router
│   └── public/            # Static assets
├── server/                # Backend logic
│   ├── routers/           # tRPC route definitions
│   ├── pdf-processor.ts   # PDF conversion logic
│   ├── db.ts              # Database queries
│   └── storage.ts         # S3 integration
├── drizzle/               # Database schema
│   ├── schema.ts          # Table definitions
│   └── migrations/        # SQL migrations
├── shared/                # Shared types and constants
└── package.json           # Dependencies
```

## 🗄️ Database Schema

### Conversions Table
- `id`: Primary key
- `userId`: Reference to user
- `originalFileName`: Name of uploaded PDF
- `convertedFileName`: Name of generated Word document
- `fileSize`: Size in bytes
- `status`: pending | processing | completed | failed
- `pageCount`: Number of pages in PDF
- `processingTimeMs`: Conversion duration
- `createdAt`: Upload timestamp
- `updatedAt`: Last update timestamp

## 🔌 API Endpoints

### Upload & Convert
```
POST /api/trpc/conversion.uploadAndConvert
Input: { fileName: string, fileData: string (base64) }
Output: { conversionId: number, status: string }
```

### Get Status
```
GET /api/trpc/conversion.getStatus
Input: { conversionId: number }
Output: { status, errorMessage, pageCount, processingTimeMs }
```

### Get History
```
GET /api/trpc/conversion.getHistory
Output: Array of conversions with metadata
```

### Download Document
```
GET /api/trpc/conversion.getDownloadUrl
Input: { conversionId: number }
Output: { downloadUrl: string, fileName: string }
```

### Delete Conversion
```
POST /api/trpc/conversion.delete
Input: { conversionId: number }
Output: { success: boolean }
```

## ✅ Testing

Run the test suite:
```bash
pnpm test
```

Tests include:
- PDF validation (format, size, magic bytes)
- File size calculation
- Error handling for corrupted files

## ⚡ Performance Considerations

- **Large Files**: Conversions are processed in background
- **OCR**: Scanned PDFs take longer due to OCR processing
- **Caching**: Converted documents cached in S3
- **Database**: Indexes on userId and createdAt for fast queries

## ⚠️ Limitations

- Maximum file size: 16MB
- Supported formats: PDF only
- OCR accuracy depends on PDF image quality
- Processing time varies based on file complexity

## 🔧 Troubleshooting

### Tesseract Not Found
```bash
# Install Tesseract
sudo apt-get install tesseract-ocr tesseract-ocr-hin
```

### Hindi Text Not Recognized
- Ensure `tesseract-ocr-hin` package is installed
- Check that PDF contains actual text (not just images)
- For scanned PDFs, ensure image quality is good

### Database Connection Error
- Verify DATABASE_URL is correct
- Check database is running and accessible
- Run migrations: `pnpm drizzle-kit migrate`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new features
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 💬 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the troubleshooting section

## 🚀 Deployment

This application is ready for deployment on:
- Manus WebDev platform (built-in)
- Railway, Render, Vercel
- Docker containers
- Traditional VPS/cloud servers

---

**Built with ❤️ for seamless PDF to Word conversion**
