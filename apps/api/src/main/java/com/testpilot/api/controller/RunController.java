package com.testpilot.api.controller;

import com.testpilot.api.dto.ExecutionDtos.*;
import com.testpilot.api.service.ExecutionService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api")
public class RunController {
    private final ExecutionService executions;
    public RunController(ExecutionService executions) { this.executions=executions; }
    @GetMapping("/dashboard") public Dashboard dashboard() { return executions.dashboard(); }
    @GetMapping("/runs") public PageView<RunView> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return executions.list(null,page,size); }
    @GetMapping("/runs/{id}") public RunView get(@PathVariable UUID id) { return executions.get(id); }
    @GetMapping("/runs/{id}/results") public List<ResultView> results(@PathVariable UUID id) { return executions.results(id); }
    @PostMapping("/runs/{id}/cancel") public RunView cancel(@PathVariable UUID id) { return executions.cancel(id); }
    @GetMapping(value="/runs/{id}/screenshot",produces=MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> screenshot(@PathVariable UUID id,@RequestParam long expires,@RequestParam String signature) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff")
            .header("Content-Disposition","inline; filename=\"screenshot.png\"").header("Referrer-Policy","no-referrer")
            .body(executions.screenshot(id,expires,signature));
    }
}
