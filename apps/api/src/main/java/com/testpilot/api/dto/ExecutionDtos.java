package com.testpilot.api.dto;

import com.testpilot.api.entity.RunStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ExecutionDtos {
    private ExecutionDtos() {}
    public record ProjectInput(@NotBlank @Size(max=120) String name, @Size(max=2000) String description,
                               @NotBlank @Size(max=2048) String baseUrl) {}
    public record ProjectView(UUID id, String name, String description, String baseUrl, Instant createdAt,
                              Instant updatedAt, RunStatus recentStatus) {}
    public record RunView(UUID id, UUID projectId, String projectName, String requestedUrl, RunStatus status,
                          Instant startedAt, Instant completedAt, Long durationMs, String errorMessage,
                          Instant createdAt, Instant updatedAt) {}
    public record PageView<T>(List<T> content, int page, int size, long totalElements, int totalPages) {}
    public record Dashboard(long totalProjects, long totalRuns, long passedRuns, long failedRuns, List<RunView> recentRuns) {}
    public record Claim(UUID runId, UUID projectId, String requestedUrl, String testType, UUID attemptId,
                        UUID claimToken, Instant leaseExpiresAt, Instant deadlineAt) {}
    public record ClaimProof(@NotNull UUID attemptId, @NotNull UUID claimToken) {}
    public record Failure(@NotNull UUID attemptId, @NotNull UUID claimToken, @NotBlank @Size(max=4000) String message) {}
    public record FailedRequest(@NotNull @Size(max=4000) String url, @NotNull @Size(max=30) String method,
                                @NotNull @Size(max=4000) String failure) {}
    public record ExecutionError(@NotBlank @Size(max=30) String phase, @NotNull @Size(max=4000) String message) {}
    public record ResultInput(@NotNull UUID attemptId, @NotNull UUID claimToken, @NotNull RunStatus status,
                              @NotBlank @Size(max=2048) String requestedUrl, @Size(max=4000) String finalUrl,
                              @Size(max=4000) String pageTitle, @Min(100) @Max(599) Integer httpStatusCode,
                              @NotNull @Size(max=200) List<@NotNull @Size(max=4000) String> consoleErrors,
                              @NotNull @Size(max=200) List<@NotNull @Size(max=4000) String> pageErrors,
                              @NotNull @Size(max=200) List<@NotNull @Valid FailedRequest> failedRequests,
                              @NotNull @Size(max=20) List<@NotNull @Valid ExecutionError> executionErrors,
                              @Min(0) @Max(600000) long executionDurationMs, @Min(0) int droppedEvidenceCount,
                              @Size(max=6990508) String screenshotBase64) {}
    public record ResultView(UUID id, UUID testRunId, String requestedUrl, String finalUrl, String pageTitle,
                             Integer httpStatusCode, List<String> consoleErrors, List<String> pageErrors,
                             List<FailedRequest> failedRequests, List<ExecutionError> executionErrors,
                             long executionDurationMs, int droppedEvidenceCount, Instant createdAt, String screenshotUrl) {}
}
