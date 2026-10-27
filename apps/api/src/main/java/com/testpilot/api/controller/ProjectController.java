package com.testpilot.api.controller;

import com.testpilot.api.dto.ExecutionDtos.*;
import com.testpilot.api.service.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projects;
    private final ExecutionService executions;
    public ProjectController(ProjectService projects, ExecutionService executions) { this.projects=projects; this.executions=executions; }
    @GetMapping public PageView<ProjectView> list(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return projects.list(page,size); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public ProjectView create(@Valid @RequestBody ProjectInput input) { return projects.create(input); }
    @GetMapping("/{id}") public ProjectView get(@PathVariable UUID id) { return projects.get(id); }
    @PutMapping("/{id}") public ProjectView update(@PathVariable UUID id,@Valid @RequestBody ProjectInput input) { return projects.update(id,input); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { projects.delete(id); }
    @PostMapping("/{id}/runs") @ResponseStatus(HttpStatus.ACCEPTED) public RunView run(@PathVariable UUID id) { return executions.create(id); }
    @GetMapping("/{id}/runs") public PageView<RunView> history(@PathVariable UUID id,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return executions.list(id,page,size); }
}
