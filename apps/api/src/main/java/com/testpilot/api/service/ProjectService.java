package com.testpilot.api.service;

import com.testpilot.api.dto.ExecutionDtos.*;
import com.testpilot.api.entity.Project;
import com.testpilot.api.repository.*;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.UUID;

@Service @Transactional
public class ProjectService {
    private final ProjectRepository projects;
    private final RunRepository runs;
    private final TargetPolicy targets;
    public ProjectService(ProjectRepository projects, RunRepository runs, TargetPolicy targets) { this.projects=projects; this.runs=runs; this.targets=targets; }
    public static Pageable page(int page, int size) {
        if (page < 0 || page > 100000 || size < 1 || size > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page must be 0–100000 and size 1–100.");
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
    }
    public static <T> PageView<T> view(Page<T> page) { return new PageView<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages()); }
    public Project require(UUID id) { return projects.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found.")); }
    public Project lock(UUID id) { return projects.lock(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found.")); }
    private ProjectView view(Project p) {
        return new ProjectView(p.id, p.name, p.description, p.baseUrl, p.createdAt, p.updatedAt,
                runs.findFirstByProjectIdOrderByCreatedAtDesc(p.id).map(r -> r.status).orElse(null));
    }
    @Transactional(readOnly=true) public PageView<ProjectView> list(int page, int size) { return view(projects.findAll(page(page,size)).map(this::view)); }
    @Transactional(readOnly=true) public ProjectView get(UUID id) { return view(require(id)); }
    public ProjectView create(ProjectInput input) {
        Project p = new Project(); p.id = UUID.randomUUID(); p.createdAt = Instant.now();
        update(p, input); projects.save(p); return view(p);
    }
    public ProjectView update(UUID id, ProjectInput input) { Project p = lock(id); update(p,input); return view(p); }
    private void update(Project p, ProjectInput input) {
        p.baseUrl = targets.validate(input.baseUrl().trim()); p.name=input.name().trim(); p.description=input.description(); p.updatedAt=Instant.now();
    }
    public void delete(UUID id) {
        Project p = lock(id);
        if (runs.existsByProjectId(id)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Project has test history. Deletion is blocked to preserve evidence.");
        projects.delete(p);
    }
}
