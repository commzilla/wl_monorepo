import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, RefreshCw, Clock, Sparkles } from 'lucide-react';
import { versionService } from '@/services/versionService';

interface UpdateDialogProps {
  open: boolean;
  onClose: () => void;
  serverCommit: string;
  localCommit: string;
}

export function UpdateDialog({ open, onClose, serverCommit, localCommit }: UpdateDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Preparing update...');

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    // Futuristic progress animation
    const stages = [
      { progress: 15, text: 'Connecting to server...' },
      { progress: 35, text: 'Downloading new version...' },
      { progress: 55, text: 'Validating assets...' },
      { progress: 75, text: 'Preparing cache...' },
      { progress: 90, text: 'Finalizing update...' },
      { progress: 100, text: 'Update complete!' },
    ];

    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 300));
      setProgress(stage.progress);
      setStatusText(stage.text);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Snooze for 12 hours after update to prevent repeated popups
    // (in case the new build hasn't deployed yet or cache issues)
    versionService.snooze(12);
    
    // Force hard refresh bypassing cache
    window.location.href = window.location.pathname + '?v=' + Date.now();
  };

  const handleSnooze = (hours: number) => {
    versionService.snooze(hours);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setIsUpdating(false);
      setProgress(0);
      setStatusText('Preparing update...');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isUpdating && !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Animated background effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center py-6">
          {!isUpdating ? (
            <>
              {/* Icon with glow effect */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/50 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-primary to-blue-600 p-4 rounded-2xl">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                New Version Available
              </h2>
              
              <p className="text-gray-400 mb-6 text-sm">
                A newer version of the application is ready to be installed.
              </p>

              {/* Version comparison */}
              <div className="w-full bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700/50">
                <div className="flex items-center justify-between text-xs">
                  <div className="text-left">
                    <p className="text-gray-500 mb-1">Current</p>
                    <code className="text-orange-400 font-mono">{localCommit.slice(0, 8)}</code>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 mb-1">Latest</p>
                    <code className="text-green-400 font-mono">{serverCommit.slice(0, 8)}</code>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col w-full gap-3">
                <Button 
                  onClick={handleUpdate}
                  className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-semibold py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Now
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSnooze(4)}
                    className="flex-1 text-gray-400 hover:text-white hover:bg-slate-700/50"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Later (4h)
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSnooze(24)}
                    className="flex-1 text-gray-400 hover:text-white hover:bg-slate-700/50"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Tomorrow
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Updating state */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/50 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-primary to-blue-600 p-4 rounded-2xl">
                  <RefreshCw className="w-8 h-8 text-white animate-spin" />
                </div>
              </div>

              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Updating...
              </h2>

              <p className="text-gray-400 mb-6 text-sm">
                {statusText}
              </p>

              {/* Progress bar */}
              <div className="w-full bg-slate-700/50 rounded-full h-3 mb-4 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>

              <p className="text-primary font-mono text-lg">{progress}%</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
