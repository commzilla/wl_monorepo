import React from 'react';

export const Pagination: React.FC = () => {
  return (
    <div className="flex w-full items-center gap-[40px_100px] justify-between flex-wrap mt-4 pt-3 pb-1 px-6 max-md:max-w-full max-md:px-5">
      <div className="self-stretch flex items-center gap-1 text-[#E4EEF5] justify-center my-auto">
        <span className="text-[#E4EEF5] text-center text-xs font-normal tracking-[-0.36px] self-stretch my-auto">
          Transactions per page:
        </span>
        <button className="justify-center items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex min-h-11 gap-2 text-sm font-semibold whitespace-nowrap bg-[rgba(40,191,255,0.05)] my-auto pl-3 pr-4 py-3 rounded-lg border-solid">
          <span className="text-[#E4EEF5] self-stretch my-auto">
            10
          </span>
          <img
            src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/838e339c4d926cd76713e9f82f9d3e3279d96f63?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
            alt="Dropdown"
          />
        </button>
      </div>
      
      <div className="text-[#456074] text-center text-sm font-normal leading-none tracking-[-0.36px] self-stretch my-auto">
        <span style={{fontWeight: 500, fontSize: '12px', lineHeight: '15px', letterSpacing: '-0.36px', color: 'rgba(69,96,116,1)'}}>
          01 - 20
        </span>{" "}
        transactions{" "}
        <span style={{fontSize: '12px', lineHeight: '15px', letterSpacing: '-0.36px', color: 'rgba(69,96,116,1)'}}>
          of
        </span>{" "}
        <span style={{fontWeight: 500, fontSize: '12px', lineHeight: '15px', letterSpacing: '-0.36px', color: 'rgba(69,96,116,1)'}}>
          105
        </span>
      </div>
      
      <div className="self-stretch flex min-w-60 items-center gap-2 justify-center my-auto">
        <button className="text-[#E4EEF5] self-stretch min-h-[38px] gap-1 text-sm font-semibold whitespace-nowrap text-center my-auto px-1 py-[11px]">
          First
        </button>
        <button className="justify-center items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] self-stretch flex min-h-8 gap-2 w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto px-1.5 rounded-lg border-solid">
          <img
            src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/ec7ae07fe1daef512d5a701c4460beb4cdc65c20?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-5 self-stretch my-auto"
            alt="Previous"
          />
        </button>
        <button className="justify-center items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] self-stretch flex min-h-8 gap-2 text-sm font-semibold whitespace-nowrap w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto px-3 rounded-lg border-solid">
          <span className="bg-clip-text self-stretch my-auto">
            1
          </span>
        </button>
        <button className="text-[#85A8C3] self-stretch border border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-h-8 gap-2 text-sm font-semibold whitespace-nowrap w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto pl-3 pr-[11px] rounded-lg border-solid">
          2
        </button>
        <button className="text-[#85A8C3] self-stretch border border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-h-8 gap-2 text-sm font-semibold whitespace-nowrap w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto px-[11px] rounded-lg border-solid">
          3
        </button>
        <button className="text-[#85A8C3] self-stretch border border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-h-8 gap-2 text-sm font-semibold whitespace-nowrap w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto px-[11px] rounded-lg border-solid">
          4
        </button>
        <button className="text-[#85A8C3] self-stretch border border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-h-8 gap-2 text-sm font-semibold whitespace-nowrap w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto pl-2.5 pr-[9px] rounded-lg border-solid">
          ...
        </button>
        <button className="text-[#85A8C3] self-stretch border border-[color:var(--border-Cards-border-gradient,#28BFFF)] min-h-8 gap-2 text-sm font-semibold whitespace-nowrap w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto pl-2 pr-[7px] rounded-lg border-solid">
          10
        </button>
        <button className="justify-center items-center border border-[color:var(--border-Cards-border-gradient,#28BFFF)] self-stretch flex min-h-8 gap-2 w-8 h-8 bg-[rgba(40,191,255,0.05)] my-auto px-1.5 rounded-lg border-solid">
          <img
            src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/14dc5235aeb54961992f360cc137b00dd88a6c40?placeholderIfAbsent=true"
            className="aspect-[1] object-contain w-5 self-stretch my-auto"
            alt="Next"
          />
        </button>
        <button className="text-[#E4EEF5] self-stretch min-h-[38px] gap-1 text-sm font-semibold whitespace-nowrap text-center my-auto px-1 py-[11px]">
          Last
        </button>
      </div>
    </div>
  );
};
