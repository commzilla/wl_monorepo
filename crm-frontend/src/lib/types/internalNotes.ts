// Types for Internal Notes API

export type NoteCategory = 'general' | 'risk' | 'consistency' | 'device' | 'copy_trading' | 'manual_review';

export const NOTE_CATEGORY_OPTIONS: { value: NoteCategory; label: string; color: string }[] = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { value: 'risk', label: 'Risk', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'consistency', label: 'Consistency', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'device', label: 'Device/IP', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'copy_trading', label: 'Copy Trading', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'manual_review', label: 'Manual Review', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
];

export interface InternalNote {
  id: string;
  created_by: number;
  created_by_name: string;
  content_type: number | null;
  model: string | null;
  object_id: string | null;
  trader: string | null;
  note: string;
  is_private: boolean;
  category: NoteCategory;
  is_high_risk: boolean;
  created_at: string;
}

export interface InternalNoteSummary {
  total_count: number;
  has_high_risk: boolean;
  category_counts: Partial<Record<NoteCategory, number>>;
  latest_notes: InternalNote[];
}

export interface CreateInternalNoteRequest {
  content_type?: string;
  object_id?: string;
  trader?: string;
  note: string;
  is_private: boolean;
  category?: NoteCategory;
  is_high_risk?: boolean;
}

export interface UpdateInternalNoteRequest {
  note?: string;
  is_private?: boolean;
  category?: NoteCategory;
  is_high_risk?: boolean;
}