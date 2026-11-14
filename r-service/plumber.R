# A11YSCAPE R data API.
#
# This phase exposes the stored SQLite scan corpus to R, runs PCA/K-means,
# derives rule-based recommendations, and generates reports.
#
# Start from the repository root with: Rscript r-service/scripts/run.R

suppressPackageStartupMessages({
  library(plumber)
  library(DBI)
  library(RSQLite)
  library(dplyr)
  library(tidyr)
  library(readr)
  library(jsonlite)
})

source("R/config.R")
source("R/errors.R")
source("R/validation.R")
source("R/db.R")
source("R/summary.R")
source("R/ml.R")
source("R/recommendations.R")
source("R/reports.R")

health_payload <- function() {
  status <- database_status()
  list(
    status = if (isTRUE(status$ok)) "ok" else "error",
    service = service_name,
    version = service_version,
    startedAt = service_started_at,
    uptimeSeconds = as.integer(difftime(
      Sys.time(), service_started_time, units = "secs"
    )),
    database = if (isTRUE(status$ok)) "connected" else "unavailable",
    scans = status$scans %||% 0L,
    message = status$message
  )
}

recent_scans_handler <- function(req, res, limit = "", status = "", query = "") {
  parsed_limit <- parse_limit(limit, default = 10L, maximum = 100L)
  parsed_status <- parse_status(status)
  parsed_query <- parse_query_text(query)
  with_database(function(connection) {
    recent_scan_payload(connection, parsed_query, parsed_status, parsed_limit)
  })
}

scan_detail_handler <- function(req, res, id) {
  scan_id <- parse_scan_id(id)
  with_database(function(connection) {
    result <- scan_detail_payload(connection, scan_id)
    if (is.null(result)) {
      stop_api(404L, "Scan not found.")
    }
    result
  })
}

summary_handler <- function(req, res, limit = "") {
  parsed_limit <- parse_limit(limit, default = 10L, maximum = 100L)
  with_database(function(connection) {
    build_summary(connection, recent_limit = parsed_limit)
  })
}

ml_runs_handler <- function(req, res, limit = "") {
  parsed_limit <- parse_limit(limit, default = 20L, maximum = 100L)
  with_database(function(connection) {
    list_model_runs(connection, parsed_limit)
  })
}

ml_run_handler <- function(req, res) {
  options <- validate_ml_body(req$body)
  with_database(function(connection) {
    run_ml_and_store(connection, options$k)
  })
}

recommendations_handler <- function(req, res) {
  with_database(function(connection) {
    model_runs <- list_model_runs(connection, limit = 1L)
    model_run <- if (length(model_runs) > 0) model_runs[[1]] else NULL
    recommendations_payload(connection, model_run)
  })
}

reports_handler <- function(req, res, limit = "") {
  parsed_limit <- parse_limit(limit, default = 20L, maximum = 100L)
  with_database(function(connection) {
    list_reports(connection, report_base_url(req))
  })
}

report_generate_handler <- function(req, res) {
  options <- validate_report_body(req$body)
  with_database(function(connection) {
    generate_report(connection, options$title, options$format, req)
  })
}

not_implemented_handler <- function(req, res) {
  stop_api(
    501L,
    paste(
      "Statistical analysis is not implemented yet.",
      "This phase only exposes stored scan data."
    )
  )
}

no_analysis_handler <- function(req, res) {
  stop_api(404L, "No statistical analysis is stored; analysis is not implemented yet.")
}

api <- plumber::pr()
api <- plumber::pr_set_parsers(api, "json")
api <- plumber::pr_set_serializer(
  api,
  plumber::serializer_json(auto_unbox = TRUE, null = "null", digits = NA)
)

api <- plumber::pr_filter(api, "cors", function(req, res) {
  origin <- req$HTTP_ORIGIN %||% ""
  allowed <- cors_origins()
  if (nzchar(origin) && origin %in% allowed) {
    res$setHeader("Access-Control-Allow-Origin", origin)
    res$setHeader("Vary", "Origin")
    res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res$setHeader("Access-Control-Allow-Headers", "Content-Type, Accept")
    res$setHeader("Access-Control-Max-Age", "600")
  }

  if (identical(req$REQUEST_METHOD, "OPTIONS")) {
    res$status <- 204L
    res$setHeader("Content-Length", "0")
    res$body <- ""
    return(list())
  }

  plumber::forward()
})

api$handle("GET", "/health", function(req, res) {
  payload <- health_payload()
  if (!identical(payload$status, "ok")) res$status <- 503L
  payload
})

api$handle("GET", "/api/summary", summary_handler)
api$handle("GET", "/api/scans/recent", recent_scans_handler)
api$handle("GET", "/api/scans/<id>", scan_detail_handler)
api$handle("GET", "/api/ml/runs", ml_runs_handler)
api$handle("POST", "/api/ml/runs", ml_run_handler)
api$handle("GET", "/api/recommendations", recommendations_handler)
api$handle("GET", "/api/reports", reports_handler)
api$handle("POST", "/api/reports", report_generate_handler)

# Contract placeholders: the frontend already calls these routes, but analysis
# results must not be fabricated before the statistical phase is implemented.
api$handle("GET", "/api/analysis/latest", no_analysis_handler)
api$handle("GET", "/api/analysis", not_implemented_handler)
api$handle("POST", "/api/analysis", not_implemented_handler)
api$handle("GET", "/api/analysis/<id>", not_implemented_handler)

reports_dir <- reports_directory()
dir.create(reports_dir, recursive = TRUE, showWarnings = FALSE)
api <- plumber::pr_static(api, "/reports", reports_dir)

api <- plumber::pr_set_404(api, function(req, res) {
  res$status <- 404L
  list(error = "Endpoint not found.")
})

api <- plumber::pr_set_error(api, function(req, res, err) {
  if (inherits(err, "api_error")) {
    res$status <- err$status
    return(list(error = conditionMessage(err)))
  }
  message("[r-analytics] unhandled error: ", conditionMessage(err))
  res$status <- 500L
  list(error = "The R analytics engine could not complete this request.")
})

api
