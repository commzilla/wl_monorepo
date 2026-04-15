import { apiService } from './apiService';
import { RiskDashboardOverview, SoftBreachesResponse, HardBreachesResponse, BreachPagination } from '@/lib/types/djangoRisk';

export class RiskService {
  private static readonly OVERVIEW_ENDPOINT = '/admin/risk-dashboard/overview/';
  private static readonly SOFT_BREACHES_ENDPOINT = '/admin/risk-dashboard/soft-breaches/';
  private static readonly HARD_BREACHES_ENDPOINT = '/admin/risk-dashboard/hard-breaches/';
  private static readonly REVERTED_BREACHES_ENDPOINT = '/admin/risk-dashboard/reverted-breaches/';

  static async getOverview(): Promise<RiskDashboardOverview> {
    try {
      const response = await apiService.get<RiskDashboardOverview>(
        this.OVERVIEW_ENDPOINT
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching risk overview:', error);
      throw error;
    }
  }

  static async getSoftBreaches(page = 1, pageSize = 10, search = '') {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await apiService.get<SoftBreachesResponse>(
        `${this.SOFT_BREACHES_ENDPOINT}?${params.toString()}`
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Convert DRF pagination format to our expected format
      const pagination: BreachPagination = {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        current_page: page,
        total_pages: Math.ceil(response.data.count / pageSize)
      };
      
      return {
        data: response.data.results,
        pagination
      };
    } catch (error) {
      console.error('Error fetching soft breaches:', error);
      throw error;
    }
  }

  static async getHardBreaches(page = 1, pageSize = 10, search = '') {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await apiService.get<HardBreachesResponse>(
        `${this.HARD_BREACHES_ENDPOINT}?${params.toString()}`
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Convert DRF pagination format to our expected format
      const pagination: BreachPagination = {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        current_page: page,
        total_pages: Math.ceil(response.data.count / pageSize)
      };
      
      return {
        data: response.data.results,
        pagination
      };
    } catch (error) {
      console.error('Error fetching hard breaches:', error);
      throw error;
    }
  }

  static async getRevertedBreaches(page = 1, pageSize = 10, search = '') {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await apiService.get<HardBreachesResponse>(
        `${this.REVERTED_BREACHES_ENDPOINT}?${params.toString()}`
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Convert DRF pagination format to our expected format
      const pagination: BreachPagination = {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        current_page: page,
        total_pages: Math.ceil(response.data.count / pageSize)
      };
      
      return {
        data: response.data.results,
        pagination
      };
    } catch (error) {
      console.error('Error fetching reverted breaches:', error);
      throw error;
    }
  }

  static async revertBreach(breachId: number): Promise<{ message: string; enrollment_id: string; new_status: string; mt5_account: string }> {
    try {
      const response = await apiService.post<{ message: string; enrollment_id: string; new_status: string; mt5_account: string }>(
        `/admin/revert-breach/${breachId}/`
      );
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error reverting breach:', error);
      throw error;
    }
  }

  static async bulkRevertBreaches(breachIds: number[]): Promise<{
    total: number;
    success_count: number;
    failed_count: number;
    success: Array<{ breach_id: number; enrollment_id: string; mt5_account: string }>;
    failed: Array<{ breach_id: number; error: string }>;
  }> {
    try {
      const response = await apiService.post<{
        total: number;
        success_count: number;
        failed_count: number;
        success: Array<{ breach_id: number; enrollment_id: string; mt5_account: string }>;
        failed: Array<{ breach_id: number; error: string }>;
      }>('/admin/breaches/revert-bulk/', { breach_ids: breachIds });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error bulk reverting breaches:', error);
      throw error;
    }
  }
}