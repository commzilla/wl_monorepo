import { apiService } from './apiService';
import { IPSummary, AccountByIP } from '@/lib/types/ipAnalysis';

export class IPAnalysisService {
  private static readonly IP_SUMMARY_ENDPOINT = '/admin/risk-dashboard/ip-summary/';
  private static readonly IP_ACCOUNTS_ENDPOINT = '/admin/risk-dashboard/ip-accounts/';

  static async getIPSummary(page = 1, pageSize = 20, search = '') {
    try {
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await apiService.get<IPSummary[]>(
        `${this.IP_SUMMARY_ENDPOINT}?page=${page}&page_size=${pageSize}${searchParam}`
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Since API returns array directly, create pagination info
      const data = response.data || [];
      const pagination = {
        page,
        pageSize,
        total: data.length,
        totalPages: Math.ceil(data.length / pageSize)
      };
      
      return {
        data,
        pagination
      };
    } catch (error) {
      console.error('Error fetching IP summary:', error);
      throw error;
    }
  }

  static async getAccountsByIP(ip: string, page = 1, pageSize = 20) {
    try {
      const response = await apiService.get<AccountByIP[]>(
        `${this.IP_ACCOUNTS_ENDPOINT}${encodeURIComponent(ip)}/?page=${page}&page_size=${pageSize}`
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Since API returns array directly, create pagination info
      const data = response.data || [];
      const pagination = {
        page,
        pageSize,
        total: data.length,
        totalPages: Math.ceil(data.length / pageSize)
      };
      
      return {
        data,
        pagination
      };
    } catch (error) {
      console.error('Error fetching accounts by IP:', error);
      throw error;
    }
  }
}