package com.testpilot.api.service;

import com.testpilot.api.dto.ExecutionDtos.*;
import com.testpilot.api.entity.*;
import com.testpilot.api.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.time.*;
import java.util.*;

@Service @Transactional
public class ExecutionService {
    private final RunRepository runs;
    private final ResultRepository results;
    private final ProjectRepository projectRepository;
    private final ProjectService projects;
    private final TargetPolicy targets;
    private final ArtifactStore artifacts;
    private final ArtifactAccess access;
    private final ObjectMapper json;
    private final int leaseSeconds;
    private final int maxAttemptSeconds;
    public ExecutionService(RunRepository runs, ResultRepository results, ProjectRepository projectRepository,
            ProjectService projects, TargetPolicy targets, ArtifactStore artifacts, ArtifactAccess access, ObjectMapper json,
            @Value("${testpilot.lease-seconds}") int leaseSeconds, @Value("${testpilot.max-attempt-seconds}") int maxAttemptSeconds) {
        this.runs=runs; this.results=results; this.projectRepository=projectRepository; this.projects=projects;
        this.targets=targets; this.artifacts=artifacts; this.access=access; this.json=json;
        if (leaseSeconds < 10 || leaseSeconds > 120 || maxAttemptSeconds < leaseSeconds || maxAttemptSeconds > 600) throw new IllegalArgumentException("Invalid lease configuration.");
        this.leaseSeconds=leaseSeconds; this.maxAttemptSeconds=maxAttemptSeconds;
    }
    private RunView view(TestRun r) { return new RunView(r.id,r.project.getId(),r.project.getName(),r.requestedUrl,r.status,r.startedAt,r.completedAt,r.durationMs,r.errorMessage,r.createdAt,r.updatedAt); }
    private TestRun require(UUID id) { return runs.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Test run not found.")); }
    public RunView create(UUID projectId) {
        Project p = projects.lock(projectId); // Serialize creation with deletion/configuration updates.
        TestRun r = new TestRun(); r.id=UUID.randomUUID(); r.project=p; r.requestedUrl=targets.validate(p.baseUrl);
        r.status=RunStatus.QUEUED; r.createdAt=Instant.now(); r.updatedAt=r.createdAt; runs.save(r); return view(r);
    }
    @Transactional(readOnly=true) public RunView get(UUID id) { return view(require(id)); }
    @Transactional(readOnly=true) public PageView<RunView> list(UUID projectId, int page, int size) {
        if (projectId != null) projects.require(projectId);
        var pageable = ProjectService.page(page,size);
        return ProjectService.view((projectId == null ? runs.findAll(pageable) : runs.findByProjectId(projectId,pageable)).map(this::view));
    }
    @Transactional(readOnly=true) public Dashboard dashboard() {
        return new Dashboard(projectRepository.count(),runs.count(),runs.countByStatus(RunStatus.PASSED),runs.countByStatus(RunStatus.FAILED),list(null,0,8).content());
    }
    @Scheduled(fixedDelayString="${testpilot.recovery-interval-ms:5000}")
    public void recover() { runs.expireClaims(); }
    public Optional<Claim> claim() {
        var next = runs.claimNext();
        if (next.isEmpty()) return Optional.empty();
        TestRun r=next.get();
        try { targets.validate(r.requestedUrl); }
        catch (ResponseStatusException e) { finish(r,RunStatus.ERROR,"Target authorization was revoked before execution."); return Optional.empty(); }
        Instant now=Instant.now(); r.status=RunStatus.RUNNING; r.startedAt=now; r.updatedAt=now;
        r.attemptId=UUID.randomUUID(); r.claimToken=UUID.randomUUID(); r.deadlineAt=now.plusSeconds(maxAttemptSeconds); r.leaseExpiresAt=now.plusSeconds(leaseSeconds);
        return Optional.of(claimView(r));
    }
    private Claim claimView(TestRun r) { return new Claim(r.id,r.project.getId(),r.requestedUrl,"NAVIGATION_SMOKE",r.attemptId,r.claimToken,r.leaseExpiresAt,r.deadlineAt); }
    private TestRun ownership(UUID id, UUID attempt, UUID token) {
        TestRun r=runs.lock(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Test run not found."));
        if (!Objects.equals(r.attemptId,attempt) || !Objects.equals(r.claimToken,token)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Claim does not own this attempt.");
        return r;
    }
    private void live(TestRun r) {
        if (r.status != RunStatus.RUNNING || r.leaseExpiresAt == null || !r.leaseExpiresAt.isAfter(Instant.now()) || !r.deadlineAt.isAfter(Instant.now()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Claim expired or run is no longer running.");
    }
    public Claim heartbeat(UUID id, ClaimProof proof) {
        TestRun r=ownership(id,proof.attemptId(),proof.claimToken()); live(r);
        Instant renewed=Instant.now().plusSeconds(leaseSeconds); r.leaseExpiresAt=renewed.isBefore(r.deadlineAt)?renewed:r.deadlineAt; r.updatedAt=Instant.now(); return claimView(r);
    }
    private void finish(TestRun r, RunStatus status, String error) {
        r.status=status; r.errorMessage=error; r.completedAt=Instant.now(); r.updatedAt=r.completedAt;
        r.durationMs=r.startedAt == null ? 0 : Math.max(0,Duration.between(r.startedAt,r.completedAt).toMillis()); r.leaseExpiresAt=null;
    }
    public RunView fail(UUID id, Failure failure) {
        TestRun r=ownership(id,failure.attemptId(),failure.claimToken());
        if (r.status == RunStatus.ERROR && Objects.equals(r.errorMessage,failure.message())) return view(r);
        live(r); finish(r,RunStatus.ERROR,failure.message()); return view(r);
    }
    public RunView cancel(UUID id) {
        TestRun r=runs.lock(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Test run not found."));
        if (r.status != RunStatus.QUEUED) throw new ResponseStatusException(HttpStatus.CONFLICT,"Only queued runs can be cancelled.");
        finish(r,RunStatus.CANCELLED,"Cancelled before execution."); return view(r);
    }
    public RunView complete(UUID id, ResultInput input) {
        TestRun r=ownership(id,input.attemptId(),input.claimToken());
        if (!Set.of(RunStatus.PASSED,RunStatus.FAILED,RunStatus.ERROR).contains(input.status()) || !r.requestedUrl.equals(input.requestedUrl()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid result status or requested URL.");
        if (input.status() == RunStatus.PASSED && (input.httpStatusCode() == null || input.httpStatusCode() < 200 || input.httpStatusCode() >= 400 || input.screenshotBase64() == null))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Passed navigation requires HTTP 2xx/3xx and a screenshot.");
        if (r.status.terminal() && r.status == input.status() && results.findByTestRunId(id).isPresent()) return view(r); // Idempotent acknowledgement, never overwrite.
        live(r);
        byte[] png=null;
        if (input.screenshotBase64() != null) {
            try { png=Base64.getDecoder().decode(input.screenshotBase64()); }
            catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid PNG encoding."); }
            byte[] magic={(byte)137,80,78,71,13,10,26,10};
            if (png.length < 24 || png.length > 5*1024*1024 || !Arrays.equals(Arrays.copyOf(png,8),magic)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Screenshot must be a PNG no larger than 5 MiB.");
        }
        TestResult result=new TestResult(); result.id=UUID.randomUUID(); result.testRun=r; result.requestedUrl=r.requestedUrl;
        result.finalUrl=input.finalUrl(); result.pageTitle=input.pageTitle(); result.httpStatusCode=input.httpStatusCode();
        result.consoleErrors=input.consoleErrors(); result.pageErrors=input.pageErrors(); result.failedRequests=input.failedRequests(); result.executionErrors=input.executionErrors();
        result.executionDurationMs=input.executionDurationMs(); result.droppedEvidenceCount=input.droppedEvidenceCount(); result.createdAt=Instant.now();
        try { result.screenshotPath=artifacts.save(id,png,json.writeValueAsString(resultView(result,false))); }
        catch (IOException e) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Artifact storage is unavailable. Retry while the claim remains valid."); }
        results.save(result); finish(r,input.status(),input.executionErrors().isEmpty()?null:input.executionErrors().getFirst().message()); return view(r);
    }
    private ResultView resultView(TestResult r, boolean signed) {
        return new ResultView(r.id,r.testRun.getId(),r.requestedUrl,r.finalUrl,r.pageTitle,r.httpStatusCode,r.consoleErrors,r.pageErrors,r.failedRequests,r.executionErrors,r.executionDurationMs,r.droppedEvidenceCount,r.createdAt,signed && r.screenshotPath!=null?access.url(r.testRun.getId()):null);
    }
    @Transactional(readOnly=true) public List<ResultView> results(UUID id) { require(id); return results.findByTestRunId(id).map(r -> List.of(resultView(r,true))).orElse(List.of()); }
    @Transactional(readOnly=true) public byte[] screenshot(UUID id,long expires,String signature) {
        access.authorize(id,expires,signature);
        TestResult r=results.findByTestRunId(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Screenshot not found."));
        if (r.screenshotPath == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Screenshot not found.");
        try { return artifacts.screenshot(id,r.screenshotPath); }
        catch (IOException e) { throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Screenshot unavailable."); }
    }
}
