package com.testpilot.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Component
public class LocalArtifactStore implements ArtifactStore {
    private final Path root;
    public LocalArtifactStore(@Value("${testpilot.artifacts-dir}") String directory) { root = Path.of(directory).toAbsolutePath().normalize(); }
    private Path directory(UUID runId) throws IOException {
        Files.createDirectories(root);
        // Reject symlinks in every existing component, including the configured root.
        Path cursor = root.getRoot();
        for (Path part : root) {
            cursor = cursor.resolve(part);
            if (Files.isSymbolicLink(cursor)) throw new IOException("Artifact root contains a symbolic link.");
        }
        Path dir = root.resolve(runId.toString());
        if (Files.isSymbolicLink(dir)) throw new IOException("Artifact directory is a symbolic link.");
        return dir;
    }
    private void write(Path path, byte[] bytes) throws IOException {
        if (Files.isSymbolicLink(path)) throw new IOException("Artifact is a symbolic link.");
        // A retry after a transaction rollback may replace an unpublished artifact.
        try (var channel = Files.newByteChannel(path, StandardOpenOption.CREATE, StandardOpenOption.WRITE,
                StandardOpenOption.TRUNCATE_EXISTING, LinkOption.NOFOLLOW_LINKS)) {
            var buffer = java.nio.ByteBuffer.wrap(bytes);
            while (buffer.hasRemaining()) channel.write(buffer);
        }
    }
    @Override public String save(UUID id, byte[] png, String report) throws IOException {
        Path dir = directory(id);
        Files.createDirectories(dir);
        if (png != null) write(dir.resolve("screenshot.png"), png);
        write(dir.resolve("result.json"), report.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return png == null ? null : id + "/screenshot.png";
    }
    @Override public byte[] screenshot(UUID id, String storedPath) throws IOException {
        if (!(id + "/screenshot.png").equals(storedPath)) throw new IOException("Invalid artifact reference.");
        Path file = directory(id).resolve("screenshot.png");
        if (Files.isSymbolicLink(file) || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS) || Files.size(file) > 5 * 1024 * 1024)
            throw new IOException("Artifact unavailable.");
        try (var stream = Files.newInputStream(file, LinkOption.NOFOLLOW_LINKS)) { return stream.readNBytes(5 * 1024 * 1024 + 1); }
    }
}
