import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Upload, FileText, Zap, CheckCircle2, Clock, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const MAX_FILE_SIZE_MB = 16;
const FILE_SIZE_WARNING_MB = 10;

export default function Home() {
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
      if (statusQuery.data.status === "completed" && conversionProgress?.stage !== "completed") {
        setConversionProgress((prev) =>
          prev ? { ...prev, stage: "completed" } : null
        );
        setRetryCount(0);
        toast.success("Conversion completed successfully!");
      } else if (statusQuery.data.status === "processing" && conversionProgress?.stage === "upload") {
        setConversionProgress((prev) =>
          prev ? { ...prev, stage: "processing" } : null
        );
      } else if (statusQuery.data.status === "failed") {
        setError("Conversion failed. Please try again.");
        setIsConverting(false);
      }
    }
  }, [statusQuery.data, conversionProgress?.conversionId, conversionProgress?.stage]);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!file.type.includes("pdf")) {
      return { valid: false, error: "Please select a PDF file" };
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit` };
    }

    return { valid: true };
  };

  const handleFileSelect = async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      setError(validation.error || "Invalid file");
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > FILE_SIZE_WARNING_MB) {
      toast.warning(`Large file detected (${fileSizeMB.toFixed(1)}MB). Processing may take longer.`);
    }

    setError(null);
    setIsConverting(true);
    setConversionProgress({
      stage: "upload",
      fileName: file.name,
      fileSizeMB: fileSizeMB,
      estimatedTimeSeconds: Math.ceil(fileSizeMB * 2),
    });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target?.result as string;
        const base64Data = fileData.split(",")[1];

        try {
          const result = await uploadMutation.mutateAsync({
            fileName: file.name,
            fileData: base64Data,
          } as any);

          setConversionProgress((prev) =>
            prev ? { ...prev, conversionId: (result as any).id || (result as any).conversionId, stage: "processing" } : null
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Upload failed";
          setError(errorMsg);
          toast.error(errorMsg);
          setIsConverting(false);
          setConversionProgress(null);

          if (retryCount < 3) {
            setRetryCount(retryCount + 1);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "File processing failed";
      setError(errorMsg);
      toast.error(errorMsg);
      setIsConverting(false);
      setConversionProgress(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDownload = async () => {
    if (!conversionProgress?.conversionId) return;

    try {
      const downloadData = await utils.conversion.getDownloadUrl.fetch({
        conversionId: conversionProgress.conversionId!,
      } as any);

      const link = document.createElement("a");
      link.href = downloadData.downloadUrl;
      link.download = conversionProgress.fileName.replace(".pdf", ".docx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started!");
      setConversionProgress(null);
      setIsConverting(false);
      await utils.conversion.getHistory.invalidate();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Download failed";
      toast.error(errorMsg);
    }
  };

  const handleReset = () => {
    setConversionProgress(null);
    setError(null);
    setIsConverting(false);
    setRetryCount(0);
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      handleReset();
    } else {
      toast.error("Maximum retry attempts reached. Please try with a different file.");
    }
  };

  const clearError = () => {
    setError(null);
    setRetryCount(0);
  };

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
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 border-slate-200">
            <div className="flex items-start gap-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg flex-shrink-0">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Easy Upload</h3>
                <p className="text-sm text-slate-600">
                  Drag and drop or click to upload PDF files up to 16MB
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <div className="flex items-start gap-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg flex-shrink-0">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Hindi Support</h3>
                <p className="text-sm text-slate-600">
                  Automatic OCR for scanned PDFs with Hindi text recognition
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-slate-200">
            <div className="flex items-start gap-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Perfect Conversion</h3>
                <p className="text-sm text-slate-600">
                  Preserves formatting, layout, and text from your PDF
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Upload Area or Progress */}
        {!isConverting ? (
          <Card
            className={`p-12 border-2 border-dashed transition-all cursor-pointer ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 hover:border-slate-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
              aria-label="Upload PDF file"
            />

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Upload className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Drop your PDF here</h2>
              <p className="text-slate-600 mb-4">or click to browse files (max 16MB)</p>
              <p className="text-sm text-slate-500">
                Supports native and scanned PDFs with English and Hindi text
              </p>
            </div>
          </Card>
        ) : conversionProgress ? (
          <Card className="p-8 border-slate-200">
            <div className="space-y-6">
              {/* File Info */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  {conversionProgress.fileName}
                </h3>
                <p className="text-sm text-slate-600">
                  {conversionProgress.fileSizeMB?.toFixed(2)}MB • Estimated time: {conversionProgress.estimatedTimeSeconds}s
                </p>
              </div>

              {/* Progress Stages */}
              <div className="space-y-3">
                {["upload", "processing", "completed"].map((stage) => (
                  <div key={stage} className="flex items-center gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        conversionProgress.stage === stage
                          ? "bg-blue-600 text-white animate-pulse"
                          : ["upload", "processing"].includes(stage) &&
                            ["upload", "processing", "completed"].indexOf(
                              conversionProgress.stage
                            ) > ["upload", "processing", "completed"].indexOf(stage)
                          ? "bg-green-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {["upload", "processing"].includes(stage) &&
                      ["upload", "processing", "completed"].indexOf(
                        conversionProgress.stage
                      ) > ["upload", "processing", "completed"].indexOf(stage) ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-xs font-semibold">
                          {stage === "upload" ? "1" : stage === "processing" ? "2" : "3"}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {stage === "upload" ? "Uploading" : stage === "processing" ? "Processing" : "Completed"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              {conversionProgress.stage === "completed" ? (
                <div className="flex gap-3 pt-4">
                  <Button
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    onClick={handleDownload}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Word Document
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleReset}
                  >
                    Convert Another
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 pt-4">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!isConverting}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ) : null}

        {/* Error Message */}
        {error && (
          <Card className="mt-6 p-4 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-1">Conversion Failed</h4>
                <p className="text-sm text-red-800 mb-3">{error}</p>
                <div className="flex gap-2">
                  {retryCount < 3 && (
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handleRetry}
                    >
                      Retry ({retryCount}/3)
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-100"
                    onClick={clearError}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// Add missing import
import { Download } from "lucide-react";
