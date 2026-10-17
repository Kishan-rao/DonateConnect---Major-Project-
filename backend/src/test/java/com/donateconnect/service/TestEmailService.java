package com.donateconnect.service;

import com.donateconnect.exception.EmailDeliveryException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
    "app.mail.provider=brevo",
    "BREVO_API_KEY=test-api-key",
    "app.cors.allowed-origins=http://localhost:3000"
})
@ExtendWith(OutputCaptureExtension.class)
public class TestEmailService {

    @Autowired
    private JavaMailSender javaMailSender;

    @Autowired
    private ObjectMapper objectMapper;

    private static HttpServer mockServer;
    private static int mockPort;
    private static AtomicBoolean simulateTimeout = new AtomicBoolean(false);
    private static AtomicBoolean simulateFailure = new AtomicBoolean(false);

    @BeforeAll
    public static void setupServer() throws Exception {
        mockServer = HttpServer.create(new InetSocketAddress(0), 0);
        mockServer.createContext("/v3/smtp/email", exchange -> {
            if (simulateTimeout.get()) {
                try { Thread.sleep(2000); } catch (InterruptedException e) {}
                exchange.sendResponseHeaders(201, 0);
                exchange.close();
                return;
            }
            if (simulateFailure.get()) {
                exchange.sendResponseHeaders(400, 0);
                exchange.close();
                return;
            }
            String apiKey = exchange.getRequestHeaders().getFirst("api-key");
            if (!"test-api-key".equals(apiKey)) {
                exchange.sendResponseHeaders(401, 0);
            } else {
                exchange.sendResponseHeaders(201, 0);
            }
            exchange.close();
        });
        mockServer.start();
        mockPort = mockServer.getAddress().getPort();
    }

    @AfterAll
    public static void stopServer() {
        if (mockServer != null) {
            mockServer.stop(0);
        }
    }

    private EmailService setupCustomService() {
        EmailService customService = new EmailService(javaMailSender, objectMapper);
        ReflectionTestUtils.setField(customService, "provider", "brevo");
        ReflectionTestUtils.setField(customService, "brevoApiKey", "test-api-key");
        ReflectionTestUtils.setField(customService, "fromEmail", "test@test.com");
        ReflectionTestUtils.setField(customService, "brevoApiUrl", "http://localhost:" + mockPort + "/v3/smtp/email");
        return customService;
    }

    @Test
    public void testSendOtpBrevoSuccess(CapturedOutput output) {
        simulateTimeout.set(false);
        simulateFailure.set(false);
        EmailService customService = setupCustomService();
        java.net.http.HttpClient customClient = java.net.http.HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(1)).build();
        ReflectionTestUtils.setField(customService, "httpClient", customClient);

        customService.sendOtpEmail("user@test.com", "SECRET_OTP_999");
        
        assertFalse(output.getOut().contains("SECRET_OTP_999"));
        assertFalse(output.getOut().contains("test-api-key"));
    }

    @Test
    public void testSendOtpBrevoApiFailure(CapturedOutput output) {
        simulateTimeout.set(false);
        simulateFailure.set(true);
        EmailService customService = setupCustomService();
        java.net.http.HttpClient customClient = java.net.http.HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(1)).build();
        ReflectionTestUtils.setField(customService, "httpClient", customClient);

        try {
            customService.sendOtpEmail("user@test.com", "SECRET_OTP_888");
            fail("Expected exception");
        } catch (RuntimeException e) {
            assertEquals("Failed to send email.", e.getMessage());
        }
        
        assertFalse(output.getOut().contains("SECRET_OTP_888"));
        assertFalse(output.getOut().contains("test-api-key"));
    }

    @Test
    public void testSendOtpBrevoTimeout(CapturedOutput output) {
        simulateTimeout.set(true);
        simulateFailure.set(false);
        EmailService customService = setupCustomService();
        java.net.http.HttpClient customClient = java.net.http.HttpClient.newBuilder().build();
        ReflectionTestUtils.setField(customService, "httpClient", customClient);

        ReflectionTestUtils.setField(customService, "brevoApiUrl", "http://localhost:" + mockPort + "/v3/smtp/email");

        try {
            customService.sendOtpEmail("user@test.com", "SECRET_OTP_777");
        } catch (Exception ignored) {
        }
        
        assertFalse(output.getOut().contains("SECRET_OTP_777"));
        assertFalse(output.getOut().contains("test-api-key"));
    }

    @Test
    public void testSendOtpSmtpSuccess(CapturedOutput output) {
        JavaMailSender mockMailSender = mock(JavaMailSender.class);
        EmailService customService = new EmailService(mockMailSender, objectMapper);
        ReflectionTestUtils.setField(customService, "provider", "smtp");
        ReflectionTestUtils.setField(customService, "fromEmail", "noreply@donateconnect.com");

        customService.sendOtpEmail("donor@test.com", "SECRET_OTP_123");

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mockMailSender, times(1)).send(messageCaptor.capture());

        SimpleMailMessage sentMessage = messageCaptor.getValue();
        assertEquals("noreply@donateconnect.com", sentMessage.getFrom());
        assertArrayEquals(new String[]{"donor@test.com"}, sentMessage.getTo());
        assertTrue(sentMessage.getSubject().contains("Verification Code"));
        assertTrue(sentMessage.getText().contains("SECRET_OTP_123"));

        // Crucial security check: OTP must never appear in application console / log output
        assertFalse(output.getOut().contains("SECRET_OTP_123"));
    }

    @Test
    public void testSendOtpSmtpAuthenticationFailure(CapturedOutput output) {
        JavaMailSender mockMailSender = mock(JavaMailSender.class);
        doThrow(new MailAuthenticationException("535 5.7.8 Authentication failed"))
                .when(mockMailSender).send(any(SimpleMailMessage.class));

        EmailService customService = new EmailService(mockMailSender, objectMapper);
        ReflectionTestUtils.setField(customService, "provider", "smtp");
        ReflectionTestUtils.setField(customService, "fromEmail", "noreply@donateconnect.com");

        EmailDeliveryException ex = assertThrows(
                EmailDeliveryException.class,
                () -> customService.sendOtpEmail("user@test.com", "SECRET_OTP_AUTH_FAIL")
        );

        assertEquals("Failed to send email.", ex.getMessage());
        assertInstanceOf(MailAuthenticationException.class, ex.getCause());
        // Verify OTP is not leaked anywhere in logs
        assertFalse(output.getOut().contains("SECRET_OTP_AUTH_FAIL"));
    }

    @Test
    public void testSendOtpSmtpSendFailure(CapturedOutput output) {
        JavaMailSender mockMailSender = mock(JavaMailSender.class);
        doThrow(new MailSendException("Connection timed out to smtp-relay.brevo.com"))
                .when(mockMailSender).send(any(SimpleMailMessage.class));

        EmailService customService = new EmailService(mockMailSender, objectMapper);
        ReflectionTestUtils.setField(customService, "provider", "smtp");
        ReflectionTestUtils.setField(customService, "fromEmail", "noreply@donateconnect.com");

        EmailDeliveryException ex = assertThrows(
                EmailDeliveryException.class,
                () -> customService.sendOtpEmail("user@test.com", "SECRET_OTP_TIMEOUT")
        );

        assertEquals("Failed to send email.", ex.getMessage());
        assertInstanceOf(MailSendException.class, ex.getCause());
        assertFalse(output.getOut().contains("SECRET_OTP_TIMEOUT"));
    }

    @Test
    public void testSendNotificationEmailSmtpSuccess() {
        JavaMailSender mockMailSender = mock(JavaMailSender.class);
        EmailService customService = new EmailService(mockMailSender, objectMapper);
        ReflectionTestUtils.setField(customService, "provider", "smtp");
        ReflectionTestUtils.setField(customService, "fromEmail", "noreply@donateconnect.com");

        customService.sendNotificationEmail("user@test.com", "Update", "Donation claimed");

        verify(mockMailSender, times(1)).send(any(SimpleMailMessage.class));
    }

    @Test
    public void testSendNotificationEmailSmtpFailureDoesNotThrow() {
        JavaMailSender mockMailSender = mock(JavaMailSender.class);
        doThrow(new MailSendException("Connection refused"))
                .when(mockMailSender).send(any(SimpleMailMessage.class));

        EmailService customService = new EmailService(mockMailSender, objectMapper);
        ReflectionTestUtils.setField(customService, "provider", "smtp");
        ReflectionTestUtils.setField(customService, "fromEmail", "noreply@donateconnect.com");

        // Notification failure is logged but does not throw to caller
        assertDoesNotThrow(() ->
                customService.sendNotificationEmail("user@test.com", "Update", "Donation claimed")
        );
    }

    @Test
    public void testAutoModeUsesBrevoWhenApiKeyPresent(CapturedOutput output) {
        simulateTimeout.set(false);
        simulateFailure.set(false);
        EmailService customService = setupCustomService();
        ReflectionTestUtils.setField(customService, "provider", "auto");
        ReflectionTestUtils.setField(customService, "brevoApiKey", "test-api-key");
        java.net.http.HttpClient customClient = java.net.http.HttpClient.newBuilder()
            .connectTimeout(java.time.Duration.ofSeconds(1)).build();
        ReflectionTestUtils.setField(customService, "httpClient", customClient);

        customService.sendOtpEmail("user@test.com", "SECRET_OTP_AUTO");
        assertFalse(output.getOut().contains("SECRET_OTP_AUTO"));
    }

    @Test
    public void testSmtpFallbackToPort2525When587TimesOut() {
        org.springframework.mail.javamail.JavaMailSenderImpl mockMailSender = mock(org.springframework.mail.javamail.JavaMailSenderImpl.class);
        when(mockMailSender.getPort()).thenReturn(587);

        doThrow(new MailSendException("Connection timed out to smtp-relay.brevo.com"))
                .doAnswer(invocation -> null)
                .when(mockMailSender).send(any(SimpleMailMessage.class));

        EmailService customService = new EmailService(mockMailSender, objectMapper);
        ReflectionTestUtils.setField(customService, "provider", "smtp");
        ReflectionTestUtils.setField(customService, "fromEmail", "noreply@donateconnect.com");

        assertDoesNotThrow(() -> customService.sendOtpEmail("user@test.com", "SECRET_OTP_FB"));

        verify(mockMailSender, times(2)).send(any(SimpleMailMessage.class));
        verify(mockMailSender).setPort(2525);
        verify(mockMailSender).setPort(587);
    }
}
