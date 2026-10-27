package com.donateconnect.service.impl;

import com.donateconnect.entity.StoredFile;
import com.donateconnect.repository.StoredFileRepository;
import com.donateconnect.service.StorageService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class LocalStorageService implements StorageService {

    private static final Map<String, String> CONTENT_TYPE_MAP = Map.of(
            "jpg",  "image/jpeg",
            "jpeg", "image/jpeg",
            "png",  "image/png",
            "gif",  "image/gif",
            "webp", "image/webp"
    );

    // Allowed extensions for uploaded files to prevent malicious uploads
    private static final java.util.Set<String> ALLOWED_EXTENSIONS = java.util.Set.of(
            "jpg", "jpeg", "png", "gif", "webp"
    );

    private final StoredFileRepository storedFileRepository;
    private final Path uploadDir;

    public LocalStorageService(
            StoredFileRepository storedFileRepository,
            @Value("${app.storage.upload-dir:uploads/}") String uploadDirPath
    ) {
        this.storedFileRepository = storedFileRepository;
        this.uploadDir = Paths.get(uploadDirPath).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(uploadDir);
            log.info("Storage directory initialized at: {}", uploadDir);
        } catch (IOException e) {
            log.warn("Could not create local upload directory: {}", uploadDir, e);
        }
    }

    @Override
    public String store(byte[] data, String originalFilename) throws IOException {
        String extension = getExtension(originalFilename);

        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new IllegalArgumentException(
                "File type not allowed: " + extension + ". Only image files (jpg, jpeg, png, gif, webp) are permitted.");
        }

        // Generate a unique filename to prevent collisions and path traversal attacks
        String storedFilename = UUID.randomUUID() + "." + extension.toLowerCase();
        String contentType = CONTENT_TYPE_MAP.getOrDefault(extension.toLowerCase(), "image/jpeg");

        // 1. Persist to PostgreSQL database (survives Render container restarts & redeploys)
        try {
            StoredFile fileRecord = StoredFile.builder()
                    .filename(storedFilename)
                    .originalFilename(originalFilename)
                    .contentType(contentType)
                    .data(data)
                    .fileSize(data.length)
                    .build();
            storedFileRepository.save(fileRecord);
            log.info("Persisted photo to database: {} ({} bytes)", storedFilename, data.length);
        } catch (Exception e) {
            log.error("Failed to persist photo to database: {}", e.getMessage(), e);
            throw new IOException("Failed to save photo to database: " + e.getMessage(), e);
        }

        // 2. Also write to local cache for fast filesystem reads
        try {
            Files.createDirectories(uploadDir);
            Path filePath = uploadDir.resolve(storedFilename);
            Files.write(filePath, data);
            log.info("Cached photo to disk: {}", storedFilename);
        } catch (Exception e) {
            log.warn("Failed to cache photo to local disk (will still be served from database): {}", e.getMessage());
        }

        // Return the relative URL used to serve this file
        return "/api/donations/photo/" + storedFilename;
    }

    @Override
    public byte[] load(String filename) throws IOException {
        String safeName = sanitizeFilename(filename);

        // 1. Try local disk cache first
        Path filePath = uploadDir.resolve(safeName).normalize();
        if (filePath.startsWith(uploadDir) && Files.exists(filePath)) {
            try {
                return Files.readAllBytes(filePath);
            } catch (IOException e) {
                log.warn("Error reading cached file {}: {}", safeName, e.getMessage());
            }
        }

        // 2. Look up in PostgreSQL database
        Optional<StoredFile> storedFile = storedFileRepository.findByFilename(safeName);
        if (storedFile.isPresent()) {
            byte[] data = storedFile.get().getData();
            // Rehydrate local disk cache
            try {
                if (filePath.startsWith(uploadDir)) {
                    Files.createDirectories(uploadDir);
                    Files.write(filePath, data);
                    log.info("Rehydrated disk cache for photo: {}", safeName);
                }
            } catch (Exception e) {
                log.debug("Could not write rehydrated cache to disk: {}", e.getMessage());
            }
            return data;
        }

        throw new IOException("File not found: " + filename);
    }

    @Override
    public void delete(String filename) {
        String safeName = sanitizeFilename(filename);
        try {
            storedFileRepository.deleteById(safeName);
            log.info("Deleted photo record from database: {}", safeName);
        } catch (Exception e) {
            log.warn("Could not delete database record for {}: {}", safeName, e.getMessage());
        }

        try {
            Path filePath = uploadDir.resolve(safeName).normalize();
            if (filePath.startsWith(uploadDir)) {
                Files.deleteIfExists(filePath);
                log.info("Deleted photo file from disk: {}", safeName);
            }
        } catch (IOException e) {
            log.warn("Could not delete disk file {}: {}", safeName, e.getMessage());
        }
    }

    @Override
    public String getContentType(String filename) {
        String safeName = sanitizeFilename(filename);
        Optional<StoredFile> storedFile = storedFileRepository.findByFilename(safeName);
        if (storedFile.isPresent() && storedFile.get().getContentType() != null) {
            return storedFile.get().getContentType();
        }

        String ext = getExtension(safeName).toLowerCase();
        return CONTENT_TYPE_MAP.getOrDefault(ext, "application/octet-stream");
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1);
    }

    private String sanitizeFilename(String filename) {
        // Strip any path components, keep only the filename
        return Paths.get(filename).getFileName().toString();
    }
}
