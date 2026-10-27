package com.donateconnect.repository;

import com.donateconnect.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("SELECT c FROM Conversation c WHERE c.donor.id = :userId OR c.ngo.user.id = :userId ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC")
    List<Conversation> findAllByParticipantUserId(@Param("userId") UUID userId);

    @Query("SELECT c FROM Conversation c WHERE c.id = :conversationId AND (c.donor.id = :userId OR c.ngo.user.id = :userId)")
    Optional<Conversation> findByIdAndParticipantUserId(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);

    @Query("SELECT c FROM Conversation c WHERE c.donor.id = :donorId AND c.ngo.id = :ngoId AND ((:donationId IS NULL AND c.donation IS NULL) OR c.donation.id = :donationId)")
    Optional<Conversation> findExactConversation(@Param("donorId") UUID donorId, @Param("ngoId") UUID ngoId, @Param("donationId") UUID donationId);

    @Query("SELECT c FROM Conversation c WHERE c.donor.id = :donorId AND c.ngo.id = :ngoId ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC")
    List<Conversation> findAllByDonorIdAndNgoId(@Param("donorId") UUID donorId, @Param("ngoId") UUID ngoId);
}

