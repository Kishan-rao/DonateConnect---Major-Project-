package com.donateconnect.repository;

import com.donateconnect.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID>, JpaSpecificationExecutor<AuditLog> {
    Page<AuditLog> findByAction(String action, Pageable pageable);
    Page<AuditLog> findByEntityType(String entityType, Pageable pageable);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE AuditLog a SET a.actor = null WHERE a.actor.id = :actorId")
    void clearActorByActorId(@org.springframework.data.repository.query.Param("actorId") UUID actorId);
}
