package com.donateconnect.service;

import com.donateconnect.dto.DonationResponseDto;
import com.donateconnect.dto.VolunteerTaskDto;
import com.donateconnect.entity.VolunteerTask;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface VolunteerService {
    /**
     * Get paginated list of ACCEPTED donations not yet claimed by any volunteer.
     */
    Page<DonationResponseDto> getAvailablePickups(Pageable pageable);

    /**
     * Get volunteer tasks for a specific volunteer (defaults to active tasks only).
     */
    default List<VolunteerTaskDto> getMyTasks(UUID volunteerId) {
        return getMyTasks(volunteerId, true);
    }

    /**
     * Get volunteer tasks for a specific volunteer, optionally filtered to active tasks only.
     */
    List<VolunteerTaskDto> getMyTasks(UUID volunteerId, boolean activeOnly);

    /**
     * Claim an available pickup. Throws if already claimed or donation is not ACCEPTED.
     */
    VolunteerTaskDto claimPickup(UUID volunteerId, UUID donationId);

    /**
     * Update the status of a task. Only the owning volunteer or ADMIN can do this.
     * Validates state machine transitions.
     */
    VolunteerTaskDto updateTaskStatus(UUID volunteerId, boolean isAdmin, UUID taskId, VolunteerTask.TaskStatus newStatus);
}
