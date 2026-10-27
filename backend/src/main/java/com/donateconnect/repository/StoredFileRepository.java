package com.donateconnect.repository;

import com.donateconnect.entity.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoredFileRepository extends JpaRepository<StoredFile, String> {
    Optional<StoredFile> findByFilename(String filename);
    boolean existsByFilename(String filename);
}

