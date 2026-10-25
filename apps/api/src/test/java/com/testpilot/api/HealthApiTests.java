package com.testpilot.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import javax.sql.DataSource;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Import(HealthApiTests.ErrorFixture.class)
class HealthApiTests {
    @Autowired MockMvc mvc;
    @Autowired ApplicationContext context;

    @Test
    void startsWithoutDatabase() {
        assertThat(context.getBeansOfType(DataSource.class)).isEmpty();
    }

    @Test
    void healthReturnsServiceStatus() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.application").value("testpilot-api"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void actuatorIsHealthyWithoutDatabase() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void permitsLocalFrontendPreflight() throws Exception {
        mvc.perform(options("/api/health").header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    @Test
    void rejectsUnconfiguredCorsOrigin() throws Exception {
        mvc.perform(options("/api/health").header("Origin", "https://untrusted.test")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void preservesFrameworkStatusCodes() throws Exception {
        mvc.perform(get("/missing")).andExpect(status().isNotFound());
        mvc.perform(post("/api/health")).andExpect(status().isMethodNotAllowed());
    }

    @Test
    void unexpectedExceptionsDoNotLeakInternalDetails() throws Exception {
        mvc.perform(get("/test/error")).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.detail").value("An unexpected error occurred. Please try again later."));
    }

    @Test
    void validationReturnsFieldNamesWithoutRejectedValues() throws Exception {
        mvc.perform(post("/test/validation").contentType("application/json").content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.invalidFields[0]").value("name"));
    }

    @RestController
    static class ErrorFixture {
        record Input(@NotBlank String name) {}
        @GetMapping("/test/error") void fail() { throw new IllegalStateException("Private implementation detail"); }
        @PostMapping("/test/validation") void validate(@Valid @RequestBody Input input) {}
    }
}
