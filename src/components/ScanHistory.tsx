
import React, { useEffect, useState } from 'react';
import { History, ChevronUp, ChevronDown, Check, AlertTriangle, AlertCircle, Download, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatTimestamp, formatUrlForDisplay, getScoreColor } from '../utils/scannerUtils';
import { ScrollArea } from "@/components/ui/scroll-area";

interface Domain {
  id: string;
  domain: string;
  spam_score: number;
  status: 'Clean' | 'High Risk' | 'Review';
  message: string | null;
  critical_urls: string | null;
  number_of_checks: number;
  created_at: string;
}

const ScanHistory = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }>({ key: 'created_at', direction: 'descending' });

  const fetchDomains = async () => {
    try {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDomains(data);
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up real-time subscription first
    const channel = supabase
      .channel('domain_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'domains'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDomains(prev => [payload.new as Domain, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDomains(prev => 
              prev.map(domain => 
                domain.id === payload.new.id ? payload.new as Domain : domain
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setDomains(prev => 
              prev.filter(domain => domain.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Then fetch initial data
    fetchDomains();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleClearHistory = async () => {
    const { error } = await supabase
      .from('domains')
      .delete()
      .neq('id', ''); // Delete all records

    if (error) {
      console.error('Error clearing history:', error);
      return;
    }

    setShowDeleteDialog(false);
    setDomains([]);
  };

  const handleExportHistory = () => {
    const csv = [
      ['Domain', 'Spam Score', 'Status', 'Message', 'Critical URL', 'Date'],
      ...domains.map(domain => [
        domain.domain,
        domain.spam_score,
        domain.status,
        domain.message || '',
        domain.critical_urls || '',
        formatTimestamp(domain.created_at)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `url-sentry-history-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'clean':
        return <Check className="h-3.5 w-3.5 text-green-500" />;
      case 'review':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case 'high risk':
        return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return null;
    }
    return sortConfig.direction === 'ascending' ? 
      <ChevronUp className="ml-1 h-4 w-4" /> : 
      <ChevronDown className="ml-1 h-4 w-4" />;
  };

  const requestSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: 
        prevConfig.key === key && prevConfig.direction === 'ascending' 
          ? 'descending' 
          : 'ascending',
    }));
  };

  const sortedDomains = [...domains].sort((a, b) => {
    const direction = sortConfig.direction === 'ascending' ? 1 : -1;
    switch (sortConfig.key) {
      case 'created_at':
        return direction * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'domain':
        return direction * a.domain.localeCompare(b.domain);
      case 'spam_score':
        return direction * (a.spam_score - b.spam_score);
      default:
        return 0;
    }
  });

  return (
    <section id="history" className="py-8 sm:py-12 w-full">
      <div className="container mx-auto px-2 sm:px-6">
        <div className="flex flex-col items-center text-center mb-6 sm:mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center p-2 mb-4 rounded-full bg-primary/10">
            <History className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Scan History</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md">
            Review your previous URL scans and track potential threats over time.
          </p>
        </div>

        <Card className="mx-auto max-w-5xl overflow-hidden shadow-md transition-all-300 glass">
          <CardHeader className="bg-card/50 border-b border-border px-3 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">Previous Scans</CardTitle>
                <CardDescription className="text-sm">History of your URL scans</CardDescription>
              </div>
              <div className="flex w-full sm:w-auto space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-initial items-center" 
                  onClick={handleExportHistory}
                  disabled={isLoading || domains.length === 0}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 sm:flex-initial items-center text-destructive hover:bg-destructive/10" 
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isLoading || domains.length === 0}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 sm:p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : domains.length === 0 ? (
              <div className="py-12 sm:py-16 text-center">
                <History className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-sm sm:text-base text-muted-foreground">No scan history available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[800px]"> {/* Minimum width to prevent table from breaking */}
                  <Table>
                    <TableHeader className="bg-card">
                      <TableRow>
                        <TableHead 
                          onClick={() => requestSort('created_at')} 
                          className="cursor-pointer w-[180px] text-sm"
                        >
                          <div className="flex items-center">
                            Timestamp
                            {getSortIcon('created_at')}
                          </div>
                        </TableHead>
                        <TableHead 
                          onClick={() => requestSort('domain')} 
                          className="cursor-pointer w-[180px] text-sm"
                        >
                          <div className="flex items-center">
                            Domain
                            {getSortIcon('domain')}
                          </div>
                        </TableHead>
                        <TableHead 
                          onClick={() => requestSort('spam_score')} 
                          className="cursor-pointer w-[150px] text-sm"
                        >
                          <div className="flex items-center">
                            Spam Score
                            {getSortIcon('spam_score')}
                          </div>
                        </TableHead>
                        <TableHead className="w-[120px] text-sm">Status</TableHead>
                        <TableHead className="text-right w-[120px] text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                  <div className={domains.length > 15 ? "h-[400px] sm:h-[600px] relative" : ""}>
                    <ScrollArea className="w-full h-full">
                      <Table>
                        <TableBody className="text-sm">
                          {sortedDomains.map((domain) => {
                            const isExpanded = expandedItems.has(domain.id);
                            
                            return (
                              <React.Fragment key={domain.id}>
                                <TableRow>
                                  <TableCell className="w-[180px]">
                                    {formatTimestamp(domain.created_at)}
                                  </TableCell>
                                  <TableCell className="w-[180px]">
                                    {domain.domain}
                                  </TableCell>
                                  <TableCell className="w-[150px]">
                                    <div className="flex items-center">
                                      {getStatusIcon(domain.status)}
                                      <span className={`ml-1 text-sm ${getScoreColor(domain.spam_score)}`}>
                                        {domain.spam_score.toFixed(1)}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="w-[120px]">
                                    {domain.status}
                                  </TableCell>
                                  <TableCell className="text-right w-[120px]">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleExpand(domain.id)}
                                    >
                                      {isExpanded ? 'Hide Details' : 'Show Details'}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow className="bg-muted/20 border-0">
                                    <TableCell colSpan={5} className="p-4">
                                      <div className="text-sm">
                                        <div className="mb-2"><strong>Status:</strong> {domain.status}</div>
                                        <div className="mb-2"><strong>Message:</strong> {domain.message}</div>
                                        {domain.critical_urls && domain.critical_urls.length > 0 && (
                                          <div>
                                            <strong>Critical URL:</strong>
                                            <ul className="list-disc list-inside pl-2 mt-1">
                                              {domain.critical_urls.split(',').map((url, idx) => (
                                                <li key={idx} className="text-muted-foreground">{url.trim()}</li>
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
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
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














