
import React from 'react';
import { Shield } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 animate-fade-in">
      <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">URL Sentry</h1>
            <p className="text-sm text-muted-foreground">Protect yourself from malicious websites</p>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-4">
          <a href="#features" className="text-sm font-medium hover:text-primary transition-all-200">
            Features
          </a>
          <a href="#scan" className="text-sm font-medium hover:text-primary transition-all-200">
            Scan URL
          </a>
          <a href="#history" className="text-sm font-medium hover:text-primary transition-all-200">
            History
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
