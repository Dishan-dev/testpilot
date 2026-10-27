package com.testpilot.api.entity;

public enum RunStatus {
    QUEUED, RUNNING, PASSED, FAILED, ERROR, CANCELLED;
    public boolean terminal() { return this != QUEUED && this != RUNNING; }
}
