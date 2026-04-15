import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaUsers, FaLink, FaClipboard, FaUserFriends, FaDollarSign, FaChartLine, FaUserCheck, FaPlus, FaExclamationTriangle, FaTable, FaSearch, FaFilter, FaCalendarAlt, FaTimes, FaArrowRight } from "react-icons/fa";

import { useAuth } from '@/contexts/AuthContext';
import { fetchAffiliateProfile, createAffiliateProfile, AffiliateProfile, CreateAffiliateProfileRequest, fetchAffiliateReferrals, AffiliateReferral, requestAffiliatePayout, PayoutRequest, fetchUserProfileSettings, ClientPaymentMethod } from '@/utils/api';
import { useToast } from '@/hooks/use-toast';

const AffiliateDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [affiliateData, setAffiliateData] = useState<AffiliateProfile | null>(null);
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateAffiliateProfileRequest>({
    website_url: '',
    promotion_strategy: ''
  });

  // Payout request state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [payoutFormData, setPayoutFormData] = useState<PayoutRequest>({
    amount: 100,
    payment_method_id: '',
    notes: ''
  });
  const [paymentMethods, setPaymentMethods] = useState<ClientPaymentMethod[]>([]);

  // New filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('-date_referred');

  const loadReferrals = async () => {
    try {
      setIsLoadingReferrals(true);
      const filters = {
        ...(statusFilter && { commission_status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(dateRange.start && { start_date: dateRange.start }),
        ...(dateRange.end && { end_date: dateRange.end }),
        ordering: sortBy,
      };
      
      console.log('Loading referrals with filters:', filters);
      const referralsData = await fetchAffiliateReferrals(1, 25, filters);
      console.log('Received referrals data:', referralsData);
      setReferrals(referralsData || []);
    } catch (referralsError) {
      console.error('Failed to load referrals:', referralsError);
      setReferrals([]);
    } finally {
      setIsLoadingReferrals(false);
    }
  };

  useEffect(() => {
    const loadAffiliateData = async () => {
      try {
        setIsLoading(true);
        const data = await fetchAffiliateProfile();
        setAffiliateData(data);
      } catch (err) {
        console.error('Failed to load affiliate data:', err);
        if (err instanceof Error && err.message.includes('404')) {
          setShowCreateForm(true);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load affiliate data');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAffiliateData();
  }, []);

  useEffect(() => {
    if (affiliateData) {
      loadReferrals();
      loadPaymentMethods();
    }
  }, [affiliateData, searchTerm, statusFilter, dateRange, sortBy]);

  const loadPaymentMethods = async () => {
    try {
      const userSettings = await fetchUserProfileSettings();
      setPaymentMethods(userSettings.payment_methods || []);
      
      // Set default payment method if available
      const defaultMethod = userSettings.payment_methods?.find(method => method.is_default);
      if (defaultMethod && !payoutFormData.payment_method_id) {
        setPayoutFormData(prev => ({ ...prev, payment_method_id: defaultMethod.id }));
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payoutFormData.payment_method_id) {
      setError('Please select a payment method');
      return;
    }

    if (payoutFormData.amount < 100) {
      setError('Minimum withdrawal amount is $100');
      return;
    }

    if (payoutFormData.amount > (affiliateData?.wallet_balance || 0)) {
      setError('Insufficient wallet balance');
      return;
    }

    try {
      setIsRequestingPayout(true);
      setError(null);
      
      await requestAffiliatePayout(payoutFormData);
      
      // Refresh affiliate data to update wallet balance
      const updatedData = await fetchAffiliateProfile();
      setAffiliateData(updatedData);
      
      setShowPayoutModal(false);
      setPayoutFormData({ amount: 100, payment_method_id: '', notes: '' });
      
      // Show beautiful success toast
      toast({
        title: "Success! 🎉",
        description: "Payout request submitted successfully! We'll process your request and notify you of the status.",
        duration: 5000,
      });
    } catch (error) {
      console.error('Failed to request payout:', error);
      setError(error instanceof Error ? error.message : 'Failed to request payout');
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.promotion_strategy.trim()) {
      setError('Promotion strategy is required');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      const newProfile = await createAffiliateProfile(formData);
      setAffiliateData(newProfile);
      setShowCreateForm(false);
    } catch (err) {
      console.error('Failed to create affiliate profile:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('500')) {
          setError('We\'re experiencing technical difficulties creating your affiliate profile. Please try again later or contact support if the issue persists.');
        } else if (err.message.includes('400')) {
          setError('Please check your information and try again. Make sure all required fields are filled out correctly.');
        } else if (err.message.includes('401') || err.message.includes('403')) {
          setError('You don\'t have permission to create an affiliate profile. Please contact support for assistance.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to create affiliate profile. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const generateAffiliateLink = (code: string) => {
    return `https://we-fund.com/?ref=${code}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const safeAmount = Number(amount || 0);
    return `$${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: AffiliateReferral['commission_status']) => {
    const statusConfig = {
      pending: { color: '#FFC107', bg: 'rgba(255,193,7,0.2)', label: 'Pending' },
      approved: { color: '#28A745', bg: 'rgba(40,167,69,0.2)', label: 'Approved' },
      processing: { color: '#17A2B8', bg: 'rgba(23,162,184,0.2)', label: 'Processing' },
      rejected: { color: '#DC3545', bg: 'rgba(220,53,69,0.2)', label: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span 
        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: config.bg, color: config.color }}
      >
        ● {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-[#85A8C3]">Loading affiliate data...</div>
        </div>
      </main>
    );
  }

  if (showCreateForm) {
    return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-20 rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:px-5">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#28BFFF]/20 to-[#4EC1FF]/5 shadow-[inset_0_-8px_32px_rgba(78,193,255,0.1)] mb-6">
              <FaUserFriends className="w-10 h-10 text-[#28BFFF]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-[#E4EEF5] mb-4 tracking-tight">
              Join Our Affiliate Program
            </h1>
            <p className="text-lg text-[#85A8C3] max-w-2xl mx-auto">
              Turn your network into revenue. Earn generous commissions by sharing We-Fund with your audience.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#0A1114]/80 backdrop-blur-sm rounded-xl p-6 border border-[#28BFFF]/10 hover:border-[#28BFFF]/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(40,191,255,0.1)]">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#28BFFF]/20 to-transparent flex items-center justify-center mb-4">
                <FaDollarSign className="w-6 h-6 text-[#28BFFF]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold text-lg mb-2">Generous Commissions</h3>
              <p className="text-[#85A8C3] text-sm">
                Earn competitive rates for every successful referral that becomes a funded trader
              </p>
            </div>

            <div className="bg-[#0A1114]/80 backdrop-blur-sm rounded-xl p-6 border border-[#28BFFF]/10 hover:border-[#28BFFF]/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(40,191,255,0.1)]">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#28BFFF]/20 to-transparent flex items-center justify-center mb-4">
                <FaChartLine className="w-6 h-6 text-[#28BFFF]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold text-lg mb-2">Real-Time Tracking</h3>
              <p className="text-[#85A8C3] text-sm">
                Monitor your referrals, earnings, and performance metrics from your dashboard
              </p>
            </div>

            <div className="bg-[#0A1114]/80 backdrop-blur-sm rounded-xl p-6 border border-[#28BFFF]/10 hover:border-[#28BFFF]/30 transition-all duration-300 hover:shadow-[0_0_30px_rgba(40,191,255,0.1)]">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#28BFFF]/20 to-transparent flex items-center justify-center mb-4">
                <FaLink className="w-6 h-6 text-[#28BFFF]" />
              </div>
              <h3 className="text-[#E4EEF5] font-semibold text-lg mb-2">Easy Sharing</h3>
              <p className="text-[#85A8C3] text-sm">
                Get your unique referral link and share it anywhere - social media, email, or website
              </p>
            </div>
          </div>

          {/* Main Form Card */}
          <div className="bg-[#0A1114]/60 backdrop-blur-md rounded-2xl border border-[#28BFFF]/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-[#28BFFF]/10 to-transparent px-8 py-6 border-b border-[#28BFFF]/10">
              <h2 className="text-2xl font-semibold text-[#E4EEF5] mb-2">
                Get Started in Minutes
              </h2>
              <p className="text-[#85A8C3]">
                Tell us a bit about yourself and how you plan to promote We-Fund
              </p>
            </div>

            {/* Form Content */}
            <div className="px-8 py-8">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <FaExclamationTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-red-400 font-medium mb-1">Error</div>
                      <div className="text-red-300 text-sm">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateProfile} className="space-y-8">
                {/* Website URL */}
                <div className="space-y-2">
                  <label className="block text-[#E4EEF5] text-sm font-medium">
                    Website URL <span className="text-[#85A8C3] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    placeholder="https://your-website.com"
                    className="w-full px-4 py-3.5 bg-[#080808]/80 border border-[#28BFFF]/20 rounded-xl text-[#E4EEF5] placeholder-[#85A8C3]/50 focus:outline-none focus:border-[#28BFFF] focus:ring-2 focus:ring-[#28BFFF]/20 transition-all duration-200"
                  />
                  <p className="text-[#85A8C3] text-xs">
                    Share your website, blog, or social media profile where you'll promote We-Fund
                  </p>
                </div>

                {/* Promotion Strategy */}
                <div className="space-y-2">
                  <label className="block text-[#E4EEF5] text-sm font-medium">
                    How Will You Promote We-Fund? <span className="text-[#28BFFF]">*</span>
                  </label>
                  <textarea
                    value={formData.promotion_strategy}
                    onChange={(e) => setFormData({ ...formData, promotion_strategy: e.target.value })}
                    placeholder="Tell us about your audience and promotion plans...&#10;&#10;Examples:&#10;• Social media marketing (Instagram, YouTube, TikTok)&#10;• Email newsletters to trading community&#10;• Blog posts and SEO content&#10;• Paid advertising campaigns&#10;• Trading forums and communities"
                    rows={6}
                    required
                    className="w-full px-4 py-3.5 bg-[#080808]/80 border border-[#28BFFF]/20 rounded-xl text-[#E4EEF5] placeholder-[#85A8C3]/50 focus:outline-none focus:border-[#28BFFF] focus:ring-2 focus:ring-[#28BFFF]/20 transition-all duration-200 resize-vertical"
                  />
                  <p className="text-[#85A8C3] text-xs">
                    Be specific about your marketing channels and audience size to help us support you better
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-[#28BFFF]/5 border border-[#28BFFF]/20 rounded-xl p-4">
                  <div className="flex gap-3">
                    <FaUserCheck className="w-5 h-5 text-[#28BFFF] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[#E4EEF5] font-medium text-sm mb-1">Quick Review Process</h4>
                      <p className="text-[#85A8C3] text-xs leading-relaxed">
                        We review all applications to ensure quality. You'll receive your unique referral link within 24-48 hours once approved.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isCreating}
                  className="group w-full relative px-8 py-4 text-base font-semibold bg-gradient-to-r from-[#28BFFF] to-[#4EC1FF] hover:from-[#4EC1FF] hover:to-[#28BFFF] text-white rounded-xl shadow-lg shadow-[#28BFFF]/25 hover:shadow-xl hover:shadow-[#28BFFF]/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isCreating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Your Profile...
                      </>
                    ) : (
                      <>
                        Join Affiliate Program
                        <FaArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center mt-8">
            <p className="text-[#85A8C3] text-sm">
              Questions? Contact our affiliate support team at{' '}
              <a href="mailto:affiliates@we-fund.com" className="text-[#28BFFF] hover:underline">
                affiliates@we-fund.com
              </a>
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-400 mb-2">Error loading affiliate data</div>
            <div className="text-[#85A8C3] text-sm">{error}</div>
          </div>
        </div>
      </main>
    );
  }

  if (!affiliateData) {
    return (
      <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-[#E4EEF5] mb-2">Affiliate profile not found</div>
            <div className="text-[#85A8C3] text-sm">Please contact support to set up your affiliate account.</div>
          </div>
        </div>
      </main>
    );
  }

  const affiliateLink = generateAffiliateLink(affiliateData.referral_code);

  return (
    <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-60 flex-col overflow-hidden grow shrink w-full min-h-full bg-[#080808] px-8 pt-10 pb-[305px] rounded-[16px_0px_0px_0px] border-t border-solid border-l max-md:max-w-full max-md:pb-[100px] max-md:px-5">
      <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full mb-8">
        <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
            <FaUsers className="w-6 h-6 text-[#28BFFF]" />
          </div>
          <h1 className="text-[#E4EEF5] self-stretch my-auto">
            Affiliate Dashboard
          </h1>
        </div>
        {affiliateData?.approved ? (
          <button
            onClick={() => setShowPayoutModal(true)}
            className="bg-[#28BFFF] hover:bg-[#28BFFF]/90 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <FaDollarSign className="w-4 h-4" />
            Request Payout
          </button>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-2">
            <span className="text-yellow-400 text-sm">Pending Approval</span>
          </div>
        )}
      </header>

      {/* Affiliate Link & Code */}
      <section className="mb-10 flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-[#0A1114] rounded-xl p-6 border border-[#28BFFF]/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#85A8C3] text-sm">
            <FaLink className="text-[#28BFFF]" />
            Your Affiliate Link
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#E4EEF5] font-mono text-base break-all">{affiliateLink}</span>
            <button
              onClick={() => handleCopy(affiliateLink)}
              className="ml-2 px-2 py-1 rounded bg-[#28BFFF]/10 text-[#28BFFF] hover:bg-[#28BFFF]/20"
              title="Copy link"
            >
              <FaClipboard />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-[#0A1114] rounded-xl p-6 border border-[#28BFFF]/10 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#85A8C3] text-sm">
            <FaUserCheck className="text-[#28BFFF]" />
            Your Affiliate Code
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#E4EEF5] font-mono text-base">{affiliateData.referral_code}</span>
            <button
              onClick={() => handleCopy(affiliateData.referral_code)}
              className="ml-2 px-2 py-1 rounded bg-[#28BFFF]/10 text-[#28BFFF] hover:bg-[#28BFFF]/20"
              title="Copy code"
            >
              <FaClipboard />
            </button>
          </div>
        </div>
        {/* Tracking Info Note */}
        <div className="bg-[#0A1114] rounded-lg px-4 py-3 border border-[#28BFFF]/10 flex items-start gap-3">
          <span className="text-[#28BFFF] mt-0.5 text-sm shrink-0">i</span>
          <p className="text-[#85A8C3] text-xs leading-relaxed">
            <span className="text-[#E4EEF5] font-medium">30-day cookie window</span> — When someone clicks your link, a tracking cookie is stored in their browser for 30 days. If they purchase within that period, the sale is attributed to you. Tracking is browser-based, so if the customer switches to a different device or browser to complete their purchase, the referral may not be tracked. Note: links opened inside in-app browsers (Instagram, TikTok, Facebook, etc.) use a separate browser session — if the customer then switches to their main browser to complete the purchase, the referral may be lost.
          </p>
        </div>
      </section>

      {/* Wallet Balance Section */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center gap-4 p-6 rounded-lg border border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] backdrop-blur-sm">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg border border-[#28BFFF]/40 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <FaDollarSign className="w-6 h-6 text-[#28BFFF]" />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <div className="text-sm text-[#85A8C3] font-normal tracking-[-0.42px] leading-normal">
                Current Balance
              </div>
              <div className="text-2xl text-[#E4EEF5] font-medium tracking-[-0.72px] leading-normal">
                {formatCurrency(affiliateData.wallet_balance || 0)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-6 rounded-lg border border-[#28BFFF]/20 bg-gradient-to-b from-[rgba(26,106,140,0.15)] to-[rgba(11,25,29,0.15)] backdrop-blur-sm">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg border border-[#28BFFF]/40 bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <FaChartLine className="w-6 h-6 text-[#28BFFF]" />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <div className="text-sm text-[#85A8C3] font-normal tracking-[-0.42px] leading-normal">
                Lifetime Earned
              </div>
              <div className="text-2xl text-[#E4EEF5] font-medium tracking-[-0.72px] leading-normal">
                {formatCurrency(affiliateData.wallet_total_earned || 0)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Grid */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-4 p-5 rounded-lg border border-cyan-400 bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-cyan-400/5 border border-cyan-400">
              <FaUserFriends className="w-6 h-6 text-[#28BFFF]" />
            </div>
            <div>
              <div className="text-[#85A8C3] text-sm">Total Referrals</div>
              <div className="text-[#E4EEF5] text-2xl font-medium">{affiliateData.total_referrals || 0}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-lg border border-cyan-400 bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-cyan-400/5 border border-cyan-400">
              <FaUserCheck className="w-6 h-6 text-[#1BBF99]" />
            </div>
            <div>
              <div className="text-[#85A8C3] text-sm">Active Referrals</div>
              <div className="text-[#E4EEF5] text-2xl font-medium">{affiliateData.active_referrals || 0}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-lg border border-cyan-400 bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-cyan-400/5 border border-cyan-400">
              <FaDollarSign className="w-6 h-6 text-[#FFD700]" />
            </div>
            <div>
              <div className="text-[#85A8C3] text-sm">Total Earnings</div>
              <div className="text-[#E4EEF5] text-2xl font-medium">{formatCurrency(affiliateData.total_earnings)}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-lg border border-cyan-400 bg-gradient-to-b from-[rgba(21,56,71,0.15)] to-[rgba(14,30,35,0.15)]">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-cyan-400/5 border border-cyan-400">
              <FaChartLine className="w-6 h-6 text-[#50D5FF]" />
            </div>
            <div>
              <div className="text-[#85A8C3] text-sm">Conversion Rate</div>
              <div className="text-[#E4EEF5] text-2xl font-medium">{affiliateData.conversion_rate || 0}%</div>
            </div>
          </div>
        </div>
      </section>

      {/* Earnings Breakdown */}
      <section className="mb-12">
        <div className="bg-[#0A1114] rounded-xl border border-[#28BFFF]/10 p-6">
          <h2 className="text-[#E4EEF5] text-xl font-medium mb-6">Earnings Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#080808] rounded-lg p-4 border border-[#28BFFF]/5">
              <div className="text-[#28A745] text-sm font-medium mb-1">Approved</div>
              <div className="text-[#E4EEF5] text-xl font-medium">{formatCurrency(affiliateData.approved_earnings)}</div>
            </div>
            <div className="bg-[#080808] rounded-lg p-4 border border-[#28BFFF]/5">
              <div className="text-[#17A2B8] text-sm font-medium mb-1">Processing</div>
              <div className="text-[#E4EEF5] text-xl font-medium">{formatCurrency(affiliateData.processing_earnings)}</div>
            </div>
            <div className="bg-[#080808] rounded-lg p-4 border border-[#28BFFF]/5">
              <div className="text-[#FFC107] text-sm font-medium mb-1">Pending</div>
              <div className="text-[#E4EEF5] text-xl font-medium">{formatCurrency(affiliateData.pending_earnings)}</div>
            </div>
            <div className="bg-[#080808] rounded-lg p-4 border border-[#28BFFF]/5">
              <div className="text-[#DC3545] text-sm font-medium mb-1">Rejected</div>
              <div className="text-[#E4EEF5] text-xl font-medium">{formatCurrency(affiliateData.rejected_earnings)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Payouts */}
      {affiliateData.recent_payouts && affiliateData.recent_payouts.length > 0 && (
        <section className="mb-12">
          <div className="bg-[#0A1114] rounded-xl border border-[#28BFFF]/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#E4EEF5] text-xl font-medium">Recent Payouts</h2>
              <Link
                to="/affiliate/wallet-transactions"
                className="flex items-center gap-2 text-[#28BFFF] hover:text-[#28BFFF]/80 text-sm transition-colors"
              >
                View All Transactions
                <FaArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-4">
              {affiliateData.recent_payouts.map((payout) => (
                <div key={payout.id} className="bg-[#080808] rounded-lg p-4 border border-[#28BFFF]/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
                      <FaDollarSign className="w-5 h-5 text-[#28BFFF]" />
                    </div>
                    <div>
                      <div className="text-[#E4EEF5] text-sm font-medium">{formatCurrency(payout.amount)}</div>
                      <div className="text-[#85A8C3] text-xs">Requested on {formatDate(payout.requested_at)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#E4EEF5] text-sm capitalize">{payout.status}</div>
                    {payout.processed_at && (
                      <div className="text-[#85A8C3] text-xs">Processed {formatDate(payout.processed_at)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sales Transaction Table */}
      <section className="mb-12">
        <div className="bg-[#0A1114] rounded-xl border border-[#28BFFF]/10">
          <div className="flex items-center justify-between p-6 border-b border-[#28BFFF]/10">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
                <FaTable className="w-5 h-5 text-[#28BFFF]" />
              </div>
              <h2 className="text-[#E4EEF5] text-xl font-medium">Sales Transactions</h2>
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FaSearch className="w-4 h-4 text-[#85A8C3]" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#080808] border border-[#28BFFF]/20 rounded-lg px-3 py-2 text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:border-[#28BFFF] w-48"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <FaFilter className="w-4 h-4 text-[#85A8C3]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#080808] border border-[#28BFFF]/20 rounded-lg px-3 py-2 text-[#E4EEF5] focus:outline-none focus:border-[#28BFFF]"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="processing">Processing</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <FaCalendarAlt className="w-4 h-4 text-[#85A8C3]" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="bg-[#080808] border border-[#28BFFF]/20 rounded-lg px-3 py-2 text-[#E4EEF5] focus:outline-none focus:border-[#28BFFF]"
                />
                <span className="text-[#85A8C3]">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="bg-[#080808] border border-[#28BFFF]/20 rounded-lg px-3 py-2 text-[#E4EEF5] focus:outline-none focus:border-[#28BFFF]"
                />
              </div>
            </div>
          </div>

          {isLoadingReferrals ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#28BFFF]"></div>
              <span className="ml-3 text-[#85A8C3]">Loading transactions...</span>
            </div>
          ) : !referrals || referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-[rgba(40,191,255,0.1)] flex items-center justify-center">
                <FaTable className="w-8 h-8 text-[#28BFFF]" />
              </div>
              <p className="text-[#85A8C3] text-lg mb-2">No transactions found</p>
              <p className="text-[#85A8C3] text-sm">
                {searchTerm || statusFilter || dateRange.start || dateRange.end
                  ? 'Try adjusting your filters or search terms'
                  : 'Start sharing your referral link to see your sales transactions here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#28BFFF]/10">
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">
                      <button
                        onClick={() => setSortBy(sortBy === 'referred_user__email' ? '-referred_user__email' : 'referred_user__email')}
                        className="hover:text-[#28BFFF] transition-colors"
                      >
                        Referred User
                      </button>
                    </th>
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">
                      <button
                        onClick={() => setSortBy(sortBy === 'date_referred' ? '-date_referred' : 'date_referred')}
                        className="hover:text-[#28BFFF] transition-colors"
                      >
                        Date
                      </button>
                    </th>
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">Challenge</th>
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">
                      <button
                        onClick={() => setSortBy(sortBy === 'commission_amount' ? '-commission_amount' : 'commission_amount')}
                        className="hover:text-[#28BFFF] transition-colors"
                      >
                        Commission
                      </button>
                    </th>
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">Status</th>
                    <th className="text-left p-4 text-[#85A8C3] text-sm font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id} className="border-b border-[#28BFFF]/5 hover:bg-[rgba(40,191,255,0.02)]">
                      <td className="p-4 text-[#E4EEF5] text-sm">{referral.referred_user_email}</td>
                      <td className="p-4 text-[#E4EEF5] text-sm">{formatDate(referral.date_referred)}</td>
                      <td className="p-4 text-[#E4EEF5] text-sm">{referral.challenge_name}</td>
                      <td className="p-4 text-[#28A745] text-sm font-medium">{formatCurrency(referral.commission_amount)}</td>
                      <td className="p-4">{getStatusBadge(referral.commission_status)}</td>
                      <td className="p-4 text-[#85A8C3] text-sm">{referral.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      
      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A1114] rounded-xl border border-[#28BFFF]/10 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#E4EEF5] text-xl font-medium">Request Payout</h2>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-[#85A8C3] hover:text-[#E4EEF5] transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-red-400 font-medium mb-1">Error</div>
                    <div className="text-red-300 text-sm">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handlePayoutRequest} className="space-y-6">
              <div>
                <label className="block text-[#E4EEF5] text-sm font-medium mb-2">
                  Amount (USD) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="100"
                  max={affiliateData?.wallet_balance || 0}
                  step="0.01"
                  value={payoutFormData.amount}
                  onChange={(e) => setPayoutFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 bg-[#080808] border border-[#28BFFF]/20 rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:border-[#28BFFF] focus:ring-1 focus:ring-[#28BFFF]"
                  placeholder="100.00"
                  required
                />
                <p className="text-[#85A8C3] text-sm mt-1">
                  Available balance: {formatCurrency(affiliateData?.wallet_balance || 0)} | Minimum: $100
                </p>
              </div>

              <div>
                <label className="block text-[#E4EEF5] text-sm font-medium mb-2">
                  Payment Method <span className="text-red-400">*</span>
                </label>
                <select
                  value={payoutFormData.payment_method_id}
                  onChange={(e) => setPayoutFormData(prev => ({ ...prev, payment_method_id: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#080808] border border-[#28BFFF]/20 rounded-lg text-[#E4EEF5] focus:outline-none focus:border-[#28BFFF] focus:ring-1 focus:ring-[#28BFFF]"
                  required
                >
                  <option value="">Select payment method</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.payment_type === 'rise' && method.rise_email}
                      {method.payment_type === 'crypto' && `${method.crypto_type?.toUpperCase()} Wallet`}
                      {method.label && ` (${method.label})`}
                      {method.is_default && ' - Default'}
                    </option>
                  ))}
                </select>
                {paymentMethods.length === 0 && (
                  <p className="text-yellow-400 text-sm mt-1">
                    No payment methods found. Please add a payment method in Settings first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[#E4EEF5] text-sm font-medium mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={payoutFormData.notes}
                  onChange={(e) => setPayoutFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#080808] border border-[#28BFFF]/20 rounded-lg text-[#E4EEF5] placeholder-[#85A8C3] focus:outline-none focus:border-[#28BFFF] focus:ring-1 focus:ring-[#28BFFF] resize-vertical"
                  placeholder="Add any additional notes for this payout request..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 px-4 py-3 text-[#85A8C3] hover:text-[#E4EEF5] transition-colors border border-[#28BFFF]/20 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRequestingPayout || paymentMethods.length === 0}
                  className="flex-1 bg-[#28BFFF] hover:bg-[#28BFFF]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {isRequestingPayout ? 'Requesting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

export const AffiliatePage: React.FC = () => {
  return <AffiliateDashboard />;
};
