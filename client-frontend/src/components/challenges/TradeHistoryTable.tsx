import React, { useState } from 'react';
import DateRangePicker from '../shared/DateRangePicker';

interface Trade {
  ticket: string;
  openTime: string;
  openPrice: string;
  closeTime: string;
  closePrice: string;
  side: 'Buy' | 'Sell';
  symbol: string;
  volume: string;
  grossProfit: string;
  netProfit: string;
}

interface TradeHistoryTableProps {
  className?: string;
}

export const TradeHistoryTable: React.FC<TradeHistoryTableProps> = ({ className = "" }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tableStartDate, setTableStartDate] = useState<Date | null>(null);
  const [tableEndDate, setTableEndDate] = useState<Date | null>(null);

  const trades: Trade[] = [
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.27881',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.27881',
      side: 'Sell',
      symbol: 'GBPUSDx',
      volume: '0.08',
      grossProfit: '0',
      netProfit: '$354,000.00'
    },
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.27881',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.27881',
      side: 'Sell',
      symbol: 'GBPUSDx',
      volume: '0.08',
      grossProfit: '0',
      netProfit: '$354,000.00'
    },
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.09115',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.09115',
      side: 'Buy',
      symbol: 'EURUSDx',
      volume: '0.02',
      grossProfit: '0',
      netProfit: '$54.00'
    },
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.09115',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.09115',
      side: 'Buy',
      symbol: 'EURUSDx',
      volume: '0.02',
      grossProfit: '0',
      netProfit: '$54.00'
    },
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.09115',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.09115',
      side: 'Buy',
      symbol: 'EURUSDx',
      volume: '3.00',
      grossProfit: '0',
      netProfit: '-$354.00'
    },
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.09115',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.09115',
      side: 'Buy',
      symbol: 'EURUSDx',
      volume: '3.00',
      grossProfit: '0',
      netProfit: '-$354.00'
    },
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.27881',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.27881',
      side: 'Sell',
      symbol: 'GBPUSDx',
      volume: '15.00',
      grossProfit: '0',
      netProfit: '-$33.24'
    },
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.27881',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.27881',
      side: 'Sell',
      symbol: 'GBPUSDx',
      volume: '15.00',
      grossProfit: '0',
      netProfit: '-$33.24'
    },
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.09115',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.09115',
      side: 'Buy',
      symbol: 'EURUSDx',
      volume: '1.00',
      grossProfit: '0',
      netProfit: '$354.00'
    },
    {
      ticket: '210551744',
      openTime: '07/01/23 - 16:35:17',
      openPrice: '1.09115',
      closeTime: '07/01/23 - 16:35:17',
      closePrice: '1.09115',
      side: 'Buy',
      symbol: 'EURUSDx',
      volume: '1.00',
      grossProfit: '0',
      netProfit: '$354.00'
    },
  ];

  const getSideBadgeStyles = (side: 'Buy' | 'Sell') => {
    return side === 'Buy'
      ? 'text-[#1BBF99] bg-[rgba(27,191,153,0.18)]'
      : 'text-[#ED5363] bg-[rgba(237,83,99,0.20)]';
  };

  const getProfitColor = (profit: string) => {
    if (profit.startsWith('-')) return 'text-[#ED5363]';
    if (profit.startsWith('$') && !profit.startsWith('$0')) return 'text-[#1BBF99]';
    return 'text-[#E4EEF5]';
  };

  const handleDateRangeSelect = (start: Date | null, end: Date | null) => {
    setTableStartDate(start);
    setTableEndDate(end);
  };

  return (
    <div className={`border border-[color:var(--border-cards-border,rgba(40,191,255,0.05))] relative z-0 w-full mt-8 py-6 rounded-2xl border-solid max-md:max-w-full ${className}`}>
      <div className="z-0 flex w-full items-center gap-[40px_100px] justify-between flex-wrap px-6 max-md:max-w-full max-md:px-5">
        <div className="text-[#E4EEF5] text-xl font-medium tracking-[-0.6px] self-stretch my-auto">
          Trade history
        </div>
        
        <div className="self-stretch flex min-w-60 items-center gap-4 text-sm text-[#85A8C3] font-normal tracking-[-0.42px] my-auto">
          <DateRangePicker
            defaultStartDate={tableStartDate}
            defaultEndDate={tableEndDate}
            onRangeSelect={handleDateRangeSelect}
          />
          
          <div className="flex items-center h-9 px-4 py-2 border border-[#28BFFF]/20 rounded-lg bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] text-[#E4EEF5] text-sm font-normal transition-all duration-200 hover:bg-[rgba(40,191,255,0.1)] focus-within:border-[#28BFFF]/40">
            <img
              src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/9325b0fefdb3ce4e8b8230a29adb5006a36dde4b?placeholderIfAbsent=true"
              className="aspect-[1] object-contain w-4 self-stretch shrink-0 my-auto"
              alt="Search"
            />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-[#E4EEF5] flex-1 bg-transparent border-none outline-none ml-2 placeholder-[#85A8C3]"
            />
          </div>
        </div>
      </div>
      
      <div className="z-0 w-full mt-8 max-md:max-w-full">
        <div className="flex w-full text-sm text-[#E4EEF5] font-normal flex-wrap max-md:max-w-full">
          {/* Table Header */}
          <div className="whitespace-nowrap tracking-[-0.42px] flex-1 shrink basis-[0%]">
            <div className="items-center flex min-h-12 w-full gap-2 text-xs font-medium tracking-[-0.36px] pl-6 pr-3 py-[17px] max-md:pl-5">
              <div className="text-[#E4EEF5] self-stretch gap-1 my-auto">
                Ticket
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-stretch tracking-[-0.42px] justify-center flex-1 shrink basis-[0%]">
            <div className="items-center flex min-h-12 w-full gap-2 text-xs font-medium tracking-[-0.36px] pl-4 pr-3 py-[17px]">
              <div className="text-[#E4EEF5] self-stretch flex-1 shrink basis-[0%] w-full gap-1 my-auto">
                Open time
              </div>
            </div>
          </div>
          
          <div className="text-right tracking-[-0.42px] w-[152px]">
            <div className="items-center flex min-h-12 w-full gap-2 text-xs font-medium tracking-[-0.36px] pl-4 pr-3 py-[17px]">
              <div className="text-[#E4EEF5] self-stretch w-[76px] gap-1 my-auto">
                Open Price
              </div>
            </div>
          </div>
          
          <div className="tracking-[-0.42px] flex-1 shrink basis-[0%]">
            <div className="items-center flex min-h-12 w-full gap-2 text-xs font-medium tracking-[-0.36px] pl-8 pr-3 py-[17px] max-md:pl-5">
              <div className="text-[#E4EEF5] self-stretch flex-1 shrink basis-[0%] w-full gap-1 my-auto">
                Close time
              </div>
            </div>
          </div>
          
          <div className="text-right tracking-[-0.42px] w-[152px]">
            <div className="items-center flex min-h-12 w-full gap-2 text-xs font-medium tracking-[-0.36px] pl-4 pr-3 py-[17px]">
              <div className="text-[#E4EEF5] self-stretch w-[76px] gap-1 my-auto">
                Close Price
              </div>
            </div>
          </div>
          
          <div className="text-xs text-[#1BBF99] font-semibold whitespace-nowrap leading-[1.2] w-32">
            <div className="justify-center items-center flex min-h-12 w-full gap-2 text-[#E4EEF5] font-medium tracking-[-0.36px] px-3 py-4">
              <div className="self-stretch flex items-center gap-1 my-auto">
                <div className="text-[#E4EEF5] self-stretch my-auto">
                  Side
                </div>
                <img
                  src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/cec3254d7f7ad0735b55d6387cfb99f28491d075?placeholderIfAbsent=true"
                  className="aspect-[1] object-contain w-4 self-stretch shrink-0 my-auto"
                  alt="Sort"
                />
              </div>
            </div>
          </div>
          
          <div className="whitespace-nowrap text-center tracking-[-0.42px] w-32">
            <div className="items-center flex min-h-12 w-full gap-2 text-xs font-medium tracking-[-0.36px] pl-8 pr-3 py-[17px] max-md:pl-5">
              <div className="text-[#E4EEF5] self-stretch gap-1 my-auto">
                Symbol
              </div>
            </div>
          </div>
          
          <div className="whitespace-nowrap text-center tracking-[-0.42px] w-32">
            <div className="justify-center items-center flex min-h-12 w-full gap-2 text-xs font-medium tracking-[-0.36px] pl-4 pr-3 py-[17px]">
              <div className="text-[#E4EEF5] self-stretch gap-1 my-auto">
                Volume
              </div>
            </div>
          </div>
          
          <div className="text-center tracking-[-0.42px] w-32">
            <div className="justify-center items-center flex min-h-12 w-full gap-2 text-xs font-medium tracking-[-0.36px] pl-4 pr-3 py-[17px]">
              <div className="text-[#E4EEF5] self-stretch gap-1 my-auto">
                Gross Profit
              </div>
            </div>
          </div>
          
          <div className="text-[#1BBF99] text-center tracking-[-0.42px] flex-1 shrink basis-[0%]">
            <div className="items-center flex min-h-12 w-full gap-2 text-xs text-[#E4EEF5] font-medium text-right tracking-[-0.36px] pl-4 pr-6 py-[9px] max-md:pr-5">
              <div className="text-[#E4EEF5] self-stretch flex-1 shrink basis-[0%] w-full gap-1 my-auto">
                Donload Win/Loss Card
              </div>
            </div>
          </div>
        </div>
        
        {/* Table Body */}
        {trades.map((trade, index) => (
          <div key={index} className="flex w-full text-sm text-[#E4EEF5] font-normal flex-wrap max-md:max-w-full">
            <div className="whitespace-nowrap tracking-[-0.42px] flex-1 shrink basis-[0%]">
              <div className="text-[#E4EEF5] self-stretch border-b-[color:var(--Grey-dark-2,#171E22)] min-h-11 w-full pl-6 pr-4 py-3.5 border-b border-solid max-md:pl-5">
                {trade.ticket}
              </div>
            </div>
            
            <div className="flex flex-col items-stretch tracking-[-0.42px] justify-center flex-1 shrink basis-[0%]">
              <div className="text-[#E4EEF5] self-stretch flex-1 shrink basis-[0%] border-b-[color:var(--Grey-dark-2,#171E22)] min-h-11 w-full gap-3 px-4 py-3.5 border-b border-solid">
                {trade.openTime}
              </div>
            </div>
            
            <div className="text-right tracking-[-0.42px] w-[152px]">
              <div className="text-[#E4EEF5] self-stretch w-full border-b-[color:var(--Grey-dark-2,#171E22)] min-h-11 whitespace-nowrap px-4 py-3.5 border-b border-solid">
                {trade.openPrice}
              </div>
            </div>
            
            <div className="tracking-[-0.42px] flex-1 shrink basis-[0%]">
              <div className="text-[#E4EEF5] self-stretch flex-1 shrink basis-[0%] border-b-[color:var(--Grey-dark-2,#171E22)] min-h-11 w-full pl-8 pr-4 py-3.5 border-b border-solid max-md:pl-5">
                {trade.closeTime}
              </div>
            </div>
            
            <div className="text-right tracking-[-0.42px] w-[152px]">
              <div className="text-[#E4EEF5] self-stretch w-full border-b-[color:var(--Grey-dark-2,#171E22)] min-h-11 whitespace-nowrap px-4 py-3.5 border-b border-solid">
                {trade.closePrice}
              </div>
            </div>
            
            <div className="text-xs text-[#1BBF99] font-semibold whitespace-nowrap leading-[1.2] w-32">
              <div className="justify-center items-center border-b-[color:var(--Grey-dark-2,#171E22)] flex min-h-11 w-full text-center px-4 py-3 border-b border-solid">
                <div className="bg-blend-normal self-stretch flex my-auto">
                  <div className={`self-stretch gap-1 pl-1.5 pr-2 py-[3px] rounded-2xl ${getSideBadgeStyles(trade.side)}`}>
                    {trade.side}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="whitespace-nowrap text-center tracking-[-0.42px] w-32">
              <div className="text-[#E4EEF5] self-stretch border-b-[color:var(--Grey-dark-2,#171E22)] min-h-11 w-full px-4 py-3.5 border-b border-solid">
                {trade.symbol}
              </div>
            </div>
            
            <div className="whitespace-nowrap text-center tracking-[-0.42px] w-32">
              <div className="text-[#E4EEF5] self-stretch border-b-[color:var(--Grey-dark-2,#171E22)] min-h-11 w-full px-4 py-3.5 border-b border-solid">
                {trade.volume}
              </div>
            </div>
            
            <div className="text-center tracking-[-0.42px] w-32">
              <div className="text-[#E4EEF5] self-stretch border-b-[color:var(--Grey-dark-2,#171E22)] min-h-11 w-full whitespace-nowrap px-4 py-3.5 border-b border-solid">
                {trade.grossProfit}
              </div>
            </div>
            
            <div className="text-center tracking-[-0.42px] flex-1 shrink basis-[0%]">
              <div className={`self-stretch border-b-[color:var(--Grey-dark-2,#171E22)] min-h-11 w-full whitespace-nowrap pl-4 pr-6 py-3.5 border-b border-solid max-md:pr-5 ${getProfitColor(trade.netProfit)}`}>
                {trade.netProfit}
              </div>
            </div>
          </div>
        ))}
        
        {/* Pagination */}
        <div className="flex w-full items-center gap-[40px_100px] justify-between flex-wrap mt-4 pt-3 pb-1 px-6 max-md:max-w-full max-md:px-5">
          <div className="self-stretch flex items-center gap-1 text-[#E4EEF5] justify-center my-auto">
            <div className="text-[#E4EEF5] text-center text-xs font-normal tracking-[-0.36px] self-stretch my-auto">
              Rows per page:
            </div>
            <div className="justify-center items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex min-h-11 gap-2 text-sm font-semibold whitespace-nowrap bg-[rgba(40,191,255,0.05)] my-auto pl-3 pr-4 py-3 rounded-lg border-solid">
              <div className="text-[#E4EEF5] self-stretch my-auto">
                {rowsPerPage}
              </div>
              <img
                src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/7efe3117927424cb7429d0d00a86a8e798a9ea75?placeholderIfAbsent=true"
                className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
                alt="Dropdown"
              />
            </div>
          </div>
          
          <div className="text-[#456074] text-center text-sm font-normal leading-none tracking-[-0.36px] self-stretch my-auto">
            <span className="font-medium">01 - 20</span> items of <span className="font-medium">105</span>
          </div>
          
          <div className="self-stretch flex min-w-60 items-center gap-2 justify-center my-auto">
            <div className="text-[#E4EEF5] self-stretch min-h-[38px] gap-1 text-sm font-semibold whitespace-nowrap text-center my-auto px-1 py-[11px]">
              First
            </div>
            <button className="justify-center items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] self-stretch flex min-h-8 gap-2 w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto px-1.5 rounded-lg border-solid">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/ab9f9a6f205598f932e5a18ebe9785f0d142b031?placeholderIfAbsent=true"
                className="aspect-[1] object-contain w-5 self-stretch my-auto"
                alt="Previous"
              />
            </button>
            {[1, 2, 3, 4].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`self-stretch border border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-h-8 gap-2 text-sm font-semibold whitespace-nowrap w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto px-3 rounded-lg border-solid ${
                  currentPage === page ? 'text-[#E4EEF5]' : 'text-[#85A8C3]'
                }`}
              >
                {page}
              </button>
            ))}
            <div className="text-[#85A8C3] self-stretch border border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-h-8 gap-2 text-sm font-semibold whitespace-nowrap w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto pl-2.5 pr-[9px] rounded-lg border-solid">
              ...
            </div>
            <div className="text-[#85A8C3] self-stretch border border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-h-8 gap-2 text-sm font-semibold whitespace-nowrap w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto pl-2 pr-[7px] rounded-lg border-solid">
              10
            </div>
            <button className="justify-center items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] self-stretch flex min-h-8 gap-2 w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto px-1.5 rounded-lg border-solid">
              <img
                src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/687d943d5a58654053e6ca6ac363dd730f531b7b?placeholderIfAbsent=true"
                className="aspect-[1] object-contain w-5 self-stretch my-auto"
                alt="Next"
              />
            </button>
            <div className="text-[#E4EEF5] self-stretch min-h-[38px] gap-1 text-sm font-semibold whitespace-nowrap text-center my-auto px-1 py-[11px]">
              Last
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
