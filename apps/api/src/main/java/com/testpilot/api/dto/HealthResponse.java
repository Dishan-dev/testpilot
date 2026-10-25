package com.testpilot.api.dto;

import java.time.Instant;

public record HealthResponse(String status, String application, Instant timestamp) {}
