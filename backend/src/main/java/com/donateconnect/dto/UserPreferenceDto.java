package com.donateconnect.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreferenceDto {
    private boolean emailNotifications;
    private boolean donationUpdates;
    private boolean deliveryUpdates;
    private boolean commentNotifications;
}
