# Stored-data summaries. These are counts and rows read from the corpus, not
# statistical modelling or inference.

numeric_scan_columns <- c(
  "duration_ms", "pages_scanned", "issue_count",
  "severity_critical", "severity_serious", "severity_moderate", "severity_minor"
)

normalise_scans <- function(scans) {
  if (nrow(scans) == 0) return(scans)
  for (column in intersect(numeric_scan_columns, names(scans))) {
    scans[[column]] <- as.numeric(scans[[column]])
  }
  scans
}

parse_json_array <- function(value) {
  if (is.null(value) || length(value) == 0 || is.na(value) || !nzchar(value)) {
    return(character(0))
  }
  parsed <- tryCatch(
    jsonlite::fromJSON(value),
    error = function(error) character(0)
  )
  if (!is.character(parsed)) return(character(0))
  parsed
}

severity_distribution <- function(violations) {
  counts <- table(factor(violations$impact, levels = severity_levels))
  data.frame(
    severity = severity_levels,
    count = as.integer(counts),
    stringsAsFactors = FALSE
  )
}

iso_timestamp <- function(value) {
  if (is.null(value) || length(value) == 0 || is.na(value)) return(NULL)
  parsed <- readr::parse_datetime(value)
  if (is.na(parsed)) return(as.character(value))
  format(parsed, "%Y-%m-%dT%H:%M:%OS3Z", tz = "UTC")
}

top_rule_records <- function(violations, limit = 10L) {
  if (nrow(violations) == 0) return(list())

  aggregated <- violations |>
    dplyr::group_by(rule_id, impact) |>
    dplyr::summarise(
      violations = dplyr::n(),
      affectedNodes = sum(node_count, na.rm = TRUE),
      scans = dplyr::n_distinct(scan_id),
      .groups = "drop"
    ) |>
    dplyr::arrange(dplyr::desc(violations), dplyr::desc(affectedNodes), rule_id) |>
    utils::head(limit)

  lapply(seq_len(nrow(aggregated)), function(index) {
    list(
      ruleId = aggregated$rule_id[[index]],
      impact = aggregated$impact[[index]],
      violations = as.integer(aggregated$violations[[index]]),
      affectedNodes = as.integer(aggregated$affectedNodes[[index]]),
      scans = as.integer(aggregated$scans[[index]])
    )
  })
}

scan_record <- function(row, issues = NULL) {
  record <- list(
    id = row$id[[1]],
    targetUrl = row$target_url[[1]],
    domain = row$domain[[1]],
    status = row$status[[1]],
    startedAt = iso_timestamp(row$started_at[[1]]),
    pagesScanned = as.integer(row$pages_scanned[[1]]),
    issueCount = as.integer(row$issue_count[[1]]),
    violationsBySeverity = list(
      critical = as.integer(row$severity_critical[[1]]),
      serious = as.integer(row$severity_serious[[1]]),
      moderate = as.integer(row$severity_moderate[[1]]),
      minor = as.integer(row$severity_minor[[1]])
    )
  )
  if (!is.na(row$page_title[[1]])) record$pageTitle <- row$page_title[[1]]
  finished <- iso_timestamp(row$finished_at[[1]])
  if (!is.null(finished)) record$finishedAt <- finished
  if (!is.na(row$duration_ms[[1]])) record$durationMs <- as.integer(row$duration_ms[[1]])
  if (!is.na(row$error_message[[1]])) record$errorMessage <- row$error_message[[1]]
  if (!is.null(issues)) record$issues <- issues
  record
}

issue_records <- function(violations) {
  if (nrow(violations) == 0) return(list())

  lapply(seq_len(nrow(violations)), function(index) {
    row <- violations[index, , drop = FALSE]
    issue <- list(
      ruleId = row$rule_id[[1]],
      impact = row$impact[[1]],
      description = row$description[[1]],
      wcagTags = parse_json_array(row$wcag_tags[[1]]),
      nodeCount = as.integer(row$node_count[[1]]),
      pageUrl = row$page_url[[1]]
    )
    if (!is.na(row$help_url[[1]])) issue$helpUrl <- row$help_url[[1]]
    elements <- parse_json_array(row$elements[[1]])
    if (length(elements) > 0) issue$elements <- elements
    issue
  })
}

recent_records <- function(scans, limit = 10L) {
  if (nrow(scans) == 0) return(list())

  ordered <- scans[order(scans$started_at, decreasing = TRUE), , drop = FALSE]
  selected <- utils::head(ordered, limit)

  lapply(seq_len(nrow(selected)), function(index) {
    scan_record(selected[index, , drop = FALSE])
  })
}

build_summary <- function(connection, recent_limit = 10L) {
  scans <- normalise_scans(query_scans(connection))
  violations <- query_violations(connection)

  severity_totals <- as.list(stats::setNames(
    vapply(
      severity_levels,
      function(level) {
        column <- paste0("severity_", level)
        if (nrow(scans) == 0 || !column %in% names(scans)) return(0)
        as.numeric(sum(scans[[column]], na.rm = TRUE))
      },
      numeric(1)
    ),
    severity_levels
  ))

  status_levels <- c("queued", "running", "completed", "partial", "failed")
  status_counts <- lapply(status_levels, function(status) {
    list(
      status = status,
      count = if (nrow(scans) == 0) 0L else as.integer(sum(scans$status == status))
    )
  })

  latest_scan_at <- if (nrow(scans) == 0) {
    NULL
  } else {
    scanned <- scans$started_at[!is.na(scans$started_at)]
    if (length(scanned) == 0) NULL else max(scanned)
  }

  distribution <- severity_distribution(violations)
  distribution_records <- lapply(seq_len(nrow(distribution)), function(index) {
    list(
      severity = distribution$severity[[index]],
      count = as.integer(distribution$count[[index]])
    )
  })

  list(
    generatedAt = utc_now(),
    totalScans = as.integer(nrow(scans)),
    totalWebsites = as.integer(length(unique(scans$domain))),
    completedScans = if (nrow(scans) == 0) 0L else
      as.integer(sum(scans$status == "completed")),
    failedScans = if (nrow(scans) == 0) 0L else
      as.integer(sum(scans$status == "failed")),
    totalViolations = as.integer(sum(scans$issue_count, na.rm = TRUE)),
    latestScanAt = latest_scan_at,
    severityTotals = severity_totals,
    statusCounts = status_counts,
    severityDistribution = distribution_records,
    topRules = top_rule_records(violations),
    recentScans = recent_records(scans, recent_limit)
  )
}

recent_scan_payload <- function(connection, query = NULL, status = "all", limit = 10L) {
  scans <- normalise_scans(query_scans(connection, status = status, query = query))
  list(
    total = as.integer(nrow(scans)),
    limit = as.integer(limit),
    records = recent_records(scans, limit)
  )
}

scan_detail_payload <- function(connection, id) {
  scan <- query_scan(connection, id)
  if (is.null(scan)) return(NULL)

  violations <- query_violations(connection, scan_id = id)
  scan_record(
    normalise_scans(scan)[1, , drop = FALSE],
    issue_records(violations)
  )
}
