import React, { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export const ImpersonationBar: React.FC = () => {
  const context = useContext(AuthContext);
  
  // Safely handle case where context might not be available yet
  if (!context) {
    return null;
  }

  const { isImpersonating, impersonatedUserEmail, stopImpersonating } = context;

  if (!isImpersonating || !impersonatedUserEmail) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-4">
      <span className="text-sm font-medium">
        You're currently impersonating {impersonatedUserEmail} account
      </span>
      <Button
        onClick={stopImpersonating}
        variant="outline"
        size="sm"
        className="bg-transparent border-white text-white hover:bg-white hover:text-orange-500 ml-2"
      >
        <X className="h-4 w-4 mr-1" />
        Stop Impersonating
      </Button>
    </div>
  );
};