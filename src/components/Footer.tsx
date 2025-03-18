
import React from 'react';
import { Shield } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-8 mt-16 border-t border-border">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">LinkGuard</span>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} LinkGuard. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Protecting the web, one URL at a time.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
