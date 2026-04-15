import { apiService } from './apiService';

interface MT5ActionResponse {
  message?: string;
  error?: string;
}

interface ChangePasswordRequest {
  enrollment_id?: string;
  account_id?: number;
  mode?: 'main' | 'investor' | 'both';
  main_password?: string;
  investor_password?: string;
}

interface ChangePasswordResponse extends MT5ActionResponse {
  account_id?: number;
  enrollment_id?: string;
  mode?: string;
  main_password?: string;
  investor_password?: string;
}

interface MT5ResyncResponse {
  account_id: number;
  fetched_from_mt5: number;
  existing_in_db: number;
  created_new: number;
  updated_existing: number;
  skipped: number;
  total_after_sync: number;
  dry_run: boolean;
  preview_created: number[];
  preview_updated: number[];
}

class MT5Service {
  async activateTrading(accountId: number): Promise<MT5ActionResponse> {
    const response = await apiService.post<MT5ActionResponse>('/admin/mt5/activate-trading/', {
      account_id: accountId
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || {};
  }

  async disableTrading(accountId: number): Promise<MT5ActionResponse> {
    const response = await apiService.post<MT5ActionResponse>('/admin/mt5/disable-trading/', {
      account_id: accountId
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || {};
  }

  async enableMT5(accountId: number): Promise<MT5ActionResponse> {
    const response = await apiService.post<MT5ActionResponse>('/admin/mt5/enable-account/', {
      account_id: accountId
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || {};
  }

  async disableMT5(accountId: number): Promise<MT5ActionResponse> {
    const response = await apiService.post<MT5ActionResponse>('/admin/mt5/disable-account/', {
      account_id: accountId
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || {};
  }

  async retryCreateMT5(enrollmentId: string): Promise<MT5ActionResponse> {
    console.log('MT5 Service - Sending retry request with enrollmentId:', enrollmentId);
    const response = await apiService.post<MT5ActionResponse>('/admin/mt5/retry-create-account/', {
      enrollment_id: enrollmentId
    });
    console.log('MT5 Service - Response:', response);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || {};
  }

  async changeGroup(accountId: number, newGroup: string): Promise<MT5ActionResponse> {
    const response = await apiService.post<MT5ActionResponse>('/admin/mt5/change-group/', {
      account_id: accountId,
      new_group: newGroup
    });
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || {};
  }

  async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await apiService.post<ChangePasswordResponse>('/admin/mt5/change-password/', request);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.data || {};
  }

  async resyncTrades(mt5Id: string, dryRun: boolean = true): Promise<MT5ResyncResponse> {
    const response = await apiService.get<MT5ResyncResponse>(
      `/admin/mt5/resync-trades/?mt5_id=${mt5Id}&dry_run=${dryRun}`
    );
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    if (!response.data) {
      throw new Error('No data returned from resync');
    }
    
    return response.data;
  }
}

export const mt5Service = new MT5Service();
