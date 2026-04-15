import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChatWidgetConfig } from '@/lib/types/chat';
import { Code, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface EmbedCodeCardProps {
  config: ChatWidgetConfig;
}

const EmbedCodeCard: React.FC<EmbedCodeCardProps> = ({ config }) => {
  const [embedCodeCopied, setEmbedCodeCopied] = useState(false);

  const getEmbedCode = () => {
    const currentDomain = window.location.origin;
    return `<!-- WeFund Chat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '/chat-widget.js';
    script.async = true;
    document.head.appendChild(script);
    
    window.WeFundChat = {
      config: {
        apiUrl: '/api/chat',
        widgetId: '${config.id}'
      }
    };
  })();
</script>`;
  };

  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(getEmbedCode());
      setEmbedCodeCopied(true);
      toast.success('Embed code copied to clipboard!');
      setTimeout(() => setEmbedCodeCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy embed code');
    }
  };

  return (
    <Card className="lg:col-span-2 bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Code className="h-5 w-5" />
          Embed Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-300">
          Copy and paste this code into your website's HTML to add the chat widget.
        </p>
        <div className="relative">
          <Textarea
            value={getEmbedCode()}
            readOnly
            className="font-mono text-sm bg-slate-800 border-slate-600 text-slate-100 min-h-[200px] resize-none"
            rows={10}
          />
          <Button
            onClick={copyEmbedCode}
            size="sm"
            className="absolute top-3 right-3 bg-slate-700 hover:bg-slate-600 border-slate-600"
            variant="outline"
          >
            {embedCodeCopied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </>
            )}
          </Button>
        </div>
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <p className="text-sm text-blue-300 font-medium mb-2">
            Installation Instructions:
          </p>
          <ol className="text-sm text-blue-200 space-y-1 ml-4 list-decimal">
            <li>Copy the embed code above</li>
            <li>Paste it just before the closing &lt;/body&gt; tag in your website's HTML</li>
            <li>The chat widget will automatically appear on your website</li>
            <li>Make sure the widget is enabled in the settings above</li>
          </ol>
        </div>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <p className="text-sm text-yellow-300 font-medium mb-2">
            Testing Instructions:
          </p>
          <ol className="text-sm text-yellow-200 space-y-1 ml-4 list-decimal">
            <li>Create a simple HTML file with the embed code</li>
            <li>Open it in your browser to test the widget</li>
            <li>Check the browser console for any error messages</li>
            <li>Ensure your widget is enabled in the settings above</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmbedCodeCard;
