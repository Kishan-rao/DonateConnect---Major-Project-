import { apiClient } from './client';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, User, VerifyOtpRequest } from '../types';


export const registerApi = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
  return response.data.data;
};

/** @deprecated Use registerApi() instead */
export const registerDonorApi = registerApi;


export const loginApi = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);
  return response.data.data;
};

export const verifyOtpApi = async (data: VerifyOtpRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/verify-otp', data);
  return response.data.data;
};

export const getCurrentUserApi = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me');
  return response.data.data;
};

export const renewTokenApi = async (): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/renew');
  return response.data.data;
};

export const resendOtpApi = async (email: string): Promise<void> => {
  await apiClient.post(`/auth/resend-otp?email=${encodeURIComponent(email)}`);
};

