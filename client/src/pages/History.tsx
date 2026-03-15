import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Download, Trash2, FileText, Calendar, HardDrive, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

type SortField = "date" | "size" | "name";
type SortOrder = "asc" | "desc";
type FilterStatus = "all" | "completed" | "processing" | "pending" | "failed";

export default function History() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const historyQuery = trpc.conversion.getHistory.useQuery();
  const deleteQuery = trpc.conversion.delete.useMutation();
  const utils = trpc.useUtils();

  const filteredAndSortedData = useMemo(() => {
    if (!historyQuery.data) return [];

    let filtered = historyQuery.data;

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((item) => item.status === filterStatus);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.originalFileName.toLowerCase().includes(query) ||
          item.convertedFileName.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;

      switch (sortField) {
        case "date":
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "size":
          compareValue = a.fileSize - b.fileSize;
          break;
        case "name":
          compareValue = a.originalFileName.localeCompare(b.originalFileName);
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return sorted;
  }, [historyQuery.data, searchQuery, sortField, sortOrder, filterStatus]);

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
      toast.success("Conversion deleted successfully");
      setDeleteConfirm(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Delete failed. Please try again.";
      toast.error(errorMsg);
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
      const errorMsg = error instanceof Error ? error.message : "Download failed. Please try again.";
      toast.error(errorMsg);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
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
        ) : historyQuery.error ? (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Failed to Load History</h3>
                <p className="text-sm text-red-800 mb-3">
                  {historyQuery.error instanceof Error ? historyQuery.error.message : "An error occurred while loading your conversion history."}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-100"
                  onClick={() => historyQuery.refetch()}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        ) : historyQuery.data && historyQuery.data.length > 0 ? (
          <div className="space-y-6">
            {/* Filters and Search */}
            <Card className="p-6 border-slate-200">
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Search conversions"
                  />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Filter by status"
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="processing">Processing</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Sort By
                    </label>
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value as SortField)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Sort by field"
                    >
                      <option value="date">Date</option>
                      <option value="size">File Size</option>
                      <option value="name">Filename</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Order
                    </label>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Sort order"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>

                {/* Results Count */}
                <div className="text-sm text-slate-600">
                  Showing {filteredAndSortedData.length} of {historyQuery.data.length} conversions
                </div>
              </div>
            </Card>

            {/* Conversions List */}
            {filteredAndSortedData.length > 0 ? (
              <div className="space-y-4">
                {filteredAndSortedData.map((conversion) => (
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
                            <h3 className="font-semibold text-slate-900 truncate" title={conversion.originalFileName}>
                              {conversion.originalFileName}
                            </h3>
                            <p className="text-sm text-slate-600 truncate" title={conversion.convertedFileName}>
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
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(conversion.status)}`}
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
                            title="Download converted document"
                            aria-label={`Download ${conversion.convertedFileName}`}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <div className="relative">
                          {deleteConfirm === conversion.id ? (
                            <div className="absolute right-0 top-full mt-2 bg-white border border-red-200 rounded-lg shadow-lg p-3 z-10 whitespace-nowrap">
                              <p className="text-sm text-slate-700 mb-2">Delete this conversion?</p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-100"
                                  onClick={() => handleDelete(conversion.id)}
                                  disabled={deleteQuery.isPending}
                                >
                                  Delete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteConfirm(conversion.id)}
                            disabled={deleteQuery.isPending}
                            title="Delete conversion"
                            aria-label={`Delete ${conversion.originalFileName}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
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
                  No conversions found
                </h2>
                <p className="text-slate-600 mb-6">
                  Try adjusting your search or filters
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterStatus("all");
                  }}
                >
                  Clear Filters
                </Button>
              </Card>
            )}
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
