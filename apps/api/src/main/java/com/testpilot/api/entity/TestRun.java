package com.testpilot.api.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "test_runs")
public class TestRun {
    @Id public UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "project_id") public Project project;
    @Column(nullable = false, length = 2048) public String requestedUrl;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 16) public RunStatus status;
    public Instant startedAt;
    public Instant completedAt;
    public Long durationMs;
    @Column(length = 4000) public String errorMessage;
    public UUID attemptId;
    public UUID claimToken;
    public Instant leaseExpiresAt;
    public Instant deadlineAt;
    @Column(nullable = false) public Instant createdAt;
    @Column(nullable = false) public Instant updatedAt;
    public UUID getId() { return id; }
}
