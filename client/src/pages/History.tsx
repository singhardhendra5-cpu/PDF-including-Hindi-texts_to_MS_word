import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Download, Trash2, FileText, Calendar, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

export default function History() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const historyQuery = trpc.conversion.getHistory.useQuery();
  const deleteQuery = trpc.conversion.delete.useMutation();
  const utils = trpc.useUtils();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Access Denied</h1>
          <p className="text-slate-600 mb-6">Please sign in to view your conversion history</p>
          <Button onClick={() => navigate("/")} className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = async (conversionId: number) => {
    try {
      await deleteQuery.mutateAsync({ conversionId });
      await utils.conversion.getHistory.invalidate();
      toast.success("Conversion deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const handleDownload = async (conversionId: number, fileName: string) => {
    try {
      const downloadData = await utils.conversion.getDownloadUrl.fetch({
        conversionId,
      });

      const link = document.createElement("a");
      link.href = downloadData.downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
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
              <h1 className="text-2xl font-bold text-slate-900">Conversion History</h1>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
            >
              Back to Converter
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {historyQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-slate-600">Loading conversion history...</p>
          </div>
        ) : historyQuery.data && historyQuery.data.length > 0 ? (
          <div className="space-y-4">
            {historyQuery.data.map((conversion) => (
              <Card
                key={conversion.id}
                className="p-6 border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg flex-shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {conversion.originalFileName}
                        </h3>
                        <p className="text-sm text-slate-600 truncate">
                          → {conversion.convertedFileName}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-4 h-4 text-slate-400" />
                        {formatFileSize(conversion.fileSize)}
                      </div>
                      {conversion.pageCount && (
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-slate-400" />
                          {conversion.pageCount} pages
                        </div>
                      )}
                      {conversion.processingTimeMs && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {(conversion.processingTimeMs / 1000).toFixed(1)}s
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDistanceToNow(new Date(conversion.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>

                    <div className="mt-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          conversion.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : conversion.status === "processing"
                            ? "bg-blue-100 text-blue-800"
                            : conversion.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {conversion.status.charAt(0).toUpperCase() +
                          conversion.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {conversion.status === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDownload(conversion.id, conversion.convertedFileName)
                        }
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(conversion.id)}
                      disabled={deleteQuery.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-slate-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              No conversions yet
            </h2>
            <p className="text-slate-600 mb-6">
              Start by uploading a PDF file to convert it to Word format
            </p>
            <Button onClick={() => navigate("/")} className="w-full sm:w-auto">
              Convert Your First PDF
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
