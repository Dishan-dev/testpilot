package com.testpilot.api.repository;

import com.testpilot.api.entity.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import java.util.*;

public interface RunRepository extends JpaRepository<TestRun, UUID> {
    Page<TestRun> findByProjectId(UUID projectId, Pageable page);
    Optional<TestRun> findFirstByProjectIdOrderByCreatedAtDesc(UUID projectId);
    boolean existsByProjectId(UUID projectId);
    long countByStatus(RunStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select r from TestRun r where r.id = :id")
    Optional<TestRun> lock(UUID id);
    @Query(value = "select * from test_runs where status = 'QUEUED' order by created_at, id limit 1 for update skip locked", nativeQuery = true)
    Optional<TestRun> claimNext();
    @Modifying @Query(value = """
        update test_runs set status = 'ERROR', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
        duration_ms = greatest(0, extract(epoch from (CURRENT_TIMESTAMP - started_at)) * 1000)::bigint,
        error_message = 'Worker lease expired. Outcome uncertain; no automatic retry.', lease_expires_at = null
        where id in (select id from test_runs where status = 'RUNNING' and lease_expires_at <= CURRENT_TIMESTAMP
        order by lease_expires_at limit 100 for update skip locked)
        """, nativeQuery = true)
    int expireClaims();
}
