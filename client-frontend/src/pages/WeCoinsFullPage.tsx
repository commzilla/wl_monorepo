import React, { useState, useEffect } from "react";
import { History, Gift, ListChecks, TrendingUp, Wifi } from "lucide-react";
import { TaskCard } from "@/components/wecoins/TaskCard";
import { ProgressSection } from "@/components/wecoins/ProgressSection";
import { TransactionsModal } from "@/components/wecoins/TransactionsModal";
import { RedemptionHistoryModal } from "@/components/wecoins/RedemptionHistoryModal";
import { SubmissionsModal } from "@/components/wecoins/SubmissionsModal";
import { RedeemItemsModal } from "@/components/wecoins/RedeemItemsModal";
import {
  fetchRewardTasks,
  fetchWeCoinWallet,
  WeCoinWallet,
  RewardTask,
  fetchRedemptionHistory,
  Redemption,
} from "@/utils/api";
import { useToast } from "@/hooks/use-toast";

const WeCoinsFullPage = () => {
  const [wallet, setWallet] = useState<WeCoinWallet | null>(null);
  const [tasks, setTasks] = useState<RewardTask[]>([]);
  const [redemptionHistory, setRedemptionHistory] = useState<Redemption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showRedemptionHistoryModal, setShowRedemptionHistoryModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showRedeemItemsModal, setShowRedeemItemsModal] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [walletData, tasksData, historyData] = await Promise.all([
        fetchWeCoinWallet(),
        fetchRewardTasks(),
        fetchRedemptionHistory(),
      ]);
      setWallet(walletData);
      setTasks(tasksData);
      setRedemptionHistory(historyData);
    } catch (error) {
      console.error("Failed to load WeCoins data:", error);
      toast({
        title: "Error loading data",
        description: "Failed to load WeCoins information. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTaskUpdate = () => {
    loadData();
  };

  const handleRedeemClose = () => {
    loadData();
    setShowRedeemItemsModal(false);
  };

  const isAnyModalOpen = showTransactionsModal || showRedemptionHistoryModal || showSubmissionsModal || showRedeemItemsModal;

  // Lock all scrolling when any modal is open
  useEffect(() => {
    if (!isAnyModalOpen) return;

    const scrollContainer = document.querySelector('.sidebar-scroll') as HTMLElement | null;

    // Block wheel and touch scroll on the entire window
    const preventScroll = (e: Event) => {
      // Allow scrolling inside modal content (the modal's own scrollable area)
      const target = e.target as HTMLElement;
      const modalContent = target.closest('.modal-scroll-content');
      if (modalContent) return;
      e.preventDefault();
    };

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });

    // Also force overflow hidden on all scrollable ancestors
    if (scrollContainer) {
      scrollContainer.style.setProperty('overflow', 'hidden', 'important');
    }

    return () => {
      window.removeEventListener('wheel', preventScroll);
      window.removeEventListener('touchmove', preventScroll);
      if (scrollContainer) {
        scrollContainer.style.removeProperty('overflow');
      }
    };
  }, [isAnyModalOpen]);

  if (isLoading) {
    return (
        <main className="flex flex-col min-h-full w-full bg-[#080808] border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-t border-solid md:border-l rounded-[16px_0px_0px_0px] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset]">
          <div className="flex items-center justify-center min-h-full">
            <div className="text-[#85A8C3] text-lg">Loading WeCoins...</div>
          </div>
        </main>
    );
  }

  return (
      <main className={`flex flex-col h-full w-full bg-[#080808] border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-t border-solid md:border-l rounded-[16px_0px_0px_0px] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] ${isAnyModalOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className="flex flex-col gap-6 px-4 py-6 md:px-8 md:py-8 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#E4EEF5] text-3xl md:text-4xl font-semibold tracking-[-1.08px] mb-2">WeCoins</h1>
              <p className="text-[#85A8C3] text-sm md:text-base">Complete tasks and earn rewards</p>
            </div>
          </div>

          {/* Balance Card and Quick Actions Row */}
          <div className="flex flex-col lg:flex-row gap-6 lg:justify-between items-center">
            {/* WeFund Balance Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A1A25] via-[#0D2030] to-[#0A1520] border border-[#28BFFF]/20 shadow-[0_8px_32px_rgba(40,191,255,0.15)] p-5 w-full lg:w-[280px] lg:min-w-[280px] h-[160px]">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-[#28BFFF]/20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#28BFFF]/10 blur-3xl" />
              </div>

              {/* Card Content */}
              <div className="relative z-10 flex flex-col h-full justify-between">
                {/* Top Row - Logo and Wifi */}
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#28BFFF]/10 border border-[#28BFFF]/30 flex items-center justify-center">
                    <img src="/logo.svg" alt="WeFund" className="w-5 h-5" />
                  </div>
                  <Wifi className="w-5 h-5 text-[#28BFFF]" />
                </div>

                {/* Balance Section */}
                <div>
                  <p className="text-[#85A8C3] text-xs uppercase tracking-wider mb-1">Available Balance</p>
                  <p className="text-[#E4EEF5] text-2xl font-bold tracking-tight">
                    {wallet ? parseFloat(wallet.balance).toLocaleString("en-US", { minimumFractionDigits: 0 }) : "0"}
                  </p>
                </div>

                {/* Bottom Row - Card Details */}
                <div className="flex items-center justify-between text-[#85A8C3] text-xs">
                  <span>WeCoins</span>
                  <span className="font-mono tracking-wider">••••</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3 w-full lg:w-[420px]">
              <button
                onClick={() => setShowTransactionsModal(true)}
                className="flex items-center justify-start gap-3 px-5 py-3 rounded-xl bg-[#0A1114] border border-[rgba(40,191,255,0.15)] hover:bg-[#0B1418] hover:border-[rgba(40,191,255,0.3)] transition-all duration-200 w-full"
              >
                <History className="w-5 h-5 text-[#28BFFF]" />
                <span className="text-sm font-medium text-[#E4EEF5]">Transactions</span>
              </button>

              <button
                onClick={() => setShowRedeemItemsModal(true)}
                className="flex items-center justify-start gap-3 px-5 py-3 rounded-xl bg-[#0A1114] border border-[rgba(40,191,255,0.15)] hover:bg-[#0B1418] hover:border-[rgba(40,191,255,0.3)] transition-all duration-200 w-full"
              >
                <Gift className="w-5 h-5 text-[#28BFFF]" />
                <span className="text-sm font-medium text-[#E4EEF5]">Redeem</span>
              </button>

              <button
                onClick={() => setShowRedemptionHistoryModal(true)}
                className="flex items-center justify-start gap-3 px-5 py-3 rounded-xl bg-[#0A1114] border border-[rgba(40,191,255,0.15)] hover:bg-[#0B1418] hover:border-[rgba(40,191,255,0.3)] transition-all duration-200 w-full"
              >
                <TrendingUp className="w-5 h-5 text-[#28BFFF]" />
                <span className="text-sm font-medium text-[#E4EEF5]">History</span>
              </button>

              <button
                onClick={() => setShowSubmissionsModal(true)}
                className="flex items-center justify-start gap-3 px-5 py-3 rounded-xl bg-[#0A1114] border border-[rgba(40,191,255,0.15)] hover:bg-[#0B1418] hover:border-[rgba(40,191,255,0.3)] transition-all duration-200 w-full"
              >
                <ListChecks className="w-5 h-5 text-[#28BFFF]" />
                <span className="text-sm font-medium text-[#E4EEF5]">Submissions</span>
              </button>
            </div>
          </div>

          {/* Progress Section */}
          {tasks.length > 0 && <ProgressSection tasks={tasks} />}

          {/* Available Tasks */}
          <div>
            <h2 className="text-[#E4EEF5] text-2xl font-semibold mb-4">Available Tasks</h2>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-[rgba(40,191,255,0.2)] bg-[rgba(40,191,255,0.03)]">
                <Gift className="w-16 h-16 text-[#28BFFF] mb-4 opacity-50" />
                <p className="text-[#85A8C3] text-center">No tasks available at the moment. Check back later!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onTaskUpdate={handleTaskUpdate} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showTransactionsModal && wallet && (
          <TransactionsModal wallet={wallet} onClose={() => setShowTransactionsModal(false)} />
        )}

        {showRedemptionHistoryModal && (
          <RedemptionHistoryModal history={redemptionHistory} onClose={() => setShowRedemptionHistoryModal(false)} />
        )}

        {showSubmissionsModal && <SubmissionsModal onClose={() => setShowSubmissionsModal(false)} />}

        {showRedeemItemsModal && wallet && (
          <RedeemItemsModal availableCoins={wallet.balance} onClose={handleRedeemClose} />
        )}
      </main>
  );
};

export default WeCoinsFullPage;
