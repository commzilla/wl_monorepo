import React from 'react';
import { ChallengeDropdown } from '../components/challenges/ChallengeDropdown';
import { ProgressCard } from '../components/challenges/ProgressCard';
import { TradingChart } from '../components/challenges/TradingChart';
import { Calendar } from '../components/challenges/Calendar';
import { TradeHistoryTable } from '../components/challenges/TradeHistoryTable';
import { MetricsGrid } from '../components/challenges/MetricsGrid';


const ChallengesPage: React.FC = () => {

  return (
    <main className="overflow-hidden bg-[#0A1114] min-h-full w-full">
        <div className="w-full max-md:max-w-full">
          <div className="gap-5 flex max-md:flex-col max-md:items-stretch">
            {/* Main Content */}
            <section className="flex-1 max-md:w-full max-md:ml-0">
              <div className="relative grow overflow-hidden w-full bg-[#0A1114] px-6 py-6 max-md:max-w-full max-md:px-5">
                
                {/* Challenge Header */}
                <div className="z-0 flex w-full flex-col items-stretch max-md:max-w-full">
                  <div className="flex w-full items-center gap-[40px_100px] justify-between flex-wrap max-md:max-w-full">
                    <ChallengeDropdown />
                    
                    <div className="self-stretch flex min-w-60 items-center gap-4 text-sm font-semibold my-auto">
                      <button className="justify-center items-center border border-[#28BFFF] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex min-h-11 gap-2 text-[#85A8C3] whitespace-nowrap bg-[rgba(40,191,255,0.05)] my-auto pl-3 pr-4 py-3 rounded-lg border-solid">
                        <img
                          src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/aaab275d822cbaae8a60fdabbc7c5e441b536eee?placeholderIfAbsent=true"
                          className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
                          alt="Credentials"
                        />
                        <span className="text-[#85A8C3] self-stretch my-auto">
                          Credentials
                        </span>
                      </button>
                      
                      <button className="items-center border border-[#126BA7] shadow-[0px_0px_40px_0px_rgba(79,214,255,0.40)_inset] bg-[rgba(8,8,8,0.01)] self-stretch flex min-h-11 gap-2 text-[#E4EEF5] my-auto pl-3.5 pr-4 py-3 rounded-lg border-solid">
                        <img
                          src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/bc78dfcc77b0b3d01f0bce5a09cf142cc45ceec6?placeholderIfAbsent=true"
                          className="aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto"
                          alt="Reset"
                        />
                        <span className="text-[#E4EEF5] self-stretch my-auto">
                          Reset Challenge
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Details Row */}
                <div className="flex w-full items-center gap-6 text-sm font-normal mt-4 max-md:flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[#456074]">Platform</span>
                    <span className="text-[#85A8C3] border border-[#28BFFF] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] bg-[rgba(40,191,255,0.05)] px-3 py-1.5 rounded-[100px] border-solid">MT4</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#456074]">Start date</span>
                    <span className="text-[#85A8C3] border border-[#28BFFF] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] bg-[rgba(40,191,255,0.05)] px-3 py-1.5 rounded-[100px] border-solid">March 12, 2024</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#456074]">Broker:</span>
                    <span className="text-[#E4EEF5]">Think Markets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#456074]">Live Profit Share:</span>
                    <span className="text-[#E4EEF5]">65.00%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#456074]">Lots:</span>
                    <span className="text-[#E4EEF5]">201</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#456074]">Average RRR:</span>
                    <span className="text-[#E4EEF5]">0</span>
                  </div>
                </div>
                
                {/* Progress Cards */}
                <div className="flex w-full items-stretch gap-6 flex-wrap mt-6 max-md:max-w-full">
                  <ProgressCard
                    title="Profit Target"
                    value="$440.00 left"
                    percentage={85}
                    maxValue="$3,234.25"
                    percentageText="56%"
                    icon="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/38c7d744be829f6086cc9938fc94c680a7b76753?placeholderIfAbsent=true"
                  />
                  
                  
                  <ProgressCard
                    title="Max Daily Loss"
                    value="$1.00 left"
                    percentage={11}
                    maxValue="$3,234.25"
                    percentageText="55%"
                    icon="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/e04cfac1b5bb550e072bb8212116b249935d2587?placeholderIfAbsent=true"
                    badge={{ text: "1.4%", color: "red" }}
                  />
                  
                  <ProgressCard
                    title="Max Permitted Loss"
                    value="$1.00 left"
                    percentage={98}
                    maxValue="$3,234.25"
                    percentageText="98%"
                    icon="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/362d67291e0e2b56355d61af554e68097e6e2024?placeholderIfAbsent=true"
                    badge={{ text: "98.4%", color: "green" }}
                  />
                  
                  <div className="border border-[rgba(40,191,255,0.05)] min-w-60 flex-1 shrink basis-[0%] px-5 py-4 rounded-xl border-solid bg-[rgba(40,191,255,0.02)]">
                    <div className="flex w-full gap-3 text-sm text-[#E4EEF5] font-medium">
                      <div className="text-[#E4EEF5] min-w-60 flex-1 shrink basis-[0%]">
                        Trading Days
                      </div>
                      <img
                        src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/6d1ddaf10e75b59e78a818708cfb2b2e46597cb7?placeholderIfAbsent=true"
                        className="aspect-[1] object-contain w-5 shrink-0"
                        alt="Trading days"
                      />
                    </div>
                    <div className="w-full flex-1 mt-[66px] max-md:mt-10">
                      <div className="text-[#E4EEF5] self-stretch flex-1 shrink basis-[0%] w-full text-xl font-medium tracking-[-0.6px]">
                        6 days
                      </div>
                      <div className="text-[#85A8C3] self-stretch flex-1 shrink basis-[0%] w-full text-xs font-normal tracking-[-0.36px] mt-[38px]">
                        No limitation in this challenge.
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Trading Chart */}
                <TradingChart className="mt-6" />
                
                {/* Metrics Grid */}
                <MetricsGrid className="mt-6" />
                
                {/* Summary by Day */}
                <div className="border border-[rgba(40,191,255,0.05)] z-0 w-full overflow-hidden mt-8 p-6 rounded-2xl border-solid bg-[rgba(40,191,255,0.02)] max-md:max-w-full max-md:px-5">
                  <div className="text-[#E4EEF5] text-xl font-medium tracking-[-0.6px]">
                    Summary by the day
                  </div>
                  
                  <div className="flex w-full items-stretch gap-4 flex-wrap mt-8 max-md:max-w-full">
                    <Calendar />
                    
                    {/* Daily Chart */}
                    <div className="border border-[#28BFFF] relative min-w-60 flex-1 shrink basis-[0%] p-6 rounded-xl border-solid bg-[rgba(40,191,255,0.02)] max-md:max-w-full max-md:px-5">
                      <div className="z-0 flex w-full gap-2 pb-4 max-md:max-w-full">
                        <div className="flex min-w-60 w-full items-center gap-[40px_100px] justify-between flex-wrap flex-1 shrink basis-[0%] px-3 max-md:max-w-full">
                          <div className="text-[#85A8C3] text-xl font-medium tracking-[-0.6px] self-stretch my-auto">
                            7 Jun 2024
                          </div>
                          
                          <div className="self-stretch flex min-w-60 items-center gap-4 text-sm font-semibold whitespace-nowrap tracking-[-0.42px] my-auto">
                            <div className="items-center border border-[rgba(40,191,255,0.05)] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex gap-2 w-[115px] my-auto px-6 py-3 rounded-[100px] border-solid max-md:px-5">
                              <div className="text-[#85A8C3] self-stretch my-auto">
                                Trades:
                              </div>
                              <div className="text-[#E4EEF5] text-right self-stretch my-auto">
                                4
                              </div>
                            </div>
                            
                            <div className="items-center border border-[rgba(40,191,255,0.05)] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] self-stretch flex gap-2 w-[115px] my-auto px-6 py-3 rounded-[100px] border-solid max-md:px-5">
                              <div className="text-[#85A8C3] self-stretch my-auto">
                                Lots:
                              </div>
                              <div className="text-[#E4EEF5] text-right self-stretch my-auto">
                                3.16
                              </div>
                            </div>
                            
                            <div className="text-[#1BBF99] text-right text-2xl font-medium tracking-[-0.72px] self-stretch my-auto">
                              $123
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Chart placeholder - simplified version */}
                      <div className="relative h-40 bg-[rgba(0,0,0,0.2)] rounded-lg mt-4 overflow-hidden">
                        {/* Chart bars */}
                        <div className="absolute bottom-0 left-[20%] w-3 h-[60%] bg-[#ED5363] rounded-t-md" />
                        <div className="absolute bottom-0 left-[40%] w-3 h-[80%] bg-[#1BBF99] rounded-t-md" />
                        <div className="absolute bottom-0 left-[60%] w-3 h-[40%] bg-[#1BBF99] rounded-t-md" />
                        <div className="absolute bottom-0 left-[80%] w-3 h-[20%] bg-[#ED5363] rounded-t-md" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Trade History Table */}
                <TradeHistoryTable className="mt-8" />
              </div>
            </section>
          </div>
        </div>
    </main>
  );
};

export default ChallengesPage;
