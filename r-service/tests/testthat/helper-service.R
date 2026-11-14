# Shared fixtures for the R data API tests. Everything is inserted into a
# throwaway SQLite database, so tests never touch the real corpus.

suppressPackageStartupMessages({
  library(DBI)
  library(RSQLite)
  library(dplyr)
  library(tidyr)
  library(readr)
  library(jsonlite)
})

service_dir <- Sys.getenv(
  "A11YSCAPE_R_SERVICE_DIR",
  unset = normalizePath(file.path(getwd(), "..", ".."), winslash = "/", mustWork = FALSE)
)

for (file in c("config.R", "errors.R", "validation.R", "db.R", "summary.R", "analysis.R", "ml.R", "recommendations.R", "reports.R")) {
  source(file.path(service_dir, "R", file))
}

create_schema <- function(connection) {
  DBI::dbExecute(connection, "
    CREATE TABLE websites (
      id TEXT PRIMARY KEY,
      hostname TEXT UNIQUE NOT NULL,
      first_seen_at TEXT,
      last_seen_at TEXT
    )")
  DBI::dbExecute(connection, "
    CREATE TABLE scans (
      id TEXT PRIMARY KEY,
      website_id TEXT NOT NULL,
      target_url TEXT NOT NULL,
      page_title TEXT,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      duration_ms INTEGER,
      pages_scanned INTEGER NOT NULL DEFAULT 1,
      issue_count INTEGER NOT NULL DEFAULT 0,
      severity_critical INTEGER NOT NULL DEFAULT 0,
      severity_serious INTEGER NOT NULL DEFAULT 0,
      severity_moderate INTEGER NOT NULL DEFAULT 0,
      severity_minor INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      max_pages INTEGER NOT NULL DEFAULT 1,
      include_screenshots INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )")
  DBI::dbExecute(connection, "
    CREATE TABLE violations (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL,
      page_url TEXT NOT NULL,
      rule_id TEXT NOT NULL,
      impact TEXT,
      description TEXT NOT NULL,
      help_url TEXT,
      wcag_tags TEXT NOT NULL,
      node_count INTEGER NOT NULL DEFAULT 0,
      elements TEXT,
      UNIQUE (scan_id, page_url, rule_id)
    )")
}

insert_scan <- function(connection, id, website_id, target_url, page_title,
                        status, started_at, finished_at = NA_character_,
                        duration_ms = NA_integer_, pages_scanned = 1L,
                        issue_count = 0L, critical = 0L, serious = 0L,
                        moderate = 0L, minor = 0L, error_message = NA_character_) {
  DBI::dbExecute(
    connection,
    "INSERT INTO scans
       (id, website_id, target_url, page_title, status, started_at, finished_at,
        duration_ms, pages_scanned, issue_count, severity_critical,
        severity_serious, severity_moderate, severity_minor, error_message,
        max_pages, include_screenshots, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)",
    params = list(
      id, website_id, target_url, page_title, status, started_at, finished_at,
      duration_ms, pages_scanned, issue_count, critical, serious, moderate,
      minor, error_message, started_at
    )
  )
}

insert_violation <- function(connection, id, scan_id, page_url, rule_id,
                             impact, description, wcag_tags, node_count,
                             help_url = NA_character_, elements = NA_character_) {
  DBI::dbExecute(
    connection,
    "INSERT INTO violations
       (id, scan_id, page_url, rule_id, impact, description, help_url,
        wcag_tags, node_count, elements)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    params = list(
      id, scan_id, page_url, rule_id, impact, description, help_url,
      wcag_tags, node_count, elements
    )
  )
}

seed_fixture <- function(connection) {
  DBI::dbExecute(
    connection,
    "INSERT INTO websites (id, hostname, first_seen_at, last_seen_at)
     VALUES ('site-a', 'a.example', '2026-01-01T09:00:00Z', '2026-01-03T09:00:00Z')"
  )
  DBI::dbExecute(
    connection,
    "INSERT INTO websites (id, hostname, first_seen_at, last_seen_at)
     VALUES ('site-b', 'b.example', '2026-01-02T09:00:00Z', '2026-01-02T09:00:00Z')"
  )

  insert_scan(
    connection, "scan-1", "site-a", "https://a.example/alpha", "Alpha page",
    "completed", "2026-01-01T10:00:00Z", "2026-01-01T10:00:02Z", 2000L, 2L, 3L, 1L, 2L
  )
  insert_scan(
    connection, "scan-2", "site-b", "https://b.example/beta", "Beta page",
    "partial", "2026-01-02T10:00:00Z", NA_character_, 1500L, 1L, 1L,
    serious = 1L
  )
  insert_scan(
    connection, "scan-3", "site-a", "https://a.example/offline", NA_character_,
    "failed", "2026-01-03T10:00:00Z", "2026-01-03T10:00:05Z", 5000L, 0L, 0L,
    error_message = "Navigation timeout"
  )

  insert_violation(
    connection, "v-1", "scan-1", "https://a.example/alpha", "color-contrast",
    "critical", "Elements must meet minimum contrast ratio.",
    '["wcag2a","wcag2aa","wcag143"]', 2L, elements = '["h1"]'
  )
  insert_violation(
    connection, "v-2", "scan-1", "https://a.example/alpha", "label",
    "serious", "Form elements must have labels.",
    '["wcag2a","wcag131"]', 1L
  )
  insert_violation(
    connection, "v-3", "scan-2", "https://b.example/beta", "image-alt",
    "serious", "Images must have alternate text.",
    '["wcag2a","wcag111"]', 4L
  )
}

open_fixture_database <- function() {
  connection <- DBI::dbConnect(RSQLite::SQLite(), ":memory:")
  create_schema(connection)
  seed_fixture(connection)
  connection
}
