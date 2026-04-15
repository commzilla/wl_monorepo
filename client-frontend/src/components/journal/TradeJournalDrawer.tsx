import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useJournalEntry, useSaveJournalEntry } from '@/hooks/useJournal';
import { Loader2 } from 'lucide-react';
import TradeTagInput from './TradeTagInput';
import TradeRatingStars from './TradeRatingStars';
import EmotionPicker from './EmotionPicker';
import ScreenshotUploader from './ScreenshotUploader';
import { Checkbox } from '@/components/ui/checkbox';

interface TradeJournalDrawerProps {
  order: number | null;
  enrollmentId: string;
  onClose: () => void;
  open: boolean;
}

const DEBOUNCE_MS = 1000;

const TradeJournalDrawer: React.FC<TradeJournalDrawerProps> = ({
  order,
  enrollmentId,
  onClose,
  open,
}) => {
  const { data: entry, isLoading } = useJournalEntry(order, enrollmentId);
  const saveMutation = useSaveJournalEntry();

  // Local form state
  const [notes, setNotes] = useState('');
  const [setupDescription, setSetupDescription] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [plannedEntry, setPlannedEntry] = useState('');
  const [plannedSL, setPlannedSL] = useState('');
  const [plannedTP, setPlannedTP] = useState('');
  const [followedPlan, setFollowedPlan] = useState<boolean>(false);
  const [emotionalState, setEmotionalState] = useState('');
  const [screenshotEntry, setScreenshotEntry] = useState('');
  const [screenshotExit, setScreenshotExit] = useState('');

  // Track if form has been hydrated from server data
  const hydratedRef = useRef(false);

  // Populate form when entry data arrives
  useEffect(() => {
    if (entry) {
      setNotes(entry.notes || '');
      setSetupDescription(entry.setup_description || '');
      setSelectedTagIds(entry.tags?.map((t) => t.id) || []);
      setRating(entry.rating);
      setPlannedEntry(entry.planned_entry || '');
      setPlannedSL(entry.planned_sl || '');
      setPlannedTP(entry.planned_tp || '');
      setFollowedPlan(entry.followed_plan ?? false);
      setEmotionalState(entry.emotional_state || '');
      setScreenshotEntry(entry.screenshot_entry || '');
      setScreenshotExit(entry.screenshot_exit || '');
      hydratedRef.current = true;
    }
  }, [entry]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
    }
  }, [open]);

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback(
    (data: Record<string, unknown>) => {
      if (!order || !hydratedRef.current) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        saveMutation.mutate({
          order,
          data,
          enrollmentId,
        });
      }, DEBOUNCE_MS);
    },
    [order, enrollmentId, saveMutation]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Field change handlers with auto-save
  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      debouncedSave({ notes: value });
    },
    [debouncedSave]
  );

  const handleSetupChange = useCallback(
    (value: string) => {
      setSetupDescription(value);
      debouncedSave({ setup_description: value });
    },
    [debouncedSave]
  );

  const handleTagsChange = useCallback(
    (tagIds: string[]) => {
      setSelectedTagIds(tagIds);
      debouncedSave({ tag_ids: tagIds });
    },
    [debouncedSave]
  );

  const handleRatingChange = useCallback(
    (value: number) => {
      setRating(value);
      debouncedSave({ rating: value });
    },
    [debouncedSave]
  );

  const handlePlannedEntryChange = useCallback(
    (value: string) => {
      setPlannedEntry(value);
      debouncedSave({ planned_entry: value || null });
    },
    [debouncedSave]
  );

  const handlePlannedSLChange = useCallback(
    (value: string) => {
      setPlannedSL(value);
      debouncedSave({ planned_sl: value || null });
    },
    [debouncedSave]
  );

  const handlePlannedTPChange = useCallback(
    (value: string) => {
      setPlannedTP(value);
      debouncedSave({ planned_tp: value || null });
    },
    [debouncedSave]
  );

  const handleFollowedPlanChange = useCallback(
    (checked: boolean) => {
      setFollowedPlan(checked);
      debouncedSave({ followed_plan: checked });
    },
    [debouncedSave]
  );

  const handleEmotionChange = useCallback(
    (value: string) => {
      setEmotionalState(value);
      debouncedSave({ emotional_state: value });
    },
    [debouncedSave]
  );

  const handleScreenshotEntryUpload = useCallback(
    (url: string) => {
      setScreenshotEntry(url);
      debouncedSave({ screenshot_entry: url });
    },
    [debouncedSave]
  );

  const handleScreenshotExitUpload = useCallback(
    (url: string) => {
      setScreenshotExit(url);
      debouncedSave({ screenshot_exit: url });
    },
    [debouncedSave]
  );

  // Derive trade summary info
  const tradeSide = entry ? (entry.trade_cmd === 0 ? 'Buy' : 'Sell') : '';
  const tradeProfit = entry ? parseFloat(entry.trade_profit) : 0;
  const isProfitable = tradeProfit >= 0;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-l border-[#28BFFF]/10 bg-[#080808] p-0 sm:max-w-lg"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <SheetHeader className="border-b border-[#28BFFF]/10 px-6 py-4">
            <SheetTitle className="text-[#E4EEF5]">Trade Journal</SheetTitle>
            {entry && (
              <div className="flex items-center gap-3 pt-1">
                <span className="text-sm font-semibold text-[#E4EEF5]">
                  {entry.trade_symbol}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    tradeSide === 'Buy'
                      ? 'bg-[#1BBF99]/18 text-[#1BBF99]'
                      : 'bg-[#ED5363]/20 text-[#ED5363]'
                  }`}
                >
                  {tradeSide}
                </span>
                <span className="text-sm text-[#85A8C3]">
                  {entry.trade_volume} lots
                </span>
                <span
                  className={`ml-auto text-sm font-semibold ${
                    isProfitable ? 'text-[#1BBF99]' : 'text-[#ED5363]'
                  }`}
                >
                  {isProfitable ? '+' : ''}
                  ${tradeProfit.toFixed(2)}
                </span>
              </div>
            )}
          </SheetHeader>

          {/* Body */}
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#28BFFF]" />
            </div>
          ) : (
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {/* Saving indicator */}
              {saveMutation.isPending && (
                <div className="flex items-center gap-1.5 text-xs text-[#85A8C3]/60">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#85A8C3]">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="What was your thought process on this trade?"
                  rows={4}
                  className="w-full resize-none rounded-lg border border-[#28BFFF]/10 bg-transparent px-3 py-2 text-sm text-[#E4EEF5] placeholder:text-[#85A8C3]/40 focus:border-[#28BFFF]/40 focus:outline-none"
                />
              </div>

              {/* Setup description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#85A8C3]">
                  Setup Description
                </label>
                <textarea
                  value={setupDescription}
                  onChange={(e) => handleSetupChange(e.target.value)}
                  placeholder="Describe the setup (e.g., breakout, pullback, reversal...)"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-[#28BFFF]/10 bg-transparent px-3 py-2 text-sm text-[#E4EEF5] placeholder:text-[#85A8C3]/40 focus:border-[#28BFFF]/40 focus:outline-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#85A8C3]">Tags</label>
                <TradeTagInput
                  selectedTags={selectedTagIds}
                  onChange={handleTagsChange}
                  enrollmentId={enrollmentId}
                />
              </div>

              {/* Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#85A8C3]">
                  Trade Rating
                </label>
                <TradeRatingStars rating={rating} onChange={handleRatingChange} />
              </div>

              {/* Planned entry / SL / TP */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#85A8C3]">
                  Trade Plan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#85A8C3]/60">
                      Planned Entry
                    </span>
                    <input
                      type="text"
                      value={plannedEntry}
                      onChange={(e) => handlePlannedEntryChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-[#28BFFF]/10 bg-transparent px-2.5 py-1.5 text-sm text-[#E4EEF5] placeholder:text-[#85A8C3]/30 focus:border-[#28BFFF]/40 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#85A8C3]/60">
                      Stop Loss
                    </span>
                    <input
                      type="text"
                      value={plannedSL}
                      onChange={(e) => handlePlannedSLChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-[#28BFFF]/10 bg-transparent px-2.5 py-1.5 text-sm text-[#E4EEF5] placeholder:text-[#85A8C3]/30 focus:border-[#28BFFF]/40 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#85A8C3]/60">
                      Take Profit
                    </span>
                    <input
                      type="text"
                      value={plannedTP}
                      onChange={(e) => handlePlannedTPChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-lg border border-[#28BFFF]/10 bg-transparent px-2.5 py-1.5 text-sm text-[#E4EEF5] placeholder:text-[#85A8C3]/30 focus:border-[#28BFFF]/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Followed plan */}
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="followed-plan"
                  checked={followedPlan}
                  onCheckedChange={(checked) =>
                    handleFollowedPlanChange(checked === true)
                  }
                  className="border-[#28BFFF]/30 data-[state=checked]:bg-[#3AB3FF] data-[state=checked]:text-[#080808]"
                />
                <label
                  htmlFor="followed-plan"
                  className="text-sm text-[#E4EEF5] cursor-pointer"
                >
                  Followed trade plan
                </label>
              </div>

              {/* Emotion picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#85A8C3]">
                  Emotional State
                </label>
                <EmotionPicker
                  value={emotionalState}
                  onChange={handleEmotionChange}
                />
              </div>

              {/* Screenshots */}
              <div className="grid grid-cols-2 gap-3">
                <ScreenshotUploader
                  url={screenshotEntry}
                  onUpload={handleScreenshotEntryUpload}
                  label="Entry Screenshot"
                />
                <ScreenshotUploader
                  url={screenshotExit}
                  onUpload={handleScreenshotExitUpload}
                  label="Exit Screenshot"
                />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TradeJournalDrawer;
