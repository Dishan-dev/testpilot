package com.testpilot.api.config;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Local development boundary, not a substitute for production authentication. */
@Component
public class RequestBoundary extends OncePerRequestFilter {
    private final String token;
    private final Set<String> origins;
    public RequestBoundary(@Value("${testpilot.worker-token}") String token,@Value("${testpilot.cors.allowed-origins}") String[] origins) { this.token=token; this.origins=Set.of(origins); }
    private void reject(HttpServletResponse response,int status,String detail) throws IOException {
        response.setStatus(status); response.setContentType("application/problem+json");
        response.getWriter().write("{\"status\":"+status+",\"detail\":\""+detail+"\"}");
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        response.setHeader("Cache-Control","no-store"); response.setHeader("X-Content-Type-Options","nosniff");
        if (!Set.of("localhost","127.0.0.1","[::1]","::1").contains(request.getServerName())) { reject(response,403,"This development API only accepts loopback hostnames."); return; }
        String origin=request.getHeader("Origin");
        if (origin != null && !origins.contains(origin)) { reject(response,403,"Origin is not allowed."); return; }
        if (request.getRequestURI().startsWith("/internal/")) {
            String provided=request.getHeader("Authorization");
            if (token.length()<32 || provided==null || !MessageDigest.isEqual(("Bearer "+token).getBytes(StandardCharsets.UTF_8),provided.getBytes(StandardCharsets.UTF_8))) {
                reject(response,401,"Valid worker credentials are required."); return;
            }
        }
        // Require a bounded body; chunked/unbounded uploads are intentionally unsupported locally.
        if (Set.of("POST","PUT","PATCH").contains(request.getMethod())) {
            long size=request.getContentLengthLong();
            if (size > 12*1024*1024) { reject(response,413,"Request body is too large."); return; }
            if (request.getHeader("Transfer-Encoding") != null) { reject(response,411,"Content-Length is required."); return; }
            if (size>0 && (request.getContentType()==null || !request.getContentType().toLowerCase(Locale.ROOT).startsWith("application/json"))) { reject(response,415,"Use application/json."); return; }
        }
        chain.doFilter(request,response);
    }
}
