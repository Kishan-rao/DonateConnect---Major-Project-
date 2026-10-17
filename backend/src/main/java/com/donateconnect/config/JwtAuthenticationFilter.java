package com.donateconnect.config;

import com.donateconnect.entity.Role;
import com.donateconnect.entity.User;
import com.donateconnect.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.lang.NonNull;

import java.io.IOException;
import java.util.Collections;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtUtils jwtUtils, UserRepository userRepository) {
        this.jwtUtils = jwtUtils;
        this.userRepository = userRepository;
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String uri = request.getRequestURI();
        String servletPath = request.getServletPath();
        return isPublicPath(uri) || isPublicPath(servletPath);
    }

    private boolean isPublicPath(String path) {
        if (!StringUtils.hasText(path)) {
            return false;
        }
        return path.endsWith("/api/auth/login")
                || path.endsWith("/api/auth/register")
                || path.endsWith("/api/auth/verify-otp")
                || path.endsWith("/api/auth/resend-otp")
                || path.endsWith("/api/health")
                || path.contains("/ws");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String jwt = parseJwt(request);

        if (jwt == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (!jwtUtils.validateToken(jwt)) {
                SecurityContextHolder.clearContext();
                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Invalid authentication token."
                );
                return;
            }

            String email = jwtUtils.getEmailFromToken(jwt);
            UUID userId = Objects.requireNonNull(jwtUtils.getUserIdFromToken(jwt));

            Optional<User> userOptional = userRepository.findById(userId);

            if (userOptional.isEmpty()) {
                SecurityContextHolder.clearContext();
                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Account not found."
                );
                return;
            }

            User user = userOptional.get();

            if (email == null || !user.getEmail().equalsIgnoreCase(email)) {
                SecurityContextHolder.clearContext();
                response.sendError(
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Invalid authentication token."
                );
                return;
            }

            if (!user.isApproved() && user.getRole() != Role.DONOR && user.getRole() != Role.ADMIN) {
                SecurityContextHolder.clearContext();
                response.sendError(
                        HttpServletResponse.SC_FORBIDDEN,
                        "Account pending admin approval or approval revoked."
                );
                return;
            }

            SimpleGrantedAuthority authority =
                    new SimpleGrantedAuthority("ROLE_" + user.getRole().name());

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            user.getEmail(),
                            null,
                            Collections.singletonList(authority)
                    );

            authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            log.warn("JWT authentication failed: {}", e.getMessage());

            response.sendError(
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "Authentication failed."
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth)
                && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
