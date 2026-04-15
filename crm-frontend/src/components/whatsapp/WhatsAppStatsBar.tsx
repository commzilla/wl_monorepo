import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { WhatsAppService, WhatsAppStats } from '@/services/whatsappService';

export function WhatsAppStatsBar() {
  const [stats, setStats] = useState<WhatsAppStats | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await WhatsAppService.getStats();
        setStats(data);
      } catch (e) {
        console.error('Failed to load WhatsApp stats:', e);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  const items = [
    {
      label: 'Total Conversations',
      value: stats.total_conversations,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Needs Attention',
      value: stats.needs_attention,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: "Today's Messages",
      value: stats.today_messages,
      icon: MessageSquare,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'New Today',
      value: stats.today_new_conversations,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="p-3 flex items-center gap-3">
          <div className={`p-2 rounded-lg ${item.bg}`}>
            <item.icon className={`h-4 w-4 ${item.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
