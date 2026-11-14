# Descriptive statistics over the stored scan corpus.
#
# Every value in this module is computed from rows the scanner wrote to SQLite.
# Nothing is sampled, mocked or rounded up from thin air: when the corpus is
# empty the payload reports "insufficient_data" instead of a result set.

new_analysis_id <- function() {
  paste0(
    "analysis-",
    format(Sys.time(), "%Y%m%dT%H%M%OS3", tz = "UTC"),
    "-",
    sprintf("%04d", sample.int(9999L, 1L))
  )
}

# Official titles and conformance levels for the WCAG criteria that axe-core
# rules reference. These are fixed standard metadata, not measured values.
wcag_criterion_meta <- list(
  "1.1.1" = list(title = "Non-text Content", level = "A"),
  "1.2.1" = list(title = "Audio-only and Video-only (Prerecorded)", level = "A"),
  "1.2.2" = list(title = "Captions (Prerecorded)", level = "A"),
  "1.2.3" = list(title = "Audio Description or Media Alternative (Prerecorded)", level = "A"),
  "1.2.4" = list(title = "Captions (Live)", level = "AA"),
  "1.2.5" = list(title = "Audio Description (Prerecorded)", level = "AA"),
  "1.3.1" = list(title = "Info and Relationships", level = "A"),
  "1.3.2" = list(title = "Meaningful Sequence", level = "A"),
  "1.3.3" = list(title = "Sensory Characteristics", level = "A"),
  "1.3.4" = list(title = "Orientation", level = "AA"),
  "1.3.5" = list(title = "Identify Input Purpose", level = "AA"),
  "1.4.1" = list(title = "Use of Color", level = "A"),
  "1.4.2" = list(title = "Audio Control", level = "A"),
  "1.4.3" = list(title = "Contrast (Minimum)", level = "AA"),
  "1.4.4" = list(title = "Resize Text", level = "AA"),
  "1.4.5" = list(title = "Images of Text", level = "AA"),
  "1.4.10" = list(title = "Reflow", level = "AA"),
  "1.4.11" = list(title = "Non-text Contrast", level = "AA"),
  "1.4.12" = list(title = "Text Spacing", level = "AA"),
  "1.4.13" = list(title = "Content on Hover or Focus", level = "AA"),
  "2.1.1" = list(title = "Keyboard", level = "A"),
  "2.1.2" = list(title = "No Keyboard Trap", level = "A"),
  "2.1.3" = list(title = "Keyboard (No Exception)", level = "AAA"),
  "2.1.4" = list(title = "Character Key Shortcuts", level = "A"),
  "2.2.1" = list(title = "Timing Adjustable", level = "A"),
  "2.2.2" = list(title = "Pause, Stop, Hide", level = "A"),
  "2.2.3" = list(title = "No Timing", level = "AAA"),
  "2.3.1" = list(title = "Three Flashes or Below Threshold", level = "A"),
  "2.4.1" = list(title = "Bypass Blocks", level = "A"),
  "2.4.2" = list(title = "Page Titled", level = "A"),
  "2.4.3" = list(title = "Focus Order", level = "A"),
  "2.4.4" = list(title = "Link Purpose (In Context)", level = "A"),
  "2.4.5" = list(title = "Multiple Ways", level = "AA"),
  "2.4.6" = list(title = "Headings and Labels", level = "AA"),
  "2.4.7" = list(title = "Focus Visible", level = "AA"),
  "2.4.11" = list(title = "Focus Not Obscured (Minimum)", level = "AA"),
  "2.5.1" = list(title = "Pointer Gestures", level = "A"),
  "2.5.2" = list(title = "Pointer Cancellation", level = "A"),
  "2.5.3" = list(title = "Label in Name", level = "A"),
  "2.5.4" = list(title = "Motion Actuation", level = "A"),
  "2.5.5" = list(title = "Target Size (Enhanced)", level = "AAA"),
  "2.5.6" = list(title = "Concurrent Input Mechanisms", level = "AAA"),
  "2.5.7" = list(title = "Dragging Movements", level = "AA"),
  "2.5.8" = list(title = "Target Size (Minimum)", level = "AA"),
  "3.1.1" = list(title = "Language of Page", level = "A"),
  "3.1.2" = list(title = "Language of Parts", level = "AA"),
  "3.2.1" = list(title = "On Focus", level = "A"),
  "3.2.2" = list(title = "On Input", level = "A"),
  "3.2.3" = list(title = "Consistent Navigation", level = "AA"),
  "3.2.4" = list(title = "Consistent Identification", level = "AA"),
  "3.2.5" = list(title = "Change on Request", level = "AAA"),
  "3.3.1" = list(title = "Error Identification", level = "A"),
  "3.3.2" = list(title = "Labels or Instructions", level = "A"),
  "3.3.3" = list(title = "Error Suggestion", level = "AA"),
  "3.3.4" = list(title = "Error Prevention (Legal, Financial, Data)", level = "AA"),
  "3.3.7" = list(title = "Redundant Entry", level = "A"),
  "3.3.8" = list(title = "Accessible Authentication (Minimum)", level = "AA"),
  "4.1.1" = list(title = "Parsing", level = "A"),
  "4.1.2" = list(title = "Name, Role, Value", level = "A"),
  "4.1.3" = list(title = "Status Messages", level = "AA")
)

# Turn the stored axe-core tags of one violation into WCAG criteria.
# "wcag111" becomes "1.1.1"; level tags such as "wcag2a" or "wcag22aa" are
# reported separately, and non-WCAG tags ("best-practice", "cat.*") are ignored.
parse_wcag_tags <- function(tags) {
  criteria <- character(0)
  levels <- character(0)

  for (tag in tags) {
    if (!grepl("^wcag", tag)) next
    digits <- sub("^wcag", "", tag)

    if (grepl("^[1-4][0-9]{2,3}$", digits)) {
      criteria <- c(
        criteria,
        paste(
          substr(digits, 1L, 1L),
          substr(digits, 2L, 2L),
          substr(digits, 3L, nchar(digits)),
          sep = "."
        )
      )
    } else if (grepl("^[0-9]+a{1,3}$", digits)) {
      levels <- c(levels, toupper(sub("^[0-9]+", "", digits)))
    }
  }

  list(criteria = unique(criteria), levels = unique(levels))
}

wcag_summary_records <- function(violations) {
  counts <- list()
  fallback_levels <- list()

  for (index in seq_len(nrow(violations))) {
    parsed <- parse_wcag_tags(parse_json_array(violations$wcag_tags[[index]]))
    for (criterion in parsed$criteria) {
      counts[[criterion]] <- (counts[[criterion]] %||% 0L) + 1L
      if (is.null(fallback_levels[[criterion]]) && length(parsed$levels) > 0) {
        fallback_levels[[criterion]] <- parsed$levels[[1]]
      }
    }
  }

  if (length(counts) == 0) return(list())

  ordered <- names(counts)[order(
    -vapply(counts, as.integer, integer(1)),
    names(counts)
  )]

  lapply(ordered, function(criterion) {
    meta <- wcag_criterion_meta[[criterion]]
    list(
      criterion = criterion,
      title = if (is.null(meta)) paste("WCAG criterion", criterion) else meta$title,
      level = if (is.null(meta)) {
        fallback_levels[[criterion]] %||% "A"
      } else {
        meta$level
      },
      violationCount = as.integer(counts[[criterion]])
    )
  })
}

analysis_descriptives <- function(scans) {
  metric_labels <- c(
    issue_count = "Violations per scan",
    severity_critical = "Critical issues",
    severity_serious = "Serious issues",
    severity_moderate = "Moderate issues",
    severity_minor = "Minor issues",
    pages_scanned = "Pages scanned",
    duration_ms = "Scan duration (ms)"
  )

  records <- list()
  for (metric in intersect(names(metric_labels), names(scans))) {
    values <- suppressWarnings(as.numeric(scans[[metric]]))
    values <- values[is.finite(values)]
    if (length(values) == 0) next
    records[[length(records) + 1]] <- list(
      metric = unname(metric_labels[[metric]]),
      mean = as.numeric(mean(values)),
      median = as.numeric(stats::median(values)),
      sd = if (length(values) >= 2L) as.numeric(stats::sd(values)) else 0,
      min = as.numeric(min(values)),
      max = as.numeric(max(values))
    )
  }
  records
}

analysis_domain_summaries <- function(scans) {
  if (nrow(scans) == 0) return(list())

  records <- lapply(sort(unique(scans$domain)), function(domain) {
    subset <- scans[scans$domain == domain, , drop = FALSE]
    list(
      domain = domain,
      scans = as.integer(nrow(subset)),
      meanIssues = as.numeric(mean(suppressWarnings(as.numeric(subset$issue_count))))
    )
  })

  records[order(
    -vapply(records, function(item) item$meanIssues, numeric(1)),
    vapply(records, function(item) item$domain, character(1))
  )]
}

analysis_severity_distribution <- function(violations) {
  distribution <- severity_distribution(violations)
  lapply(seq_len(nrow(distribution)), function(index) {
    list(
      severity = distribution$severity[[index]],
      count = as.integer(distribution$count[[index]])
    )
  })
}

# Pearson correlation between per-scan severity counts. Only computed when the
# caller asks for it, and only from columns that actually vary.
analysis_correlation <- function(scans, include = FALSE, minimum_scans = 3L) {
  if (!isTRUE(include)) {
    return(list(
      correlation = NULL,
      notes = "Correlation matrix was not requested for this run."
    ))
  }

  if (nrow(scans) < minimum_scans) {
    return(list(
      correlation = NULL,
      notes = sprintf(
        paste(
          "Correlation needs at least %d completed or partial scans;",
          "%d are stored, so the matrix was omitted."
        ),
        minimum_scans, nrow(scans)
      )
    ))
  }

  columns <- intersect(paste0("severity_", severity_levels), names(scans))
  values <- as.data.frame(lapply(scans[, columns, drop = FALSE], function(column) {
    suppressWarnings(as.numeric(column))
  }))
  names(values) <- columns

  variances <- vapply(values, stats::sd, numeric(1))
  usable <- names(variances)[is.finite(variances) & variances > 0]
  dropped <- setdiff(columns, usable)

  if (length(usable) < 2L) {
    return(list(
      correlation = NULL,
      notes = paste(
        "Correlation needs at least two severity columns with variance;",
        "the stored scans do not provide them, so the matrix was omitted."
      )
    ))
  }

  matrix <- stats::cor(values[, usable, drop = FALSE], use = "pairwise.complete.obs")
  if (any(!is.finite(matrix))) {
    return(list(
      correlation = NULL,
      notes = paste(
        "Correlation coefficients were not finite for this dataset,",
        "so the matrix was omitted."
      )
    ))
  }

  notes <- sprintf(
    "Correlation used %d scans and %d severity columns (Pearson): %s.",
    nrow(scans), length(usable), paste(usable, collapse = ", ")
  )
  if (length(dropped) > 0) {
    notes <- c(notes, sprintf(
      "Severity columns without variance were dropped: %s.",
      paste(dropped, collapse = ", ")
    ))
  }

  list(
    correlation = list(
      variables = as.list(usable),
      matrix = lapply(seq_len(nrow(matrix)), function(index) {
        as.list(as.numeric(matrix[index, ]))
      })
    ),
    notes = notes
  )
}

analysis_summary <- function(connection, scans) {
  totals <- DBI::dbGetQuery(
    connection,
    "SELECT
       (SELECT COUNT(*) FROM scans) AS scans,
       (SELECT COUNT(*) FROM websites) AS websites"
  )
  recorded <- DBI::dbGetQuery(
    connection,
    "SELECT COUNT(*) AS violations
     FROM violations v
     JOIN scans s ON s.id = v.scan_id
     WHERE s.status IN ('completed', 'partial')"
  )

  issue_counts <- suppressWarnings(as.numeric(scans$issue_count))
  issue_counts <- issue_counts[is.finite(issue_counts)]
  latest <- if (nrow(scans) == 0) {
    NULL
  } else {
    started <- scans$started_at[!is.na(scans$started_at)]
    if (length(started) == 0) NULL else iso_timestamp(max(started))
  }

  list(
    totalWebsites = as.integer(totals$websites[[1]]),
    totalScans = as.integer(totals$scans[[1]]),
    eligibleScans = as.integer(nrow(scans)),
    totalViolations = as.integer(recorded$violations[[1]]),
    meanViolationsPerScan = if (length(issue_counts) == 0) 0 else
      as.numeric(mean(issue_counts)),
    medianViolationsPerScan = if (length(issue_counts) == 0) 0 else
      as.numeric(stats::median(issue_counts)),
    latestScanAt = latest
  )
}

analysis_method <- paste(
  "Descriptive statistics and WCAG aggregation in R",
  "(base R with dplyr/tidyr over the scanner SQLite corpus)"
)

compute_analysis <- function(connection, include_correlation = FALSE) {
  scans <- normalise_scans(query_scans(connection))
  # Only completed/partial scans contribute violations, matching the rest of
  # the API, so they are the rows the analysis describes.
  analysable <- normalise_scans(query_ml_scans(connection))
  violations <- query_violations(connection)
  summary <- analysis_summary(connection, analysable)

  if (nrow(analysable) == 0) {
    notes <- c(
      "Run at least one website scan first.",
      sprintf(
        "%d stored scan(s) exist, but none finished as completed or partial.",
        nrow(scans)
      ),
      "No sample, mock or placeholder statistics are produced."
    )
    return(list(
      id = new_analysis_id(),
      createdAt = utc_now(),
      status = "insufficient_data",
      message = "Run at least one website scan first.",
      datasetRows = 0L,
      method = analysis_method,
      summary = summary,
      severityDistribution = list(),
      wcagSummary = list(),
      domainSummaries = list(),
      descriptives = list(),
      correlation = NULL,
      notes = as.list(notes)
    ))
  }

  correlation <- analysis_correlation(analysable, include_correlation)

  excluded <- nrow(scans) - nrow(analysable)
  notes <- c(
    sprintf(
      "%d completed or partial scan(s) contributed to this analysis.",
      nrow(analysable)
    ),
    if (excluded > 0) {
      sprintf(
        "%d queued, running or failed scan(s) were excluded because they have no recorded findings.",
        excluded
      )
    } else {
      "Every stored scan is completed or partial, so none were excluded."
    },
    "Descriptive statistics only: no hypothesis test, inference or prediction is made.",
    "WCAG frequencies count one occurrence per recorded violation that lists the criterion."
  )
  if (nrow(analysable) < 10L) {
    notes <- c(notes, "The sample is small, so these values will move as scans are added.")
  }
  notes <- c(notes, correlation$notes)

  list(
    id = new_analysis_id(),
    createdAt = utc_now(),
    status = "completed",
    message = NULL,
    datasetRows = as.integer(nrow(analysable)),
    method = analysis_method,
    summary = summary,
    severityDistribution = analysis_severity_distribution(violations),
    wcagSummary = wcag_summary_records(violations),
    domainSummaries = analysis_domain_summaries(analysable),
    descriptives = analysis_descriptives(analysable),
    correlation = correlation$correlation,
    notes = as.list(notes)
  )
}

ensure_analysis_runs_table <- function(connection) {
  DBI::dbExecute(
    connection,
    "CREATE TABLE IF NOT EXISTS analysis_runs (
       id TEXT PRIMARY KEY,
       created_at TEXT NOT NULL,
       payload TEXT NOT NULL
     );"
  )
}

save_analysis_run <- function(connection, run) {
  ensure_analysis_runs_table(connection)
  payload <- jsonlite::toJSON(
    run,
    auto_unbox = TRUE,
    null = "null",
    digits = NA
  )
  DBI::dbExecute(
    connection,
    "INSERT INTO analysis_runs (id, created_at, payload) VALUES (?, ?, ?)",
    params = list(run$id, run$createdAt, as.character(payload))
  )
  invisible(run)
}

list_analysis_runs <- function(connection, limit = 1L) {
  ensure_analysis_runs_table(connection)
  rows <- DBI::dbGetQuery(
    connection,
    "SELECT payload FROM analysis_runs
     ORDER BY created_at DESC, rowid DESC LIMIT ?",
    params = list(as.integer(limit))
  )
  if (nrow(rows) == 0) return(list())
  lapply(rows$payload, function(payload) {
    jsonlite::fromJSON(payload, simplifyVector = FALSE)
  })
}

find_analysis_run <- function(connection, id) {
  ensure_analysis_runs_table(connection)
  rows <- DBI::dbGetQuery(
    connection,
    "SELECT payload FROM analysis_runs WHERE id = ? LIMIT 1",
    params = list(id)
  )
  if (nrow(rows) == 0) return(NULL)
  jsonlite::fromJSON(rows$payload[[1]], simplifyVector = FALSE)
}

run_analysis_and_store <- function(connection, include_correlation = FALSE) {
  run <- compute_analysis(connection, include_correlation)
  # Incomplete runs are returned to the caller but not stored, so they never
  # become the "latest" analysis for a populated dataset.
  if (identical(run$status, "completed")) {
    save_analysis_run(connection, run)
  }
  run
}
