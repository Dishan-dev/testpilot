package com.testpilot.api.entity;

import com.testpilot.api.dto.ExecutionDtos.FailedRequest;
import com.testpilot.api.dto.ExecutionDtos.ExecutionError;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity @Table(name = "test_results")
public class TestResult {
    @Id public UUID id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "test_run_id") public TestRun testRun;
    @Column(nullable = false, length = 2048) public String requestedUrl;
    @Column(length = 4000) public String finalUrl;
    @Column(length = 4000) public String pageTitle;
    public Integer httpStatusCode;
    @JdbcTypeCode(SqlTypes.JSON) public List<String> consoleErrors;
    @JdbcTypeCode(SqlTypes.JSON) public List<String> pageErrors;
    @JdbcTypeCode(SqlTypes.JSON) public List<FailedRequest> failedRequests;
    @JdbcTypeCode(SqlTypes.JSON) public List<ExecutionError> executionErrors;
    @Column(length = 200) public String screenshotPath;
    public long executionDurationMs;
    public int droppedEvidenceCount;
    public Instant createdAt;
}
