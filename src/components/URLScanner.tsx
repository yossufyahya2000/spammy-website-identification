
import React, { useState } from 'react';
import { Search, Shield, AlertTriangle, Link2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import ScanResult from './ScanResult';
import { UrlScanResult, HistoryItem } from '../types/scanner';
import { scanUrl, saveToHistory, generateId, isValidUrl } from '../utils/scannerUtils';
import { supabase } from '../lib/supabase';

const URLScanner: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<UrlScanResult | null>(null);
  const [isShowingResult, setIsShowingResult] = useState(false);
  const { toast } = useToast();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to scan",
        variant: "destructive",
      });
      return;
    }
    
    if (!isValidUrl(url)) {
      toast({
        title: "Invalid URL Format",
        description: "Please enter a valid URL (e.g., example.com)",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      setScanResult(null);
      setIsShowingResult(false);

      // Extract domain from URL
      const domain = url.replace(/^(https?:\/\/)?(www\.)?/i, '').split('/')[0];

      // Insert domain into Supabase
      const { data: insertedDomain, error: supabaseError } = await supabase
        .from('domains')
        .insert([
          { 
            domain: domain,
            spam_score: 0,
            status: 'Clean'
          }
        ])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      // Set up realtime subscription using channel
      const channel = supabase.channel('domain_updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'domains',
            filter: `id=eq.${insertedDomain.id}`
          },
          (payload) => {
            if (payload.new.number_of_checks >= 3) {
              channel.unsubscribe();
              setIsLoading(false);
              
              // Update scan result with the final data
              setScanResult({
                url: domain,
                spamScore: payload.new.spam_score,
                status: payload.new.status.toLowerCase(),
                timestamp: new Date().toISOString(),
                criticalUrls: payload.new.critical_urls ? payload.new.critical_urls.split(',') : undefined,
                message: payload.new.message
              });
              setIsShowingResult(true);
            }
          }
        )
        .subscribe();

      // Send webhook
      const webhookResponse = await fetch('https://lab.aiagents.menu/webhook/1cdb84df-6af0-406c-abbd-8aa8d0c918e7', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record_id: insertedDomain.id,
          domain: domain
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error('Webhook call failed');
      }
      
    } catch (error) {
      console.error('Scan error:', error);
      setIsLoading(false);
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : "Failed to scan URL",
        variant: "destructive",
      });
    }
  };

  return (
    <section id="scan" className="py-12 w-full">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center justify-center p-2 mb-4 rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Check any URL for spam</h2>
          <p className="text-muted-foreground max-w-md">
            Scan any website and instantly find out if it's safe, suspicious, or potentially dangerous.
          </p>
        </div>

        <Card className="mx-auto max-w-2xl overflow-hidden transition-all-300 border shadow-md hover:shadow-lg glass">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter website URL (e.g., example.com)"
                    className="pl-10 pr-4 py-6 bg-background/50 border-input rounded-xl focus:ring-2 focus:ring-ring focus:border-input transition-all-200 w-full"
                    value={url}
                    onChange={handleUrlChange}
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto py-6 px-8 rounded-xl font-medium transition-all-200 bg-primary text-white hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      Scanning...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Search className="mr-2 h-4 w-4" />
                      Scan URL
                    </div>
                  )}
                </Button>
              </div>
            </form>

            {isLoading && (
              <div className="mt-8 flex flex-col items-center justify-center p-6 animate-pulse">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                <p className="text-muted-foreground">Scanning URL for threats...</p>
              </div>
            )}

            {scanResult && (
              <div className={`mt-8 overflow-hidden transition-all-300 ${isShowingResult ? 'animate-fade-up opacity-100' : 'opacity-0'}`}>
                <ScanResult result={scanResult} />
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </section>
  );
};

export default URLScanner;




