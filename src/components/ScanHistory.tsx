
import React, { useState, useEffect } from 'react';
import { History, Trash2, Download, ChevronDown, ChevronUp, AlertTriangle, Check, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HistoryItem, UrlScanResult, BulkScanResult } from '../types/scanner';
import { getHistory, clearHistory, exportHistoryAsCsv, formatTimestamp, formatUrlForDisplay, getScoreColor } from '../utils/scannerUtils';

const ScanHistory: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({ 
    key: 'timestamp', 
    direction: 'descending' 
  });
  const { toast } = useToast();

  useEffect(() => {
    // Load history from localStorage
    loadHistory();
  }, []);

  const loadHistory = () => {
    const historyItems = getHistory();
    setHistory(historyItems);
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setShowDeleteDialog(false);
    toast({
      title: "History Cleared",
      description: "All scan history has been successfully cleared",
    });
  };

  const handleExportHistory = () => {
    if (history.length === 0) {
      toast({
        title: "Nothing to Export",
        description: "Your scan history is empty",
        variant: "destructive",
      });
      return;
    }
    
    const csvContent = exportHistoryAsCsv(history);
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `url-sentry-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: "History has been exported to CSV",
    });
  };

  const sortedHistory = React.useMemo(() => {
    let sortableItems = [...history];
    
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (sortConfig.key === 'timestamp') {
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
        } else if (sortConfig.key === 'type') {
          return sortConfig.direction === 'ascending'
            ? a.type.localeCompare(b.type)
            : b.type.localeCompare(a.type);
        }
        return 0;
      });
    }
    
    return sortableItems;
  }, [history, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
    if (sortConfig.key !== columnName) {
      return null;
    }
    return sortConfig.direction === 'ascending' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean':
        return <Check className="h-3.5 w-3.5 text-green-500" />;
      case 'suspicious':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case 'dangerous':
        return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <section id="history" className="py-12 w-full">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center p-2 mb-4 rounded-full bg-primary/10">
            <History className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Scan History</h2>
          <p className="text-muted-foreground max-w-md">
            Review your previous URL scans and track potential threats over time.
          </p>
        </div>

        <Card className="mx-auto max-w-5xl overflow-hidden shadow-md transition-all-300 glass">
          <CardHeader className="bg-card/50 border-b border-border px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Previous Scans</CardTitle>
              <CardDescription>History of your URL scans</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center" 
                onClick={handleExportHistory}
                disabled={history.length === 0}
              >
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center text-destructive hover:bg-destructive/10" 
                onClick={() => setShowDeleteDialog(true)}
                disabled={history.length === 0}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <div className="py-16 text-center">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No scan history yet</h3>
                <p className="text-sm text-muted-foreground">
                  Your scan history will appear here after you scan a URL
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead onClick={() => requestSort('timestamp')} className="cursor-pointer">
                        <div className="flex items-center">
                          Timestamp
                          {getSortIcon('timestamp')}
                        </div>
                      </TableHead>
                      <TableHead onClick={() => requestSort('type')} className="cursor-pointer">
                        <div className="flex items-center">
                          Type
                          {getSortIcon('type')}
                        </div>
                      </TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedHistory.map((item) => {
                      const isExpanded = expandedItems.has(item.id);
                      
                      if (item.type === 'single') {
                        const singleData = item.data as UrlScanResult;
                        return (
                          <React.Fragment key={item.id}>
                            <TableRow>
                              <TableCell>
                                {formatTimestamp(item.timestamp)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">Single</Badge>
                              </TableCell>
                              <TableCell>
                                {formatUrlForDisplay(singleData.url)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  {getStatusIcon(singleData.status)}
                                  <span className={`ml-1 text-sm ${getScoreColor(singleData.spamScore)}`}>
                                    {singleData.spamScore.toFixed(1)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(item.id)}
                                >
                                  {isExpanded ? 'Hide Details' : 'Show Details'}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="bg-muted/20 border-0">
                                <TableCell colSpan={5} className="p-4">
                                  <div className="text-sm">
                                    <div className="mb-2"><strong>Status:</strong> {singleData.status}</div>
                                    <div className="mb-2"><strong>Message:</strong> {singleData.message}</div>
                                    {singleData.criticalUrls && singleData.criticalUrls.length > 0 && (
                                      <div>
                                        <strong>Critical URLs:</strong>
                                        <ul className="list-disc list-inside pl-2 mt-1">
                                          {singleData.criticalUrls.map((url, idx) => (
                                            <li key={idx} className="text-muted-foreground">{url}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      } else {
                        const bulkData = item.data as BulkScanResult;
                        return (
                          <React.Fragment key={item.id}>
                            <TableRow>
                              <TableCell>
                                {formatTimestamp(item.timestamp)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">Bulk ({bulkData.totalScanned})</Badge>
                              </TableCell>
                              <TableCell>Multiple URLs</TableCell>
                              <TableCell>
                                {bulkData.results.some(r => r.status === 'dangerous') ? (
                                  <div className="flex items-center">
                                    <AlertCircle className="h-3.5 w-3.5 text-red-500 mr-1" />
                                    <span className="text-sm">Issues Found</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <Check className="h-3.5 w-3.5 text-green-500 mr-1" />
                                    <span className="text-sm">All Clean</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(item.id)}
                                >
                                  {isExpanded ? 'Hide Results' : 'Show Results'}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="bg-muted/20 border-0">
                                <TableCell colSpan={5} className="p-4">
                                  <div className="text-sm mb-2">
                                    <strong>Bulk Scan Results</strong> - {formatTimestamp(bulkData.timestamp)}
                                  </div>
                                  <Separator className="my-2" />
                                  <div className="max-h-64 overflow-y-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>URL</TableHead>
                                          <TableHead>Score</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Message</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {bulkData.results.map((result, idx) => (
                                          <TableRow key={idx}>
                                            <TableCell className="text-xs">
                                              {formatUrlForDisplay(result.url)}
                                            </TableCell>
                                            <TableCell className={`text-xs ${getScoreColor(result.spamScore)}`}>
                                              {result.spamScore.toFixed(1)}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                              <div className="flex items-center">
                                                {getStatusIcon(result.status)}
                                                <span className="ml-1">{result.status}</span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                              {result.message}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      }
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear History</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your scan history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default ScanHistory;
