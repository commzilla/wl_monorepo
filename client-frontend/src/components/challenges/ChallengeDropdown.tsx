
import React, { useState } from 'react';

interface Challenge {
  id: string;
  name: string;
  phase: string;
  account: string;
  status: 'active' | 'completed';
}

interface ChallengeDropdownProps {
  className?: string;
}

export const ChallengeDropdown: React.FC<ChallengeDropdownProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge>({
    id: '1',
    name: '200k - 1 step',
    phase: 'Phase 1',
    account: 'Account #105502',
    status: 'active'
  });

  const challenges: Challenge[] = [
    {
      id: '1',
      name: '200k - 1 step',
      phase: 'Phase 1',
      account: 'Account #105502',
      status: 'active'
    },
    {
      id: '2',
      name: '200k - 1 step',
      phase: 'Phase 1',
      account: 'Account #105502',
      status: 'completed'
    },
    {
      id: '3',
      name: '200k - 1 step',
      phase: 'Phase 1',
      account: 'Account #105502',
      status: 'completed'
    }
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="justify-between items-center border border-[#126BA7] shadow-[0px_-8px_32px_0px_rgba(78,193,255,0.06)_inset] flex min-w-60 gap-[40px_100px] w-[444px] pl-5 pr-4 py-2 rounded-2xl border-solid bg-[rgba(40,191,255,0.05)] max-md:max-w-full"
      >
        <div className="self-stretch flex min-w-60 items-center gap-3 my-auto">
          <h1 className="text-[#E4EEF5] text-[32px] font-medium tracking-[-0.96px] self-stretch my-auto">
            {selectedChallenge.name}
          </h1>
          <div className="text-[#1BBF99] self-stretch min-h-6 gap-1 text-xs font-normal whitespace-nowrap text-center tracking-[-0.36px] bg-[rgba(27,191,153,0.18)] my-auto pl-2 pr-2.5 py-[5px] rounded-[100px]">
            Active
          </div>
        </div>
        <img
          src="https://cdn.builder.io/api/v1/image/assets/f274d4dcba504b51a1f43e4d05a455ef/e60b1648bb1f07f493ebeb31e36318c395066382?placeholderIfAbsent=true"
          className={`aspect-[1] object-contain w-5 self-stretch shrink-0 my-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
          alt="Dropdown"
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-[#0A1114] border border-[#28BFFF] rounded-2xl shadow-lg z-50 overflow-hidden">
          {challenges.map((challenge) => (
            <button
              key={challenge.id}
              onClick={() => {
                setSelectedChallenge(challenge);
                setIsOpen(false);
              }}
              className="w-full px-5 py-4 text-left hover:bg-[rgba(40,191,255,0.05)] border-b border-[#1A2328] last:border-b-0 flex items-center gap-3"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="text-[#E4EEF5] text-lg font-medium">{challenge.name}</span>
                  <span className="text-[#85A8C3] text-sm">{challenge.phase}</span>
                  <div className={`w-2 h-2 rounded-full ${challenge.status === 'active' ? 'bg-[#1BBF99]' : 'bg-[#456074]'}`} />
                </div>
                <span className="text-[#85A8C3] text-sm">{challenge.account}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
