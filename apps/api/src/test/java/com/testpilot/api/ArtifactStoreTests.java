package com.testpilot.api;

import com.testpilot.api.service.LocalArtifactStore;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class ArtifactStoreTests {
    @TempDir Path directory;
    @Test void cannotReadAnotherRunOrTraverseDirectories() throws Exception {
        var store=new LocalArtifactStore(directory.toString());
        UUID first=UUID.randomUUID(), second=UUID.randomUUID();
        String path=store.save(first,new byte[]{1,2,3},"{}");
        assertThat(store.screenshot(first,path)).containsExactly(1,2,3);
        assertThatThrownBy(() -> store.screenshot(second,path)).isInstanceOf(java.io.IOException.class);
        assertThatThrownBy(() -> store.screenshot(first,"../outside.png")).isInstanceOf(java.io.IOException.class);
    }
    @Test void missingAllowlistDeniesTargets() {
        var policy=new com.testpilot.api.service.TargetPolicy("");
        assertThatThrownBy(() -> policy.validate("https://fixture.test")).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
}
