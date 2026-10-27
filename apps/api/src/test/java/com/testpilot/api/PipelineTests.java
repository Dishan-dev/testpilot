package com.testpilot.api;

import com.testpilot.api.dto.ExecutionDtos.*;
import com.testpilot.api.entity.RunStatus;
import com.testpilot.api.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class PipelineTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ProjectService projects;
    @Autowired ExecutionService executions;
    @Autowired JdbcTemplate jdbc;
    static final String TOKEN="Bearer test-worker-token-at-least-32-characters";
    static final String PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ1kAAAAASUVORK5CYII=";

    @BeforeEach void cleanTestDatabase() {
        String database=jdbc.queryForObject("select current_database()",String.class);
        if (database==null || !database.endsWith("_test")) throw new IllegalStateException("Integration tests require a dedicated database ending in _test.");
        jdbc.execute("TRUNCATE test_results, test_runs, projects");
    }
    ProjectView project() { return projects.create(new ProjectInput("Fixture","Offline only","https://fixture.test")); }
    Claim claim() { executions.create(project().id()); return executions.claim().orElseThrow(); }
    ResultInput result(Claim c,RunStatus status) { return new ResultInput(c.attemptId(),c.claimToken(),status,c.requestedUrl(),"https://fixture.test/","Fixture",200,List.of("observed"),List.of(),List.of(new FailedRequest("https://fixture.test/missing","GET","failed")),List.of(),123,0,PNG); }

    @Test void projectCrudValidationAndPagination() throws Exception {
        mvc.perform(post("/api/projects").contentType("application/json").content("{\"name\":\"\",\"baseUrl\":\"https://fixture.test\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.invalidFields[0]").value("name"));
        for (String url:List.of("http://fixture.test","https://other.test","https://user:pass@fixture.test","https://fixture.test:8443","https://fixture.test/?token=secret")) {
            mvc.perform(post("/api/projects").contentType("application/json").content(json.writeValueAsString(new ProjectInput("Bad",null,url)))).andExpect(status().isBadRequest());
        }
        var created=mvc.perform(post("/api/projects").contentType("application/json").content(json.writeValueAsString(new ProjectInput("Fixture",null,"https://fixture.test"))))
            .andExpect(status().isCreated()).andReturn();
        String id=json.readTree(created.getResponse().getContentAsString()).get("id").asText();
        mvc.perform(get("/api/projects/"+id)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Fixture"));
        mvc.perform(put("/api/projects/"+id).contentType("application/json").content(json.writeValueAsString(new ProjectInput("Updated","Description","https://fixture.test/path"))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated"));
        mvc.perform(get("/api/projects?size=101")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/projects")).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(delete("/api/projects/"+id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/projects/"+id)).andExpect(status().isNotFound());
    }
    @Test void snapshotsTargetsAndPreservesHistory() throws Exception {
        var p=project();
        mvc.perform(post("/api/projects/"+p.id()+"/runs")).andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("QUEUED"));
        projects.update(p.id(),new ProjectInput("Edited",null,"https://fixture.test/changed"));
        assertThat(executions.list(p.id(),0,20).content().getFirst().requestedUrl()).isEqualTo("https://fixture.test");
        mvc.perform(delete("/api/projects/"+p.id())).andExpect(status().isConflict());
        mvc.perform(post("/api/projects/"+UUID.randomUUID()+"/runs")).andExpect(status().isNotFound());
    }
    @Test void concurrentClaimsHaveExactlyOneOwner() throws Exception {
        executions.create(project().id());
        try (var pool=Executors.newFixedThreadPool(8)) {
            CountDownLatch start=new CountDownLatch(1);
            List<Future<Optional<Claim>>> futures=new ArrayList<>();
            for (int i=0;i<8;i++) futures.add(pool.submit(() -> { start.await(); return executions.claim(); }));
            start.countDown(); int owners=0;
            for (var future:futures) if (future.get(15,TimeUnit.SECONDS).isPresent()) owners++;
            assertThat(owners).isEqualTo(1);
        }
    }
    @Test void resultsArePersistedAndOnlyClaimHolderCanUpdate() throws Exception {
        Claim c=claim();
        mvc.perform(post("/internal/worker/runs/"+c.runId()+"/heartbeat").header("Authorization",TOKEN).contentType("application/json")
            .content(json.writeValueAsString(new ClaimProof(c.attemptId(),UUID.randomUUID())))).andExpect(status().isConflict());
        assertThat(executions.heartbeat(c.runId(),new ClaimProof(c.attemptId(),c.claimToken())).leaseExpiresAt()).isAfterOrEqualTo(c.leaseExpiresAt());
        mvc.perform(post("/internal/worker/runs/"+c.runId()+"/results").header("Authorization",TOKEN).contentType("application/json").content(json.writeValueAsString(result(c,RunStatus.QUEUED))))
            .andExpect(status().isBadRequest());
        executions.complete(c.runId(),result(c,RunStatus.PASSED));
        executions.complete(c.runId(),result(c,RunStatus.PASSED));
        assertThat(executions.get(c.runId()).status()).isEqualTo(RunStatus.PASSED);
        assertThat(executions.get(c.runId()).completedAt()).isNotNull();
        assertThat(jdbc.queryForObject("select count(*) from test_results",Long.class)).isEqualTo(1);
        assertThat(executions.results(c.runId()).getFirst().consoleErrors()).containsExactly("observed");
        assertThatThrownBy(() -> executions.fail(c.runId(),new Failure(c.attemptId(),c.claimToken(),"late failure"))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        mvc.perform(get("/api/runs/"+c.runId())).andExpect(jsonPath("$.claimToken").doesNotExist()).andExpect(jsonPath("$.attemptId").doesNotExist());
    }
    @Test void expiredClaimsCannotSubmitAndAreNeverAutomaticallyRetried() {
        Claim c=claim();
        jdbc.update("update test_runs set lease_expires_at=CURRENT_TIMESTAMP - interval '1 second' where id=?",c.runId());
        assertThatThrownBy(() -> executions.complete(c.runId(),result(c,RunStatus.PASSED))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        assertThatThrownBy(() -> executions.heartbeat(c.runId(),new ClaimProof(c.attemptId(),c.claimToken()))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        executions.recover();
        assertThat(executions.get(c.runId()).status()).isEqualTo(RunStatus.ERROR);
        assertThat(executions.get(c.runId()).errorMessage()).contains("uncertain");
        assertThat(executions.claim()).isEmpty();
    }
    @Test void failedErrorAndCancelledTransitions() {
        Claim c=claim(); executions.complete(c.runId(),result(c,RunStatus.FAILED));
        assertThat(executions.get(c.runId()).status()).isEqualTo(RunStatus.FAILED);
        Claim other=claim(); executions.fail(other.runId(),new Failure(other.attemptId(),other.claimToken(),"Browser unavailable"));
        assertThat(executions.get(other.runId()).status()).isEqualTo(RunStatus.ERROR);
        var queued=executions.create(project().id()); executions.cancel(queued.id());
        assertThat(executions.get(queued.id()).status()).isEqualTo(RunStatus.CANCELLED);
        assertThat(executions.claim()).isEmpty();
    }
    @Test void workerAuthenticationAndBrowserBoundary() throws Exception {
        mvc.perform(post("/internal/worker/claims")).andExpect(status().isUnauthorized());
        mvc.perform(post("/internal/worker/claims").header("Authorization","Bearer wrong")).andExpect(status().isUnauthorized());
        mvc.perform(post("/internal/worker/claims").header("Authorization",TOKEN)).andExpect(status().isNoContent());
        mvc.perform(post("/api/projects").header("Origin","https://evil.test")).andExpect(status().isForbidden());
        mvc.perform(get("/api/projects").with(r -> { r.setServerName("rebinding.test"); return r; })).andExpect(status().isForbidden());
    }
    @Test void screenshotsRequireRunScopedUnexpiredCapability() throws Exception {
        Claim c=claim(); executions.complete(c.runId(),result(c,RunStatus.PASSED));
        String link=executions.results(c.runId()).getFirst().screenshotUrl();
        mvc.perform(get(link)).andExpect(status().isOk()).andExpect(content().contentType("image/png"));
        mvc.perform(get("/api/runs/"+c.runId()+"/screenshot?expires=0&signature=wrong")).andExpect(status().isForbidden());
        mvc.perform(get(link.replace(c.runId().toString(),UUID.randomUUID().toString()))).andExpect(status().isForbidden());
        jdbc.update("update test_results set screenshot_path='../outside.png' where test_run_id=?",c.runId());
        mvc.perform(get(link)).andExpect(status().isNotFound());
    }
}
