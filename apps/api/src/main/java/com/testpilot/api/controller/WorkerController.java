package com.testpilot.api.controller;

import com.testpilot.api.dto.ExecutionDtos.*;
import com.testpilot.api.service.ExecutionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/internal/worker")
public class WorkerController {
    private final ExecutionService executions;
    public WorkerController(ExecutionService executions) { this.executions=executions; }
    @PostMapping("/claims") public ResponseEntity<Claim> claim() { return executions.claim().map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build()); }
    @PostMapping("/runs/{id}/heartbeat") public Claim heartbeat(@PathVariable UUID id,@Valid @RequestBody ClaimProof proof) { return executions.heartbeat(id,proof); }
    @PostMapping("/runs/{id}/results") public RunView complete(@PathVariable UUID id,@Valid @RequestBody ResultInput result) { return executions.complete(id,result); }
    @PostMapping("/runs/{id}/failure") public RunView fail(@PathVariable UUID id,@Valid @RequestBody Failure failure) { return executions.fail(id,failure); }
}
