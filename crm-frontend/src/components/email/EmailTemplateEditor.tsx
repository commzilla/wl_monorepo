import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Save, Eye, Send, Code, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { EmailTemplate, EmailTemplateService } from '@/services/emailTemplateService';

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  onBack: () => void;
  onSaved: () => void;
}

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({ template, onBack, onSaved }) => {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [bodyHtml, setBodyHtml] = useState(template.body_html);
  const [subject, setSubject] = useState(template.subject);
  const [description, setDescription] = useState(template.description);
  const [sampleContext, setSampleContext] = useState<Record<string, any>>(template.sample_context || {});

  const [editorMode, setEditorMode] = useState<'source' | 'preview'>('source');
  const [previewHtml, setPreviewHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [sendTestOpen, setSendTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed =
      bodyHtml !== template.body_html ||
      subject !== template.subject ||
      description !== template.description;
    setHasChanges(changed);
  }, [bodyHtml, subject, description, template]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await EmailTemplateService.updateTemplate(template.id, {
        body_html: bodyHtml,
        subject,
        description,
        sample_context: sampleContext,
      });
      toast({ title: 'Template saved', description: `${template.name} has been updated.` });
      setHasChanges(false);
      onSaved();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const res = await EmailTemplateService.previewTemplate(template.id, sampleContext);
      setPreviewHtml(res.rendered_html);
      setEditorMode('preview');
    } catch (err: any) {
      toast({ title: 'Preview failed', description: err.message, variant: 'destructive' });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) return;
    setSendingTest(true);
    try {
      const res = await EmailTemplateService.sendTestEmail(template.id, testEmail, sampleContext);
      toast({ title: 'Test email sent', description: res.message });
      setSendTestOpen(false);
      setTestEmail('');
    } catch (err: any) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    if (editorMode === 'preview' && iframeRef.current && previewHtml) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(previewHtml);
        doc.close();
      }
    }
  }, [editorMode, previewHtml]);

  const handleSampleContextChange = (key: string, value: string) => {
    setSampleContext(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{template.name}</h2>
            <p className="text-sm text-muted-foreground">{template.template_path}</p>
          </div>
          <Badge variant="outline">{template.category}</Badge>
          {hasChanges && <Badge variant="secondary">Unsaved changes</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
            {previewing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}
            Preview
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSendTestOpen(true)}>
            <Send className="h-4 w-4 mr-1" /> Send Test
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Editor panel — 3 cols */}
        <div className="lg:col-span-3 space-y-3">
          {/* Subject */}
          <div>
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject..."
            />
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1 border rounded-md p-1 w-fit">
            <Button
              variant={editorMode === 'source' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setEditorMode('source')}
            >
              <Code className="h-4 w-4 mr-1" /> HTML Source
            </Button>
            <Button
              variant={editorMode === 'preview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handlePreview()}
            >
              <FileText className="h-4 w-4 mr-1" /> Preview
            </Button>
          </div>

          {/* Editor / Preview */}
          {editorMode === 'source' ? (
            <div className="border rounded-md overflow-hidden">
              <Editor
                height="600px"
                language="html"
                theme="vs-dark"
                value={bodyHtml}
                onChange={val => setBodyHtml(val || '')}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          ) : (
            <div className="border rounded-md bg-white">
              <iframe
                ref={iframeRef}
                title="Email Preview"
                className="w-full rounded-md"
                style={{ height: '600px', border: 'none' }}
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Sidebar — 1 col */}
        <div className="space-y-4">
          {/* Template Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Template Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <p>{template.category}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <p>{template.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              {template.last_modified_by_email && (
                <div>
                  <Label className="text-xs text-muted-foreground">Last Modified By</Label>
                  <p>{template.last_modified_by_email}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Last Updated</Label>
                <p>{new Date(template.updated_at).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="When is this email sent?"
                rows={3}
                className="text-sm"
              />
            </CardContent>
          </Card>

          {/* Variables */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Template Variables ({template.variables.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {template.variables.length === 0 ? (
                <p className="text-xs text-muted-foreground">No variables detected.</p>
              ) : (
                template.variables.map(v => (
                  <div key={v}>
                    <Label className="text-xs font-mono">{`{{ ${v} }}`}</Label>
                    <Input
                      value={String(sampleContext[v] ?? '')}
                      onChange={e => handleSampleContextChange(v, e.target.value)}
                      placeholder={`Sample value for ${v}`}
                      className="text-xs h-8"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Send Test Dialog */}
      <Dialog open={sendTestOpen} onOpenChange={setSendTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will send <strong>{template.name}</strong> with sample data to the email address below.
            </p>
            <div>
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendTestOpen(false)}>Cancel</Button>
            <Button onClick={handleSendTest} disabled={sendingTest || !testEmail}>
              {sendingTest ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Send Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplateEditor;
