import axios, { type AxiosResponse } from 'axios';


interface iitAuthConfig {
  baseURL: string;
  timeout?: number;
  authEndpoint?: string;
  retries?: number;
}


interface iitAuthResponse {
  success: boolean;
  valid: boolean;
  message?: string;
  userData?: {
    empCode?: string;
    department?: string;
    email?: string;
    fullName?: string;
    [key: string]: any;
  };
}

interface iitAuthRequest {
  username: string;
  password: string;
}

export class iitAuthService {
  private config: iitAuthConfig;
  private axiosInstance;

  constructor(config: iitAuthConfig) {
    this.config = {
      timeout: 10000, 
      authEndpoint: '/auth/verify', 
      retries: 3,
      ...config
    };

    
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      ...(this.config.timeout !== undefined ? { timeout: this.config.timeout } : {}),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AttendanceApp-Backend/1.0.0'
      }
    });

    
    this.axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`[iitAuth] Sending request to: ${config.baseURL}${config.url}`);
        console.log(`[iitAuth] Request data:`, { username: '***', password: '***' }); 
        return config;
      },
      (error) => {
        console.error('[iitAuth] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`[iitAuth] Response received: ${response.status}`);
        console.log(`[iitAuth] Response data:`, response.data);
        return response;
      },
      (error) => {
        console.error('[iitAuth] Response error:', error.response?.status, error.message);
        if (error.response?.data) {
          console.error('[iitAuth] Error response data:', error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate user credentials against iit backend
   */
  async authenticateUser(credentials: iitAuthRequest): Promise<iitAuthResponse> {
    try {
      console.log(`[iitAuth] Authenticating user: ${credentials.username}`);
      
      const response: AxiosResponse = await this.axiosInstance.post(
        this.config.authEndpoint!,
        {
          username: credentials.username,
          password: credentials.password
        }
      );

      
      return this.parseAuthResponse(response);

    } catch (error: any) {
      console.error('[iitAuth] Authentication failed:', error.message);
      
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('iit authentication service is unavailable');
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('iit authentication service timeout');
      }

      
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          return {
            success: true,
            valid: false,
            message: 'Invalid credentials'
          };
        }
        
        if (status >= 500) {
          throw new Error('iit authentication service error');
        }
      }

      throw new Error(`Authentication service error: ${error.message}`);
    }
  }

  /**
   * Parse the simple boolean response from IIT backend
   */
  private parseAuthResponse(response: AxiosResponse): iitAuthResponse {
    const data = response.data;

    console.log(`[iitAuth] Parsing response:`, data);

    
    if (typeof data === 'boolean') {
      return {
        success: true,
        valid: data,
        message: data ? 'Authentication successful' : 'Invalid credentials'
      };
    }

    
    if (typeof data === 'object' && data !== null) {
      if (typeof data.valid === 'boolean') {
        return {
          success: true,
          valid: data.valid,
          message: data.valid ? 'Authentication successful' : 'Invalid credentials'
        };
      }

      if (typeof data.success === 'boolean') {
        return {
          success: true,
          valid: data.success,
          message: data.success ? 'Authentication successful' : 'Invalid credentials'
        };
      }

      if (typeof data.result === 'boolean') {
        return {
          success: true,
          valid: data.result,
          message: data.result ? 'Authentication successful' : 'Invalid credentials'
        };
      }
    }

    
    if (response.status === 200) {
      console.warn('[iitAuth] Unknown response format, assuming success:', data);
      return {
        success: true,
        valid: true,
        message: 'Authentication successful'
      };
    }

    
    console.warn('[iitAuth] Unknown response format, assuming failure:', data);
    return {
      success: true,
      valid: false,
      message: 'Unknown authentication response format'
    };
  }

  /**
   * Test connection to iit backend
   */
  async testConnection(): Promise<boolean> {
    try {
      
      await this.axiosInstance.get('/');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<iitAuthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    
    if (newConfig.baseURL) {
      this.axiosInstance.defaults.baseURL = newConfig.baseURL;
    }
  }
}


let iitAuthInstance: iitAuthService | null = null;

/**
 * Get or create iit auth service instance
 */
export const getiitAuthService = (): iitAuthService => {
  if (!iitAuthInstance) {
    const config: iitAuthConfig = {
      baseURL: process.env.iit_AUTH_BASE_URL!,
      timeout: parseInt(process.env.iit_AUTH_TIMEOUT!),
      authEndpoint: process.env.iit_AUTH_ENDPOINT!,
      retries: parseInt(process.env.iit_AUTH_RETRIES!)
      
    };

    iitAuthInstance = new iitAuthService(config);
  }

  return iitAuthInstance;
};