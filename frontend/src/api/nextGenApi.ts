import { apiClient } from './client';
import { ApiResponse, BlockchainBlock, NgoResourceTrade, SmartLocker, SosStatus } from '../types';

export const getSmartLockers = async (): Promise<SmartLocker[]> => {
  const response = await apiClient.get<ApiResponse<SmartLocker[]>>('/lockers');
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
};

export const getBlockchainLedger = async (): Promise<BlockchainBlock[]> => {
  const response = await apiClient.get<ApiResponse<BlockchainBlock[]>>('/blockchain');
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
};

export const getActiveResourceTrades = async (): Promise<NgoResourceTrade[]> => {
  const response = await apiClient.get<ApiResponse<NgoResourceTrade[]>>('/trades');
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
};

export const getSosStatus = async (): Promise<SosStatus> => {
  const response = await apiClient.get<ApiResponse<SosStatus>>('/sos');
  return response.data?.data;
};
