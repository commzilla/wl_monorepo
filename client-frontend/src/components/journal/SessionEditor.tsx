import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import { useJournalSession, useSaveSession } from '@/hooks/useJournal';
import { TradingSession } from '@/utils/journalApi';

interface SessionEditorProps {
  date: string;
  enrollmentId: string;
}

const EMOTIONAL_STATES = [
  { value: '', label: 'Select...' },
  { value: 'calm', label: 'Calm' },
  { value: 'focused', label: 'Focused' },
  { value: 'confident', label: 'Confident' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'frustrated', label: 'Frustrated' },
  { value: 'fearful', label: 'Fearful' },
  { value: 'greedy', label: 'Greedy' },
  { value: 'euphoric', label: 'Euphoric' },
  { value: 'revenge', label: 'Revenge' },
  { value: 'bored', label: 'Bored' },
  { value: 'neutral', label: 'Neutral' },
];

const MARKET_CONDITIONS = [
  { value: '', label: 'Select...' },
  { value: 'trending_up', label: 'Trending Up' },
  { value: 'trending_down', label: 'Trending Down' },
  { value: 'ranging', label: 'Ranging' },
  { value: 'volatile', label: 'Volatile' },
  { value: 'low_volatility', label: 'Low Volatility' },
  { value: 'news_driven', label: 'News Driven' },
  { value: 'choppy', label: 'Choppy' },
];

const AUTOSAVE_DELAY = 1500;

interface FormData {
  pre_session_notes: string;
  post_session_notes: string;
  key_lessons: string;
  energy_level: number | null;
  discipline_score: number | null;
  emotional_state_start: string;
  emotional_state_end: string;
  market_conditions: string;
  followed_rules: boolean | null;
  rule_violations: string;
}

const initialFormData: FormData = {
  pre_session_notes: '',
  post_session_notes: '',
  key_lessons: '',
  energy_level: null,
  discipline_score: null,
  emotional_state_start: '',
  emotional_state_end: '',
  market_conditions: '',
  followed_rules: null,
  rule_violations: '',
};

const SessionEditor: React.FC<SessionEditorProps> = ({ date, enrollmentId }) => {
  const { data: session, isLoading } = useJournalSession(date, enrollmentId);
  const saveSession = useSaveSession();

  const [form, setForm] = useState<FormData>(initialFormData);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [initialized, setInitialized] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  // Sync session data to form when loaded
  useEffect(() => {
    if (session) {
      setForm({
        pre_session_notes: session.pre_session_notes ?? '',
        post_session_notes: session.post_session_notes ?? '',
        key_lessons: session.key_lessons ?? '',
        energy_level: session.energy_level,
        discipline_score: session.discipline_score,
        emotional_state_start: session.emotional_state_start ?? '',
        emotional_state_end: session.emotional_state_end ?? '',
        market_conditions: session.market_conditions ?? '',
        followed_rules: session.followed_rules,
        rule_violations: session.rule_violations ?? '',
      });
      setInitialized(true);
    } else if (!isLoading) {
      setForm(initialFormData);
      setInitialized(true);
    }
  }, [session, isLoading]);

  const triggerAutosave = useCallback(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    autosaveTimer.current = setTimeout(() => {
      setSaveStatus('saving');
      saveSession.mutate(
        { date, data: formRef.current, enrollmentId },
        {
          onSuccess: () => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
          },
          onError: () => {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
          },
        }
      );
    }, AUTOSAVE_DELAY);
  }, [date, enrollmentId, saveSession]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, []);

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (initialized) {
        triggerAutosave();
      }
    },
    [initialized, triggerAutosave]
  );

  const handleManualSave = useCallback(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    setSaveStatus('saving');
    saveSession.mutate(
      { date, data: formRef.current, enrollmentId },
      {
        onSuccess: () => {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        },
        onError: () => {
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
        },
      }
    );
  }, [date, enrollmentId, saveSession]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-[#1E2D3D]/60 bg-[#080808]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3AB3FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1E2D3D]/60 bg-[#080808]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1E2D3D]/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#7570FF]" />
          <h4 className="text-sm font-medium text-[#E4EEF5]">Trading Session</h4>
        </div>
        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-[10px] text-[#85A8C3]">
              <div className="h-3 w-3 animate-spin rounded-full border border-[#3AB3FF] border-t-transparent" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-[10px] text-[#1BBF99]">
              <CheckCircle className="h-3 w-3" />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-[10px] text-[#ED5363]">
              <AlertCircle className="h-3 w-3" />
              Save failed
            </span>
          )}
          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className="rounded-md border border-[#1E2D3D] p-1.5 text-[#85A8C3] transition-colors hover:border-[#3AB3FF]/30 hover:text-[#3AB3FF] disabled:opacity-40"
            aria-label="Save session"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Emotional State Start / End */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
              Emotion (Start)
            </label>
            <select
              value={form.emotional_state_start}
              onChange={(e) => updateField('emotional_state_start', e.target.value)}
              className="w-full rounded-md border border-[#1E2D3D] bg-[#0A1114] px-3 py-2 text-xs text-[#E4EEF5] outline-none transition-colors focus:border-[#3AB3FF]/50"
            >
              {EMOTIONAL_STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
              Emotion (End)
            </label>
            <select
              value={form.emotional_state_end}
              onChange={(e) => updateField('emotional_state_end', e.target.value)}
              className="w-full rounded-md border border-[#1E2D3D] bg-[#0A1114] px-3 py-2 text-xs text-[#E4EEF5] outline-none transition-colors focus:border-[#3AB3FF]/50"
            >
              {EMOTIONAL_STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Energy Level */}
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
            Energy Level
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => updateField('energy_level', level)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-all ${
                  form.energy_level === level
                    ? 'border-[#3AB3FF] bg-[#3AB3FF]/10 text-[#3AB3FF]'
                    : 'border-[#1E2D3D] text-[#85A8C3]/60 hover:border-[#3AB3FF]/30 hover:text-[#85A8C3]'
                }`}
              >
                {level}
              </button>
            ))}
            <span className="ml-2 text-[10px] text-[#85A8C3]/40">
              {form.energy_level === 1 && 'Very low'}
              {form.energy_level === 2 && 'Low'}
              {form.energy_level === 3 && 'Normal'}
              {form.energy_level === 4 && 'High'}
              {form.energy_level === 5 && 'Peak'}
            </span>
          </div>
        </div>

        {/* Discipline Score */}
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
            Discipline Score
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => updateField('discipline_score', score)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-all ${
                  form.discipline_score === score
                    ? 'border-[#7570FF] bg-[#7570FF]/10 text-[#7570FF]'
                    : 'border-[#1E2D3D] text-[#85A8C3]/60 hover:border-[#7570FF]/30 hover:text-[#85A8C3]'
                }`}
              >
                {score}
              </button>
            ))}
            <span className="ml-2 text-[10px] text-[#85A8C3]/40">
              {form.discipline_score === 1 && 'Poor'}
              {form.discipline_score === 2 && 'Below avg'}
              {form.discipline_score === 3 && 'Average'}
              {form.discipline_score === 4 && 'Good'}
              {form.discipline_score === 5 && 'Excellent'}
            </span>
          </div>
        </div>

        {/* Market Conditions */}
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
            Market Conditions
          </label>
          <select
            value={form.market_conditions}
            onChange={(e) => updateField('market_conditions', e.target.value)}
            className="w-full rounded-md border border-[#1E2D3D] bg-[#0A1114] px-3 py-2 text-xs text-[#E4EEF5] outline-none transition-colors focus:border-[#3AB3FF]/50"
          >
            {MARKET_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Pre-session Notes */}
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
            Pre-Session Notes
          </label>
          <textarea
            value={form.pre_session_notes}
            onChange={(e) => updateField('pre_session_notes', e.target.value)}
            placeholder="What's your plan for today? Key levels, setups to watch..."
            rows={3}
            className="w-full resize-none rounded-md border border-[#1E2D3D] bg-[#0A1114] px-3 py-2 text-xs text-[#E4EEF5] placeholder-[#85A8C3]/30 outline-none transition-colors focus:border-[#3AB3FF]/50"
          />
        </div>

        {/* Post-session Notes */}
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
            Post-Session Notes
          </label>
          <textarea
            value={form.post_session_notes}
            onChange={(e) => updateField('post_session_notes', e.target.value)}
            placeholder="How did the session go? What happened vs your plan..."
            rows={3}
            className="w-full resize-none rounded-md border border-[#1E2D3D] bg-[#0A1114] px-3 py-2 text-xs text-[#E4EEF5] placeholder-[#85A8C3]/30 outline-none transition-colors focus:border-[#3AB3FF]/50"
          />
        </div>

        {/* Key Lessons */}
        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
            Key Lessons
          </label>
          <textarea
            value={form.key_lessons}
            onChange={(e) => updateField('key_lessons', e.target.value)}
            placeholder="Main takeaways from today's session..."
            rows={2}
            className="w-full resize-none rounded-md border border-[#1E2D3D] bg-[#0A1114] px-3 py-2 text-xs text-[#E4EEF5] placeholder-[#85A8C3]/30 outline-none transition-colors focus:border-[#3AB3FF]/50"
          />
        </div>

        {/* Followed Rules */}
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.followed_rules === true}
              onChange={(e) => updateField('followed_rules', e.target.checked ? true : null)}
              className="h-4 w-4 rounded border-[#1E2D3D] bg-[#0A1114] text-[#3AB3FF] accent-[#3AB3FF] focus:ring-[#3AB3FF]/30"
            />
            <span className="text-xs text-[#E4EEF5]">Followed all trading rules</span>
          </label>
        </div>

        {/* Rule Violations */}
        {form.followed_rules !== true && (
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-[#85A8C3]/60">
              Rule Violations
            </label>
            <textarea
              value={form.rule_violations}
              onChange={(e) => updateField('rule_violations', e.target.value)}
              placeholder="What rules did you break today? Be honest..."
              rows={2}
              className="w-full resize-none rounded-md border border-[#ED5363]/20 bg-[#0A1114] px-3 py-2 text-xs text-[#E4EEF5] placeholder-[#85A8C3]/30 outline-none transition-colors focus:border-[#ED5363]/40"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionEditor;
