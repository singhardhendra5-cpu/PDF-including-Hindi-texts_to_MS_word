import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Upload, FileText, Zap, CheckCircle2, Clock, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const MAX_FILE_SIZE_MB = 16;
const FILE_SIZE_WARNING_MB = 10;

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<{
    stage: "upload" | "processing" | "completed";
    fileName: string;
    conversionId?: number;
    fileSizeMB?: number;
    estimatedTimeSeconds?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.conversion.uploadAndConvert.useMutation();
  const utils = trpc.useUtils();
  
  const statusQuery = trpc.conversion.getStatus.useQuery(
    { conversionId: conversionProgress?.conversionId || 0 },
    {
      enabled: !!conversionProgress?.conversionId && conversionProgress.stage !== "completed",
      refetchInterval: 1000,
      staleTime: 0,
    }
  );

  // Update progress based on status query
  useEffect(() => {
    if (statusQuery.data && conversionProgress?.conversionId === statusQuery.data.id) {
      if (statusQuery.data.status === "completed" && conversionProgress.stage !== "completed") {
        setConversionProgress((prev) =>
          prev ? { ...prev, stage: "completed" } : null
        );
        setRetryCount(0);
        toast.success("Conversion completed successfully!");
      } else if (statusQuery.data.status === "processing" && conversionProgress.stage === "upload") {
        setConversionProgress((prev) =>
          prev ? { ...prev, stage: "processing" } : null
        );
      } else if (statusQuery.data.status === "failed") {
        const errorMsg = statusQuery.data.errorMessage || "Unknown error occurred";
        setError(errorMsg);
        toast.error(`Conversion failed: ${errorMsg}`);
        setConversionProgress(null);
        setIsConverting(false);
      }
    }
  }, [statusQuery.data, conversionProgress?.conversionId, conversionProgress?.stage]);

  const estimateConversionTime = (fileSizeMB: number): number => {
    // Rough estimate: 1-2 seconds per MB, plus 5 seconds base time
    return Math.ceil(5 + fileSizeMB * 1.5);
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setError(null);

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      const msg = "Please select a PDF file. Other formats are not supported.";
      setError(msg);
      toast.error(msg);
      return;
    }

    // Validate file size (16MB)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      const msg = `File size (${fileSizeMB.toFixed(2)}MB) exceeds ${MAX_FILE_SIZE_MB}MB limit. Please choose a smaller file.`;
      setError(msg);
      toast.error(msg);
      return;
    }

    // Warning for large files
    if (fileSizeMB > FILE_SIZE_WARNING_MB) {
      toast.warning(`Large file detected (${fileSizeMB.toFixed(2)}MB). Conversion may take longer.`);
    }

    // Read file and convert to base64
    const reader = new FileReader();
    
    reader.onerror = () => {
      const msg = "Failed to read file. Please try again.";
      setError(msg);
      toast.error(msg);
    };

    reader.onload = async (e) => {
      try {
        const base64Data = (e.target?.result as string)?.split(",")[1];
        if (!base64Data) {
          const msg = "Failed to process file data. Please try again.";
          setError(msg);
          toast.error(msg);
          return;
        }

        setIsConverting(true);
        setError(null);
        const estimatedTime = estimateConversionTime(fileSizeMB);
        setConversionProgress({
          stage: "upload",
          fileName: file.name,
          fileSizeMB: parseFloat(fileSizeMB.toFixed(2)),
          estimatedTimeSeconds: estimatedTime,
        });

        const result = await uploadMutation.mutateAsync({
          fileName: file.name,
          fileData: base64Data,
        });

        setConversionProgress((prev) =>
          prev
            ? { ...prev, conversionId: result.conversionId }
            : null
        );

        toast.success("Conversion started! Please wait...");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Upload failed. Please try again.";
        setError(errorMsg);
        toast.error(errorMsg);
        setConversionProgress(null);
        setIsConverting(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDownload = async () => {
    if (!conversionProgress?.conversionId) return;

    try {
      const downloadData = await utils.conversion.getDownloadUrl.fetch({
        conversionId: conversionProgress.conversionId,
      });

      const link = document.createElement("a");
      link.href = downloadData.downloadUrl;
      link.download = downloadData.fileName || "document.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started!");
      setConversionProgress(null);
      setIsConverting(false);
      setError(null);
      
      // Invalidate history to refresh
      utils.conversion.getHistory.invalidate();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Download failed. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(retryCount + 1);
      setError(null);
      setConversionProgress(null);
      setIsConverting(false);
      fileInputRef.current?.click();
    } else {
      toast.error("Maximum retry attempts reached. Please try again later.");
    }
  };

  const handleCancel = () => {
    setConversionProgress(null);
    setIsConverting(false);
    setError(null);
    setRetryCount(0);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">PDF to Word</h1>
            <p className="text-slate-600">Convert PDFs to editable Word documents with Hindi support</p>
          </div>
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            onClick={() => navigate("/auth")}
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">PDF to Word Converter</h1>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/history")}
            >
              History
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 border-slate-200 hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <Upload className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Easy Upload</h3>
            </div>
            <p className="text-sm text-slate-600">Drag and drop or click to upload PDF files up to 16MB</p>
          </Card>

          <Card className="p-6 border-slate-200 hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-slate-900">Hindi Support</h3>
            </div>
            <p className="text-sm text-slate-600">Automatic OCR for scanned PDFs with Hindi text recognition</p>
          </Card>

          <Card className="p-6 border-slate-200 hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-slate-900">Perfect Conversion</h3>
            </div>
            <p className="text-sm text-slate-600">Preserves formatting, layout, and text from your PDF</p>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 p-4 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Conversion Error</h3>
                <p className="text-sm text-red-800 mb-3">{error}</p>
                <div className="flex gap-2">
                  {retryCount < 3 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-100"
                      onClick={handleRetry}
                    >
                      Retry ({retryCount}/3)
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </Card>
        )}

        {/* Upload Area or Progress */}
        {!conversionProgress ? (
          <Card
            className={`border-2 border-dashed transition-all cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            aria-label="Upload PDF file"
          >
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                Drop your PDF here
              </h2>
              <p className="text-slate-600 mb-4">
                or click to browse files (max 16MB)
              </p>
              <p className="text-sm text-slate-500">
                Supports native and scanned PDFs with English and Hindi text
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              aria-label="Select PDF file"
            />
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-4">
                {conversionProgress.stage === "completed" ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600 animate-pulse" />
                ) : (
                  <Clock className="w-8 h-8 text-blue-600 animate-spin" />
                )}
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                {conversionProgress.stage === "upload" && "Uploading..."}
                {conversionProgress.stage === "processing" && "Converting..."}
                {conversionProgress.stage === "completed" && "Conversion Complete!"}
              </h2>
              <p className="text-slate-600 mb-2">
                {conversionProgress.fileName}
              </p>
              {conversionProgress.fileSizeMB && (
                <p className="text-sm text-slate-500 mb-2">
                  File size: {conversionProgress.fileSizeMB}MB
                </p>
              )}
              {conversionProgress.stage !== "completed" && conversionProgress.estimatedTimeSeconds && (
                <p className="text-sm text-slate-500">
                  Estimated time: ~{conversionProgress.estimatedTimeSeconds}s
                </p>
              )}
            </div>

            {/* Progress Stages */}
            <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  conversionProgress.stage !== "upload"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    conversionProgress.stage !== "upload" ? "bg-green-700" : "bg-blue-700"
                  }`}
                />
                Upload
              </div>
              <div className="w-8 h-0.5 bg-slate-300 hidden sm:block" />
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  conversionProgress.stage === "completed"
                    ? "bg-green-100 text-green-700"
                    : conversionProgress.stage === "processing"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    conversionProgress.stage === "processing" || conversionProgress.stage === "completed"
                      ? "bg-blue-700"
                      : "bg-slate-500"
                  }`}
                />
                Processing
              </div>
              <div className="w-8 h-0.5 bg-slate-300 hidden sm:block" />
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                  conversionProgress.stage === "completed"
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    conversionProgress.stage === "completed" ? "bg-green-700" : "bg-slate-500"
                  }`}
                />
                Complete
              </div>
            </div>

            {conversionProgress.stage === "completed" && (
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  onClick={handleDownload}
                >
                  Download Word Document
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancel}
                >
                  Convert Another
                </Button>
              </div>
            )}

            {conversionProgress.stage !== "completed" && (
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={handleCancel}
              >
                Cancel Conversion
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
