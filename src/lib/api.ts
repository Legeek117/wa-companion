/**
 * API Configuration and Client
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    statusCode: number;
  };
}

/**
 * API Client with authentication
 */
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    // Always check localStorage in case token was updated elsewhere
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken !== this.token) {
        this.token = storedToken;
      }
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add auth token if available (always get the latest token)
    const token = this.getToken();

    // Determine if endpoint is protected (most /api routes except auth public endpoints)
    // Login and register are public, but logout requires authentication
    const isProtected = endpoint.startsWith('/api/') &&
      !endpoint.startsWith('/api/auth/login') &&
      !endpoint.startsWith('/api/auth/register');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (isProtected) {
      // Short-circuit without hitting the network for protected routes when unauthenticated
      console.warn(`[API] Skipping request without token for protected route: ${endpoint}`);
      return {
        success: false,
        error: {
          message: 'Not authenticated',
          statusCode: 401,
        },
      };
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        // If response is not JSON, create error response
        data = {
          error: {
            message: response.statusText || 'An error occurred',
            statusCode: response.status,
          },
        };
      }

      if (!response.ok) {
        // If 401, clear token as it might be invalid
        if (response.status === 401) {
          this.setToken(null);
        }
        return {
          success: false,
          error: {
            message: data.error?.message || data.message || 'An error occurred',
            statusCode: response.status,
          },
        };
      }

      // If response includes a new token, update it automatically (for token refresh)
      if (data.token && typeof data.token === 'string') {
        this.setToken(data.token);
      }

      return {
        success: true,
        ...data,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          statusCode: 0,
        },
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_URL);

// Export API endpoints
export const api = {
  // Auth
  auth: {
    register: (email: string, password: string) =>
      apiClient.post('/api/auth/register', { email, password }),
    login: (email: string, password: string) =>
      apiClient.post('/api/auth/login', { email, password }),
    me: () => apiClient.get('/api/auth/me'),
    logout: () => apiClient.post('/api/auth/logout'),
  },

  // WhatsApp
  whatsapp: {
    getQR: () => apiClient.get('/api/whatsapp/qr'),
    getPairingCode: () => apiClient.get('/api/whatsapp/pairing-code'),
    getStatus: () => apiClient.get('/api/whatsapp/status'),
    disconnect: () => apiClient.post('/api/whatsapp/disconnect'),
  },

  // Status
  status: {
    list: () => apiClient.get('/api/status'),
    getStats: () => apiClient.get('/api/status/stats'),
    getContacts: () => apiClient.get('/api/status/contacts'),
    like: (contactId: string, statusId: string, emoji?: string) =>
      apiClient.post('/api/status/like', { contactId, statusId, emoji }),
    getConfig: () => apiClient.get('/api/status/config'),
    updateConfig: (config: any) =>
      apiClient.put('/api/status/config', config),
  },

  // View Once
  viewOnce: {
    list: (limit?: number) => apiClient.get(`/api/view-once${limit ? `?limit=${limit}` : ''}`),
    getStats: () => apiClient.get('/api/view-once/stats'),
    get: (id: string) => apiClient.get(`/api/view-once/${id}`),
    download: (id: string) => apiClient.get(`/api/view-once/${id}/download`),
  },

  // Deleted Messages
  deletedMessages: {
    delete: (id: string) => apiClient.delete(`/api/deleted-messages/${id}`),
    list: (limit?: number) => apiClient.get(`/api/deleted-messages${limit ? `?limit=${limit}` : ''}`),
    getStats: () => apiClient.get('/api/deleted-messages/stats'),
    get: (id: string) => apiClient.get(`/api/deleted-messages/${id}`),
    export: () => apiClient.get('/api/deleted-messages/export'),
  },

  // Autoresponder
  autoresponder: {
    getConfig: () => apiClient.get('/api/autoresponder/config'),
    updateConfig: (config: any) =>
      apiClient.put('/api/autoresponder/config', config),
    getContacts: () => apiClient.get('/api/autoresponder/contacts'),
    updateContact: (id: string, contact: any) =>
      apiClient.put(`/api/autoresponder/contacts/${id}`, contact),
  },

  // Subscription
  subscription: {
    createCheckout: (priceId: string) =>
      apiClient.post('/api/subscription/create-checkout', { priceId }),
    getStatus: () => apiClient.get('/api/subscription/status'),
    cancel: () => apiClient.post('/api/subscription/cancel'),
  },

  // Analytics
  analytics: {
    getOverview: () => apiClient.get('/api/analytics/overview'),
    getStatusStats: () => apiClient.get('/api/analytics/status'),
    getViewOnceStats: () => apiClient.get('/api/analytics/view-once'),
    getDeletedMessagesStats: () =>
      apiClient.get('/api/analytics/deleted-messages'),
  },

  // Scheduled Status
  scheduledStatus: {
    list: () => apiClient.get('/api/scheduled-status'),
    create: (status: any) =>
      apiClient.post('/api/scheduled-status', status),
    update: (id: string, status: any) =>
      apiClient.put(`/api/scheduled-status/${id}`, status),
    delete: (id: string) =>
      apiClient.delete(`/api/scheduled-status/${id}`),
  },

  // Media Upload
  media: {
    uploadScheduledStatus: async (file: File): Promise<ApiResponse<{ mediaUrl: string; filename: string; size: number; mimeType: string }>> => {
      const formData = new FormData();
      formData.append('media', file);

      const token = apiClient.getToken();
      const response = await fetch(`${API_URL}/api/media/scheduled-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      return data;
    },
  },

  // Quota
  quota: {
    get: () => apiClient.get('/api/quota'),
  },
};

