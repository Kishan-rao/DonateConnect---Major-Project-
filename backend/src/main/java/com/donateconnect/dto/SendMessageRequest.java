package com.donateconnect.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {

    @Size(max = 2000, message = "Message content must not exceed 2000 characters")
    private String content;

    @Size(max = 64, message = "Client message ID must not exceed 64 characters")
    private String clientMessageId;
}

