package com.donateconnect.service;

import com.donateconnect.exception.EmailDeliveryException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;
    private java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(5)).build();

    @Value("${app.mail.from:noreply@donateconnect.com}")
    private String fromEmail;

    @Value("${app.mail.provider:auto}")
    private String provider;

    @Value("${app.mail.brevo-api-key:}")
    private String brevoApiKey;

    @Value("${app.mail.brevo-url:https://api.brevo.com/v3/smtp/email}")
    private String brevoApiUrl;

    @PostConstruct
    public void init() {
        log.info("EmailService initialized with provider: {}, fromEmail: {}", provider, fromEmail);
    }

    public void sendOtpEmail(String toEmail, String otp) {
        String subject = "Your DonateConnect Verification Code";
        String body = "Welcome to DonateConnect!\n\nYour One-Time Password (OTP) for login is: " + otp + "\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.";
        try {
            sendEmail(toEmail, subject, body);
            log.info("OTP email sent successfully to {}", toEmail);
        } catch (EmailDeliveryException ede) {
            throw ede;
        } catch (Exception e) {
            log.error("Failed to send OTP email to {}: {}", toEmail, e.getMessage());
            throw new EmailDeliveryException("Failed to send email.", e);
        }
    }

    public void sendNotificationEmail(String toEmail, String subject, String body) {
        try {
            sendEmail(toEmail, subject, body);
            log.info("Notification email sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send notification email to {}: {}", toEmail, e.getMessage());
        }
    }

    private void sendEmail(String to, String subject, String textContent) throws Exception {
        if ("brevo".equalsIgnoreCase(provider) || "api".equalsIgnoreCase(provider)) {
            sendViaBrevoHttp(to, subject, textContent);
        } else if ("smtp".equalsIgnoreCase(provider)) {
            sendViaSmtp(to, subject, textContent);
        } else {
            // Auto mode: If BREVO_API_KEY is configured, prefer Brevo HTTP API (HTTPS port 443,
            // which bypasses Render Free Tier outbound SMTP port restrictions). Otherwise, use SMTP.
            if (brevoApiKey != null && !brevoApiKey.isBlank()) {
                sendViaBrevoHttp(to, subject, textContent);
            } else {
                sendViaSmtp(to, subject, textContent);
            }
        }
    }

    private void sendViaSmtp(String to, String subject, String textContent) {
        if (fromEmail == null || fromEmail.isBlank()) {
            throw new EmailDeliveryException("Failed to send email: sender address not configured");
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(textContent);

        if (mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl) {
            int originalPort = impl.getPort();
            try {
                impl.send(message);
            } catch (org.springframework.mail.MailSendException mse) {
                if (originalPort == 587 && isConnectionTimeoutOrRefused(mse)) {
                    log.warn("SMTP connection failed on port 587 (connection timeout/blocked). Attempting fallback to port 2525...");
                    impl.setPort(2525);
                    try {
                        impl.send(message);
                        log.info("Email sent successfully via SMTP fallback port 2525 to {}", to);
                        return;
                    } catch (Exception fallbackEx) {
                        log.error("SMTP fallback on port 2525 also failed: {}", fallbackEx.getMessage());
                        throw mse;
                    } finally {
                        impl.setPort(originalPort);
                    }
                }
                throw mse;
            }
        } else {
            mailSender.send(message);
        }
    }

    private boolean isConnectionTimeoutOrRefused(org.springframework.mail.MailSendException mse) {
        if (mse.getMessage() != null && (mse.getMessage().contains("timed out") || mse.getMessage().contains("Connection refused"))) {
            return true;
        }
        for (Exception subEx : mse.getMessageExceptions()) {
            Throwable cause = subEx;
            while (cause != null) {
                if (cause instanceof java.net.SocketTimeoutException
                        || cause instanceof java.net.ConnectException
                        || cause.getClass().getName().contains("MailConnectException")) {
                    return true;
                }
                cause = cause.getCause();
            }
        }
        Throwable cause = mse.getCause();
        while (cause != null) {
            if (cause instanceof java.net.SocketTimeoutException
                    || cause instanceof java.net.ConnectException
                    || cause.getClass().getName().contains("MailConnectException")) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    void sendViaBrevoHttp(String to, String subject, String textContent) throws Exception {
        if (brevoApiKey == null || brevoApiKey.isBlank()) {
            throw new IllegalArgumentException("BREVO_API_KEY is not set for Brevo provider");
        }
        
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("sender", java.util.Map.of("email", fromEmail, "name", "DonateConnect"));
        payload.put("to", java.util.List.of(java.util.Map.of("email", to)));
        payload.put("subject", subject);
        payload.put("textContent", textContent);
        
        String json = objectMapper.writeValueAsString(payload);
        
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(brevoApiUrl))
                .header("api-key", brevoApiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(java.time.Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
                
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            log.error("Brevo API error: HTTP {} - {}", response.statusCode(), response.body());
            throw new RuntimeException("Brevo API error: " + response.statusCode());
        }
    }
}
