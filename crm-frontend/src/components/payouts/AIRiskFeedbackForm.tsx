import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  MessageSquareText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Plus,
  X,
  ThumbsUp,
  ThumbsDown,
  Star,
  Target
} from 'lucide-react';
import { aiRiskAnalysisService } from '@/services/aiRiskAnalysisService';
import { AIRiskReviewFeedback, AIRiskFeedbackResponse } from '@/lib/types/aiRiskFeedback';
import { toast } from 'sonner';

interface AIRiskFeedbackFormProps {
  analysisId: string;
  payoutId: string;
  detectedPatterns: string[];
  aiRecommendation: string | null;
  existingFeedback?: AIRiskFeedbackResponse;
  isCompleted: boolean;
}

const DECISION_OPTIONS = [
  { value: 'APPROVE', label: 'Approve', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'REJECT', label: 'Reject', icon: XCircle, color: 'text-destructive' },
  { value: 'APPROVE_WITH_DEDUCTIONS', label: 'Approve with Deductions', icon: AlertTriangle, color: 'text-amber-600' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { value: 'hard', label: 'Hard', color: 'bg-destructive/10 text-destructive border-destructive/20' },
];

const PRIORITY_OPTIONS = [
  { value: 0, label: 'None (0)' },
  { value: 1, label: 'Low (1)' },
  { value: 2, label: 'Medium (2)' },
  { value: 3, label: 'High (3)' },
  { value: 4, label: 'Critical (4)' },
  { value: 5, label: 'Urgent (5)' },
];

const AIRiskFeedbackForm: React.FC<AIRiskFeedbackFormProps> = ({
  analysisId,
  payoutId,
  detectedPatterns,
  aiRecommendation,
  existingFeedback,
  isCompleted,
}) => {
  const queryClient = useQueryClient();
  const hasExistingFeedback = existingFeedback?.exists && existingFeedback.data;

  const [formData, setFormData] = useState<AIRiskReviewFeedback>({
    human_decision: existingFeedback?.data?.human_decision || 'APPROVE',
    human_agrees_with_ai: existingFeedback?.data?.human_agrees_with_ai ?? true,
    human_reasoning: existingFeedback?.data?.human_reasoning || '',
    patterns_confirmed: existingFeedback?.data?.patterns_confirmed || [],
    patterns_rejected: existingFeedback?.data?.patterns_rejected || [],
    patterns_added: existingFeedback?.data?.patterns_added || [],
    review_difficulty: existingFeedback?.data?.review_difficulty || 'medium',
    training_priority: existingFeedback?.data?.training_priority ?? 0,
    is_training_example: existingFeedback?.data?.is_training_example ?? false,
  });

  const [newPattern, setNewPattern] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => aiRiskAnalysisService.submitFeedback(analysisId, formData),
    onSuccess: (data) => {
      toast.success('Feedback submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-risk-analysis', payoutId] });
      queryClient.invalidateQueries({ queryKey: ['ai-risk-feedback', analysisId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to submit feedback');
    },
  });

  const handlePatternToggle = (pattern: string, type: 'confirmed' | 'rejected') => {
    if (type === 'confirmed') {
      const isConfirmed = formData.patterns_confirmed.includes(pattern);
      setFormData(prev => ({
        ...prev,
        patterns_confirmed: isConfirmed 
          ? prev.patterns_confirmed.filter(p => p !== pattern)
          : [...prev.patterns_confirmed, pattern],
        patterns_rejected: prev.patterns_rejected.filter(p => p !== pattern),
      }));
    } else {
      const isRejected = formData.patterns_rejected.includes(pattern);
      setFormData(prev => ({
        ...prev,
        patterns_rejected: isRejected 
          ? prev.patterns_rejected.filter(p => p !== pattern)
          : [...prev.patterns_rejected, pattern],
        patterns_confirmed: prev.patterns_confirmed.filter(p => p !== pattern),
      }));
    }
  };

  const handleAddPattern = () => {
    if (newPattern.trim() && !formData.patterns_added.includes(newPattern.trim())) {
      setFormData(prev => ({
        ...prev,
        patterns_added: [...prev.patterns_added, newPattern.trim()],
      }));
      setNewPattern('');
    }
  };

  const handleRemoveAddedPattern = (pattern: string) => {
    setFormData(prev => ({
      ...prev,
      patterns_added: prev.patterns_added.filter(p => p !== pattern),
    }));
  };

  // Display existing feedback in read-only mode
  if (hasExistingFeedback) {
    const feedback = existingFeedback.data!;
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquareText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Human Review Feedback</CardTitle>
              <CardDescription>Review has been submitted</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Decision */}
          <div className="p-4 rounded-xl bg-background/50 border">
            <Label className="text-xs text-muted-foreground mb-2 block">Final Decision</Label>
            <div className="flex items-center gap-2">
              {feedback.human_decision === 'APPROVE' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              {feedback.human_decision === 'REJECT' && <XCircle className="h-5 w-5 text-destructive" />}
              {feedback.human_decision === 'APPROVE_WITH_DEDUCTIONS' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              <span className="font-semibold">{feedback.human_decision.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Agreement */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border">
            {feedback.human_agrees_with_ai ? (
              <ThumbsUp className="h-5 w-5 text-green-600" />
            ) : (
              <ThumbsDown className="h-5 w-5 text-amber-600" />
            )}
            <span className="text-sm">
              {feedback.human_agrees_with_ai ? 'Agrees with AI recommendation' : 'Disagrees with AI recommendation'}
            </span>
          </div>

          {/* Reasoning */}
          {feedback.human_reasoning && (
            <div className="p-4 rounded-xl bg-background/50 border">
              <Label className="text-xs text-muted-foreground mb-2 block">Reasoning</Label>
              <p className="text-sm">{feedback.human_reasoning}</p>
            </div>
          )}

          {/* Patterns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {feedback.patterns_confirmed.length > 0 && (
              <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <Label className="text-xs text-muted-foreground mb-2 block">Confirmed Patterns</Label>
                <div className="flex flex-wrap gap-1">
                  {feedback.patterns_confirmed.map(p => (
                    <Badge key={p} className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {feedback.patterns_rejected.length > 0 && (
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <Label className="text-xs text-muted-foreground mb-2 block">Rejected Patterns</Label>
                <div className="flex flex-wrap gap-1">
                  {feedback.patterns_rejected.map(p => (
                    <Badge key={p} variant="destructive" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
            {feedback.patterns_added.length > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <Label className="text-xs text-muted-foreground mb-2 block">Added Patterns</Label>
                <div className="flex flex-wrap gap-1">
                  {feedback.patterns_added.map(p => (
                    <Badge key={p} className="bg-primary/10 text-primary border-primary/20 text-xs">{p}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background/50 border text-center">
              <Label className="text-xs text-muted-foreground mb-1 block">Difficulty</Label>
              <Badge className={DIFFICULTY_OPTIONS.find(d => d.value === feedback.review_difficulty)?.color}>
                {feedback.review_difficulty}
              </Badge>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border text-center">
              <Label className="text-xs text-muted-foreground mb-1 block">Training Priority</Label>
              <Badge variant="outline">
                {PRIORITY_OPTIONS.find(p => p.value === feedback.training_priority)?.label || feedback.training_priority}
              </Badge>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border text-center">
              <Label className="text-xs text-muted-foreground mb-1 block">Training Example</Label>
              <Badge variant={feedback.is_training_example ? 'default' : 'secondary'}>
                {feedback.is_training_example ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show form only for completed analysis
  if (!isCompleted) {
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquareText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Submit Human Review</CardTitle>
            <CardDescription>Provide feedback on this AI analysis</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Decision Selection */}
        <div className="space-y-3">
          <Label className="font-semibold">Your Decision</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DECISION_OPTIONS.map(option => {
              const Icon = option.icon;
              const isSelected = formData.human_decision === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, human_decision: option.value as any }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`h-6 w-6 mx-auto mb-2 ${option.color}`} />
                  <p className="text-sm font-medium">{option.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agreement Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
          <div className="flex items-center gap-3">
            {formData.human_agrees_with_ai ? (
              <ThumbsUp className="h-5 w-5 text-green-600" />
            ) : (
              <ThumbsDown className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <Label className="font-semibold">Agree with AI?</Label>
              <p className="text-xs text-muted-foreground">
                AI recommended: {aiRecommendation || 'N/A'}
              </p>
            </div>
          </div>
          <Switch
            checked={formData.human_agrees_with_ai}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, human_agrees_with_ai: checked }))}
          />
        </div>

        {/* Reasoning */}
        <div className="space-y-2">
          <Label className="font-semibold">Reasoning</Label>
          <Textarea
            placeholder="Explain your decision..."
            value={formData.human_reasoning}
            onChange={(e) => setFormData(prev => ({ ...prev, human_reasoning: e.target.value }))}
            className="min-h-[100px]"
          />
        </div>

        {/* Pattern Review */}
        <div className="space-y-3">
          <Label className="font-semibold">Review Detected Patterns</Label>
          {detectedPatterns.length > 0 ? (
            <div className="space-y-2">
              {detectedPatterns.map(pattern => {
                const isConfirmed = formData.patterns_confirmed.includes(pattern);
                const isRejected = formData.patterns_rejected.includes(pattern);
                return (
                  <div key={pattern} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <span className="text-sm font-medium">{pattern}</span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isConfirmed ? 'default' : 'outline'}
                        className={isConfirmed ? 'bg-green-600 hover:bg-green-700' : ''}
                        onClick={() => handlePatternToggle(pattern, 'confirmed')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={isRejected ? 'destructive' : 'outline'}
                        onClick={() => handlePatternToggle(pattern, 'rejected')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-3 rounded-lg border bg-muted/30">
              No patterns were detected by AI. You can add patterns below if you found any.
            </p>
          )}
        </div>

        {/* Add New Patterns */}
        <div className="space-y-3">
          <Label className="font-semibold">Add Missing Patterns</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter pattern name..."
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPattern())}
            />
            <Button type="button" variant="outline" onClick={handleAddPattern}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {formData.patterns_added.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.patterns_added.map(pattern => (
                <Badge key={pattern} className="gap-1 pr-1">
                  {pattern}
                  <button
                    type="button"
                    onClick={() => handleRemoveAddedPattern(pattern)}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Meta Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Review Difficulty</Label>
            <Select
              value={formData.review_difficulty}
              onValueChange={(v) => setFormData(prev => ({ ...prev, review_difficulty: v as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Training Priority</Label>
            <Select
              value={String(formData.training_priority)}
              onValueChange={(v) => setFormData(prev => ({ ...prev, training_priority: parseInt(v, 10) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-3 p-3 rounded-lg border w-full">
              <Checkbox
                id="training-example"
                checked={formData.is_training_example}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_training_example: checked as boolean }))}
              />
              <Label htmlFor="training-example" className="text-sm cursor-pointer">
                Use as training example
              </Label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          className="w-full gap-2"
          size="lg"
        >
          {submitMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Target className="h-4 w-4" />
              Submit Review Feedback
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIRiskFeedbackForm;
