package com.testpilot.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@Component
public class ArtifactAccess {
    private final String secret;
    public ArtifactAccess(@Value("${testpilot.artifact-secret}") String secret) { this.secret = secret; }
    private String signature(UUID id, long expires) {
        if (secret.length() < 32) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Configure ARTIFACT_SECRET with at least 32 characters.");
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal((id + ":" + expires).getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException e) { throw new IllegalStateException(e); }
    }
    public String url(UUID id) {
        long expires = Instant.now().plusSeconds(900).getEpochSecond();
        return "/api/runs/" + id + "/screenshot?expires=" + expires + "&signature=" + signature(id, expires);
    }
    public void authorize(UUID id, long expires, String signature) {
        long now = Instant.now().getEpochSecond();
        if (expires < now || expires > now + 900 || !MessageDigest.isEqual(signature(id, expires).getBytes(StandardCharsets.UTF_8), signature.getBytes(StandardCharsets.UTF_8)))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Artifact link is invalid or expired.");
    }
}
