
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
    switch (status) {
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
    switch (status) {
      case 'clean':
        return 'bg-green-500/10 text-green-700';
      case 'suspicious':
        return 'bg-amber-500/10 text-amber-700';
      case 'dangerous':
        return 'bg-red-500/10 text-red-700';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };
  
  return (
    <Card className="bg-card/50 border-border transition-all-300 overflow-hidden shadow-sm hover:shadow">
      <CardContent className="pt-6 pb-4 px-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold tracking-tight flex items-center">
            <span className="inline-block p-1.5 mr-2 rounded-full bg-primary/10">
              <LinkIcon className="h-4 w-4 text-primary" />
            </span>
            {formatUrlForDisplay(url)}
          </h3>
          <Badge className={getStatusClass()}>
            <StatusIcon />
            <span className="ml-1">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
          </Badge>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Spam Score</span>
            <span className={`text-sm font-bold ${scoreColor}`}>{spamScore.toFixed(1)} / 10</span>
          </div>
          <Progress value={spamScore * 10} className="h-2" 
            style={{
              background: 'linear-gradient(to right, rgb(74 222 128 / 0.3), rgb(250 204 21 / 0.3), rgb(248 113 113 / 0.3))'
            }}
          />
          <p className={`text-xs mt-1 ${scoreColor} text-right`}>{scoreText}</p>
        </div>
        
        {message && (
          <div className="text-sm text-muted-foreground mb-4">
            {message}
          </div>
        )}
        
        {criticalUrls && criticalUrls.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="mb-1">
              <h4 className="text-sm font-medium mb-2">Critical URLs Detected:</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {criticalUrls.map((criticalUrl, index) => (
                  <li key={index} className="flex items-start">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                    {formatUrlForDisplay(criticalUrl, 40)}
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
