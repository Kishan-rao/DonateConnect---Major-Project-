package com.donateconnect.service;

import com.donateconnect.service.impl.RoutingServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class RoutingServiceContextTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private RoutingService routingService;

    @Test
    @DisplayName("RoutingServiceImpl bean is instantiated and autowired into Spring ApplicationContext without no-arg constructor error")
    void testRoutingServiceBeanInstantiation() {
        assertThat(routingService).isNotNull();
        assertThat(routingService).isInstanceOf(RoutingServiceImpl.class);
        assertThat(applicationContext.getBean(RoutingService.class)).isSameAs(routingService);
    }
}

