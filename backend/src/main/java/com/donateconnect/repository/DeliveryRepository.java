package com.donateconnect.repository;

import com.donateconnect.entity.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Delivery d where d.id = :id")
    Optional<Delivery> findByIdForUpdate(@Param("id") UUID id);

    List<Delivery> findByVolunteerId(UUID volunteerId);
    Optional<Delivery> findByDonationId(UUID donationId);
    boolean existsByProofImageUrl(String proofImageUrl);
    boolean existsByDonationIdAndStatusIn(UUID donationId, List<com.donateconnect.entity.DeliveryStatus> statuses);
    boolean existsByVolunteerIdAndStatusIn(UUID volunteerId, List<com.donateconnect.entity.DeliveryStatus> statuses);
    void deleteByDonationId(UUID donationId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Delivery d SET d.volunteer = null WHERE d.volunteer.id = :volunteerId")
    void clearVolunteerByVolunteerId(@org.springframework.data.repository.query.Param("volunteerId") UUID volunteerId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Delivery d SET d.lastLat = :lat, d.lastLng = :lng, d.lastLocationAt = :time WHERE d.id = :id")
    void updateLocation(@org.springframework.data.repository.query.Param("id") UUID id, @org.springframework.data.repository.query.Param("lat") Double lat, @org.springframework.data.repository.query.Param("lng") Double lng, @org.springframework.data.repository.query.Param("time") java.time.LocalDateTime time);
}
