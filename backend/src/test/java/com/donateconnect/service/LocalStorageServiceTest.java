package com.donateconnect.service;

import com.donateconnect.entity.StoredFile;
import com.donateconnect.repository.StoredFileRepository;
import com.donateconnect.service.impl.LocalStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LocalStorageServiceTest {

    private StoredFileRepository storedFileRepository;
    private LocalStorageService storageService;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        storedFileRepository = mock(StoredFileRepository.class);
        storageService = new LocalStorageService(storedFileRepository, tempDir.toString());
        storageService.init();
    }

    @Test
    void store_persistsToDatabaseAndWritesToDiskCache() throws IOException {
        byte[] content = "dummy-image-bytes".getBytes();
        String resultUrl = storageService.store(content, "donation-photo.jpg");

        assertNotNull(resultUrl);
        assertTrue(resultUrl.startsWith("/api/donations/photo/"));
        assertTrue(resultUrl.endsWith(".jpg"));

        // Verify saved to database repository
        ArgumentCaptor<StoredFile> captor = ArgumentCaptor.forClass(StoredFile.class);
        verify(storedFileRepository).save(captor.capture());
        StoredFile saved = captor.getValue();
        assertEquals("image/jpeg", saved.getContentType());
        assertArrayEquals(content, saved.getData());

        // Verify written to temp disk cache
        String filename = resultUrl.substring(resultUrl.lastIndexOf('/') + 1);
        Path cachedFile = tempDir.resolve(filename);
        assertTrue(Files.exists(cachedFile));
        assertArrayEquals(content, Files.readAllBytes(cachedFile));
    }

    @Test
    void store_rejectsDisallowedFileExtensions() {
        byte[] content = "malicious".getBytes();
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                storageService.store(content, "script.exe")
        );
        assertTrue(ex.getMessage().contains("File type not allowed"));
        verifyNoInteractions(storedFileRepository);
    }

    @Test
    void load_servesFromDiskCacheWhenPresent() throws IOException {
        String filename = "cached-photo.png";
        byte[] content = "cached-bytes".getBytes();
        Files.write(tempDir.resolve(filename), content);

        byte[] loaded = storageService.load(filename);

        assertArrayEquals(content, loaded);
        // Did not need to query database because disk cache hit
        verify(storedFileRepository, never()).findByFilename(filename);
    }

    @Test
    void load_rehydratesFromDatabaseWhenDiskCacheMiss() throws IOException {
        String filename = "db-only-photo.jpg";
        byte[] content = "rehydrated-bytes".getBytes();

        StoredFile storedFile = StoredFile.builder()
                .filename(filename)
                .contentType("image/jpeg")
                .data(content)
                .fileSize(content.length)
                .build();

        when(storedFileRepository.findByFilename(filename)).thenReturn(Optional.of(storedFile));

        // Disk cache is empty initially
        assertFalse(Files.exists(tempDir.resolve(filename)));

        byte[] loaded = storageService.load(filename);

        assertArrayEquals(content, loaded);
        // Verify disk cache was rehydrated
        assertTrue(Files.exists(tempDir.resolve(filename)));
        assertArrayEquals(content, Files.readAllBytes(tempDir.resolve(filename)));
    }

    @Test
    void load_throwsIOExceptionWhenNotFoundAnywhere() {
        String filename = "missing.jpg";
        when(storedFileRepository.findByFilename(filename)).thenReturn(Optional.empty());

        assertThrows(IOException.class, () -> storageService.load(filename));
    }

    @Test
    void delete_removesFromBothDatabaseAndDisk() throws IOException {
        String filename = "delete-me.jpg";
        Path filePath = tempDir.resolve(filename);
        Files.write(filePath, "data".getBytes());
        assertTrue(Files.exists(filePath));

        storageService.delete(filename);

        verify(storedFileRepository).deleteById(filename);
        assertFalse(Files.exists(filePath));
    }
}

