package com.testpilot.api.repository;

import com.testpilot.api.entity.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ResultRepository extends JpaRepository<TestResult, UUID> {
    Optional<TestResult> findByTestRunId(UUID id);
}
