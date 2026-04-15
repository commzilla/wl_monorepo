import { apiService } from "./apiService";
import { UnprofitableCountryAnalytics } from "@/lib/types/unprofitableCountryAnalytics";

export const unprofitableCountryAnalyticsService = {
  getUnprofitableCountries: async (): Promise<UnprofitableCountryAnalytics[]> => {
    const response = await apiService.get<UnprofitableCountryAnalytics[]>(
      "/admin/analytics/unprofitable-countries/"
    );
    return response.data || [];
  },
};
