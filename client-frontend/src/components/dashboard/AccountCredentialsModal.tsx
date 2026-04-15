import React, { useState } from "react";
import { X, Copy, Eye, EyeOff, Download } from "lucide-react";

interface AccountCredentials {
  accountId: string;
  login: string;
  password: string;
  server: string;
}

interface AccountCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: AccountCredentials;
}

const CopyButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/5 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-colors"
  >
    <Copy className="w-5 h-5 text-white" strokeWidth={1.5} />
  </button>
);

const EyeToggleButton: React.FC<{
  isVisible: boolean;
  onClick: () => void;
}> = ({ isVisible, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/5 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-colors"
  >
    {isVisible ? (
      <EyeOff className="w-5 h-5 text-white" strokeWidth={1.5} />
    ) : (
      <Eye className="w-5 h-5 text-white" strokeWidth={1.5} />
    )}
  </button>
);

const CredentialField: React.FC<{
  label: string;
  value: string;
  onCopy: () => void;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}> = ({
  label,
  value,
  onCopy,
  isPassword = false,
  showPassword = false,
  onTogglePassword,
}) => {
  const displayValue = isPassword && !showPassword ? "••••••••••••••" : value;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between gap-2 pl-1">
        <span className="text-xs font-medium text-[#85A8C3] tracking-tight leading-6">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 h-11 px-3 md:px-4 pr-2 md:pr-3 rounded-[9px] border border-[#354B5F] bg-transparent">
        <span className="flex-1 text-sm font-normal text-[#E4EEF5] tracking-tight min-w-0 truncate">
          {displayValue}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPassword && onTogglePassword && (
            <EyeToggleButton
              isVisible={showPassword}
              onClick={onTogglePassword}
            />
          )}
          <CopyButton onClick={onCopy} />
        </div>
      </div>
    </div>
  );
};

const WindowsIcon: React.FC = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.545L9.818 2.182v9.818H0V3.545zM10.909 2.182L24 0v9.818H10.909V2.182zM0 12.182h9.818V22L0 20.636V12.182zM10.909 12.182H24V24l-13.091-1.818V12.182z"/>
  </svg>
);

const AppleIcon: React.FC = () => (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

const DownloadButton: React.FC<{
  platform: "Windows" | "Mac";
  onClick: () => void;
}> = ({ platform, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center gap-2 w-full h-11 px-4 rounded-[9px] border border-[#354B5F] bg-transparent hover:bg-[#28BFFF]/10 transition-colors"
  >
    {platform === "Windows" ? (
      <WindowsIcon />
    ) : (
      <AppleIcon />
    )}
    <span className="text-sm font-normal text-[#E4EEF5] tracking-tight">
      Download MetaTrader 5 for {platform}
    </span>
  </button>
);

const AccountCredentialsModal: React.FC<AccountCredentialsModalProps> = ({
  isOpen,
  onClose,
  credentials,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        console.log(`${fieldName} copied to clipboard`);
        return;
      }

      // Fallback method for environments where Clipboard API is blocked
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        console.log(`${fieldName} copied to clipboard using fallback method`);
      } else {
        throw new Error("Fallback copy failed");
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback: show the text so user can manually copy
      alert(`Copy this ${fieldName}: ${text}`);
    }
  };

  const handleDownloadMT5 = (platform: "Windows" | "Mac") => {
    const downloadUrls = {
      Windows: "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe",
      Mac: "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.dmg"
    };
    
    const url = downloadUrls[platform];
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-12 md:pt-16 lg:pt-20 p-3 md:p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="flex flex-col items-end gap-5 w-full max-w-[360px] p-4 md:p-5 pb-6 md:pb-7 rounded-2xl border border-[#1B3342] bg-[#0E1E23] shadow-[0_0_30px_rgba(0,0,0,0.35)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex flex-col items-start gap-3 w-full">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-base md:text-lg font-medium text-[#E4EEF5] tracking-tight">
              Account Credentials
            </h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#3AB3FF] bg-[#3AB3FF]/5 shadow-[0px_-8px_32px_0px_rgba(58,179,255,0.06)_inset] hover:bg-[#3AB3FF]/10 transition-colors"
            >
              <X
                className="w-5 h-5 text-white"
                strokeWidth={1.5}
              />
            </button>
          </div>

          {/* Account Info */}
          <div className="flex items-center gap-2 w-full">
            <div className="w-3.5 h-3.5 rounded-full bg-[#1BBF99]" />
            <span className="flex-1 text-sm font-normal text-[#E4EEF5] tracking-tight truncate">
              Account #{credentials.accountId}
            </span>
          </div>
        </div>

        {/* Credential Fields */}
        <div className="flex flex-col items-start gap-2 w-full">
          <CredentialField
            label="Login"
            value={credentials.login}
            onCopy={() => copyToClipboard(credentials.login, "Login")}
          />

          <CredentialField
            label="Password"
            value={credentials.password}
            isPassword={true}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword(!showPassword)}
            onCopy={() => copyToClipboard(credentials.password, "Password")}
          />

          <CredentialField
            label="Server"
            value={credentials.server}
            onCopy={() => copyToClipboard(credentials.server, "Server")}
          />
        </div>

        {/* Download MT5 Section */}
        <div className="flex flex-col items-start gap-3 w-full pt-2 border-t border-[#354B5F]/30">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-white" strokeWidth={1.5} />
            <span className="text-sm font-medium text-[#85A8C3] tracking-tight">
              Download MetaTrader 5
            </span>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <DownloadButton
              platform="Windows"
              onClick={() => handleDownloadMT5("Windows")}
            />
            <DownloadButton
              platform="Mac"
              onClick={() => handleDownloadMT5("Mac")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountCredentialsModal;