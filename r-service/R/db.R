# Read-only access to the scanner-owned SQLite corpus.
#
# This module exposes stored scan data through R. It never writes scan,
# violation or website rows; derived model runs are kept in the additive
# model_runs table.

required_tables <- c("websites", "scans", "violations")

scan_select <- paste(
  "SELECT s.id, w.hostname AS domain, s.target_url, s.page_title, s.status,",
  "       s.started_at, s.finished_at, s.duration_ms, s.pages_scanned,",
  "       s.issue_count, s.severity_critical, s.severity_serious,",
  "       s.severity_moderate, s.severity_minor, s.error_message",
  "FROM scans s",
  "JOIN websites w ON w.id = s.website_id"
)

db_connect <- function() {
  path <- database_path()
  if (!file.exists(path)) {
    stop_api(
      503L,
      paste0(
        "Analytics database not found at ", path,
        ". Run: npm run db:init --workspace scanner-service"
      )
    )
  }

  connection <- tryCatch(
    DBI::dbConnect(RSQLite::SQLite(), path),
    error = function(error) {
      message("[r-analytics] cannot open database: ", conditionMessage(error))
      stop_api(503L, "The analytics database could not be opened.")
    }
  )

  DBI::dbExecute(connection, "PRAGMA busy_timeout = 5000;")

  tables <- tryCatch(
    DBI::dbListTables(connection),
    error = function(error) {
      DBI::dbDisconnect(connection)
      message("[r-analytics] cannot list tables: ", conditionMessage(error))
      stop_api(503L, "The analytics database could not be inspected.")
    }
  )
  missing <- setdiff(required_tables, tables)
  if (length(missing) > 0) {
    DBI::dbDisconnect(connection)
    stop_api(
      503L,
      paste0(
        "The database is missing required tables: ", paste(missing, collapse = ", "),
        ". Run the scanner database migrations first."
      )
    )
  }

  connection
}

with_database <- function(work) {
  connection <- db_connect()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  tryCatch(
    work(connection),
    error = function(error) {
      if (inherits(error, "api_error")) stop(error)
      message("[r-analytics] database operation failed: ", conditionMessage(error))
      stop_api(503L, "The analytics database could not be queried.")
    }
  )
}

query_scans <- function(connection, status = "all", query = NULL) {
  clauses <- character(0)
  params <- list()

  if (!identical(status, "all")) {
    clauses <- c(clauses, "s.status = ?")
    params <- c(params, list(status))
  }

  if (!is.null(query) && nzchar(query)) {
    clauses <- c(
      clauses,
      paste0(
        "(instr(lower(s.target_url), lower(?)) > 0 ",
        "OR instr(lower(w.hostname), lower(?)) > 0 ",
        "OR instr(lower(COALESCE(s.page_title, '')), lower(?)) > 0)"
      )
    )
    params <- c(params, list(query, query, query))
  }

  sql <- paste(
    scan_select,
    if (length(clauses) > 0) paste("WHERE", paste(clauses, collapse = " AND ")) else "",
    "ORDER BY s.started_at DESC"
  )

  if (length(params) > 0) {
    DBI::dbGetQuery(connection, sql, params = params)
  } else {
    DBI::dbGetQuery(connection, sql)
  }
}

query_scan <- function(connection, id) {
  rows <- DBI::dbGetQuery(
    connection,
    paste(scan_select, "WHERE s.id = ? LIMIT 1"),
    params = list(id)
  )
  if (nrow(rows) == 0) return(NULL)
  rows[1, , drop = FALSE]
}

ensure_model_runs_table <- function(connection) {
  DBI::dbExecute(
    connection,
    "CREATE TABLE IF NOT EXISTS model_runs (
       id TEXT PRIMARY KEY,
       created_at TEXT NOT NULL,
       algorithm TEXT NOT NULL,
       dataset_rows INTEGER NOT NULL,
       payload TEXT NOT NULL
     );"
  )
}

save_model_run <- function(connection, run) {
  ensure_model_runs_table(connection)
  payload <- jsonlite::toJSON(
    run,
    auto_unbox = TRUE,
    null = "null",
    digits = NA
  )
  DBI::dbExecute(
    connection,
    "INSERT INTO model_runs (id, created_at, algorithm, dataset_rows, payload)
     VALUES (?, ?, ?, ?, ?)",
    params = list(
      run$id,
      run$createdAt,
      run$algorithm,
      as.integer(run$datasetRows),
      as.character(payload)
    )
  )
  invisible(run)
}

list_model_runs <- function(connection, limit = 20L) {
  ensure_model_runs_table(connection)
  rows <- DBI::dbGetQuery(
    connection,
    "SELECT payload FROM model_runs
     ORDER BY created_at DESC, rowid DESC LIMIT ?",
    params = list(as.integer(limit))
  )
  if (nrow(rows) == 0) return(list())
  lapply(rows$payload, function(payload) {
    jsonlite::fromJSON(payload, simplifyVector = FALSE)
  })
}

query_violations <- function(connection, scan_id = NULL) {
  sql <- paste(
    "SELECT v.scan_id, w.hostname AS domain, v.rule_id, v.impact,",
    "       v.description, v.help_url, v.wcag_tags, v.node_count,",
    "       v.elements, v.page_url",
    "FROM violations v",
    "JOIN scans s ON s.id = v.scan_id",
    "JOIN websites w ON w.id = s.website_id",
    "WHERE s.status IN ('completed', 'partial')"
  )
  params <- list()

  if (!is.null(scan_id)) {
    sql <- paste(sql, "AND v.scan_id = ?")
    params <- list(scan_id)
  }

  sql <- paste(
    sql,
    "ORDER BY CASE v.impact",
    "  WHEN 'critical' THEN 1 WHEN 'serious' THEN 2",
    "  WHEN 'moderate' THEN 3 WHEN 'minor' THEN 4 ELSE 5 END,",
    "v.rule_id, v.page_url"
  )

  if (length(params) > 0) {
    DBI::dbGetQuery(connection, sql, params = params)
  } else {
    DBI::dbGetQuery(connection, sql)
  }
}

database_status <- function() {
  path <- database_path()
  if (!file.exists(path)) {
    return(list(ok = FALSE, message = "Database file not found.", path = path))
  }

  connection <- tryCatch(
    DBI::dbConnect(RSQLite::SQLite(), path),
    error = function(error) {
      list(ok = FALSE, message = conditionMessage(error), path = path)
    }
  )
  if (!inherits(connection, "DBIConnection")) return(connection)

  on.exit(DBI::dbDisconnect(connection), add = TRUE)
  DBI::dbExecute(connection, "PRAGMA busy_timeout = 5000;")

  tables <- DBI::dbListTables(connection)
  missing <- setdiff(required_tables, tables)
  if (length(missing) > 0) {
    return(list(
      ok = FALSE,
      message = paste("Missing tables:", paste(missing, collapse = ", ")),
      path = path
    ))
  }

  scans <- DBI::dbGetQuery(connection, "SELECT COUNT(*) AS count FROM scans")$count[[1]]
  list(ok = TRUE, message = "connected", path = path, scans = as.integer(scans))
}
