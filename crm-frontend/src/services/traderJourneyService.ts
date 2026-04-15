import { apiService } from "./apiService";
import { TraderJourneyResponse } from "@/lib/types/traderJourney";

export const traderJourneyService = {
  getAnalytics: async (filters?: {
    program?: string;
    country?: string;
    account_size?: string;
    quick_date?: string;
    from_date?: string;
    to_date?: string;
    trade_from?: string;
    trade_to?: string;
  }): Promise<TraderJourneyResponse> => {
    const params = new URLSearchParams();
    
    if (filters?.program) params.append("program", filters.program);
    if (filters?.country) params.append("country", filters.country);
    if (filters?.account_size) params.append("account_size", filters.account_size);
    if (filters?.quick_date) params.append("quick_date", filters.quick_date);
    if (filters?.from_date) params.append("from_date", filters.from_date);
    if (filters?.to_date) params.append("to_date", filters.to_date);
    if (filters?.trade_from) params.append("trade_from", filters.trade_from);
    if (filters?.trade_to) params.append("trade_to", filters.trade_to);

    const queryString = params.toString();
    const endpoint = queryString 
      ? `/admin/analytics/orders-pass-breach/?${queryString}`
      : "/admin/analytics/orders-pass-breach/";

    const response = await apiService.get<TraderJourneyResponse>(endpoint);
    return response.data;
  },
};
