
import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  AlertTriangle, 
  AlertCircle, // Add this import
  Download, 
  X, 
  CheckCircle 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { BulkScanResult, HistoryItem } from '../types/scanner';
import { processCsvFile, saveToHistory, generateId, formatUrlForDisplay, getScoreColor } from '../utils/scannerUtils';
import { supabase } from '../lib/supabase';

const BulkScanner: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [bulkResults, setBulkResults] = useState<BulkScanResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Check file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) return;
    
    try {
      setIsProcessing(true);
      setScanProgress(0);
      
      // Read the CSV file
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(selectedFile);
      });

      // Parse CSV content (assuming one URL per line or first column)
      const domains = fileContent
        .split('\n')
        .map(line => line.split(',')[0].trim())
        .filter(url => url.length > 0)
        .map(url => url.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0]);

      if (domains.length === 0) {
        throw new Error('No valid domains found in the CSV file');
      }

      const totalDomains = domains.length;
      const domainProgress = new Map<string, number>();
      let completedDomains = 0;

      // Create a subscription for all domains
      const channel = supabase.channel('domain_updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'domains'
          },
          (payload) => {
            const domain = payload.new.domain;
            const checks = payload.new.number_of_checks;
            
            domainProgress.set(domain, checks);
            
            // Calculate total progress
            let totalChecks = 0;
            domainProgress.forEach(checks => {
              totalChecks += Math.min(checks, 3);
            });
            
            const progressPercentage = (totalChecks / (totalDomains * 3)) * 100;
            setScanProgress(progressPercentage);

            if (checks >= 3) {
              completedDomains++;
              if (completedDomains === totalDomains) {
                channel.unsubscribe();
                fetchFinalResults();
              }
            }
          }
        )
        .subscribe();

      // Insert all domains into Supabase
      const insertPromises = domains.map(domain => 
        supabase
          .from('domains')
          .insert([{ 
            domain: domain,
            spam_score: 0,
            status: 'Clean'
          }])
          .select()
          .single()
      );

      const insertedDomains = await Promise.all(insertPromises);
      const domainIds = insertedDomains.map(result => result.data?.id).filter(Boolean);

      // Send webhook for each domain
      const webhookPromises = domains.map((domain, index) => 
        fetch('https://lab.aiagents.menu/webhook/1cdb84df-6af0-406c-abbd-8aa8d0c918e7', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            record_id: domainIds[index],
            domain: domain
          }),
        })
      );

      await Promise.all(webhookPromises);

      // Function to fetch final results
      const fetchFinalResults = async () => {
        const { data: finalResults } = await supabase
          .from('domains')
          .select('*')
          .in('domain', domains);

        if (finalResults) {
          const results: BulkScanResult = {
            results: finalResults.map(domain => ({
              url: domain.domain,
              spamScore: domain.spam_score,
              status: domain.status.toLowerCase(),
              timestamp: new Date().toISOString(),
              criticalUrls: domain.critical_urls ? domain.critical_urls.split(',') : undefined,
              message: domain.message
            })),
            totalScanned: finalResults.length,
            timestamp: new Date().toISOString()
          };

          setBulkResults(results);
          setShowResults(true);
          setIsProcessing(false);
          
          // Save to history
          const historyItem: HistoryItem = {
            id: generateId(),
            type: 'bulk',
            timestamp: new Date().toISOString(),
            data: results
          };
          saveToHistory(historyItem);

          toast({
            title: "Scan Complete",
            description: `Successfully scanned ${results.totalScanned} URLs`,
          });
        }
      };

    } catch (error) {
      console.error('Processing error:', error);
      setIsProcessing(false);
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to process CSV file",
        variant: "destructive",
      });
    }
  };

  const handleExportCsv = () => {
    if (!bulkResults) return;
    
    // Create CSV content
    const headers = 'url,spamScore,status,message\n';
    const rows = bulkResults.results.map(result => 
      `"${result.url}",${result.spamScore},"${result.status}","${result.message || ''}"\n`
    ).join('');
    
    const csvContent = headers + rows;
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bulk-scan-results-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseResults = () => {
    setShowResults(false);
    setSelectedFile(null);
    setBulkResults(null);
    setScanProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="py-12 w-full">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center p-2 mb-4 rounded-full bg-primary/10">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Bulk URL Scanning</h2>
          <p className="text-muted-foreground max-w-md">
            Scan multiple URLs at once by uploading a CSV file containing the websites you want to check.
          </p>
        </div>

        <Card className="mx-auto max-w-2xl overflow-hidden shadow-md hover:shadow-lg transition-all-300 glass">
          <CardContent className="p-6">
            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all-200 ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Upload CSV File</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Drag and drop your file here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Browse Files
                </Button>
                <p className="text-xs text-muted-foreground mt-6">
                  CSV file should contain one URL per line or in the first column
                </p>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-primary/10 p-2 rounded-lg mr-3">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleRemoveFile}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {isProcessing ? (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Scanning URLs...</span>
                      <span>{Math.round(scanProgress)}%</span>
                    </div>
                    <Progress value={scanProgress} className="h-2" />
                  </div>
                ) : (
                  <Button
                    className="w-full rounded-lg py-5"
                    onClick={handleProcessFile}
                  >
                    Start Scanning
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Dialog */}
        <Dialog open={showResults} onOpenChange={setShowResults}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Bulk Scan Results</DialogTitle>
              <DialogDescription>
                Scanned {bulkResults?.totalScanned} URLs from {selectedFile?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Spam Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkResults?.results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {formatUrlForDisplay(result.url, 30)}
                      </TableCell>
                      <TableCell className={getScoreColor(result.spamScore)}>
                        {result.spamScore.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`
                            ${result.status === 'clean' ? 'bg-green-500/10 text-green-700' :
                              result.status === 'suspicious' ? 'bg-amber-500/10 text-amber-700' :
                                result.status === 'dangerous' ? 'bg-red-500/10 text-red-700' :
                                  'bg-secondary text-muted-foreground'}
                          `}
                        >
                          {result.status === 'clean' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : result.status === 'suspicious' ? (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          ) : result.status === 'dangerous' ? (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {result.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseResults}>
                Close
              </Button>
              <Button onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export as CSV
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default BulkScanner;



