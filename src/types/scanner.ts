
export interface UrlScanResult {
  url: string;
  spamScore: number;
  status: 'clean' | 'suspicious' | 'dangerous' | 'error';
  timestamp: string;
  criticalUrls?: string[];
  message?: string;
}

export interface BulkScanResult {
  results: UrlScanResult[];
  totalScanned: number;
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  type: 'single' | 'bulk';
  timestamp: string;
  data: UrlScanResult | BulkScanResult;
}
