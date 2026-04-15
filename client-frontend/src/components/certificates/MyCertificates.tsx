
import React, { useState } from 'react';
import { Header } from '../shared/Header';
import { Sidebar } from '../shared/Sidebar';
import { CertificateCard } from './CertificateCard';

interface Certificate {
  id: string;
  title: string;
  imageUrl?: string;
}

export const MyCertificates: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const certificates: Certificate[] = [
    {
      id: '1',
      title: 'Passed Phase 1',
      imageUrl: '/LiveAccountCertificate.png'
    },
    {
      id: '2',
      title: 'Payout Certificate',
      imageUrl: '/PayoutCertificate.png'
    },
    {
      id: '2',
      title: 'Payout Certificate',
      imageUrl: '/PayoutCertificate.png'
    }
  ];

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleShare = (certificateId: string) => {
    console.log('Sharing certificate:', certificateId);
    // Implement share functionality
  };

  const handleDownload = (certificateId: string) => {
    console.log('Downloading certificate:', certificateId);
    // Implement download functionality
  };

  const handleFilterToggle = () => {
    setFilterOpen(!filterOpen);
  };

  return (
    <div className="content-start flex-wrap flex gap-[-148px] overflow-hidden bg-[#0A1114] min-h-full">
      <Header onToggleSidebar={handleToggleSidebar} />
      
      <div className="flex w-full">
        <Sidebar />
        
        <main className="border-t-[rgba(40,191,255,0.05)] border-l-[rgba(40,191,255,0.05)] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] min-w-60 min-h-[952px] overflow-hidden shrink w-[1563px] bg-[#080808] pt-10 pb-[305px] px-8 rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
          <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full">
            <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/9c3f3302847bef0d195611f42d2d85337f7b0137?placeholderIfAbsent=true"
                className="aspect-[1] object-contain w-12 shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch min-h-12 shrink-0 my-auto"
                alt="Certificates icon"
              />
              <h1 className="text-[#E4EEF5] self-stretch my-auto">
                Certificates
              </h1>
            </div>
            
            <div className="relative">
              <button
                onClick={handleFilterToggle}
                className="items-center shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex min-h-12 gap-2 text-sm text-[#85A8C3] font-normal tracking-[-0.42px] bg-[rgba(40,191,255,0.05)] my-auto pl-4 pr-3 py-3.5 rounded-lg hover:bg-[rgba(40,191,255,0.1)] transition-colors"
              >
                <span className="text-[#85A8C3] self-stretch my-auto">
                  All certificates
                </span>
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/90ebc2b5ff7b4a20badecdc487273096/bbab564e26a02ba0df23bef2f57cbfe226dae916?placeholderIfAbsent=true"
                  className={`aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto transition-transform ${filterOpen ? 'rotate-180' : ''}`}
                  alt="Dropdown arrow"
                />
              </button>
              
              {filterOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[rgba(40,191,255,0.05)] rounded-lg shadow-lg z-10">
                  <div className="p-2">
                    <button className="w-full text-left px-3 py-2 text-[#85A8C3] hover:bg-[rgba(40,191,255,0.05)] rounded">
                      All certificates
                    </button>
                    <button className="w-full text-left px-3 py-2 text-[#85A8C3] hover:bg-[rgba(40,191,255,0.05)] rounded">
                      Phase 1 certificates
                    </button>
                    <button className="w-full text-left px-3 py-2 text-[#85A8C3] hover:bg-[rgba(40,191,255,0.05)] rounded">
                      Payout certificates
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>
          
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12 max-md:max-w-full max-md:mt-10">
            {certificates.map((certificate) => (
              <CertificateCard
                key={certificate.id}
                title={certificate.title}
                imageUrl={certificate.imageUrl}
                onShare={() => handleShare(certificate.id)}
                onDownload={() => handleDownload(certificate.id)}
              />
            ))}
          </section>
        </main>
      </div>
    </div>
  );
};
