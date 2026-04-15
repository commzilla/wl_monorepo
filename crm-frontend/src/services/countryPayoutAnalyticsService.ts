import { apiService } from "./apiService";
import { CountryPayoutAnalytics } from "@/lib/types/countryPayoutAnalytics";

export const countryPayoutAnalyticsService = {
  getAnalytics: async (): Promise<CountryPayoutAnalytics[]> => {
    const response = await apiService.get<CountryPayoutAnalytics[]>(
      "/admin/analytics/country-wise-payouts/"
    );
    return response.data;
  },
};
