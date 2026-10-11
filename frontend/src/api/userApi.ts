import { apiClient } from './client';
import { ApiResponse, ChangePasswordRequest, DeleteAccountRequest, User, UserPreference } from '../types';

export const getCurrentUserProfileApi = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<User>>('/users/me');
  return response.data.data;
};

export const changePasswordApi = async (data: ChangePasswordRequest): Promise<void> => {
  await apiClient.put<ApiResponse<void>>('/users/me/password', data);
};

export const getUserPreferencesApi = async (): Promise<UserPreference> => {
  const response = await apiClient.get<ApiResponse<UserPreference>>('/users/me/preferences');
  return response.data.data;
};

export const updateUserPreferencesApi = async (data: UserPreference): Promise<UserPreference> => {
  const response = await apiClient.put<ApiResponse<UserPreference>>('/users/me/preferences', data);
  return response.data.data;
};

export const deleteAccountApi = async (data: DeleteAccountRequest): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>('/users/me', {
    data,
  });
};
