import React, { useState } from 'react';

import { LotSizeCalculator } from "../components/lotsize/LotSizeCalculator";

export default function LotsizeCalculatorPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  
  return (
    <main className="items-center border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] rounded-[16px_0px_0px_0px] border-t border-solid border-l">
        <div className="mt-8 px-4 md:px-8 w-full">
          <LotSizeCalculator/>
        </div>
    </main>
  );
}


//fix