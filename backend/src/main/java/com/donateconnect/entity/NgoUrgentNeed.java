package com.donateconnect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ngo_urgent_needs", indexes = {
    @Index(name = "idx_urgent_ngo", columnList = "ngo_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NgoUrgentNeed {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "ngo_id", nullable = false)
    private NGOProfile ngo;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, columnDefinition = "varchar(20) default 'ACTIVE'")
    @Builder.Default
    private UrgentNeedStatus status = UrgentNeedStatus.ACTIVE;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "quantity")
    private Integer quantity;

    @Column(name = "fulfilled_quantity")
    @Builder.Default
    private Integer fulfilledQuantity = 0;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public UrgentNeedStatus getStatus() {
        if (status == null) {
            return active ? UrgentNeedStatus.ACTIVE : UrgentNeedStatus.COMPLETED;
        }
        return status;
    }

    public Integer getFulfilledQuantity() {
        return fulfilledQuantity != null ? fulfilledQuantity : 0;
    }
}
