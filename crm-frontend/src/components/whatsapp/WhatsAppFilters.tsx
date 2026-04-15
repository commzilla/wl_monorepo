import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Archive,
  Search,
  User,
} from 'lucide-react';

interface WhatsAppFiltersProps {
  statusFilter: string;
  leadFilter: string;
  search: string;
  onStatusChange: (status: string) => void;
  onLeadChange: (lead: string) => void;
  onSearchChange: (search: string) => void;
}

const statusFilters = [
  { value: 'all', label: 'All', icon: MessageSquare, color: 'slate' },
  { value: 'active', label: 'Active', icon: MessageSquare, color: 'blue' },
  { value: 'human_handoff', label: 'Handoff', icon: AlertTriangle, color: 'orange' },
  { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'green' },
  { value: 'archived', label: 'Archived', icon: Archive, color: 'gray' },
];

const leadFilters = [
  { value: 'all', label: 'All Leads' },
  { value: 'new', label: 'New' },
  { value: 'engaged', label: 'Engaged' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const colorMap: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-800 border-slate-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  green: 'bg-green-100 text-green-800 border-green-300',
  gray: 'bg-gray-100 text-gray-800 border-gray-300',
};

export function WhatsAppFilters({
  statusFilter,
  leadFilter,
  search,
  onStatusChange,
  onLeadChange,
  onSearchChange,
}: WhatsAppFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search phone, name, email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {statusFilters.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? 'default' : 'outline'}
            size="sm"
            className={`h-7 text-xs ${statusFilter === f.value ? '' : colorMap[f.color] || ''}`}
            onClick={() => onStatusChange(f.value)}
          >
            <f.icon className="h-3 w-3 mr-1" />
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {leadFilters.map((f) => (
          <Button
            key={f.value}
            variant={leadFilter === f.value ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onLeadChange(f.value)}
          >
            <User className="h-3 w-3 mr-1" />
            {f.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
