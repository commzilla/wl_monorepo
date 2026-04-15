import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Facebook, Twitter, Linkedin, MessageCircle, Mail, Link2, Copy, Check, Share2 } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  offerId: number;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  offerId,
}) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/offers/${offerId}`;
  const shareText = `Check out this offer: ${title}`;

  const handleShare = (platform: string) => {
    let url = '';
    
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl).then(() => {
          toast.success('Link copied to clipboard!');
          setCopied(true);
          setTimeout(() => {
            setCopied(false);
            onClose();
          }, 1500);
        }).catch(() => {
          toast.error('Failed to copy link');
        });
        return;
      default:
        return;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=600,height=600');
      onClose();
    }
  };

  const socialPlatforms = [
    {
      name: 'Facebook',
      icon: Facebook,
      gradient: 'from-[#1877F2] to-[#0d5dbf]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(24,119,242,0.4)]',
      key: 'facebook'
    },
    {
      name: 'Twitter',
      icon: Twitter,
      gradient: 'from-[#1DA1F2] to-[#0c7abf]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(29,161,242,0.4)]',
      key: 'twitter'
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      gradient: 'from-[#0A66C2] to-[#004182]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(10,102,194,0.4)]',
      key: 'linkedin'
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      gradient: 'from-[#25D366] to-[#128C7E]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(37,211,102,0.4)]',
      key: 'whatsapp'
    },
    {
      name: 'Email',
      icon: Mail,
      gradient: 'from-[#EA4335] to-[#c5221f]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(234,67,53,0.4)]',
      key: 'email'
    },
    {
      name: 'Copy Link',
      icon: Copy,
      gradient: 'from-[#4EC1FF] to-[#28BFFF]',
      hoverGlow: 'hover:shadow-[0_0_30px_rgba(40,191,255,0.4)]',
      key: 'copy'
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gradient-to-br from-[#0A1114] via-[#0D1418] to-[#0A1114] border-2 border-[rgba(40,191,255,0.2)] shadow-[0_0_50px_rgba(40,191,255,0.15)]">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-gradient-to-br from-[#4EC1FF] to-[#28BFFF] shadow-[0_0_30px_rgba(40,191,255,0.3)] shrink-0">
              <Share2 size={24} className="text-[#0A1114]" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#4EC1FF] via-[#28BFFF] to-[#4EC1FF] mb-3">
                Share Offer
              </DialogTitle>
              <p className="text-[#85A8C3] text-sm leading-relaxed">
                Spread the word about this amazing offer with your friends and network
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {socialPlatforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <button
                  key={platform.key}
                  onClick={() => handleShare(platform.key)}
                  className={`group relative flex flex-col items-center justify-center gap-3 p-5 rounded-xl bg-[rgba(40,191,255,0.05)] border-2 border-[rgba(40,191,255,0.15)] hover:border-[rgba(40,191,255,0.4)] transition-all duration-300 hover:scale-105 ${platform.hoverGlow}`}
                >
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${platform.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                  <div className={`p-3 rounded-full bg-gradient-to-br ${platform.gradient} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <span className="text-[#E4EEF5] text-xs font-semibold group-hover:text-[#4EC1FF] transition-colors">
                    {platform.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[rgba(40,191,255,0.15)] via-[rgba(40,191,255,0.08)] to-[rgba(40,191,255,0.15)] blur-xl"></div>
            <div className="relative p-5 rounded-xl bg-gradient-to-r from-[rgba(40,191,255,0.12)] to-[rgba(40,191,255,0.06)] border-2 border-[rgba(40,191,255,0.2)] backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <Link2 size={18} className="text-[#4EC1FF]" />
                <span className="text-[#E4EEF5] text-sm font-semibold">Direct Link</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A1114] border border-[rgba(40,191,255,0.2)]">
                <span className="text-[#85A8C3] text-sm truncate flex-1 font-mono">
                  {shareUrl}
                </span>
                <button
                  onClick={() => handleShare('copy')}
                  className="group shrink-0 px-4 py-2 rounded-lg bg-gradient-to-r from-[#4EC1FF] to-[#28BFFF] hover:from-[#28BFFF] hover:to-[#4EC1FF] text-[#0A1114] text-sm font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(40,191,255,0.4)] flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
