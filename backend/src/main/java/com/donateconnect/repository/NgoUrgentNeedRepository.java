package com.donateconnect.repository;

import com.donateconnect.entity.NgoUrgentNeed;
import com.donateconnect.entity.UrgentNeedStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NgoUrgentNeedRepository extends JpaRepository<NgoUrgentNeed, UUID> {
    List<NgoUrgentNeed> findByActiveTrueOrderByCreatedAtDesc();
    List<NgoUrgentNeed> findByStatusOrderByCreatedAtDesc(UrgentNeedStatus status);
    List<NgoUrgentNeed> findAllByOrderByCreatedAtDesc();
    List<NgoUrgentNeed> findByNgoIdOrderByCreatedAtDesc(UUID ngoId);
    void deleteByNgoId(UUID ngoId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM NgoUrgentNeed u WHERE u.id = :id")
    Optional<NgoUrgentNeed> findByIdWithLock(@Param("id") UUID id);
}
