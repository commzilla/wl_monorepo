
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Affiliate } from '@/types/affiliate';

interface AffiliateReviewFormProps {
  affiliate: Affiliate;
  onSubmit: (data: { id: string; status: string; notes?: string; code?: string }) => void;
  isLoading: boolean;
}

const AffiliateReviewForm: React.FC<AffiliateReviewFormProps> = ({ affiliate, onSubmit, isLoading }) => {
  const [status, setStatus] = useState(affiliate.application_status);
  const [notes, setNotes] = useState(affiliate.admin_notes || '');
  const [affiliateCode, setAffiliateCode] = useState(affiliate.affiliate_code || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: affiliate.id,
      status,
      notes,
      code: status === 'approved' ? affiliateCode : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="font-medium">Business Name</Label>
          <p className="text-sm">{affiliate.business_name}</p>
        </div>
        <div>
          <Label className="font-medium">Expected Volume</Label>
          <p className="text-sm">${affiliate.expected_monthly_volume?.toLocaleString() || 0}/month</p>
        </div>
      </div>

      <div>
        <Label className="font-medium">Website</Label>
        <p className="text-sm">
          {affiliate.website_url ? (
            <a href={affiliate.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {affiliate.website_url}
            </a>
          ) : (
            'Not provided'
          )}
        </p>
      </div>

      <div>
        <Label className="font-medium">Marketing Channels</Label>
        <p className="text-sm">{affiliate.marketing_channels?.join(', ') || 'None specified'}</p>
      </div>

      <div>
        <Label className="font-medium">Social Media</Label>
        <div className="text-sm">
          {affiliate.social_media_handles && Object.keys(affiliate.social_media_handles).length > 0 ? (
            Object.entries(affiliate.social_media_handles).map(([platform, handle]) => (
              <div key={platform} className="flex justify-between">
                <span className="capitalize">{platform}:</span>
                <span>{handle as string}</span>
              </div>
            ))
          ) : (
            'Not provided'
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="status">Application Status</Label>
        <Select value={status} onValueChange={(value: 'pending' | 'approved' | 'rejected') => setStatus(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {status === 'approved' && (
        <div>
          <Label htmlFor="code">Affiliate Code</Label>
          <Input
            id="code"
            value={affiliateCode}
            onChange={(e) => setAffiliateCode(e.target.value)}
            placeholder="Enter unique affiliate code"
            required
          />
        </div>
      )}

      <div>
        <Label htmlFor="notes">Admin Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this application..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Application'}
        </Button>
      </div>
    </form>
  );
};

export default AffiliateReviewForm;
