package com.testpilot.api.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "projects")
public class Project {
    @Id public UUID id;
    @Column(nullable = false, length = 120) public String name;
    @Column(length = 2000) public String description;
    @Column(nullable = false, length = 2048) public String baseUrl;
    @Column(nullable = false) public Instant createdAt;
    @Column(nullable = false) public Instant updatedAt;
    public UUID getId() { return id; }
    public String getName() { return name; }
}
