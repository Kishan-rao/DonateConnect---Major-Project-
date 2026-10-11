package com;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class PasswordHashGeneratorTest {

    @Test
    void generateDeliveryPasswordHash() {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        String password = "deliver1234";
        String hash = encoder.encode(password);

        System.out.println("DELIVERY_BCRYPT_HASH=" + hash);

        assert encoder.matches(password, hash);
    }
}
