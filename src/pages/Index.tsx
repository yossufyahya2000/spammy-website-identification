
import React from 'react';
import { Shield, Search, History, Upload, ExternalLink } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import URLScanner from '@/components/URLScanner';
import BulkScanner from '@/components/BulkScanner';
import ScanHistory from '@/components/ScanHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col items-center text-center animate-fade-in">
              <div className="mb-6 p-3 rounded-full bg-primary/10">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-clip-text">
                Protect your SEO from bad backlinks
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mb-8">
                Identify domains with gambling, CBD, cannabis, iGaming, or PBN links so you can avoid harmful backlinks and keep your SEO profile clean.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="rounded-full py-6 px-8 text-base" size="lg" asChild>
                  <a href="#scan">
                    <Search className="mr-2 h-5 w-5" />
                    Scan a URL
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section id="features" className="py-16 px-4 sm:px-6 bg-secondary/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12 animate-fade-up">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Comprehensive Protection</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our intelligent scanning system provides multi-layered security features
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-card/50 border-border shadow-sm hover:shadow-md transition-all-300 overflow-hidden glass">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Check Any URL</h3>
                  <p className="text-muted-foreground">
                    Scan any site to instantly see if it’s tied to questionable niches. LinkGuard provides a clear score, helping you decide whether to link to or receive links from that domain.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-border shadow-sm hover:shadow-md transition-all-300 overflow-hidden glass">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Bulk URL Scanning</h3>
                  <p className="text-muted-foreground">
                    Have multiple sites to check? Upload your CSV list and let LinkGuard do the work. Quickly find out which domains might harm your SEO efforts.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50 border-border shadow-sm hover:shadow-md transition-all-300 overflow-hidden glass">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                    <History className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Scan History</h3>
                  <p className="text-muted-foreground">
                    Keep track of your scan results with our dashboard. We store each domain’s score and status, making it easy to track changes, export reports, or remove entries as needed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* URL Scanner Component */}
        <URLScanner />
        
        {/* Bulk Scanner Component */}
        <BulkScanner />
        
        {/* History Component */}
        <ScanHistory />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
