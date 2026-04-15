import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Search, Eye, Edit, Send, Clock, Check, AlertCircle, Loader2, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/use-toast';
import EmailTemplateEditor from '@/components/email/EmailTemplateEditor';
import {
  EmailTemplate,
  EmailLogEntry,
  EmailTemplateService,
  PaginatedResponse,
} from '@/services/emailTemplateService';

// ─── Category colors ─────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  payout: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  challenge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  competition: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  crm: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  migration: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  bulk_import: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  breach: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  certificate: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  ea_submission: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  auth: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  affiliate: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  automation: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  queued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

const TEMPLATE_CATEGORIES = [
  'all', 'payout', 'challenge', 'competition', 'crm', 'migration', 'bulk_import',
  'breach', 'certificate', 'ea_submission', 'auth', 'affiliate', 'automation',
];

const LOG_CATEGORIES = [
  'all', 'payout', 'challenge', 'affiliate', 'system', 'admin', 'other',
];

// ─── Main Page ───────────────────────────────────────────────────────────────

const Email: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('templates');

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategory, setTemplateCategory] = useState('all');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Logs state
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsCount, setLogsCount] = useState(0);
  const [logSearch, setLogSearch] = useState('');
  const [logCategory, setLogCategory] = useState('all');
  const [logStatus, setLogStatus] = useState('all');
  const [logPage, setLogPage] = useState(1);
  const [viewingLog, setViewingLog] = useState<EmailLogEntry | null>(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await EmailTemplateService.getTemplates({
        category: templateCategory,
        search: templateSearch,
        page_size: 100,
      });
      setTemplates(res.results);
    } catch (err: any) {
      toast({ title: 'Failed to load templates', description: err.message, variant: 'destructive' });
    } finally {
      setTemplatesLoading(false);
    }
  }, [templateCategory, templateSearch, toast]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await EmailTemplateService.getEmailLogs({
        category: logCategory,
        status: logStatus,
        search: logSearch,
        page: logPage,
        page_size: 25,
      });
      setLogs(res.results);
      setLogsCount(res.count);
    } catch (err: any) {
      toast({ title: 'Failed to load email logs', description: err.message, variant: 'destructive' });
    } finally {
      setLogsLoading(false);
    }
  }, [logCategory, logStatus, logSearch, logPage, toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchLogs]);

  // Stats
  const templateStats = {
    total: templates.length,
    active: templates.filter(t => t.is_active).length,
    categories: new Set(templates.map(t => t.category)).size,
  };

  const logStats = {
    total: logsCount,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
  };

  // If editing a template, show the editor
  if (editingTemplate) {
    return (
      <div className="space-y-6">
        <EmailTemplateEditor
          template={editingTemplate}
          onBack={() => setEditingTemplate(null)}
          onSaved={() => {
            fetchTemplates();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Email Management"
        subtitle="Manage email templates and view email logs"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full sm:max-w-md grid-cols-2">
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates ({templateStats.total})
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Mail className="h-4 w-4 mr-2" />
            Email Logs ({logsCount})
          </TabsTrigger>
        </TabsList>

        {/* ═══ Templates Tab ═══ */}
        <TabsContent value="templates" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templateStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Check className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templateStats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templateStats.categories}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={templateCategory} onValueChange={setTemplateCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Templates Table */}
          {templatesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No templates found. Run <code>python manage.py seed_email_templates</code> to populate.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Variables</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(t => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setEditingTemplate(t)}
                    >
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <Badge className={CATEGORY_COLORS[t.category] || ''} variant="secondary">
                          {t.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                        {t.subject || '—'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{t.variables.length}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(t.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingTemplate(t);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ═══ Email Logs Tab ═══ */}
        <TabsContent value="logs" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{logStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sent (this page)</CardTitle>
                <Check className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{logStats.sent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed (this page)</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{logStats.failed}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 sm:flex-wrap">
            <div className="flex-1 min-w-0 sm:min-w-[200px] relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or subject..."
                value={logSearch}
                onChange={e => { setLogSearch(e.target.value); setLogPage(1); }}
                className="pl-8"
              />
            </div>
            <Select value={logCategory} onValueChange={v => { setLogCategory(v); setLogPage(1); }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {LOG_CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={logStatus} onValueChange={v => { setLogStatus(v); setLogPage(1); }}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs Table */}
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No email logs found. Emails will appear here once they are sent by the system.
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.to_email}</TableCell>
                        <TableCell className="max-w-[250px] truncate text-sm">
                          {log.subject}
                        </TableCell>
                        <TableCell>
                          <Badge className={CATEGORY_COLORS[log.category] || ''} variant="secondary">
                            {log.category || 'other'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[log.status] || ''} variant="secondary">
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {logsCount > 25 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(logPage - 1) * 25 + 1}–{Math.min(logPage * 25, logsCount)} of {logsCount}
                  </p>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logPage <= 1}
                      onClick={() => setLogPage(p => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logPage * 25 >= logsCount}
                      onClick={() => setLogPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!viewingLog} onOpenChange={() => setViewingLog(null)}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
          </DialogHeader>
          {viewingLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">To:</span>{' '}
                  <span className="font-medium">{viewingLog.to_email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">From:</span>{' '}
                  <span>{viewingLog.from_email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Subject:</span>{' '}
                  <span className="font-medium">{viewingLog.subject}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{' '}
                  <Badge className={STATUS_COLORS[viewingLog.status] || ''} variant="secondary">
                    {viewingLog.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>{' '}
                  <Badge className={CATEGORY_COLORS[viewingLog.category] || ''} variant="secondary">
                    {viewingLog.category || 'other'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Sent:</span>{' '}
                  <span>{viewingLog.sent_at ? new Date(viewingLog.sent_at).toLocaleString() : '—'}</span>
                </div>
              </div>
              {viewingLog.error_message && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-200">
                  <strong>Error:</strong> {viewingLog.error_message}
                </div>
              )}
              {viewingLog.body_html && (
                <div>
                  <p className="text-sm font-medium mb-2">Email Content</p>
                  <iframe
                    title="Email Content"
                    srcDoc={viewingLog.body_html}
                    className="w-full rounded-md border bg-white"
                    style={{ height: '400px' }}
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Email;
