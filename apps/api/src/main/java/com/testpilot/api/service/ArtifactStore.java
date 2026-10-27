package com.testpilot.api.service;

import java.io.IOException;
import java.util.UUID;

public interface ArtifactStore {
    String save(UUID runId, byte[] png, String reportJson) throws IOException;
    byte[] screenshot(UUID runId, String storedPath) throws IOException;
}
