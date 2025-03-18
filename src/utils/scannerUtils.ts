import { UrlScanResult, BulkScanResult, HistoryItem } from '../types/scanner';

// Simulate API call for URL scanning
export const scanUrl = async (url: string): Promise<UrlScanResult> => {
  // Validate URL
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL format');
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock response based on URL content for demo purposes
  if (url.includes('spam') || url.includes('phish') || url.includes('scam')) {
    return {
      url,
      spamScore: 8.5,
      status: 'dangerous',
      timestamp: new Date().toISOString(),
      criticalUrls: ['http://malicious-tracking.com', 'http://data-stealer.net'],
      message: 'High likelihood of malicious content detected'
    };
  } else if (url.includes('suspicious') || url.includes('unknown')) {
    return {
      url,
      spamScore: 5.7,
      status: 'suspicious',
      timestamp: new Date().toISOString(),
      criticalUrls: ['http://analytics-tracker.com'],
      message: 'Some suspicious elements detected'
    };
  } else {
    return {
      url,
      spamScore: Math.random() * 3,
      status: 'clean',
      timestamp: new Date().toISOString(),
      message: 'No malicious content detected'
    };
  }
};

// Process CSV file and scan multiple URLs
export const processCsvFile = async (file: File): Promise<BulkScanResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        
        // Extract URLs from CSV content (assumes one URL per line or first column)
        const urls = lines.map(line => {
          // Extract first column if CSV has multiple columns
          const columns = line.split(',');
          return columns[0].trim().replace(/^["'](.*)["']$/, '$1'); // Remove quotes if present
        }).filter(isValidUrl);
        
        if (urls.length === 0) {
          reject(new Error('No valid URLs found in the CSV file'));
          return;
        }
        
        // Process URLs in batches to avoid overwhelming the API
        const results: UrlScanResult[] = [];
        const batchSize = 5;
        
        for (let i = 0; i < urls.length; i += batchSize) {
          const batch = urls.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(url => scanUrl(url).catch(error => ({
              url,
              spamScore: 0,
              status: 'error' as const,
              timestamp: new Date().toISOString(),
              message: error.message || 'Failed to scan URL'
            })))
          );
          results.push(...batchResults);
          
          // Simulate processing delay between batches
          if (i + batchSize < urls.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        resolve({
          results,
          totalScanned: results.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
};

// Save scan history to localStorage
export const saveToHistory = (item: HistoryItem): void => {
  try {
    // Get existing history
    const history = getHistory();
    
    // Add new item to the beginning of the array
    history.unshift(item);
    
    // Keep only the latest 50 items to prevent localStorage from filling up
    const trimmedHistory = history.slice(0, 50);
    
    // Save back to localStorage
    localStorage.setItem('urlSentryHistory', JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save history:', error);
  }
};

// Get scan history from localStorage
export const getHistory = (): HistoryItem[] => {
  try {
    const history = localStorage.getItem('urlSentryHistory');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Failed to get history:', error);
    return [];
  }
};

// Clear scan history
export const clearHistory = (): void => {
  localStorage.removeItem('urlSentryHistory');
};

// Export history as CSV
export const exportHistoryAsCsv = (history: HistoryItem[]): string => {
  const headers = 'id,type,timestamp,url,spamScore,status,message\n';
  
  const rows = history.map(item => {
    if (item.type === 'single') {
      const result = item.data as UrlScanResult;
      return `${item.id},"${item.type}","${item.timestamp}","${result.url}",${result.spamScore},"${result.status}","${result.message || ''}"\n`;
    } else {
      // For bulk scans, create a row for each result
      const bulkData = item.data as BulkScanResult;
      return bulkData.results.map(result => 
        `${item.id},"${item.type}","${item.timestamp}","${result.url}",${result.spamScore},"${result.status}","${result.message || ''}"\n`
      ).join('');
    }
  }).join('');
  
  return headers + rows;
};

// Validate URL format
export const isValidUrl = (url: string): boolean => {
  try {
    // Add protocol if missing
    if (!url.match(/^[a-zA-Z]+:\/\//)) {
      url = 'http://' + url;
    }
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// Format timestamp for display
export const formatTimestamp = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    return timestamp;
  }
};

// Generate a unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Convert scan score to color
export const getScoreColor = (score: number): string => {
  if (score >= 7) return 'text-red-500';
  if (score >= 4) return 'text-amber-500';
  return 'text-green-500';
};

// Convert scan score to status text
export const getScoreText = (score: number): string => {
  if (score >= 7) return 'High Risk';
  if (score >= 4) return 'Medium Risk';
  return 'Low Risk';
};

// Prepare a URL for display (truncate if needed)
export const formatUrlForDisplay = (url: string, maxLength = 50): string => {
  if (!url) return '';
  
  // Remove protocol
  let displayUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  // Truncate if too long
  if (displayUrl.length > maxLength) {
    displayUrl = displayUrl.substring(0, maxLength - 3) + '...';
  }
  
  return displayUrl;
};
