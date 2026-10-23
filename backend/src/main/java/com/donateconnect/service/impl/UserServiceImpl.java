package com.donateconnect.service.impl;

import com.donateconnect.dto.ChangePasswordRequest;
import com.donateconnect.dto.UserPreferenceDto;
import com.donateconnect.dto.UserResponseDto;
import com.donateconnect.entity.*;
import com.donateconnect.exception.ResourceNotFoundException;
import com.donateconnect.repository.*;
import com.donateconnect.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationRepository notificationRepository;
    private final DonationRepository donationRepository;
    private final DeliveryRepository deliveryRepository;
    private final VolunteerTaskRepository volunteerTaskRepository;
    private final DonationCommentRepository donationCommentRepository;
    private final NGOProfileRepository ngoProfileRepository;
    private final NgoRatingRepository ngoRatingRepository;
    private final VolunteerRatingRepository volunteerRatingRepository;
    private final AuditLogRepository auditLogRepository;
    private final CorporateDriveRepository corporateDriveRepository;
    private final StatusHistoryRepository statusHistoryRepository;
    private final NgoUrgentNeedRepository ngoUrgentNeedRepository;
    private final NgoResourceTradeRepository ngoResourceTradeRepository;
    private final com.donateconnect.service.StorageService storageService;

    @Override
    @Transactional(readOnly = true)
    public UserResponseDto getCurrentUserProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return UserResponseDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .approved(user.isApproved())
                .build();
    }

    @Override
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password does not match");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password cannot be the same as the current password");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password updated successfully for user ID: {}", userId);
    }

    @Override
    @Transactional
    public UserPreferenceDto getUserPreferences(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        UserPreference preference = userPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserPreference defaultPref = UserPreference.builder()
                            .user(user)
                            .emailNotifications(true)
                            .donationUpdates(true)
                            .deliveryUpdates(true)
                            .commentNotifications(true)
                            .build();
                    return userPreferenceRepository.save(defaultPref);
                });

        return UserPreferenceDto.builder()
                .emailNotifications(preference.isEmailNotifications())
                .donationUpdates(preference.isDonationUpdates())
                .deliveryUpdates(preference.isDeliveryUpdates())
                .commentNotifications(preference.isCommentNotifications())
                .build();
    }

    @Override
    @Transactional
    public UserPreferenceDto updateUserPreferences(UUID userId, UserPreferenceDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        UserPreference preference = userPreferenceRepository.findByUserId(userId)
                .orElseGet(() -> UserPreference.builder()
                        .user(user)
                        .build());

        preference.setEmailNotifications(dto.isEmailNotifications());
        preference.setDonationUpdates(dto.isDonationUpdates());
        preference.setDeliveryUpdates(dto.isDeliveryUpdates());
        preference.setCommentNotifications(dto.isCommentNotifications());

        preference = userPreferenceRepository.save(preference);
        log.info("User preferences updated for user ID: {}", userId);

        return UserPreferenceDto.builder()
                .emailNotifications(preference.isEmailNotifications())
                .donationUpdates(preference.isDonationUpdates())
                .deliveryUpdates(preference.isDeliveryUpdates())
                .commentNotifications(preference.isCommentNotifications())
                .build();
    }

    @Override
    @Transactional
    public void deleteAccount(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // 1. Last administrator protection check
        if (user.getRole() == Role.ADMIN) {
            long adminCount = userRepository.countByRole(Role.ADMIN);
            if (adminCount <= 1) {
                log.warn("Attempt to delete the sole administrator account with ID: {}", userId);
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete the only remaining administrator account.");
            }
        }

        // 2. Workflow safety guards: reject deletion if active operations exist
        if (user.getRole() == Role.VOLUNTEER) {
            List<DeliveryStatus> activeDeliveryStatuses = List.of(
                    DeliveryStatus.ASSIGNED,
                    DeliveryStatus.ACCEPTED_BY_VOLUNTEER,
                    DeliveryStatus.EN_ROUTE_TO_PICKUP,
                    DeliveryStatus.PICKED_UP,
                    DeliveryStatus.EN_ROUTE_TO_NGO
            );
            if (deliveryRepository.existsByVolunteerIdAndStatusIn(userId, activeDeliveryStatuses)) {
                log.warn("Attempt to delete volunteer account {} with active deliveries in progress", userId);
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Cannot delete account while you have active deliveries in progress. Please complete or cancel them first.");
            }

            List<VolunteerTask.TaskStatus> activeTaskStatuses = List.of(
                    VolunteerTask.TaskStatus.CLAIMED,
                    VolunteerTask.TaskStatus.IN_TRANSIT
            );
            if (volunteerTaskRepository.existsByVolunteerIdAndStatusIn(userId, activeTaskStatuses)) {
                log.warn("Attempt to delete volunteer account {} with active volunteer tasks in progress", userId);
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Cannot delete account while you have active volunteer tasks in progress. Please complete or cancel them first.");
            }
        } else if (user.getRole() == Role.DONOR) {
            List<DonationStatus> activeDonationStatuses = List.of(
                    DonationStatus.REQUESTED,
                    DonationStatus.ACCEPTED,
                    DonationStatus.PICKED_UP
            );
            if (donationRepository.existsByDonorIdAndStatusIn(userId, activeDonationStatuses)) {
                log.warn("Attempt to delete donor account {} with active donations in progress", userId);
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Cannot delete account while you have active donations in progress. Please wait for deliveries to complete or cancel your pending requests.");
            }
        } else if (user.getRole() == Role.NGO) {
            Optional<NGOProfile> ngoProfileOpt = ngoProfileRepository.findByUserId(userId);
            if (ngoProfileOpt.isPresent()) {
                UUID ngoId = ngoProfileOpt.get().getId();
                List<DonationStatus> activeDonationStatuses = List.of(
                        DonationStatus.REQUESTED,
                        DonationStatus.ACCEPTED,
                        DonationStatus.PICKED_UP
                );
                if (donationRepository.existsByNgoIdAndStatusIn(ngoId, activeDonationStatuses)) {
                    log.warn("Attempt to delete NGO account {} with incoming donations in progress", userId);
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Cannot delete NGO account while there are active incoming donations or deliveries pending.");
                }
            }
        }

        log.info("Initiating account deletion for user ID: {} with role: {}", userId, user.getRole());

        // 3. Clear actor from audit logs to preserve audit history while removing FK reference
        auditLogRepository.clearActorByActorId(userId);

        // 4. Delete user preferences
        userPreferenceRepository.deleteByUserId(userId);

        // 5. Delete user notifications
        notificationRepository.deleteByRecipientUserId(userId);

        // 6. Delete user's comments on donations
        donationCommentRepository.deleteByAuthorId(userId);

        // 7. Delete ratings given by or received by this user
        ngoRatingRepository.deleteByDonorId(userId);
        volunteerRatingRepository.deleteByDonorId(userId);
        volunteerRatingRepository.deleteByVolunteerId(userId);

        // 8. Role-specific cleanup
        if (user.getRole() == Role.VOLUNTEER) {
            // Unlink volunteer from completed deliveries so donation & delivery records remain intact with delivery proof
            deliveryRepository.clearVolunteerByVolunteerId(userId);

            // Delete completed/cancelled volunteer tasks assigned to this volunteer
            volunteerTaskRepository.deleteByVolunteerId(userId);
        } else if (user.getRole() == Role.CORPORATE) {
            corporateDriveRepository.deleteByCorporateUserId(userId);
        } else if (user.getRole() == Role.NGO) {
            Optional<NGOProfile> ngoProfileOpt = ngoProfileRepository.findByUserId(userId);
            if (ngoProfileOpt.isPresent()) {
                NGOProfile ngoProfile = ngoProfileOpt.get();
                UUID ngoId = ngoProfile.getId();

                // Clear NGO urgent needs and trades
                ngoUrgentNeedRepository.deleteByNgoId(ngoId);
                ngoResourceTradeRepository.deleteByOfferingNgoId(ngoId);
                ngoRatingRepository.deleteByNgoId(ngoId);

                // For non-active terminal donations targeted at this NGO
                List<Donation> ngoDonations = donationRepository.findByNgoIdOrderByCreatedAtDesc(ngoId);
                for (Donation donation : ngoDonations) {
                    cleanUpDonationDependencies(donation);
                    donationRepository.delete(donation);
                }

                ngoProfileRepository.delete(ngoProfile);
            }
        } else if (user.getRole() == Role.DONOR) {
            // Cascade delete donor's terminal donations and dependencies
            List<Donation> donorDonations = donationRepository.findByDonorIdOrderByCreatedAtDesc(userId);
            for (Donation donation : donorDonations) {
                cleanUpDonationDependencies(donation);
                donationRepository.delete(donation);
            }
        }

        // 9. Finally delete the user entity (frees up the email for reuse)
        userRepository.delete(user);
        userRepository.flush();

        log.info("Successfully deleted user ID: {} and all associated personal data.", userId);
    }

    private void cleanUpDonationDependencies(Donation donation) {
        UUID donationId = donation.getId();
        deliveryRepository.deleteByDonationId(donationId);
        volunteerTaskRepository.deleteByDonationId(donationId);
        donationCommentRepository.deleteByDonationId(donationId);
        statusHistoryRepository.deleteByDonationId(donationId);

        // Clean up photo files from storage safely
        if (donation.getPhotoUrls() != null) {
            for (String photoUrl : donation.getPhotoUrls()) {
                if (photoUrl != null && photoUrl.contains("/api/donations/photo/")) {
                    String filename = photoUrl.substring(photoUrl.lastIndexOf('/') + 1);
                    try {
                        storageService.delete(filename);
                    } catch (Exception e) {
                        log.warn("Could not delete photo file {}: {}", filename, e.getMessage());
                    }
                }
            }
        }
    }
}
