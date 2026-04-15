import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Coins } from 'lucide-react';
import { RewardTask } from '@/utils/api';
import { submitRewardTask } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

interface SubmitTaskModalProps {
  task: RewardTask;
  onClose: () => void;
  onSuccess: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export const SubmitTaskModal: React.FC<SubmitTaskModalProps> = ({ task, onClose, onSuccess, anchorRef }) => {
  const [notes, setNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setProofFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setProofFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required URL submission
    if (task.requires_url_submission && !proofUrl.trim()) {
      toast({
        title: "URL Required",
        description: "This task requires submitting a URL as proof.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await submitRewardTask({
        task: task.id,
        notes: notes.trim() || undefined,
        proof_url: proofUrl.trim() || undefined,
        proof_file: proofFile || undefined,
      });

      toast({
        title: "Task submitted successfully!",
        description: "Your submission is now under review. You'll be notified once it's approved.",
      });

      onClose();
      
      // Delay refetch to allow backend to process
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to submit task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [topOffset, setTopOffset] = useState(0);

  useEffect(() => {
    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const clamped = Math.max(16, Math.min(rect.top, window.innerHeight * 0.5));
      setTopOffset(clamped);
    }
  }, [anchorRef]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="flex justify-center p-4" style={{ paddingTop: `${topOffset}px`, minHeight: '100%' }}>
      <div className="relative w-full max-w-2xl bg-[#0A1114] rounded-2xl border border-[rgba(40,191,255,0.2)] shadow-[0_0_50px_rgba(58,179,255,0.3)] animate-scale-in flex flex-col max-h-[90vh] h-fit">
        {/* Decorative gradient background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3AB3FF]/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#4EC1FF]/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

        {/* Header */}
        <div className="relative border-b border-[rgba(40,191,255,0.1)] bg-[rgba(40,191,255,0.03)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.1)] border border-[rgba(40,191,255,0.2)]">
                <CheckCircle className="w-5 h-5 text-[#4EC1FF]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#E4EEF5] tracking-[-0.6px]">
                  Submit Task
                </h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Coins className="w-3.5 h-3.5 text-[#4EC1FF]" />
                  <span className="text-sm font-semibold text-[#4EC1FF]">
                    Earn {task.reward_amount} WeCoins
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[rgba(40,191,255,0.1)] transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-[#85A8C3]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="relative overflow-y-auto flex-1 px-6 py-6 space-y-6">
          {/* Task Title */}
          <div className="p-4 rounded-lg bg-[rgba(40,191,255,0.03)] border border-[rgba(40,191,255,0.1)]">
            <p className="text-[#E4EEF5] font-semibold mb-1">Task:</p>
            <p className="text-[#85A8C3] text-sm">{task.title}</p>
          </div>

          {/* Proof URL Field (if required by task) */}
          {task.requires_url_submission && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[#E4EEF5] text-sm font-semibold">
                <FileText className="w-4 h-4 text-[#4EC1FF]" />
                Proof URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://example.com/your-submission"
                className="w-full px-4 py-3 bg-[rgba(40,191,255,0.03)] border border-[rgba(40,191,255,0.1)] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:border-[#4EC1FF] focus:ring-1 focus:ring-[#4EC1FF] transition-colors"
                required={task.requires_url_submission}
              />
              <p className="text-xs text-[#85A8C3]">
                Provide a link to your completed task (e.g., social media post, review page, etc.)
              </p>
            </div>
          )}

          {/* Notes Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[#E4EEF5] text-sm font-semibold">
              <FileText className="w-4 h-4 text-[#4EC1FF]" />
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional information about your submission..."
              className="w-full min-h-[100px] px-4 py-3 bg-[rgba(40,191,255,0.03)] border border-[rgba(40,191,255,0.1)] rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:border-[#4EC1FF] focus:ring-1 focus:ring-[#4EC1FF] transition-colors resize-none"
              maxLength={500}
            />
            <p className="text-xs text-[#85A8C3] text-right">{notes.length}/500</p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[#E4EEF5] text-sm font-semibold">
              <Upload className="w-4 h-4 text-[#4EC1FF]" />
              Proof of Completion (Optional)
            </label>
            
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${
                dragActive
                  ? 'border-[#4EC1FF] bg-[rgba(40,191,255,0.1)]'
                  : 'border-[rgba(40,191,255,0.2)] bg-[rgba(40,191,255,0.03)] hover:border-[rgba(40,191,255,0.3)]'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="proof-file"
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
              />
              
              {proofFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.1)]">
                      <FileText className="w-5 h-5 text-[#4EC1FF]" />
                    </div>
                    <div>
                      <p className="text-[#E4EEF5] text-sm font-medium">{proofFile.name}</p>
                      <p className="text-[#85A8C3] text-xs">
                        {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProofFile(null)}
                    className="text-[#85A8C3] hover:text-[#E4EEF5] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <label htmlFor="proof-file" className="flex flex-col items-center cursor-pointer">
                  <Upload className="w-10 h-10 text-[#4EC1FF] mb-3" />
                  <p className="text-[#E4EEF5] text-sm font-medium mb-1">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-[#85A8C3] text-xs">
                    Supports: Images, PDF, Word documents (Max 10MB)
                  </p>
                </label>
              )}
            </div>
          </div>

          {/* Info Message */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-[rgba(58,179,255,0.05)] border border-[rgba(58,179,255,0.15)]">
            <AlertCircle className="w-5 h-5 text-[#4EC1FF] flex-shrink-0 mt-0.5" />
            <p className="text-[#85A8C3] text-xs leading-relaxed">
              Your submission will be reviewed by our team. You will receive your WeCoins once approved.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="relative border-t border-[rgba(40,191,255,0.1)] bg-[rgba(40,191,255,0.03)] px-6 py-4 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 items-center border border-[#28BFFF] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] flex min-h-11 gap-2 justify-center text-[#85A8C3] bg-[rgba(40,191,255,0.05)] px-4 py-3 rounded-lg hover:bg-[rgba(40,191,255,0.1)] transition-colors"
            >
              <span className="text-sm font-semibold">Cancel</span>
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`flex-1 items-center border flex min-h-11 gap-2 justify-center overflow-hidden px-4 py-3 rounded-lg border-solid transition-colors ${
                isSubmitting
                  ? 'border-gray-600 bg-gray-500/10 text-gray-500 cursor-not-allowed'
                  : 'border-[#4EC1FF] bg-[#4EC1FF]/10 text-[#4EC1FF] hover:bg-[#4EC1FF]/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#4EC1FF] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-semibold">Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-semibold">Submit Task</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
