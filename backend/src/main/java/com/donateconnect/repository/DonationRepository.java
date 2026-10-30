package com.donateconnect.repository;

import com.donateconnect.entity.Category;
import com.donateconnect.entity.Donation;
import com.donateconnect.entity.DonationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DonationRepository extends JpaRepository<Donation, UUID>, JpaSpecificationExecutor<Donation> {

    @EntityGraph(attributePaths = {"donor", "ngo", "ngo.user"})
    Page<Donation> findByDonorIdOrderByCreatedAtDesc(UUID donorId, Pageable pageable);

    @EntityGraph(attributePaths = {"donor", "ngo", "ngo.user"})
    Page<Donation> findByNgoIdOrderByCreatedAtDesc(UUID ngoId, Pageable pageable);

    // Legacy list-based queries kept for backward compatibility
    List<Donation> findByDonorIdOrderByCreatedAtDesc(UUID donorId);
    List<Donation> findByNgoIdOrderByCreatedAtDesc(UUID ngoId);

    /**
     * Retrieve a single donation by primary key, scoped to the owning donor.
     * Returns empty if the donation does not exist OR belongs to a different donor.
     * Used by the donor self-service detail endpoint to enforce ownership at the
     * database level rather than loading all donations and filtering in memory.
     */
    @EntityGraph(attributePaths = {"donor", "ngo", "ngo.user"})
    Optional<Donation> findByIdAndDonorId(UUID donationId, UUID donorId);

    long countByStatus(DonationStatus status);
    long countByCategory(Category category);
    boolean existsByDonorIdAndStatusIn(UUID donorId, List<DonationStatus> statuses);
    boolean existsByNgoIdAndStatusIn(UUID ngoId, List<DonationStatus> statuses);

    @EntityGraph(attributePaths = {"donor", "ngo"})
    List<Donation> findByUrgentNeedIdOrderByCreatedAtDesc(UUID urgentNeedId);

    @Query("SELECT COALESCE(SUM(COALESCE(d.quantity, 1)), 0) FROM Donation d WHERE d.urgentNeed.id = :urgentNeedId AND d.status = :status")
    int sumQuantityByUrgentNeedIdAndStatus(
            @org.springframework.data.repository.query.Param("urgentNeedId") UUID urgentNeedId,
            @org.springframework.data.repository.query.Param("status") DonationStatus status
    );

    /**
     * Find ACCEPTED donations that have NOT been claimed by any volunteer yet.
     * Used for the volunteer "available pickups" endpoint.
     */
    @Query("SELECT d FROM Donation d WHERE d.status = com.donateconnect.entity.DonationStatus.ACCEPTED " +
           "AND NOT EXISTS (SELECT t FROM VolunteerTask t WHERE t.donation = d AND t.status <> com.donateconnect.entity.VolunteerTask.TaskStatus.CANCELLED)")
    Page<Donation> findAvailableForPickup(Pageable pageable);
}
