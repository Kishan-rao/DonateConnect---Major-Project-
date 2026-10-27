export type Role = 'DONOR' | 'NGO' | 'ADMIN' | 'VOLUNTEER' | 'CORPORATE';

export type Category = 'CLOTHES' | 'FOOD' | 'BOOKS' | 'STATIONERY' | 'TOYS' | 'OTHER';

export type DonationStatus = 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'PICKED_UP' | 'DELIVERED';

export type DeliveryStatus = 'ASSIGNED' | 'ACCEPTED_BY_VOLUNTEER' | 'EN_ROUTE_TO_PICKUP' | 'PICKED_UP' | 'EN_ROUTE_TO_NGO' | 'DELIVERED';

export interface DeliveryDto {
  id: string;
  donationId: string;
  volunteerId: string;
  status: DeliveryStatus;
  assignedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  lastLat?: number;
  lastLng?: number;
  lastLocationAt?: string;
  proofImageUrl?: string;
}

export interface RouteEtaDto {
  deliveryId: string;
  donationId: string;
  deliveryStatus: string;
  destinationType: 'PICKUP' | 'NGO_HUB' | string;
  destinationAddress?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  driverLastLocationAt?: string | null;
  staleGps: boolean;
  destinationLat?: number | null;
  destinationLng?: number | null;
  roadDistanceKm?: number | null;
  roadDistanceMeters?: number | null;
  durationMinutes?: number | null;
  durationSeconds?: number | null;
  calculatedAt?: string | null;
  trafficAware: boolean;
  provider: string;
  routingStatus: 'SUCCESS' | 'FALLBACK_ESTIMATE' | 'DRIVER_OFFLINE' | 'MISSING_COORDINATES' | 'DELIVERY_COMPLETED' | string;
  statusMessage?: string | null;
  routeCoordinates?: [number, number][];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  approved?: boolean;
  averageRating?: number;
  ratingCount?: number;
  createdAt: string;
}

export interface UserPreference {
  emailNotifications: boolean;
  donationUpdates: boolean;
  deliveryUpdates: boolean;
  commentNotifications: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface DeleteAccountRequest {
  confirmation: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role?: Role;
  address?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  expectedRole: Role;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface AuthResponse {
  token: string | null;
  user: User;
  requiresOtp?: boolean;
}

export interface NGOProfile {
  id: string;
  user: User;
  name: string;
  description?: string | null;
  address: string;
  city?: string | null;
  phone: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  verified: boolean;
  averageRating?: number | null;
  ratingCount?: number | null;
  urgentNeeds?: NgoUrgentNeed[];
  createdAt: string;
}

export interface VolunteerRating {
  id: string;
  volunteerId: string;
  donor: User;
  rating: number;
  review?: string;
  createdAt: string;
}

export interface CreateNgoRequest {
  email: string;
  password: string;
  name: string;
  description?: string;
  address: string;
  phone: string;
}

export interface UpdateNgoProfileDto {
  name: string;
  description?: string;
  address: string;
  phone: string;
}

export interface Donation {
  id: string;
  donor: User;
  ngo: NGOProfile;
  category: Category;
  description?: string;
  photoUrls: string[];
  status: DonationStatus;
  pickupDate?: string;
  pickupTimeSlot?: string;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDonationRequest {
  ngoId: string;
  category: Category;
  description?: string;
  photoUrls?: string[];
  pickupDate?: string;
  pickupTimeSlot?: string;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
}

export interface UpdateDonationStatusDto {
  status: DonationStatus;
}

export interface HealthStatus {
  status: string;
  service?: string;
  timestamp?: string;
}

export interface AdminStats {
  totalDonations: number;
  verifiedNgos: number;
  pendingRequests: number;
  completedDeliveries: number;
  
  donationsByDate?: Record<string, number>;
  donationsByCategory?: Record<string, number>;
  donationsByCity?: Record<string, number>;
  deliverySuccessRate?: number;
  averageDeliveryTimeHours?: number;
  
  topDonors?: { name: string; donations: number }[];
  topNgos?: { name: string; donations: number }[];
}

export interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  relatedDonationId?: string;
  createdAt: string;
}

export interface DonationComment {
  id: string;
  donationId: string;
  author: User;
  message: string;
  createdAt: string;
}

export interface CreateCommentRequest {
  message: string;
}

export interface NgoRating {
  id: string;
  ngoId: string;
  donor: User;
  rating: number;
  review?: string;
  createdAt: string;
}

export interface CreateRatingRequest {
  rating: number;
  review?: string;
}

export interface NgoUrgentNeed {
  id: string;
  ngo?: NGOProfile;
  ngoId?: string;
  ngoName?: string;
  ngoCity?: string;
  title: string;
  description: string;
  category: Category;
  quantity?: number;
  active: boolean;
  createdAt: string;
}

export interface CreateUrgentNeedRequest {
  title: string;
  description: string;
  category: Category;
  quantity?: number;
}

export interface ImpactMetrics {
  totalDonations: number;
  deliveredDonations: number;
  totalNgosSupported: number;
  totalActiveDonors: number;
  estimatedCo2SavedKg: number;
  donationsByCategory: Record<string, number>;
}

export interface VolunteerTask {
  id: string;
  donation: Donation;
  volunteer: User;
  deliveryId?: string;
  deliveryStatus?: string;
  status: 'CLAIMED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  routeNotes?: string;
  claimedAt: string;
}

export interface CorporateDrive {
  id: string;
  corporateUser: User;
  companyName: string;
  campaignTitle: string;
  description?: string;
  targetItemCount: number;
  collectedItemCount: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorEmail: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface SmartLocker {
  id: string;
  name: string;
  address: string;
  totalLockers: number;
  availableLockers: number;
  pinCode?: string;
  createdAt: string;
}

export interface BlockchainBlock {
  id: string;
  blockIndex: number;
  previousHash: string;
  hash: string;
  donationId: string;
  action: string;
  timestamp: string;
}

export interface NgoResourceTrade {
  id: string;
  ngoId: string;
  ngoName: string;
  ngoCity: string;
  ngoVerified: boolean;
  offeredCategory: Category;
  offeredQuantity: number;
  requestedCategory: Category;
  requestedQuantity: number;
  active: boolean;
  createdAt: string;
}

export interface SosStatus {
  active: boolean;
  disasterTitle: string;
  urgentCategories: string[];
  priorityMessage: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}


export interface ConversationDto {
  id: string;
  otherParticipantId: string;
  otherParticipantName: string;
  otherParticipantRole: Role;
  otherParticipantEmail: string;
  ngoVerified?: boolean | null;
  ngoAddress?: string | null;
  ngoCity?: string | null;
  donationId?: string | null;
  donationCategory?: Category | null;
  donationDescription?: string | null;
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  lastMessageSenderId?: string | null;
  unreadCount: number;
  createdAt: string;
}

export interface ChatMessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  recipientId: string;
  content?: string | null;
  attachmentUrl?: string | null;
  attachmentContentType?: string | null;
  attachmentSize?: number | null;
  attachmentOriginalFilename?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  clientMessageId?: string | null;
}

export interface CreateConversationRequest {
  ngoId?: string;
  donorId?: string;
  donationId?: string;
}

export interface SendMessageRequest {
  content?: string;
  clientMessageId?: string;
}
