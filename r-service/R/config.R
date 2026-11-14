# Runtime configuration for the A11YSCAPE R analytics engine.
# All paths are resolved against A11YSCAPE_ROOT, which scripts/run.R sets to the
# repository root. DATABASE_PATH keeps the same meaning as in the scanner.

`%||%` <- function(x, y) {
  if (is.null(x) || length(x) == 0) y else x
}

a11yscape_root <- function() {
  configured <- Sys.getenv("A11YSCAPE_ROOT", unset = "")
  root <- if (nzchar(configured)) configured else getwd()
  normalizePath(root, winslash = "/", mustWork = FALSE)
}

database_path <- function() {
  configured <- Sys.getenv("DATABASE_PATH", unset = "")
  path <- if (nzchar(configured)) configured else "database/a11yscape.sqlite"
  if (!grepl("^([A-Za-z]:[\\\\/]|/)", path)) {
    path <- file.path(a11yscape_root(), path)
  }
  normalizePath(path, winslash = "/", mustWork = FALSE)
}

cors_origins <- function() {
  raw <- Sys.getenv(
    "CORS_ORIGIN",
    unset = "http://localhost:5173,http://127.0.0.1:5173"
  )
  origins <- trimws(strsplit(raw, ",", fixed = TRUE)[[1]])
  origins[nzchar(origins)]
}

service_name <- "A11YSCAPE R analytics engine"
service_version <- "0.1.0"
service_started_time <- Sys.time()
service_started_at <- format(service_started_time, "%Y-%m-%dT%H:%M:%SZ", tz = "UTC")

utc_now <- function() {
  format(Sys.time(), "%Y-%m-%dT%H:%M:%OS3Z", tz = "UTC")
}

severity_levels <- c("critical", "serious", "moderate", "minor")
