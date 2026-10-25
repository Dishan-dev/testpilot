package com.testpilot.api.controller;

import com.testpilot.api.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.Instant;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("UP", "testpilot-api", Instant.now());
    }
}
