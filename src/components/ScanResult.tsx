
import React from 'react';
import { Check, AlertTriangle, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { UrlScanResult } from '../types/scanner';
import { formatUrlForDisplay, getScoreColor, getScoreText } from '../utils/scannerUtils';

interface ScanResultProps {
  result: UrlScanResult;
}

const ScanResult: React.FC<ScanResultProps> = ({ result }) => {
  const { url, spamScore, status, message, criticalUrls } = result;
  
  const scoreColor = getScoreColor(spamScore);
  const scoreText = getScoreText(spamScore);
  
  const StatusIcon = () => {
    switch (status.toLowerCase()) {
      case 'clean':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'suspicious':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'dangerous':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const getStatusClass = () => {
    switch (status.toLowerCase()) {
      case 'clean':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'suspicious':
        return 'bg-amber-500/10 text-amber-700 border-amber-200';
      case 'dangerous':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  const getProgressBarColor = () => {
    if (spamScore >= 7) return 'bg-red-500';
    if (spamScore >= 4) return 'bg-amber-500';
    return 'bg-green-500';
  };
  
  return (
    <Card className="bg-card/50 border-border transition-all-300 overflow-hidden shadow-sm hover:shadow">
      <CardContent className="pt-6 pb-4 px-6">
        {/* URL and Status Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold tracking-tight flex items-center">
            <span className="inline-block p-1.5 mr-2 rounded-full bg-primary/10">
              <LinkIcon className="h-4 w-4 text-primary" />
            </span>
            {formatUrlForDisplay(url)}
          </h3>
          <Badge className={`px-3 py-1.5 ${getStatusClass()}`}>
            <StatusIcon />
            <span className="ml-1.5 font-medium">
              {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
            </span>
          </Badge>
        </div>
        
        {/* Spam Score Section */}
        <div className="mb-6 bg-background/50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Spam Score</span>
            <div className="flex items-center">
              <span className={`text-sm font-bold ${scoreColor}`}>
                {spamScore.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground ml-1">/10</span>
            </div>
          </div>
          <Progress 
            value={spamScore * 10} 
            className="h-2.5 rounded-full" 
            style={{
              background: 'linear-gradient(to right, rgba(74, 222, 128, 0.2), rgba(250, 204, 21, 0.2), rgba(248, 113, 113, 0.2))'
            }}
          />
          <p className={`text-xs mt-2 ${scoreColor} text-right font-medium`}>
            {scoreText}
          </p>
        </div>
        
        {/* Message Section */}
        {message && (
          <div className="mb-6 text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
            <p className="leading-relaxed">{message}</p>
          </div>
        )}
        
        {/* Critical URLs Section */}
        {criticalUrls && criticalUrls.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center text-amber-600">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Critical URL Detected
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground bg-amber-50/50 p-4 rounded-lg border border-amber-100">
                {criticalUrls.map((criticalUrl, index) => (
                  <li key={index} className="flex items-start">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="break-all">{formatUrlForDisplay(criticalUrl, 60)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ScanResult;

