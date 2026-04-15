import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { FileText, Upload, AlertCircle, CheckCircle, X, ChevronDown } from 'lucide-react';
import { fetchActiveChallenges, submitEAApproval, ChallengeEnrollment } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const SubmitEAPage: React.FC = () => {
  const { t } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [activeChallenges, setActiveChallenges] = useState<ChallengeEnrollment[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState<ChallengeEnrollment | null>(null);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
  const [showEnrollmentDropdown, setShowEnrollmentDropdown] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    loadActiveChallenges();
  }, []);

  const loadActiveChallenges = async () => {
    if (!user) return;
    
    setIsLoadingChallenges(true);
    try {
      const challenges = await fetchActiveChallenges();
      setActiveChallenges(challenges);
      if (challenges.length > 0) {
        setSelectedEnrollment(challenges[0]);
      }
    } catch (error) {
      console.error('Error loading active challenges:', error);
      toast.error('Failed to load active challenges');
    } finally {
      setIsLoadingChallenges(false);
    }
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const mq5Files = files.filter(file => file.name.endsWith('.mq5'));
    
    if (files.length !== mq5Files.length) {
      toast.error('Only .mq5 files are allowed');
      return;
    }
    
    setUploadedFiles(prev => [...prev, ...mq5Files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedEnrollment || uploadedFiles.length === 0) {
      toast.error('Please select an enrollment and upload at least one .mq5 file');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit each file separately (as per Django backend logic)
      for (const file of uploadedFiles) {
        await submitEAApproval(selectedEnrollment.id, file);
      }
      
      setSubmitSuccess(true);
      toast.success('EA submission successful!');
    } catch (error) {
      console.error('Error submitting EA:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit EA';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <main className="items-stretch border-t-[color:var(--border-cards-border,rgba(40,191,255,0.05))] border-l-[color:var(--border-cards-border,rgba(40,191,255,0.05))] shadow-[2px_2px_16px_0px_rgba(0,0,0,0.12)_inset] flex min-w-0 flex-col overflow-hidden grow bg-[#080808] w-full max-w-[1600px] mx-auto px-4 md:px-8 pt-10 pb-24 md:pb-40 rounded-[16px_0px_0px_0px] border-t border-solid md:border-l">
        <header className="flex w-full items-center justify-between flex-wrap max-md:max-w-full">
          <div className="self-stretch flex min-w-60 items-center gap-2 text-[32px] text-[#E4EEF5] font-medium whitespace-nowrap tracking-[-0.96px] flex-wrap flex-1 shrink basis-7 my-auto max-md:max-w-full">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-[rgba(40,191,255,0.05)] shadow-[inset_0_-8px_32px_rgba(78,193,255,0.06)]">
              <FileText 
                size={29}
                color="#4EC1FF"
              />
            </div>
            <h1 className="text-[#E4EEF5] self-stretch my-auto">
              {t('submitEA.title')}
            </h1>
          </div>
        </header>

        <section className="mt-12 max-md:max-w-full max-md:mt-10">
          {submitSuccess ? (
            <div className="bg-[#101A1F] rounded-xl p-8 border border-[color:var(--border-primary-color,#3AB3FF)]/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#1BBF99]/20 flex items-center justify-center">
                  <CheckCircle size={24} className="text-[#1BBF99]" />
                </div>
                <div>
                  <h2 className="text-[#E4EEF5] text-xl font-semibold">{t('submitEA.submissionSuccessful')}</h2>
                  <p className="text-[#85A8C3]">{t('submitEA.submissionSuccess')}</p>
                </div>
              </div>
              <p className="text-[#85A8C3] mb-6">
                {t('submitEA.submissionMessage')}
              </p>
              <button
                onClick={() => {
                  setSubmitSuccess(false);
                  setUploadedFiles([]);
                }}
                className="text-[#E4EEF5] bg-[color:var(--border-primary-color,#3AB3FF)] shadow-[0px_3px_1px_0px_rgba(255,255,255,0.35)_inset] px-6 py-3 rounded-lg font-semibold hover:bg-[rgba(58,179,255,0.1)] transition-colors"
              >
                {t('submitEA.submitAnother')}
              </button>
            </div>
          ) : (
            <div className="bg-[#101A1F] rounded-xl p-8 border border-[rgba(40,191,255,0.1)]">
              {/* Challenge Selection */}
              {isLoadingChallenges ? (
                <div className="mb-8">
                  <p className="text-[#85A8C3]">Loading active challenges...</p>
                </div>
              ) : activeChallenges.length === 0 ? (
                <div className="mb-8 p-6 bg-[#1A2633] rounded-lg border border-[rgba(255,193,7,0.3)]">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={24} className="text-[#FFC107]" />
                    <div>
                      <h3 className="text-[#E4EEF5] font-semibold">No Active Challenges</h3>
                      <p className="text-[#85A8C3]">You need an active challenge enrollment to submit an EA.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-8">
                  <h3 className="text-[#E4EEF5] text-lg font-medium mb-4">Select Challenge Enrollment</h3>
                  <div className="relative">
                    <button
                      onClick={() => setShowEnrollmentDropdown(!showEnrollmentDropdown)}
                      className="w-full p-4 bg-[#1A2633] rounded-lg border border-[rgba(40,191,255,0.1)] text-left flex items-center justify-between hover:border-[color:var(--border-primary-color,#3AB3FF)] transition-colors"
                    >
                      <div>
                        <p className="text-[#E4EEF5] font-medium">
                          {selectedEnrollment?.challenge_name} - ${parseFloat(selectedEnrollment?.account_size || '0').toLocaleString()}
                        </p>
                        <p className="text-[#85A8C3] text-sm">MT5 Account: {selectedEnrollment?.mt5_account_id}</p>
                      </div>
                      <ChevronDown size={20} className={`text-[#85A8C3] transition-transform ${showEnrollmentDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showEnrollmentDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A2633] rounded-lg border border-[rgba(40,191,255,0.1)] shadow-lg z-10 max-h-60 overflow-y-auto">
                        {activeChallenges.map((enrollment) => (
                          <button
                            key={enrollment.id}
                            onClick={() => {
                              setSelectedEnrollment(enrollment);
                              setShowEnrollmentDropdown(false);
                            }}
                            className="w-full p-4 text-left hover:bg-[rgba(40,191,255,0.05)] transition-colors first:rounded-t-lg last:rounded-b-lg"
                          >
                            <p className="text-[#E4EEF5] font-medium">
                              {enrollment.challenge_name} - ${parseFloat(enrollment.account_size).toLocaleString()}
                            </p>
                            <p className="text-[#85A8C3] text-sm">MT5 Account: {enrollment.mt5_account_id}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-8">
                <h2 className="text-[#E4EEF5] text-xl font-semibold mb-4">Upload Your EA Documents</h2>
                <p className="text-[#85A8C3] mb-6">
                  Please upload all necessary documents for your Expert Advisor submission. This may include strategy descriptions, backtest results, risk management documentation, and any other relevant files.
                </p>
                
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-[rgba(40,191,255,0.3)] rounded-xl p-8 text-center hover:border-[color:var(--border-primary-color,#3AB3FF)] transition-colors">
                  <Upload size={48} className="text-[#4EC1FF] mx-auto mb-4" />
                  <h3 className="text-[#E4EEF5] text-lg font-medium mb-2">Drop files here or click to upload</h3>
                  <p className="text-[#85A8C3] mb-4">Support for .mq5 Expert Advisor files only</p>
                  <input
                    type="file"
                    multiple
                    accept=".mq5"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="text-[#E4EEF5] bg-[color:var(--border-primary-color,#3AB3FF)] shadow-[0px_3px_1px_0px_rgba(255,255,255,0.35)_inset] px-6 py-3 rounded-lg font-semibold hover:bg-[rgba(58,179,255,0.1)] transition-colors cursor-pointer inline-block"
                  >
                    Choose Files
                  </label>
                </div>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-[#E4EEF5] text-lg font-medium mb-4">Uploaded Files</h3>
                  <div className="space-y-3">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-[#1A2633] rounded-lg border border-[rgba(40,191,255,0.1)]"
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={20} className="text-[#4EC1FF]" />
                          <div>
                            <p className="text-[#E4EEF5] font-medium">{file.name}</p>
                            <p className="text-[#85A8C3] text-sm">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
                        >
                          <X size={16} className="text-[#85A8C3]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedEnrollment || uploadedFiles.length === 0 || isSubmitting}
                  className={`text-[#E4EEF5] px-8 py-3 rounded-lg font-semibold transition-colors ${
                    !selectedEnrollment || uploadedFiles.length === 0 || isSubmitting
                      ? 'bg-[#2A3A4A] text-[#5A6A7A] cursor-not-allowed'
                      : 'bg-[color:var(--border-primary-color,#3AB3FF)] shadow-[0px_3px_1px_0px_rgba(255,255,255,0.35)_inset] hover:bg-[rgba(58,179,255,0.1)]'
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                </button>
              </div>
            </div>
          )}
        </section>
    </main>
  );
};

export default SubmitEAPage;
