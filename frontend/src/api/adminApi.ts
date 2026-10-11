import { apiClient } from './client';
import { AdminStats, ApiResponse, NGOProfile, User } from '../types';

export const getAdminStats = async (): Promise<AdminStats> => {
  const response = await apiClient.get<ApiResponse<AdminStats>>('/admin/stats');
  return response.data.data;
};

export { getAllNgosAdmin } from './ngoApi';

export const getPendingUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<ApiResponse<any>>('/admin/users/pending');
  // Backend returns a Page object, so we extract the 'content' array
  return response.data.data.content || [];
};

export const approveUser = async (id: string): Promise<User> => {
  const response = await apiClient.put<ApiResponse<User>>(`/admin/users/${id}/approve`);
  return response.data.data;
};
