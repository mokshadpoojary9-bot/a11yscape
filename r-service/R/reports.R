# Report generation from stored scanner records and derived analytics.
#
# Reports are written under r-engine/reports and registered in the additive
# reports table. Their content is assembled from SQLite rows and existing R
# calculations; no finding is typed by hand.

report_base_url <- function(req = NULL) {
  host <- Sys.getenv("R_HOST", unset = "127.0.0.1")
  port <- Sys.getenv("R_PORT", unset = "8000")
  if (!is.null(req) && !is.null(req$HTTP_HOST) && nzchar(req$HTTP_HOST)) {
    scheme <- if (!is.null(req$rook.url_scheme) && nzchar(req$rook.url_scheme)) {
      req$rook.url_scheme
    } else {
      "http"
    }
    return(paste0(scheme, "://", req$HTTP_HOST))
  }
  paste0("http://", host, ":", port)
}

reports_directory <- function() {
  path <- file.path(a11yscape_root(), "r-engine", "reports")
  dir.create(path, recursive = TRUE, showWarnings = FALSE)
  path
}

report_download_url <- function(filename, req = NULL) {
  paste0(sub("/$", "", report_base_url(req)), "/reports/", filename)
}

html_escape <- function(value) {
  value <- as.character(value %||% "")
  value <- gsub("&", "&amp;", value, fixed = TRUE)
  value <- gsub("<", "&lt;", value, fixed = TRUE)
  value <- gsub(">", "&gt;", value, fixed = TRUE)
  value <- gsub("\"", "&quot;", value, fixed = TRUE)
  value
}

report_analysis <- function(connection) {
  scans <- normalise_scans(query_scans(connection))
  violations <- query_violations(connection)
  summary <- build_summary(connection)

  metric_labels <- c(
    issue_count = "Issue count",
    duration_ms = "Scan duration (ms)",
    pages_scanned = "Pages scanned",
    severity_critical = "Critical issues",
    severity_serious = "Serious issues",
    severity_moderate = "Moderate issues",
    severity_minor = "Minor issues"
  )

  descriptives <- list()
  for (metric in intersect(numeric_scan_columns, names(scans))) {
    values <- suppressWarnings(as.numeric(scans[[metric]]))
    values <- values[is.finite(values)]
    if (length(values) == 0) next
    descriptives[[length(descriptives) + 1]] <- list(
      metric = unname(metric_labels[[metric]] %||% metric),
      mean = as.numeric(mean(values)),
      median = as.numeric(stats::median(values)),
      sd = if (length(values) >= 2L) as.numeric(stats::sd(values)) else 0,
      min = as.numeric(min(values)),
      max = as.numeric(max(values))
    )
  }

  domain_summaries <- list()
  if (nrow(scans) > 0) {
    for (domain in sort(unique(scans$domain))) {
      subset <- scans[scans$domain == domain, , drop = FALSE]
      domain_summaries[[length(domain_summaries) + 1]] <- list(
        domain = domain,
        scans = as.integer(nrow(subset)),
        meanIssues = as.numeric(mean(subset$issue_count))
      )
    }
    order_index <- order(
      vapply(domain_summaries, function(item) -item$meanIssues, numeric(1)),
      vapply(domain_summaries, function(item) item$domain, character(1))
    )
    domain_summaries <- domain_summaries[order_index]
  }

  wcag_tags <- unlist(lapply(violations$wcag_tags, parse_json_array), use.names = FALSE)
  wcag_counts <- sort(table(wcag_tags), decreasing = TRUE)
  wcag_summary <- lapply(names(wcag_counts), function(tag) {
    list(criterion = tag, count = as.integer(wcag_counts[[tag]]))
  })

  correlation <- NULL
  correlation_columns <- intersect(
    c("issue_count", "duration_ms", "pages_scanned", "severity_critical",
      "severity_serious", "severity_moderate", "severity_minor"),
    names(scans)
  )
  if (nrow(scans) >= 3L && length(correlation_columns) >= 2L &&
      all(vapply(scans[, correlation_columns, drop = FALSE], function(column) {
        values <- suppressWarnings(as.numeric(column))
        values <- values[is.finite(values)]
        length(values) >= 2L && stats::sd(values) > 0
      }, logical(1)))) {
    matrix <- tryCatch(
      stats::cor(scans[, correlation_columns, drop = FALSE], use = "pairwise.complete.obs"),
      error = function(error) NULL
    )
    if (!is.null(matrix) && all(is.finite(matrix))) {
      correlation <- list(
        variables = correlation_columns,
        matrix = lapply(seq_len(nrow(matrix)), function(index) {
          as.numeric(matrix[index, ])
        })
      )
    }
  }

  list(
    summary = summary,
    descriptives = descriptives,
    domainSummaries = domain_summaries,
    wcagSummary = wcag_summary,
    correlation = correlation,
    topRules = summary$topRules
  )
}

report_text_lines <- function(report) {
  lines <- c(
    report$title,
    "",
    sprintf("Generated: %s", report$generatedAt),
    sprintf("Report ID: %s", report$id),
    sprintf("Format: %s", toupper(report$format)),
    "",
    "EXECUTIVE SUMMARY",
    sprintf("Scans: %d", report$analysis$summary$totalScans),
    sprintf("Domains: %d", report$analysis$summary$totalWebsites),
    sprintf("Recorded issues: %d", report$analysis$summary$totalViolations),
    sprintf("Recommendations: %d", length(report$recommendations)),
    sprintf("Latest scan: %s", report$analysis$summary$latestScanAt %||% "not available"),
    if (!is.null(report$modelRun)) {
      sprintf(
        "Latest K-means run: k=%d, silhouette=%.3f, %d scans.",
        report$modelRun$kSelection$selectedK %||% NA_integer_,
        report$modelRun$silhouette %||% NA_real_,
        report$modelRun$datasetRows %||% 0L
      )
    } else {
      "Latest K-means run: not available."
    },
    "",
    "DATASET OVERVIEW",
    sprintf("Completed scans: %d", report$analysis$summary$completedScans),
    sprintf("Failed scans: %d", report$analysis$summary$failedScans),
    sprintf("Severity totals: critical=%d, serious=%d, moderate=%d, minor=%d",
            report$analysis$summary$severityTotals$critical %||% 0L,
            report$analysis$summary$severityTotals$serious %||% 0L,
            report$analysis$summary$severityTotals$moderate %||% 0L,
            report$analysis$summary$severityTotals$minor %||% 0L),
    "",
    "TOP RECORDED RULES"
  )

  for (rule in report$analysis$summary$topRules) {
    lines <- c(lines, sprintf(
      "- %s (%s): %d violations, %d nodes, %d scans",
      rule$ruleId, rule$impact, rule$violations, rule$affectedNodes, rule$scans
    ))
  }
  if (length(report$analysis$summary$topRules) == 0) {
    lines <- c(lines, "- No recorded violations.")
  }

  lines <- c(lines, "", "STATISTICAL ANALYSIS")
  for (item in report$analysis$descriptives) {
    lines <- c(lines, sprintf(
      "- %s: mean=%.3f, median=%.3f, sd=%.3f, min=%.3f, max=%.3f",
      item$metric, item$mean, item$median, item$sd, item$min, item$max
    ))
  }
  if (length(report$analysis$descriptives) == 0) {
    lines <- c(lines, "- No descriptive statistics available.")
  }

  lines <- c(lines, "", "DOMAIN SUMMARIES")
  for (item in report$analysis$domainSummaries) {
    lines <- c(lines, sprintf("- %s: %d scans, mean issues=%.2f", item$domain, item$scans, item$meanIssues))
  }
  if (length(report$analysis$domainSummaries) == 0) {
    lines <- c(lines, "- No domain summaries available.")
  }

  lines <- c(lines, "", "PCA RESULTS")
  if (!is.null(report$modelRun) && !is.null(report$modelRun$pca)) {
    pca <- report$modelRun$pca
    lines <- c(lines, sprintf("Features: %s", paste(pca$features, collapse = ", ")))
    for (index in seq_along(pca$explainedVariance)) {
      lines <- c(lines, sprintf(
        "- PC%d: %.1f%% explained, %.1f%% cumulative",
        index, 100 * pca$explainedVariance[[index]], 100 * pca$cumulativeVariance[[index]]
      ))
    }
    lines <- c(lines, "Loadings:")
    for (loading in pca$loadings) {
      lines <- c(lines, sprintf(
        "  %s: PC1=%.3f, PC2=%.3f",
        loading$feature, loading$pc1, loading$pc2
      ))
    }
  } else {
    lines <- c(lines, "No persisted PCA result is available.")
  }

  lines <- c(lines, "", "K-MEANS CLUSTER RESULTS")
  if (!is.null(report$modelRun)) {
    for (cluster in report$modelRun$clusters) {
      lines <- c(lines, sprintf(
        "- %s: %d scans, mean issues=%.2f, dominant severity=%s, top rules=%s",
        cluster$label, cluster$size, cluster$meanIssueCount, cluster$dominantSeverity,
        if (length(cluster$topRules) > 0) paste(cluster$topRules, collapse = ", ") else "none"
      ))
    }
    if (length(report$modelRun$clusters) == 0) {
      lines <- c(lines, "- No cluster results available.")
    }
  } else {
    lines <- c(lines, "No persisted K-means result is available.")
  }

  lines <- c(lines, "", "RECOMMENDATIONS AND PRIORITIES")
  if (length(report$recommendations) == 0) {
    lines <- c(lines, "No recommendations can be derived from the current records.")
  } else {
    for (recommendation in report$recommendations) {
      lines <- c(lines, sprintf(
        "- [%s] %s (%s): %d scans, %d domains",
        toupper(recommendation$priority), recommendation$title, recommendation$ruleId,
        recommendation$affectedScans, length(recommendation$affectedDomains)
      ))
      lines <- c(lines, sprintf("  Why: %s", recommendation$rationale))
      lines <- c(lines, sprintf("  Action: %s", recommendation$remediation))
      if (length(recommendation$analyticsEvidence) > 0) {
        lines <- c(lines, sprintf("  Evidence: %s", paste(recommendation$analyticsEvidence, collapse = " ")))
      }
      if (length(recommendation$mlEvidence) > 0) {
        lines <- c(lines, sprintf("  ML evidence: %s", paste(recommendation$mlEvidence, collapse = " ")))
      }
    }
  }

  lines <- c(lines, "", "LIMITATIONS AND METHODOLOGY")
  for (note in report$notes) {
    lines <- c(lines, paste("-", note))
  }
  lines <- c(
    lines,
    "- Recommendations are rule-based and derived from recorded axe-core findings.",
    "- Statistical and ML outputs are descriptive; correlation is not causation.",
    "- Component signs in PCA are arbitrary.",
    "- Results describe this corpus only and may change as scans are added."
  )
  lines
}

write_report_csv_data <- function(path, scans) {
  columns <- intersect(
    c("id", "domain", "target_url", "status", "started_at", "finished_at",
      "duration_ms", "pages_scanned", "issue_count", "severity_critical",
      "severity_serious", "severity_moderate", "severity_minor"),
    names(scans)
  )
  data <- if (nrow(scans) == 0) {
    data.frame()
  } else {
    scans[, columns, drop = FALSE]
  }
  utils::write.csv(data, path, row.names = FALSE, na = "")
}

write_report_json <- function(path, report) {
  payload <- list(
    generatedAt = report$generatedAt,
    report = list(
      id = report$id,
      title = report$title,
      format = report$format
    ),
    dataset = report$analysis$summary,
    analysis = list(
      descriptives = report$analysis$descriptives,
      domainSummaries = report$analysis$domainSummaries,
      wcagSummary = report$analysis$wcagSummary,
      correlation = report$analysis$correlation
    ),
    recommendations = report$recommendations,
    modelRun = report$modelRun,
    notes = report$notes
  )
  jsonlite::write_json(
    payload, path, auto_unbox = TRUE, pretty = TRUE, null = "null", na = "null", digits = NA
  )
}

html_table <- function(headers, rows) {
  if (length(rows) == 0) return("<p>No data available.</p>")
  header_html <- paste(vapply(headers, function(header) {
    paste0("<th>", html_escape(header), "</th>")
  }, character(1)), collapse = "")
  body_html <- paste(vapply(rows, function(row) {
    paste0("<tr>", paste(vapply(row, function(cell) {
      paste0("<td>", html_escape(cell), "</td>")
    }, character(1)), collapse = ""), "</tr>")
  }, character(1)), collapse = "")
  paste0(
    "<table><thead><tr>", header_html, "</tr></thead><tbody>",
    body_html, "</tbody></table>"
  )
}

write_report_html <- function(path, report) {
  top_rule_rows <- lapply(report$analysis$summary$topRules, function(rule) {
    c(rule$ruleId, rule$impact, as.character(rule$violations), as.character(rule$scans))
  })
  descriptive_rows <- lapply(report$analysis$descriptives, function(item) {
    c(item$metric, sprintf("%.3f", item$mean), sprintf("%.3f", item$sd), sprintf("%.3f", item$min), sprintf("%.3f", item$max))
  })
  domain_rows <- lapply(report$analysis$domainSummaries, function(item) {
    c(item$domain, as.character(item$scans), sprintf("%.2f", item$meanIssues))
  })
  recommendation_html <- if (length(report$recommendations) == 0) {
    "<p>No recommendations can be derived from the current records.</p>"
  } else {
    paste(vapply(report$recommendations, function(item) {
      paste0(
        "<section class=\"recommendation\">",
        "<h3>", html_escape(item$title), " <span>", html_escape(item$ruleId), "</span></h3>",
        "<p><strong>Priority:</strong> ", html_escape(item$priority), "</p>",
        "<p>", html_escape(item$rationale), "</p>",
        "<p><strong>Recommended action:</strong> ", html_escape(item$remediation), "</p>",
        "<p><strong>Evidence:</strong> ", html_escape(paste(item$analyticsEvidence, collapse = " ")), "</p>",
        if (length(item$mlEvidence) > 0) {
          paste0("<p><strong>ML evidence:</strong> ", html_escape(paste(item$mlEvidence, collapse = " ")), "</p>")
        } else { "" },
        "<p><strong>Source scans:</strong> ", html_escape(paste(item$sourceScanIds, collapse = ", ")), "</p>",
        "</section>"
      )
    }, character(1)), collapse = "")
  }

  pca_html <- if (!is.null(report$modelRun) && !is.null(report$modelRun$pca)) {
    pca <- report$modelRun$pca
    paste0(
      "<p>Features: ", html_escape(paste(pca$features, collapse = ", ")), "</p>",
      html_table(
        c("Component", "Explained variance", "Cumulative variance"),
        lapply(seq_along(pca$explainedVariance), function(index) {
          c(sprintf("PC%d", index), sprintf("%.1f%%", 100 * pca$explainedVariance[[index]]), sprintf("%.1f%%", 100 * pca$cumulativeVariance[[index]]))
        })
      ),
      "<h4>Loadings</h4>",
      html_table(
        c("Feature", "PC1", "PC2"),
        lapply(pca$loadings, function(item) {
          c(item$feature, sprintf("%.3f", item$pc1), sprintf("%.3f", item$pc2))
        })
      )
    )
  } else {
    "<p>No persisted PCA result is available.</p>"
  }

  cluster_html <- if (!is.null(report$modelRun) && length(report$modelRun$clusters) > 0) {
    html_table(
      c("Cluster", "Scans", "Mean issues", "Dominant severity", "Top rules"),
      lapply(report$modelRun$clusters, function(item) {
        c(item$label, as.character(item$size), sprintf("%.2f", item$meanIssueCount), item$dominantSeverity,
          if (length(item$topRules) > 0) paste(item$topRules, collapse = ", ") else "none")
      })
    )
  } else {
    "<p>No persisted K-means result is available.</p>"
  }

  html <- paste0(
    "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">",
    "<title>", html_escape(report$title), "</title>",
    "<style>body{font-family:system-ui,sans-serif;max-width:960px;margin:2rem auto;padding:0 1rem;color:#111}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border:1px solid #ccc;padding:.4rem .6rem;text-align:left}h1,h2,h3{margin-top:1.5rem}section{margin:1.5rem 0;padding:1rem;border:1px solid #eee;border-radius:.5rem}</style>",
    "</head><body>",
    "<h1>", html_escape(report$title), "</h1>",
    "<p><strong>Generated:</strong> ", html_escape(report$generatedAt), "</p>",
    "<p><strong>Report ID:</strong> ", html_escape(report$id), "</p>",
    "<h2>Executive summary</h2>",
    "<ul>",
    "<li>Scans: ", report$analysis$summary$totalScans, "</li>",
    "<li>Domains: ", report$analysis$summary$totalWebsites, "</li>",
    "<li>Recorded issues: ", report$analysis$summary$totalViolations, "</li>",
    "<li>Recommendations: ", length(report$recommendations), "</li>",
    "<li>Latest scan: ", html_escape(report$analysis$summary$latestScanAt %||% "not available"), "</li>",
    "</ul>",
    "<h2>Dataset overview</h2>",
    html_table(
      c("Status", "Count"),
      lapply(report$analysis$summary$statusCounts, function(item) {
        c(item$status, as.character(item$count))
      })
    ),
    "<h2>Accessibility findings</h2>",
    html_table(c("Rule", "Impact", "Violations", "Scans"), top_rule_rows),
    "<h2>Statistical analysis</h2>",
    html_table(c("Metric", "Mean", "SD", "Min", "Max"), descriptive_rows),
    "<h3>Domain summaries</h3>",
    html_table(c("Domain", "Scans", "Mean issues"), domain_rows),
    "<h2>PCA results</h2>", pca_html,
    "<h2>K-means cluster results</h2>", cluster_html,
    "<h2>Recommendations and priorities</h2>", recommendation_html,
    "<h2>Limitations and methodology</h2><ul>",
    paste(vapply(report$notes, function(note) paste0("<li>", html_escape(note), "</li>"), character(1)), collapse = ""),
    "<li>Recommendations are rule-based and derived from recorded axe-core findings.</li>",
    "<li>Statistical and ML outputs are descriptive; correlation is not causation.</li>",
    "<li>PCA component signs are arbitrary.</li>",
    "<li>Results describe this corpus only and may change as scans are added.</li>",
    "</ul></body></html>"
  )
  writeLines(html, path, useBytes = TRUE)
}

write_report_pdf <- function(path, report) {
  lines <- report_text_lines(report)
  pdf(path, width = 8.27, height = 11.69)
  on.exit(grDevices::dev.off(), add = TRUE)
  par(mar = c(0, 0, 0, 0))
  plot.new()
  y <- 0.95
  for (line in lines) {
    wrapped <- strwrap(line, width = 100)
    if (length(wrapped) == 0) wrapped <- ""
    for (wrapped_line in wrapped) {
      if (y < 0.05) {
        plot.new()
        y <- 0.95
      }
      text(0.06, y, wrapped_line, adj = c(0, 1), cex = 0.82)
      y <- y - 0.015
    }
    y <- y - 0.004
  }
}

generate_report <- function(connection, title, format, req = NULL) {
  scans <- normalise_scans(query_scans(connection))
  report_id <- paste0(
    "report-",
    format(Sys.time(), "%Y%m%dT%H%M%OS3", tz = "UTC"),
    "-",
    sprintf("%04d", sample.int(9999L, 1L))
  )
  filename <- paste0(report_id, ".", format)
  path <- file.path(reports_directory(), filename)
  timestamp <- utc_now()

  analysis <- report_analysis(connection)
  model_run <- {
    runs <- list_model_runs(connection, limit = 1L)
    if (length(runs) > 0) runs[[1]] else NULL
  }
  recommendations <- recommendations_payload(connection, model_run)

  report <- list(
    id = report_id,
    title = title,
    format = format,
    generatedAt = timestamp,
    createdAt = timestamp,
    filePath = path,
    analysis = analysis,
    recommendations = recommendations,
    modelRun = model_run,
    notes = c(
      "Report generated from stored scanner records only.",
      if (nrow(scans) == 0) {
        "No scan records were available when this report was generated."
      } else {
        sprintf("%d scan record(s) contributed to this report.", nrow(scans))
      },
      if (length(query_violations(connection)) == 0) {
        "No violations were recorded in the current corpus."
      } else {
        sprintf("%d violation record(s) contributed to this report.", nrow(query_violations(connection)))
      },
      if (is.null(model_run)) {
        "No persisted PCA/K-means run was available; machine-learning sections are omitted."
      } else {
        "The latest persisted PCA/K-means run is included."
      },
      "Correlation coefficients describe association, not causation.",
      "Recommendations are rule-based and tied to recorded axe-core findings."
    )
  )

  if (identical(format, "csv")) {
    write_report_csv_data(path, scans)
  } else if (identical(format, "json")) {
    write_report_json(path, report)
  } else if (identical(format, "html")) {
    write_report_html(path, report)
  } else if (identical(format, "pdf")) {
    write_report_pdf(path, report)
  } else {
    stop_api(400L, "Unsupported report format.", list(parameter = "format"))
  }

  size <- file.info(path)$size
  if (is.na(size)) size <- 0L
  report$sizeBytes <- as.integer(size)
  report$downloadUrl <- report_download_url(filename, NULL)

  saved <- list(
    id = report$id,
    createdAt = report$createdAt,
    title = report$title,
    format = report$format,
    filePath = path,
    sizeBytes = report$sizeBytes
  )
  save_report(connection, saved)

  list(
    id = report$id,
    title = report$title,
    format = report$format,
    createdAt = report$createdAt,
    sizeBytes = report$sizeBytes,
    downloadUrl = report_download_url(filename, req)
  )
}
