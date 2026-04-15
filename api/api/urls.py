from django.urls import path, include
from django.contrib import admin
from rest_framework.routers import DefaultRouter
from api import rbac_views
from .views import (
    AddTraderView,
    ChallengeEnrollmentListView,
    ChallengeProductViewSet,
    ClientKYCListView,
    CopyTradingDetectView,
    CountryListView,
    FindSimilarAccountsView,
    HedgingDetectView,
    HedgingFindSimilarView,
    SuperuserJWTLoginView,
    TraderListView,
    WooCommerceOrderWebhookView,
    AdminOrderListView,
    UserProfileView,
    MyProfileView,
    AdminOrderDeleteView,
    ChallengeViewSet, 
    ChallengePhaseViewSet,
    OfferViewSet,
    TraderViewSet,
    MT5TradeViewSet,
    MT5AccountListView,
    issue_certificate_view,
    TraderPayoutViewSet,
    Certificate2ViewSet,
    PayoutConfigurationViewSet,
    AdminTokenRefreshView,
    GlobalNotificationViewSet,
    CustomNotificationViewSet,
    AllNotificationViewSet,
    RiskDashboardOverviewView,
    RiskDashboardSoftBreachesView,
    RiskDashboardHardBreachesView,
    RiskDashboardRevertedBreachesView,
    AdminAffiliateWalletView,
    AdminAffiliateWalletTransactionListView,
    AdminAffiliateReferralViewSet,
    AdminAffiliatePayoutViewSet,
    AdminAffiliateDashboardView,
    TraderPayoutDetailView,
    AdminDashboardAPIView,
    ReviewChallengeEnrollmentView,
    EnrollmentOpenTradesView,
    CloseEnrollmentTradesView,
    AccountMetricsView,
    AccountFundsView,
    BlockAccountView,
    ChallengeAccountsView,
    EATradingBotRequestAdminViewSet,
    AffiliateCommissionTierViewSet,
    AffiliateUserViewSet,
    OrderAffiliateDetailView,
    OrderAffiliateAssignView,
    TraderPayoutActionView,
    ChallengeEnrollmentViewSet,
    ClientDropdownViewSet,
    EnrollmentEventListView,
    ChallengePhaseGroupMappingViewSet,
    ChallengePhaseOptionsView,
    MigrationToolUploadView,
    EnrollmentTransitionLogListView,
    AccountDetailsView,
    MT5AccountTradesViewSet,
    PayoutComplianceAnalysisView,
    ChallengeAnalyticsView,
    PayoutAnalyticsView,
    OrderAnalyticsView,
    TradeAnalyticsView,
    ClientKYCViewSet,
    SMTPTestView,
    InternalNoteViewSet,
    PayoutPolicyViewSet,
    PayoutSplitTierViewSet,
    SuperUserProfileView,
    SuperUserPasswordChangeView,
    MigrationLogListView,
    MigrationSendEmailView,
    RevertBreachAndActivateView,
    PeriodicTaskListView,
    PeriodicTaskToggleView,
    PeriodicTaskEditView,
    EnrollmentSnapshotsView,
    ResetTraderPasswordView,
    ResetAffiliatePasswordView,
    IPSummaryView,
    AccountsByIPView,
    EnrollmentManualBreachScanView,
    AdminUserViewSet,
    ImpersonateUserView,
    CertificateTemplateViewSet,
    EnrollmentPayoutConfigView,
    EnrollmentPayoutHistoryView,
    BulkPayoutConfigImportView,
    ManualRiseInviteView,
    TriggerPayoutAnalysisView,
    GenerateTraderPasswordView,
    ChallengeEnrollmentDropdownViewSet,
    AdminAccountPnLView,
    AdminTraderPaymentMethodsView,
    AdminCreatePayoutView,
    AdminManualEnrollmentPayoutView,
    EnrollmentBreachHistoryView,
    ActivateTradingView,
    DisableTradingView,
    EnableAccountView,
    DisableAccountView,
    ChangeGroupView,
    ChangePasswordView,
    RetryMT5AccountCreationView,
    ManualCertificateGenerateView,
    ManualPayoutCertificateGenerateView,
    PayoutLookupByEmailView,
    MT5TradeListView,
    MT5ClosedTradesSyncCheckView,
    ActivityLogListView,
    ActivityLogDetailView,
    TraderPayoutExtendReviewView,
    TopEarningTradersView,
    MT5MigrationAPIView,
    MT5MigrationLogsAPIView,
    RewardTaskViewSet,
    RewardSubmissionViewSet,
    AutoRewardRuleViewSet,
    RedeemItemViewSet,
    WeCoinWalletViewSet,
    MT5TradeResyncView,
    AffiliateManagementViewSet,
    AdminAffiliateManagerViewSet,
    AdminAssignReferralCodeView,
    ScheduledNotificationViewSet,
    NotificationImageUploadView,
    TraderBreakdownView,
    WeCoinsBetaAdminViewSet,
    StopLossHistoryAdminViewSet,
    AdminAssignAffiliateTierView,
    TopAffiliatesView,
    EventLogViewSet,
    RedeemDashboardViewSet,
    RedemptionActionViewSet,
    AdminResetTokenConfigView,
    AdminResetTokenViewSet,
    BulkRevertBreachAndActivateView,
    BetaFeatureAdminViewSet,
    ChallengeWisePayoutsView,
    AccountSizeWisePayoutsView,
    CountryWisePayoutsView,
    UnprofitableCountriesView,
    RiskCoreMetricsView,
    TrendsAnalyticsView,
    TraderBehaviorAnalyticsView,
    OrderPassBreachAnalyticsView,
    EnrollmentEventLogListView,
    ManualEnrollmentStatusUpdateView,
    RunRiskScanAPIView,
    RunPayoutAIAnalysisView,
    RiskEngineReportView,
    GetPayoutAIAnalysisView,
    RunPayoutConsistencyCheckView,
    ExportChallengeEnrollmentCSVView,
    AdminCompetitionViewSet,
    AdminCompetitionStatusListView,
    AdminCompetitionRegistrationsView,
    AdminCompetitionLeaderboardView,
    AdminCompetitionLeaderboardExportCSV,
    LiveCompetitionLeaderboardView,
    AdminLeaderboardManagementView,
    AdminLeaderboardTraderUpdateView,
    CompetitionsBetaAdminViewSet,
    AIRiskAnalysisView,
    AIRiskReviewFeedbackView,
    AIRiskReportExportView,
    AILearningStatsView,
    AILearningAnalysesView,
    AILearningTrainingListView,
    AILearningTrainingApproveView,
    AILearningTrainingRejectView,
    ConvertAffiliateToClientView,
    OrderExportCSVView,
    EconomicEventViewSet,
    TradingReportViewSet,
    AdminTraderPaymentMethodListCreateView,
    AdminTraderPaymentMethodDetailView,
    AdminCreateAffiliateProfileForTraderView,
    admin_user_event_logs,
    admin_user_wecoins_overview
)
from . import swagger_urls
from rest_framework_simplejwt.views import TokenRefreshView
from api.client_views import ClientLoginView, ClientTokenRefreshView, ClientDashboardInitView, ClientProfileSettingsView, ActiveOffersView, ClientDashboardView, LeaderboardView, MyStatsView, CertificateViewSet, WithdrawalAPIView, TradingResultView  
from api.client_views import (
    ClientNotificationListView,
    ClientNotificationDetailView,
    MarkNotificationReadView,
    ClientNotificationDeleteView,
    MonthlyPnlSummaryView,
    DailyPnlDetailView,
    OpenTradesView,
    EligibleAccountsView,
    ClientPaymentMethodListView,
    RequestTraderPayoutView,
    ClientActiveChallengesView,
    EAApprovalRequestView,
    ClientChallengeEnrollmentListView,
    PasswordResetRequestView, 
    PasswordResetConfirmView,
    ImpersonateExchangeView,
    PasswordChangeView,
    ClientRewardTasksView,
    ClientRewardSubmissionCreateView,
    ClientRewardSubmissionsView,
    ClientRedeemItemListView,
    ClientRedeemItemRedeemView,
    ClientRedemptionHistoryView,
    ClientWeCoinWalletView,
    WeCoinsAccessView,
    ClientEligibleResetView,
    ClientPurchaseResetTokenView,
    ClientResetTokenListView,
    RegistrationRequestView,
    OTPVerificationView,
    CompleteRegistrationView,
    TraderCompetitionsHubView,
    TraderCompetitionDetailView,
    TraderJoinCompetitionView,
    ClientCompetitionLeaderboardTableView,
    CompetitionsAccessView
)
from api.client_views import AffiliateProfileView, AffiliateReferralListView, AffiliateFunnelStatsView, AffiliatePayoutRequestView, AffiliateWalletTransactionListView, PayoutHistoryByAccountView
from django.conf import settings
from django.conf.urls.static import static
from . import views
from api.admin_trader_profile import trader_full_profile
from . import woocommerce_webhook as wc_webhook
from api.rise import rise_webhook_view
from api.engine_supervisor import SupervisorStatusView, SupervisorControlView
from api.sse_views import EnrollmentManualBreachScanSSEView
from api.admin_ai_views import (
    AdminAIChatStreamView,
    AdminAIChatStartView,
    AdminAIChatConfirmView,
    AdminAIConversationListView,
    AdminAIConversationDetailView,
    AdminAIConfigView,
    AdminAIFeedbackViewSet,
    AdminAITrainingExampleViewSet,
)
from api.monitoring_views import (
    APIAnalyticsView,
    clear_old_logs,
    export_logs
)
from api.generic_wordpress_views import (
    JWTTokenGeneratorView,
    JWTTokenRefreshView,
    GenericOrderProcessingView,
    PluginHealthCheckView,
    test_plugin_endpoint,
    plugin_documentation_view,
    get_universal_postman_collection
)
from .bulk_import import BulkChallengeEnrollmentImportView
from .payout_export import ExportPayoutCSVView
from wefund.ai_risk.policy_manager import AIRiskRuleViewSet
from .system_tool import SystemVersionView
from .health_views import SystemHealthView
from .journal_views import (
    JournalDashboardView,
    JournalEntryListView,
    JournalEntryDetailView,
    JournalEntryBulkUpdateView,
    JournalScreenshotUploadView,
    TradeTagListCreateView,
    TradeTagDetailView,
    TagCategoryListView,
    TradingSessionListCreateView,
    TradingSessionDetailView,
    JournalCalendarView,
    SymbolPerformanceView,
    TimePerformanceView,
    TagPerformanceView,
    EquityCurveView,
    MFEMAEAnalysisView,
    ComplianceDashboardView,
    WinLossDistributionView,
    HoldingTimeView,
    MonteCarloView,
    StreakAnalysisView,
    AIDailySummaryView,
    AIChatView,
    AIReportView,
    AIPatternDetectionView,
    AIWhatIfView,
    MentorAccessListCreateView,
    MentorAccessRevokeView,
    SharedJournalView,
    JournalShareLinkCreateView,
    JournalShareLinkListView,
    JournalShareLinkDeactivateView,
    PublicSharedJournalView,
)
from .certificate_views import PublicCertificateVerifyView
from .blog_views import BlogPostAdminViewSet, BlogCategoryAdminViewSet, BlogTagAdminViewSet, BlogPostPublicListView, BlogPostPublicDetailView, BlogCategoryPublicListView, BlogSitemapView
from .blog_ai import BlogAIGenerateView, BlogImageUploadView
from .email_views import EmailTemplateViewSet, EmailLogViewSet
from .zoho_export_views import (
    AccountingOrdersExportView,
    AccountingCustomersExportView,
    AccountingInvoicesExportView,
    AccountingPaymentsExportView,
)
from .zoho_sync_views import (
    ZohoSyncTriggerView,
    ZohoSyncStatusView,
    ZohoSyncHistoryView,
)
from .website_views import (
    WebsiteProductCatalogView,
    ValidateDiscountView,
    PAPCheckoutDetailsView,
    WebsiteOrderCreateView,
    CreatePaymentView,
    PaytikoWebhookView,
    ConfirmoWebhookView,
    PayPalCaptureView,
    PayPalWebhookView,
    WebsiteOrderStatusView,
    WebsiteProductAdminViewSet,
    WebsiteProductVariantAdminViewSet,
    WebsiteProductAddonAdminViewSet,
    DiscountCodeAdminViewSet,
    WebsiteOrderAdminViewSet,
    WebsiteOrderExportCSVView,
)
from .meeting_views import (
    MeetingProfilePublicView,
    MeetingAvailableSlotsView,
    MeetingBookingCreateView,
    MeetingBookingDetailView,
    MeetingBookingCancelView,
    MeetingGuestTokenView,
    AdminMeetingProfileView,
    AdminMeetingAvailabilityView,
    AdminMeetingOverridesView,
    AdminMeetingBookingsView,
    AdminMeetingBookingUpdateView,
    AdminMeetingBookingCreateByAdminView,
    AdminMeetingHostTokenView,
    AdminInstantMeetingView,
    AdminGoogleAuthURLView,
    AdminGoogleCallbackView,
    AdminGoogleDisconnectView,
)
from .support_views import (
    SupportChatViewSet,
    SupportFAQViewSet,
    AdminSupportConversationViewSet,
    AdminSupportAIConfigView,
    AdminSupportAgentsView,
    AdminMentionNotificationsView,
    AdminMarkMentionReadView,
    AdminFAQCollectionViewSet,
    AdminFAQArticleViewSet,
    AdminFAQImportView,
    AdminSupportAIFeedbackViewSet,
    SupportAttachmentUploadView,
    AdminWidgetConfigurationView,
    AdminWidgetCustomizationView,
    SupportWidgetScriptView,
    AdminShiftScheduleView,
    AdminShiftScheduleDetailView,
    AdminShiftOverrideView,
    AdminShiftOverrideDetailView,
    AdminOnDutyView,
    GuestSupportChatViewSet,
    GuestWidgetScriptView,
)
from .release_views import ReleaseViewSet, GitLogView
from .whatsapp_webhook import whatsapp_inbound_webhook, whatsapp_status_webhook, whatsapp_voice_webhook
from .email_webhook import inbound_email_webhook
from .whatsapp_views import WhatsAppConversationViewSet, WhatsAppBotConfigView

router = DefaultRouter()
router.register(r'admin/traders', TraderViewSet, basename='admin-traders')
router.register(r'challenge-products', ChallengeProductViewSet, basename='challengeproduct')
router.register(r"challenges", ChallengeViewSet, basename="challenge")
router.register(r"challenge-phases", ChallengePhaseViewSet, basename="challengephase")
router.register(r"admin/clients-dropdown", ClientDropdownViewSet, basename="clients-dropdown")
router.register(r'admin/challenge-enrollment-dropdown', ChallengeEnrollmentDropdownViewSet, basename='challenge-enrollment-dropdown')
router.register(r"admin/challenge/enrollments", ChallengeEnrollmentViewSet, basename="challenge-enrollment")
router.register(r"admin/challenge/group-mappings", ChallengePhaseGroupMappingViewSet, basename="group-mapping")
router.register(r'admin/kyc-management', ClientKYCViewSet, basename='kyc')
router.register(r'offers', OfferViewSet, basename='offer')
router.register(r'mt5-trades', MT5TradeViewSet, basename='mt5-trades')
router.register(r'payouts', TraderPayoutViewSet, basename='trader-payout')
router.register(r'certificates', CertificateViewSet, basename='certificate')
router.register(r'certificates2', Certificate2ViewSet, basename='2certificate')
router.register("admin/stoploss-history", StopLossHistoryAdminViewSet, basename="admin-stoploss-history")
router.register(r"admin/payout-policies", PayoutPolicyViewSet, basename="payout-policy")
router.register(r"admin/payout-split-tiers", PayoutSplitTierViewSet, basename="payout-split-tier")
router.register(r'payout-configs', PayoutConfigurationViewSet, basename='payout-config')
router.register(r'notifications/global', GlobalNotificationViewSet, basename='global-notifications')
router.register(r'notifications/custom', CustomNotificationViewSet, basename='custom-notifications')
router.register(r'notifications/all', AllNotificationViewSet, basename='all-notifications')
router.register("admin/scheduled-notifications", ScheduledNotificationViewSet, basename="scheduled-notifications")
router.register(r'admin-affiliate-referrals', AdminAffiliateReferralViewSet, basename='admin-affiliate-referrals')
router.register(r'admin/affiliate/payouts', AdminAffiliatePayoutViewSet, basename='admin-affiliate-payouts')
router.register(r"admin/ea-requests", EATradingBotRequestAdminViewSet, basename="ea-requests-admin")
router.register(r"admin/affiliate-tiers", AffiliateCommissionTierViewSet, basename="affiliate-tier")
router.register(r"admin/affiliates", AffiliateUserViewSet, basename="affiliate-user")
router.register(r"admin/affiliate-manager", AdminAffiliateManagerViewSet, basename="admin-affiliate")
router.register("admin/affiliate-management", AffiliateManagementViewSet, basename="affiliate-management")
router.register(r"admin/internal-notes", InternalNoteViewSet, basename="internal-note")
router.register(r"admin/user-management", AdminUserViewSet, basename="admin-users")
router.register(r"admin/certificate-templates", CertificateTemplateViewSet, basename="certificate-template")
router.register("admin/wecoins/access", WeCoinsBetaAdminViewSet, basename="wecoins-beta-admin")
router.register('admin/reward/auto-rules', AutoRewardRuleViewSet, basename='auto-reward-rule')
router.register('admin/reward/tasks', RewardTaskViewSet, basename='reward-task')
router.register('admin/reward/submissions', RewardSubmissionViewSet, basename='reward-submission')
router.register('admin/reward/redeem-items', RedeemItemViewSet, basename='redeem-item')
router.register('admin/reward/redeem-dashboard', RedeemDashboardViewSet, basename='redeem-dashboard')
router.register('admin/reward/redemption-actions', RedemptionActionViewSet, basename='redemption-actions')
router.register('admin/reward/wallets', WeCoinWalletViewSet, basename='wecoin-wallet')
router.register('admin/wecoins/reset-tokens', AdminResetTokenViewSet, basename='admin-reset-tokens')
router.register(r"admin/event-logs", EventLogViewSet, basename="event-logs")
router.register("admin/beta-features", BetaFeatureAdminViewSet, basename="beta-features")
router.register("admin/competitions-beta", CompetitionsBetaAdminViewSet, basename="competitions-beta-admin")
router.register("admin/competitions", AdminCompetitionViewSet, basename="admin-competitions")
router.register(r"admin/ai-risk-rules", AIRiskRuleViewSet, basename="ai-risk-rule")
router.register(r"admin/economic-calendar", EconomicEventViewSet, basename="economic-calendar")
router.register(r"admin/trading-reports", TradingReportViewSet, basename="trading-reports")
router.register(r"admin/releases", ReleaseViewSet, basename="releases")

# Admin AI Assistant endpoints
router.register(r'admin/ai-assistant/feedback', AdminAIFeedbackViewSet, basename='admin-ai-feedback')
router.register(r'admin/ai-assistant/training-examples', AdminAITrainingExampleViewSet, basename='admin-ai-training')

# Support Chat Widget endpoints
router.register(r'admin/blog/posts', BlogPostAdminViewSet, basename='admin-blog-posts')
router.register(r'admin/blog/categories', BlogCategoryAdminViewSet, basename='admin-blog-categories')
router.register(r'admin/blog/tags', BlogTagAdminViewSet, basename='admin-blog-tags')
router.register(r'support/chat', SupportChatViewSet, basename='support-chat')
router.register(r'support/guest-chat', GuestSupportChatViewSet, basename='support-guest-chat')
router.register(r'support/faq', SupportFAQViewSet, basename='support-faq')
router.register(r'admin/support/conversations', AdminSupportConversationViewSet, basename='admin-support-conversations')
router.register(r'admin/support/faq/collections', AdminFAQCollectionViewSet, basename='admin-faq-collections')
router.register(r'admin/support/faq/articles', AdminFAQArticleViewSet, basename='admin-faq-articles')
router.register(r'admin/support/feedback', AdminSupportAIFeedbackViewSet, basename='admin-support-feedback')
router.register(r'admin/whatsapp/conversations', WhatsAppConversationViewSet, basename='admin-whatsapp-conversations')
router.register(r'admin/email-templates', EmailTemplateViewSet, basename='admin-email-templates')
router.register(r'admin/email-logs', EmailLogViewSet, basename='admin-email-logs')

account_trades = MT5AccountTradesViewSet.as_view({'get': 'list'})
 
urlpatterns = [
     path('', include(router.urls)),                # DRF router endpoints
    path('', include(swagger_urls.urlpatterns)),   # Swagger endpoints
    path('auth/admin/login/', SuperuserJWTLoginView.as_view(), name='superuser-jwt-login'),
    path('auth/admin/refresh/', AdminTokenRefreshView.as_view(), name='admin_token_refresh'),

    # RBAC
    path('admin/roles/', rbac_views.RoleListCreateView.as_view(), name='rbac-role-list'),
    path('admin/roles/<uuid:pk>/', rbac_views.RoleDetailView.as_view(), name='rbac-role-detail'),
    path('admin/permissions/', rbac_views.PermissionListView.as_view(), name='rbac-permission-list'),
    path('auth/permissions/me/', rbac_views.MyPermissionsView.as_view(), name='rbac-my-permissions'),
    path('countries/', CountryListView.as_view(), name='country-list'),
    path('', include(router.urls)),
    path('add-trader/', AddTraderView.as_view(), name='add-trader'),
    path("admin/reset-trader-password/", ResetTraderPasswordView.as_view(), name="reset-trader-password"),
    path("admin/reset-affiliate-password/", ResetAffiliatePasswordView.as_view(), name="reset-affiliate-password"),
    path("admin/users/generate-password/", GenerateTraderPasswordView.as_view(), name="generate-trader-password"),
    path("traders/", TraderListView.as_view(), name="trader-list"),
    path('admin/dashboard/', AdminDashboardAPIView.as_view(), name='admin-dashboard'),
    path('challenge-enrollments/', ChallengeEnrollmentListView.as_view(), name='challenge-enrollment-list'),
    path("admin/export-challenge-enrollments/", ExportChallengeEnrollmentCSVView.as_view(), name="export-challenge-enrollments"),
    path('kyc-verifications/', ClientKYCListView.as_view(), name='kyc-verification-list'),
    path(
        'webhooks/woocommerce/order/',
        WooCommerceOrderWebhookView.as_view(),
        name='woocommerce-order-webhook'
    ),
    path('admin/orders/', AdminOrderListView.as_view(), name='admin-order-list'),
    path('admin/payouts/<uuid:id>/', TraderPayoutDetailView.as_view(), name='trader-payout-detail'),
    path("admin/ai-risk-analysis/<uuid:payout_id>/", AIRiskAnalysisView.as_view(), name="admin-ai-risk-analysis"),
    path("admin/ai-risk-analysis/feedback/<uuid:analysis_id>/", AIRiskReviewFeedbackView.as_view()),
    path("admin/ai-risk-report/<uuid:payout_id>/", AIRiskReportExportView.as_view()),

    # AI Learning Center endpoints
    path("admin/ai-risk-learning/stats/", AILearningStatsView.as_view(), name="ai-learning-stats"),
    path("admin/ai-risk-learning/analyses/", AILearningAnalysesView.as_view(), name="ai-learning-analyses"),
    path("admin/ai-risk-learning/training/", AILearningTrainingListView.as_view(), name="ai-learning-training"),
    path("admin/ai-risk-learning/training/<uuid:analysis_id>/approve/", AILearningTrainingApproveView.as_view(), name="ai-learning-training-approve"),
    path("admin/ai-risk-learning/training/<uuid:analysis_id>/reject/", AILearningTrainingRejectView.as_view(), name="ai-learning-training-reject"),

    path('admin/trader-payouts/action/<uuid:id>/', TraderPayoutActionView.as_view(), name='trader-payout-action'),
    path('admin/payouts/<uuid:id>/extend-review/', TraderPayoutExtendReviewView.as_view(), name='admin-payout-extend-review'),
    path('mt5-trades/accounts/', MT5AccountListView.as_view(), name='mt5-account-list'),
    
    path("admin/traders/payment-methods/<uuid:trader_id>/", AdminTraderPaymentMethodListCreateView.as_view(), name="admin-trader-payment-methods"),
    path("admin/traders/payment-methods/<uuid:trader_id>/<uuid:method_id>/", AdminTraderPaymentMethodDetailView.as_view(), name="admin-trader-payment-method-detail"),
    path("admin/traders/<uuid:trader_id>/affiliate-profile/", AdminCreateAffiliateProfileForTraderView.as_view(), name="admin-create-affiliate-profile-for-trader"),
    path("admin/users/event-logs/<uuid:user_id>/", admin_user_event_logs, name="admin-user-event-logs"),
    path("admin/users/wecoins/<uuid:user_id>/", admin_user_wecoins_overview, name="admin-user-wecoins-overview"),
    path('admin/wecoins/reset-tokens/config/', AdminResetTokenConfigView.as_view(), name='admin-reset-token-config'),

    path("admin/risk-scan/", RunRiskScanAPIView.as_view(), name="run-risk-scan"),
    path("admin/run-ai-analysis/", RunPayoutAIAnalysisView.as_view(), name="run_ai_analysis"),
    path("admin/risk-engine/payout-report/", RiskEngineReportView.as_view(), name="risk_engine_report"),
    path("admin/payout-report/ai-analysis/<uuid:payout_id>/", GetPayoutAIAnalysisView.as_view(), name="payout_ai_analysis"),
    path("admin/payout-report/run-consistency/<uuid:payout_id>/", RunPayoutConsistencyCheckView.as_view()),

    path("admin/export-csv/payout/", ExportPayoutCSVView.as_view(), name="export-payouts-csv"),
    path("admin/export-csv/orders/", OrderExportCSVView.as_view(), name="order-export-csv"),

    # Zoho Accounting Exports
    path("admin/zoho-export/orders/", AccountingOrdersExportView.as_view(), name="accounting-export-orders"),
    path("admin/zoho-export/customers/", AccountingCustomersExportView.as_view(), name="accounting-export-customers"),
    path("admin/zoho-export/invoices/", AccountingInvoicesExportView.as_view(), name="accounting-export-invoices"),
    path("admin/zoho-export/payments/", AccountingPaymentsExportView.as_view(), name="accounting-export-payments"),

    # Zoho Sync (async Celery-based sync)
    path("admin/zoho-sync/trigger/", ZohoSyncTriggerView.as_view(), name="zoho-sync-trigger"),
    path("admin/zoho-sync/status/<str:job_id>/", ZohoSyncStatusView.as_view(), name="zoho-sync-status"),
    path("admin/zoho-sync/history/", ZohoSyncHistoryView.as_view(), name="zoho-sync-history"),

    # Release Notes & Git Log
    path("admin/git-log/", GitLogView.as_view(), name="admin-git-log"),

    path("admin/payouts/lookup/", PayoutLookupByEmailView.as_view(), name="admin-payout-lookup"),

    path("admin/certificates/manual-generate/challenge/", ManualCertificateGenerateView.as_view(), name="manual-certificate-generate"),
    path("admin/certificates/manual-generate/payout/", ManualPayoutCertificateGenerateView.as_view(), name="manual-payout-certificate-generate"),
    
    path("utils/test-smtp/", SMTPTestView.as_view(), name="smtp-test"),
    path("superuser/profile/", SuperUserProfileView.as_view(), name="superuser-profile"),
    path("superuser/change-password/", SuperUserPasswordChangeView.as_view(), name="superuser-change-password"),
    
    path('auth/profile/<uuid:id>/', UserProfileView.as_view(), name='user-profile'),
    path('auth/profile/me/', MyProfileView.as_view(), name='my-profile'),
    path('orders/<int:id>/delete/', AdminOrderDeleteView.as_view(), name='admin-order-delete'),

    path('admin/rise/manual-invite/', ManualRiseInviteView.as_view(), name='manual-rise-invite'),

    path("admin/payouts/trigger-analysis/", TriggerPayoutAnalysisView.as_view(), name="trigger-payout-analysis"),
    
    path('admin/orders/<int:pk>/affiliate/', OrderAffiliateDetailView.as_view(), name='order-affiliate-detail'),
    path('admin/orders/<int:pk>/affiliate/assign/', OrderAffiliateAssignView.as_view(), name='order-affiliate-assign'),
    
    path("rise-status/", rise_webhook_view, name="rise-webhook"),
    
    path('admin/traders/<uuid:trader_id>/full-profile/', trader_full_profile, name='trader-full-profile'),
    path("admin/enrollments/review/<uuid:enrollment_id>/", ReviewChallengeEnrollmentView.as_view(), name="review-challenge-enrollment"),
    path("admin/enrollments/open-trades/<uuid:enrollment_id>/", EnrollmentOpenTradesView.as_view(), name="enrollment-open-trades"),
    path("admin/enrollments/close-trades/<uuid:enrollment_id>/", CloseEnrollmentTradesView.as_view(), name="enrollment-close-trades"),
    path("admin/enrollments/metrics/<uuid:enrollment_id>/", AccountMetricsView.as_view(), name="account-metrics"),
    path("admin/enrollments/funds/<uuid:enrollment_id>/", AccountFundsView.as_view(), name="enrollment-funds"),
    path("admin/enrollments/block/<uuid:enrollment_id>/", BlockAccountView.as_view(), name="block-enrollment"),
    path("admin/enrollments/accounts/<uuid:enrollment_id>/", ChallengeAccountsView.as_view(), name="challenge-accounts"),
    path("admin/enrollments/snapshots/<uuid:enrollment_id>/", EnrollmentSnapshotsView.as_view(), name="enrollment-snapshots"),
    path("admin/enrollments/payout-config/<uuid:enrollment_id>/", EnrollmentPayoutConfigView.as_view(), name="enrollment-payout-config"),
    path("admin/enrollments/payout-history/<uuid:enrollment_id>/", EnrollmentPayoutHistoryView.as_view(), name="enrollment-payout-history"),
    path("admin/enrollments/manual-payout/<uuid:enrollment_id>/", AdminManualEnrollmentPayoutView.as_view(), name="admin-manual-enrollment-payout"),
    path("admin/enrollments/breach-history/<uuid:enrollment_id>/", EnrollmentBreachHistoryView.as_view(), name="admin-enrollment-breach-history"),
    path("admin/enrollments/events/<uuid:enrollment_id>/", EnrollmentEventListView.as_view(), name="enrollment-events"),
    path("admin/enrollments/logs/<uuid:enrollment_id>/", EnrollmentTransitionLogListView.as_view(), name="enrollment-transition-logs"),
    path("admin/enrollments/account/details/<uuid:enrollment_id>/", AccountDetailsView.as_view(), name="account-details"),
    path("admin/enrollments/manual-breach-scan/<uuid:enrollment_id>/", EnrollmentManualBreachScanView.as_view(), name="enrollment-manual-breach-scan"),
    path("admin/enrollments/manual-breach-scan-sse/<uuid:enrollment_id>/", EnrollmentManualBreachScanSSEView.as_view(), name="enrollment-manual-breach-scan_sse"),
    path("admin/enrollments/event-logs/<uuid:enrollment_id>/", EnrollmentEventLogListView.as_view(), name="enrollment-event-logs"),
    path("admin/enrollments/manual-upgrade/<uuid:enrollment_id>/", ManualEnrollmentStatusUpdateView.as_view(), name="manual-enrollment-upgrade"),
    path("admin/challenges/bulk-import/", BulkChallengeEnrollmentImportView.as_view(), name="challenge-bulk-import"),

    path("admin/mt5-trades/", MT5TradeListView.as_view(), name="mt5-trade-list"),
    path("admin/mt5-trades/mt5-api/", MT5ClosedTradesSyncCheckView.as_view(), name="mt5-trades-sync-check"),
    path("admin/mt5/resync-trades/", MT5TradeResyncView.as_view(), name="mt5-trade-resync"),

    path("admin/mt5/activate-trading/", ActivateTradingView.as_view(), name="mt5-activate-trading"),
    path("admin/mt5/disable-trading/", DisableTradingView.as_view(), name="mt5-disable-trading"),
    path("admin/mt5/enable-account/", EnableAccountView.as_view(), name="mt5-enable-account"),
    path("admin/mt5/disable-account/", DisableAccountView.as_view(), name="mt5-disable-account"),
    path("admin/mt5/change-group/", ChangeGroupView.as_view(), name="mt5-change-group"),
    path("admin/mt5/change-password/", ChangePasswordView.as_view(), name="mt5-change-password"),
    path("admin/mt5/retry-create-account/", RetryMT5AccountCreationView.as_view(), name="mt5-retry-create-account"),

    path("admin/account/pnl/", AdminAccountPnLView.as_view(), name="admin-account-pnl"),
    path("admin/trader/payment-methods/", AdminTraderPaymentMethodsView.as_view(), name="admin-trader-payment-methods"),
    path("admin/trader/create-payout/", AdminCreatePayoutView.as_view(), name="admin-create-payout"),
    
    path("mt5-trades/account/<int:account_id>/", account_trades, name="account-trades"),
    
    path("challenge-phases/options/", ChallengePhaseOptionsView.as_view(), name="challenge-phase-options"),
    
    path('admin/migration/upload-csv/', MigrationToolUploadView.as_view(), name='migration-upload-csv'),
    
    path('admin/affiliate/dashboard/', AdminAffiliateDashboardView.as_view(), name='admin-affiliate-dashboard'),
    path('admin/affiliate/wallet/', AdminAffiliateWalletView.as_view(), name='admin-affiliate-wallet'),
    path('admin/affiliate/wallet/transactions/', AdminAffiliateWalletTransactionListView.as_view(), name='admin-affiliate-wallet-transactions'),
    path("admin/affiliate/top/", TopAffiliatesView.as_view(), name="top-affiliates"),
    
    path("admin/affiliate/assign-referral-code/", AdminAssignReferralCodeView.as_view(), name="admin-assign-referral-code"),
    path("api/admin/affiliate/tier/assign/", AdminAssignAffiliateTierView.as_view(), name="admin-assign-affiliate-tier"),
    path("admin/affiliate/convert-to-client/", ConvertAffiliateToClientView.as_view()),

    path("payouts/compliance-analysis/<uuid:payout_id>/", PayoutComplianceAnalysisView.as_view(), name="payout-compliance-analysis"),
    
    path("admin/analytics/challenges/", ChallengeAnalyticsView.as_view(), name="challenge-analytics"),
    path("admin/analytics/payouts/", PayoutAnalyticsView.as_view(), name="payout-analytics"),
    path("admin/analytics/orders/", OrderAnalyticsView.as_view(), name="order-analytics"),
    path("admin/analytics/trades/", TradeAnalyticsView.as_view(), name="trade-analytics"),

    path("admin/analytics/challenge-wise-payouts/", ChallengeWisePayoutsView.as_view()),
    path("admin/analytics/account-size-wise-payouts/", AccountSizeWisePayoutsView.as_view()),
    path("admin/analytics/country-wise-payouts/", CountryWisePayoutsView.as_view()),
    path("admin/analytics/unprofitable-countries/", UnprofitableCountriesView.as_view()),
    path("admin/analytics/risk/core-metrics/", RiskCoreMetricsView.as_view()),
    path("admin/analytics/trends/", TrendsAnalyticsView.as_view()),
    path("admin/analytics/trader-behavior/", TraderBehaviorAnalyticsView.as_view()),
    path("admin/analytics/orders-pass-breach/", OrderPassBreachAnalyticsView.as_view()),
    
    path("admin/migration/logs/", MigrationLogListView.as_view(), name="migration_logs"),
    path("admin/migration/send-emails/", MigrationSendEmailView.as_view(), name="migration_send_emails"),

    path("admin/migration/mt5-broker/", MT5MigrationAPIView.as_view(), name="mt5-migration"),
    path("admin/migration/mt5-broker/logs/", MT5MigrationLogsAPIView.as_view(), name="mt5-migration-logs"),

    path("admin/enrollments/import-payout-configs/", BulkPayoutConfigImportView.as_view(), name="import-payout-configs"),

    path("admin/revert-breach/<int:breach_id>/", RevertBreachAndActivateView.as_view(), name="revert-breach-activate"),
    path("admin/breaches/revert-bulk/", BulkRevertBreachAndActivateView.as_view(), name="bulk_revert_breaches"),
    
    path("admin/risk-dashboard/overview/", RiskDashboardOverviewView.as_view(), name="risk-dashboard-overview"),
    path("admin/risk-dashboard/soft-breaches/", RiskDashboardSoftBreachesView.as_view(), name="risk-dashboard-soft"),
    path("admin/risk-dashboard/hard-breaches/", RiskDashboardHardBreachesView.as_view(), name="risk-dashboard-hard"),
    path("admin/risk-dashboard/reverted-breaches/", RiskDashboardRevertedBreachesView.as_view(), name="risk-dashboard-reverted"),
    
    path("admin/risk-dashboard/ip-summary/", IPSummaryView.as_view(), name="ip-summary"),
    path("admin/risk-dashboard/ip-accounts/<str:ip>/", AccountsByIPView.as_view(), name="ip-accounts"),
    path("admin/risk/top-earning-traders/", TopEarningTradersView.as_view(), name="top-earning-traders"),
    path("admin/risk/traders/breakdown/<uuid:user_id>/", TraderBreakdownView.as_view(), name="trader-breakdown"),

    path("admin/risk/copy-trading/detect/", CopyTradingDetectView.as_view(), name="copy-trading-detect"),
    path("admin/risk/copy-trading/find-similar/", FindSimilarAccountsView.as_view(), name="copy-trading-find-similar"),
    path("admin/risk/hedging/detect/", HedgingDetectView.as_view(), name="hedging-detect"),
    path("admin/risk/hedging/find-similar/", HedgingFindSimilarView.as_view(), name="hedging-find-similar"),

    path("engine/tasks/", PeriodicTaskListView.as_view(), name="engine_task_list"),
    path("engine/tasks/<int:pk>/toggle/", PeriodicTaskToggleView.as_view(), name="engine_task_toggle"),
    path("engine/tasks/<int:pk>/edit/", PeriodicTaskEditView.as_view(), name="engine_task_edit"),
    
    path("engine/supervisor/status/", SupervisorStatusView.as_view(), name="supervisor_status"),
    path("engine/supervisor/<str:process_name>/<str:action>/", SupervisorControlView.as_view(), name="supervisor_control"),
    
    path("wc-webhook/status/", wc_webhook.get_webhook_status, name="wc_webhook_status"),
    path("wc-webhook/enable/", wc_webhook.enable_webhook, name="wc_webhook_enable"),
    path("wc-webhook/disable/", wc_webhook.disable_webhook, name="wc_webhook_disable"),

    path("api/system/version/", SystemVersionView.as_view(), name="system-version"),
    path("api/health/", SystemHealthView.as_view(), name="system-health"),
    
    path("certificates/issue/<uuid:enrollment_id>/", issue_certificate_view, name="issue-certificate"),
    
    path("cert-preview/", views.certificate_preview_view, name="certificate_preview"),
    path("cert-preview/render/", views.certificate_render_api, name="certificate_render_api"),
    
    # Universal WordPress Plugin API Endpoints (Works with ANY plugin)
    path('plugin/generate-token/', JWTTokenGeneratorView.as_view(), name='plugin-generate-token'),
    path('plugin/refresh-token/', JWTTokenRefreshView.as_view(), name='plugin-refresh-token'),
    path('plugin/order/process/', GenericOrderProcessingView.as_view(), name='plugin-order-process'),
    path('plugin/health/', PluginHealthCheckView.as_view(), name='plugin-health'),
    path('plugin/test/', test_plugin_endpoint, name='plugin-test'),
    path('plugin/docs/', plugin_documentation_view, name='plugin-docs'),
    path('plugin/postman-collection/', get_universal_postman_collection, name='plugin-postman-collection'),
    
    # API Monitoring and Analytics Endpoints
    path('admin/api/analytics/', APIAnalyticsView.as_view(), name='api-analytics'),
    path('admin/api/logs/clear/', clear_old_logs, name='clear-old-logs'),
    path('admin/api/logs/export/', export_logs, name='export-logs'),
    
    path("admin/impersonate/", ImpersonateUserView.as_view(), name="impersonate-user"),
    path("client/impersonate/exchange/", ImpersonateExchangeView.as_view(), name="impersonate-exchange"),

    path("admin/competitions/manage/", AdminCompetitionStatusListView.as_view(), name="admin-competitions-status-wise"),
    path("admin/competitions/registrations/<uuid:competition_id>/", AdminCompetitionRegistrationsView.as_view(), name="admin-competition-registrations"),
    path("admin/competitions/leaderboard/<uuid:competition_id>/", AdminCompetitionLeaderboardView.as_view(), name="admin-competition-leaderboard"),
    path("admin/competitions/leaderboard/export-csv/<uuid:competition_id>/", AdminCompetitionLeaderboardExportCSV.as_view(), name="admin-competition-leaderboard-export"),
    path("admin/competitions/leaderboard/live/<uuid:competition_id>/", LiveCompetitionLeaderboardView.as_view(), name="client-competition-leaderboard-live"),

    # Leaderboard Management
    path("admin/leaderboard/", AdminLeaderboardManagementView.as_view(), name="admin-leaderboard-management"),
    path("admin/leaderboard/<uuid:user_id>/", AdminLeaderboardTraderUpdateView.as_view(), name="admin-leaderboard-trader-update"),

    # Activity Log APIs
    path("admin/activity-logs/", ActivityLogListView.as_view(), name="activity-logs-list"),
    path("admin/activity-logs/<uuid:id>/", ActivityLogDetailView.as_view(), name="activity-logs-detail"),

    # Support Chat Widget APIs
    path('admin/support/ai-config/', AdminSupportAIConfigView.as_view(), name='admin-support-ai-config'),
    path('admin/support/widget-config/', AdminWidgetConfigurationView.as_view(), name='admin-support-widget-config'),
    path('admin/support/widget-customization/', AdminWidgetCustomizationView.as_view(), name='admin-support-widget-customization'),
    path('admin/support/faq/import/', AdminFAQImportView.as_view(), name='admin-faq-import'),
    path('admin/support/agents/', AdminSupportAgentsView.as_view(), name='admin-support-agents'),
    path('admin/support/mentions/', AdminMentionNotificationsView.as_view(), name='admin-support-mentions'),
    path('admin/support/mentions/mark-read/', AdminMarkMentionReadView.as_view(), name='admin-support-mentions-mark-read'),
    path('admin/support/shifts/', AdminShiftScheduleView.as_view(), name='admin-shift-schedules'),
    path('admin/support/shifts/on-duty/', AdminOnDutyView.as_view(), name='admin-shifts-on-duty'),
    path('admin/support/shifts/overrides/', AdminShiftOverrideView.as_view(), name='admin-shift-overrides'),
    path('admin/support/shifts/overrides/<uuid:id>/', AdminShiftOverrideDetailView.as_view(), name='admin-shift-override-detail'),
    path('admin/support/shifts/<uuid:id>/', AdminShiftScheduleDetailView.as_view(), name='admin-shift-schedule-detail'),
    path('support/upload-attachment/', SupportAttachmentUploadView.as_view(), name='support-upload-attachment'),
    path('support/widget.js', SupportWidgetScriptView.as_view(), name='support-widget-script'),
    path('support/guest-widget.js', GuestWidgetScriptView.as_view(), name='guest-widget-script'),

    # Admin AI Assistant endpoints
    path('admin/ai-assistant/chat/start/', AdminAIChatStartView.as_view(), name='admin-ai-chat-start'),
    path('admin/ai-assistant/chat/stream/', AdminAIChatStreamView.as_view(), name='admin-ai-chat-stream'),
    path('admin/ai-assistant/chat/confirm/', AdminAIChatConfirmView.as_view(), name='admin-ai-chat-confirm'),
    path('admin/ai-assistant/chat/conversations/', AdminAIConversationListView.as_view(), name='admin-ai-conversations'),
    path('admin/ai-assistant/chat/conversations/<uuid:conversation_id>/', AdminAIConversationDetailView.as_view(), name='admin-ai-conversation-detail'),
    path('admin/ai-assistant/config/', AdminAIConfigView.as_view(), name='admin-ai-config'),

    path('auth/client/login/', ClientLoginView.as_view(), name='client-login'),
    path("auth/client/refresh/", ClientTokenRefreshView.as_view(), name="token_refresh"),

    path('auth/client/register/request/', RegistrationRequestView.as_view(), name='register-request'),
    path('auth/client/register/verify-otp/', OTPVerificationView.as_view(), name='register-verify-otp'),
    path('auth/client/register/complete/', CompleteRegistrationView.as_view(), name='register-complete'),
    
    path("auth/client/password-reset/request/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("auth/client/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"), 
    
    path('client/dashboard/init/', ClientDashboardInitView.as_view(), name='client_dashboard_init'),
    path('client/change-password/', PasswordChangeView.as_view(), name='change-password'),
    path('client/settings/', ClientProfileSettingsView.as_view(), name='client-profile-settings'),
    path('client/offers/', ActiveOffersView.as_view(), name='client-active-offers'),
    path('client/dashboard/', ClientDashboardView.as_view(), name='client-dashboard'),
    path('client/leaderboard/', LeaderboardView.as_view(), name='client-leaderboard'),
    path('client/mystats/', MyStatsView.as_view(), name='client-mystats'),
    path("client/mt5/open-trades/", OpenTradesView.as_view(), name="open-trades"),
    path("client/daily-summary/<int:account_id>/", MonthlyPnlSummaryView.as_view(), name="daily-summary-month"),
    path("client/daily-summary/<int:account_id>/<str:day>/", DailyPnlDetailView.as_view(), name="daily-summary-day"),
    path('client/withdrawal/', WithdrawalAPIView.as_view(), name='client-withdrawal'),
    path("client/payout-history/<str:mt5_account_id>/", PayoutHistoryByAccountView.as_view(), name="payout-history-by-account"),
    path('client/trading-results/', TradingResultView.as_view(), name='trading-results'),
    path('client/payout/eligible-accounts/', EligibleAccountsView.as_view()),
    path("client/payment-methods/", ClientPaymentMethodListView.as_view(), name="client-payment-methods"),
    path('client/payout/request/', RequestTraderPayoutView.as_view()),
    
    path("client/challenges/active/", ClientActiveChallengesView.as_view(), name="client-active-challenges"),
    path("client/ea-request/upload/", EAApprovalRequestView.as_view(), name="client-ea-request-upload"),
    path("client/challenges/", ClientChallengeEnrollmentListView.as_view(), name="client-challenges"),
    
    path("client/wecoins/access/", WeCoinsAccessView.as_view(), name="wecoins-access"),
    path('client/wecoins/tasks/', ClientRewardTasksView.as_view(), name='client-reward-tasks'),
    path('client/wecoins/tasks/submit/', ClientRewardSubmissionCreateView.as_view(), name='client-task-submit'),
    path('client/wecoins/submissions/', ClientRewardSubmissionsView.as_view(), name='client-reward-submissions'),
    path('client/wecoins/redeem-items/', ClientRedeemItemListView.as_view(), name='client-redeem-items'),
    path('client/wecoins/redeem-items/redeem/', ClientRedeemItemRedeemView.as_view(), name='client-redeem-item'),
    path('client/wecoins/redeem-items/history/', ClientRedemptionHistoryView.as_view(), name='client-redeem-history'),
    path('client/wecoins/wallet/', ClientWeCoinWalletView.as_view(), name='client-wallet'),
    path('client/wecoins/reset-tokens/', ClientResetTokenListView.as_view(), name='client-reset-tokens'),
    path('client/wecoins/reset-tokens/eligible/', ClientEligibleResetView.as_view(), name='client-eligible-resets'),
    path('client/wecoins/reset-tokens/purchase/', ClientPurchaseResetTokenView.as_view(), name='client-purchase-reset'),

    # Trade Journal
    path('client/journal/dashboard/', JournalDashboardView.as_view(), name='journal-dashboard'),
    path('client/journal/entries/', JournalEntryListView.as_view(), name='journal-entries'),
    path('client/journal/entries/<int:order>/', JournalEntryDetailView.as_view(), name='journal-entry-detail'),
    path('client/journal/entries/bulk/', JournalEntryBulkUpdateView.as_view(), name='journal-entry-bulk'),
    path('client/journal/screenshots/upload/', JournalScreenshotUploadView.as_view(), name='journal-screenshot-upload'),
    path('client/journal/tags/', TradeTagListCreateView.as_view(), name='journal-tags'),
    path('client/journal/tags/<uuid:pk>/', TradeTagDetailView.as_view(), name='journal-tag-detail'),
    path('client/journal/tag-categories/', TagCategoryListView.as_view(), name='journal-tag-categories'),
    path('client/journal/sessions/', TradingSessionListCreateView.as_view(), name='journal-sessions'),
    path('client/journal/sessions/<str:date>/', TradingSessionDetailView.as_view(), name='journal-session-detail'),
    path('client/journal/analytics/calendar/', JournalCalendarView.as_view(), name='journal-calendar'),
    path('client/journal/analytics/symbols/', SymbolPerformanceView.as_view(), name='journal-symbol-performance'),
    path('client/journal/analytics/time/', TimePerformanceView.as_view(), name='journal-time-performance'),
    path('client/journal/analytics/tags/', TagPerformanceView.as_view(), name='journal-tag-performance'),
    path('client/journal/analytics/equity-curve/', EquityCurveView.as_view(), name='journal-equity-curve'),
    path('client/journal/analytics/mfe-mae/', MFEMAEAnalysisView.as_view(), name='journal-mfe-mae'),
    path('client/journal/analytics/compliance/', ComplianceDashboardView.as_view(), name='journal-compliance'),
    path('client/journal/analytics/distribution/', WinLossDistributionView.as_view(), name='journal-distribution'),
    path('client/journal/analytics/holding-time/', HoldingTimeView.as_view(), name='journal-holding-time'),
    path('client/journal/analytics/monte-carlo/', MonteCarloView.as_view(), name='journal-monte-carlo'),
    path('client/journal/analytics/streaks/', StreakAnalysisView.as_view(), name='journal-streaks'),
    path('client/journal/ai/daily-summary/', AIDailySummaryView.as_view(), name='journal-ai-daily-summary'),
    path('client/journal/ai/chat/', AIChatView.as_view(), name='journal-ai-chat'),
    path('client/journal/ai/report/<str:period>/', AIReportView.as_view(), name='journal-ai-report'),
    path('client/journal/ai/patterns/', AIPatternDetectionView.as_view(), name='journal-ai-patterns'),
    path('client/journal/ai/what-if/', AIWhatIfView.as_view(), name='journal-ai-what-if'),
    path('client/journal/mentor-access/', MentorAccessListCreateView.as_view(), name='journal-mentor-access'),
    path('client/journal/mentor-access/<uuid:pk>/', MentorAccessRevokeView.as_view(), name='journal-mentor-revoke'),
    path('client/journal/shared/<uuid:pk>/', SharedJournalView.as_view(), name='journal-shared'),
    path('client/journal/share-link/', JournalShareLinkCreateView.as_view(), name='journal-share-link-create'),
    path('client/journal/share-links/', JournalShareLinkListView.as_view(), name='journal-share-link-list'),
    path('client/journal/share-link/<uuid:pk>/', JournalShareLinkDeactivateView.as_view(), name='journal-share-link-deactivate'),
    path('public/journal/<uuid:token>/', PublicSharedJournalView.as_view(), name='public-shared-journal'),
    path('public/certificate/verify/<uuid:certificate_id>/', PublicCertificateVerifyView.as_view(), name='public-certificate-verify'),

    path("client/competitions/access/", CompetitionsAccessView.as_view(), name="competitions-access"),
    path("client/competitions/", TraderCompetitionsHubView.as_view()),
    path("client/competitions/<uuid:competition_id>/", TraderCompetitionDetailView.as_view()),
    path("client/competitions/join/<uuid:competition_id>/", TraderJoinCompetitionView.as_view()),
    path("client/competitions/leaderboard/table/<uuid:competition_id>/", ClientCompetitionLeaderboardTableView.as_view(), name="client-competition-leaderboard-table"),
    
    
    path(
      'api/client//daily-summary/',
      MonthlyPnlSummaryView.as_view(),
      name='daily-summary-month'
    ),
    path(
      'api/client/<int:account_id>/daily-summary/',
      DailyPnlDetailView.as_view(),
      name='daily-summary-day'
    ),
    
    path('affiliate/profile/', AffiliateProfileView.as_view(), name='affiliate_profile'),
    path('affiliate/referrals/', AffiliateReferralListView.as_view(), name='affiliate_referrals'),
    path('affiliate/funnel-stats/', AffiliateFunnelStatsView.as_view(), name='affiliate-funnel-stats'),
    path('affiliate/payout-request/', AffiliatePayoutRequestView.as_view(), name='affiliate-payout-request'),
    path('affiliate/wallet/transactions/', AffiliateWalletTransactionListView.as_view(), name='affiliate-wallet-transactions'),
    
    path('client/notifications/', ClientNotificationListView.as_view(), name='client_notifications'),
    path('client/notifications/<uuid:pk>/', ClientNotificationDetailView.as_view(), name='notification_detail'),
    path('client/notifications/mark-read/<uuid:pk>/', MarkNotificationReadView.as_view(), name='notification_mark_read'),
    path('client/notifications/<uuid:pk>/delete/', ClientNotificationDeleteView.as_view(), name='notification_delete'),

    # Notification image upload
    path('admin/notifications/upload-image/', NotificationImageUploadView.as_view(), name='admin-notification-upload-image'),

    # Blog Admin (path-based)
    path('admin/blog/ai-generate/', BlogAIGenerateView.as_view(), name='admin-blog-ai-generate'),
    path('admin/blog/upload-image/', BlogImageUploadView.as_view(), name='admin-blog-upload-image'),

    # Blog Public
    path('website/blog/posts/', BlogPostPublicListView.as_view(), name='blog-public-list'),
    path('website/blog/posts/<slug:slug>/', BlogPostPublicDetailView.as_view(), name='blog-public-detail'),
    path('website/blog/categories/', BlogCategoryPublicListView.as_view(), name='blog-public-categories'),
    path('website/blog/sitemap.xml', BlogSitemapView.as_view(), name='blog-sitemap'),

    # Website Public Endpoints
    path('website/products/', WebsiteProductCatalogView.as_view(), name='website-product-catalog'),
    path('website/validate-discount/', ValidateDiscountView.as_view(), name='website-validate-discount'),
    path('website/pap-checkout/<uuid:enrollment_id>/', PAPCheckoutDetailsView.as_view(), name='website-pap-checkout'),
    path('website/orders/create/', WebsiteOrderCreateView.as_view(), name='website-order-create'),
    path('website/orders/<uuid:order_id>/status/', WebsiteOrderStatusView.as_view(), name='website-order-status'),
    path('website/payments/create/', CreatePaymentView.as_view(), name='website-payment-create'),
    path('website/webhooks/paytiko/', PaytikoWebhookView.as_view(), name='website-paytiko-webhook'),
    path('website/webhooks/confirmo/', ConfirmoWebhookView.as_view(), name='website-confirmo-webhook'),
    path('website/payments/paypal/capture/', PayPalCaptureView.as_view(), name='website-paypal-capture'),
    path('website/webhooks/paypal/', PayPalWebhookView.as_view(), name='website-paypal-webhook'),

    # Website Admin Endpoints (for CRM)
    path('admin/website-products/', WebsiteProductAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-website-products'),
    path('admin/website-products/<int:pk>/', WebsiteProductAdminViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin-website-product-detail'),
    path('admin/website-product-variants/', WebsiteProductVariantAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-website-product-variants'),
    path('admin/website-product-variants/<int:pk>/', WebsiteProductVariantAdminViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin-website-product-variant-detail'),
    path('admin/website-product-addons/', WebsiteProductAddonAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-website-product-addons'),
    path('admin/website-product-addons/<int:pk>/', WebsiteProductAddonAdminViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin-website-product-addon-detail'),
    path('admin/discount-codes/', DiscountCodeAdminViewSet.as_view({'get': 'list', 'post': 'create'}), name='admin-discount-codes'),
    path('admin/discount-codes/bulk-import/', DiscountCodeAdminViewSet.as_view({'post': 'bulk_import'}), name='admin-discount-codes-bulk-import'),
    path('admin/discount-codes/<int:pk>/', DiscountCodeAdminViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='admin-discount-code-detail'),
    path('admin/website-orders/', WebsiteOrderAdminViewSet.as_view({'get': 'list'}), name='admin-website-orders'),
    path('admin/website-orders/<uuid:pk>/', WebsiteOrderAdminViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name='admin-website-order-detail'),
    path('admin/website-orders/<uuid:pk>/reprocess/', WebsiteOrderAdminViewSet.as_view({'post': 'reprocess'}), name='admin-website-order-reprocess'),
    path('admin/website-orders/export.csv', WebsiteOrderExportCSVView.as_view(), name='admin-website-orders-export'),

    # Public Meeting Booking Endpoints
    path('meet/<slug:slug>/', MeetingProfilePublicView.as_view(), name='meeting-profile-public'),
    path('meet/<slug:slug>/slots/', MeetingAvailableSlotsView.as_view(), name='meeting-available-slots'),
    path('meet/<slug:slug>/book/', MeetingBookingCreateView.as_view(), name='meeting-booking-create'),
    path('meet/booking/<uuid:booking_id>/', MeetingBookingDetailView.as_view(), name='meeting-booking-detail'),
    path('meet/booking/<uuid:booking_id>/cancel/', MeetingBookingCancelView.as_view(), name='meeting-booking-cancel'),
    path('meet/room/<uuid:booking_id>/token/', MeetingGuestTokenView.as_view(), name='meeting-guest-token'),

    # Admin Meeting Management Endpoints
    path('admin/meetings/profile/', AdminMeetingProfileView.as_view(), name='admin-meeting-profile'),
    path('admin/meetings/availability/', AdminMeetingAvailabilityView.as_view(), name='admin-meeting-availability'),
    path('admin/meetings/overrides/', AdminMeetingOverridesView.as_view(), name='admin-meeting-overrides'),
    path('admin/meetings/bookings/', AdminMeetingBookingsView.as_view(), name='admin-meeting-bookings'),
    path('admin/meetings/bookings/create/', AdminMeetingBookingCreateByAdminView.as_view(), name='admin-meeting-booking-create'),
    path('admin/meetings/bookings/<uuid:booking_id>/', AdminMeetingBookingUpdateView.as_view(), name='admin-meeting-booking-update'),
    path('admin/meetings/bookings/<uuid:booking_id>/host-token/', AdminMeetingHostTokenView.as_view(), name='admin-meeting-host-token'),
    path('admin/meetings/instant-start/', AdminInstantMeetingView.as_view(), name='admin-meeting-instant-start'),
    path('admin/meetings/google/auth-url/', AdminGoogleAuthURLView.as_view(), name='admin-meeting-google-auth'),
    path('admin/meetings/google/callback/', AdminGoogleCallbackView.as_view(), name='admin-meeting-google-callback'),
    path('admin/meetings/google/disconnect/', AdminGoogleDisconnectView.as_view(), name='admin-meeting-google-disconnect'),

    # Email Inbound Webhook
    path('webhooks/email/inbound/', inbound_email_webhook, name='email-inbound-webhook'),

    # WhatsApp Webhooks & Admin
    path('webhooks/whatsapp/inbound/', whatsapp_inbound_webhook, name='whatsapp-inbound-webhook'),
    path('webhooks/whatsapp/status/', whatsapp_status_webhook, name='whatsapp-status-webhook'),
    path('webhooks/whatsapp/voice/', whatsapp_voice_webhook, name='whatsapp-voice-webhook'),
    path('admin/whatsapp/config/', WhatsAppBotConfigView.as_view(), name='admin-whatsapp-config'),
]
# from rest_framework import permissions
# from drf_yasg.views import get_schema_view
# from drf_yasg import openapi
# schema_view = get_schema_view(
#     openapi.Info(
#         title="Backend API Documentation",
#         default_version='v1',
#         description="All API endpoints for admin, client, affiliate, etc.",
#         terms_of_service="https://yourdomain.com/terms/",
#         contact=openapi.Contact(email="support@yourdomain.com"),
#         license=openapi.License(name="BSD License"),
#     ),
#     public=True,
#     permission_classes=(permissions.AllowAny,),
# )
# urlpatterns += [
#     path('docs/swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
#     path('docs/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
#     path('docs/json/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
# ]
# Only for development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) 