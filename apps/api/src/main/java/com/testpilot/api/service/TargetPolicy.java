package com.testpilot.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.util.*;

@Component
public class TargetPolicy {
    private final Set<String> hosts = new HashSet<>();
    public TargetPolicy(@Value("${testpilot.authorized-hosts}") String configured) {
        for (String entry : configured.split(",")) {
            String host = entry.trim().toLowerCase(Locale.ROOT);
            if (host.isEmpty()) continue;
            if (!host.matches("[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?") || host.contains(".."))
                throw new IllegalArgumentException("AUTHORIZED_HOSTS must contain exact hostnames.");
            hosts.add(host);
        }
    }
    public String validate(String input) {
        try {
            URI uri = URI.create(input);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getRawUserInfo() != null
                    || (uri.getPort() != -1 && uri.getPort() != 443) || uri.getRawQuery() != null || uri.getRawFragment() != null
                    || !hosts.contains(uri.getHost().toLowerCase(Locale.ROOT))) throw new IllegalArgumentException();
            return uri.toASCIIString();
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Use an authorized HTTPS host on port 443, without credentials, query parameters or fragments.");
        }
    }
}
