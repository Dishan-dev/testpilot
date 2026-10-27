package com.testpilot.api.repository;

import com.testpilot.api.entity.Project;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select p from Project p where p.id = :id")
    Optional<Project> lock(UUID id);
}
