
import React from 'react';

interface CertificateCardProps {
  title: string;
  imageUrl?: string;
  onShare: () => void;
  onDownload: () => void;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  title,
  imageUrl,
  onShare,
  onDownload
}) => {
  return (
    <article className="justify-center items-stretch self-stretch flex min-w-60 flex-col my-auto px-5 py-6 rounded-xl max-md:max-w-full bg-[#0A1114]">
      {imageUrl && (
        <img
          src={imageUrl}
          className="aspect-[1.42] object-contain w-full min-h-[331px] max-md:max-w-full"
          alt={`${title} certificate`}
        />
      )}
      
      <h3 className="text-[#E4EEF5] text-xl font-medium tracking-[-0.6px] mt-4 max-md:max-w-full">
        {title}
      </h3>
      
      <div className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap mt-8 justify-end">
        <button
          onClick={onShare}
          className="justify-center items-center border border-[#28BFFF] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex min-h-11 gap-2 overflow-hidden text-[#85A8C3] bg-[rgba(40,191,255,0.05)] my-auto pl-3 pr-4 py-3 rounded-lg border-solid hover:bg-[rgba(40,191,255,0.1)] transition-colors"
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/b46d9173e50b3c93543e02ab2f987ad0c7d7c050?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
            alt="Share icon"
          />
          <span className="text-[#85A8C3] self-stretch my-auto">
            Share
          </span>
        </button>
        
        <button
          onClick={onDownload}
          className="items-center border border-[#126BA7] shadow-[0px_0px_40px_0px_rgba(79,214,255,0.40)_inset] bg-[rgba(8,8,8,0.01)] self-stretch flex min-h-11 gap-2 overflow-hidden text-[#E4EEF5] my-auto pl-3.5 pr-4 py-3 rounded-lg border-solid hover:bg-[rgba(18,107,167,0.1)] transition-colors"
        >
          <img
            src="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/aceb7dd9a00400de9972370777d957fbe5311df8?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
            alt="Download icon"
          />
          <span className="text-[#E4EEF5] self-stretch my-auto">
            Download
          </span>
        </button>
      </div>
    </article>
  );
};
