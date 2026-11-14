test_that("axe tags are parsed into WCAG criteria and level tags are ignored", {
  parsed <- parse_wcag_tags(c("wcag2a", "wcag2aa", "wcag143", "best-practice", "cat.color"))
  expect_equal(parsed$criteria, "1.4.3")
  expect_equal(parsed$levels, c("A", "AA"))

  expect_equal(parse_wcag_tags(c("wcag111"))$criteria, "1.1.1")
  expect_equal(parse_wcag_tags(c("wcag258"))$criteria, "2.5.8")
  expect_equal(parse_wcag_tags(c("wcag2411"))$criteria, "2.4.11")
  expect_equal(length(parse_wcag_tags(c("best-practice"))$criteria), 0L)
})

test_that("analysis is computed from stored rows only", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  run <- compute_analysis(connection, include_correlation = TRUE)

  expect_equal(run$status, "completed")
  # scan-1 is completed and scan-2 is partial; scan-3 failed and is excluded.
  expect_equal(run$datasetRows, 2L)
  expect_equal(run$summary$totalScans, 3L)
  expect_equal(run$summary$totalWebsites, 2L)
  expect_equal(run$summary$totalViolations, 3L)
  expect_equal(run$summary$meanViolationsPerScan, 2)
  expect_equal(run$summary$medianViolationsPerScan, 2)

  severity_counts <- vapply(run$severityDistribution, function(item) item$count, integer(1))
  expect_equal(sum(severity_counts), 3L)

  criteria <- vapply(run$wcagSummary, function(item) item$criterion, character(1))
  expect_true(all(c("1.1.1", "1.3.1", "1.4.3") %in% criteria))
  contrast <- run$wcagSummary[[which(criteria == "1.4.3")]]
  expect_equal(contrast$title, "Contrast (Minimum)")
  expect_equal(contrast$level, "AA")
  expect_equal(contrast$violationCount, 1L)

  metrics <- vapply(run$descriptives, function(item) item$metric, character(1))
  expect_true("Violations per scan" %in% metrics)

  # Two analysable scans are below the three-scan minimum: no matrix is invented.
  expect_null(run$correlation)
  expect_true(any(grepl("Correlation needs at least 3", run$notes, fixed = TRUE)))
})

test_that("correlation is returned only when requested and only with variance", {
  connection <- open_fixture_database()
  insert_scan(
    connection, "scan-4", "site-b", "https://b.example/gamma", "Gamma page",
    "completed", "2026-01-04T10:00:00Z", "2026-01-04T10:00:01Z", 700L, 1L, 0L
  )
  insert_scan(
    connection, "scan-5", "site-a", "https://a.example/delta", "Delta page",
    "completed", "2026-01-05T10:00:00Z", "2026-01-05T10:00:01Z", 900L, 1L, 2L,
    serious = 2L
  )
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  without_matrix <- compute_analysis(connection, include_correlation = FALSE)
  expect_null(without_matrix$correlation)
  expect_true(any(grepl("not requested", without_matrix$notes, fixed = TRUE)))

  with_matrix <- compute_analysis(connection, include_correlation = TRUE)
  expect_false(is.null(with_matrix$correlation))
  expect_true(length(with_matrix$correlation$variables) >= 2L)
  expect_equal(
    length(with_matrix$correlation$matrix),
    length(with_matrix$correlation$variables)
  )
  expect_true(all(vapply(with_matrix$correlation$matrix, function(row) {
    length(row) == length(with_matrix$correlation$variables)
  }, logical(1))))
})

test_that("an empty corpus reports insufficient_data instead of fabricating results", {
  connection <- DBI::dbConnect(RSQLite::SQLite(), ":memory:")
  create_schema(connection)
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  run <- compute_analysis(connection, include_correlation = TRUE)

  expect_equal(run$status, "insufficient_data")
  expect_equal(run$message, "Run at least one website scan first.")
  expect_equal(run$datasetRows, 0L)
  expect_equal(run$summary$totalScans, 0L)
  expect_equal(length(run$severityDistribution), 0L)
  expect_equal(length(run$wcagSummary), 0L)
  expect_equal(length(run$descriptives), 0L)
  expect_null(run$correlation)
})

test_that("analysis runs are stored and read back as the latest run", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  run <- run_analysis_and_store(connection, include_correlation = FALSE)
  listed <- list_analysis_runs(connection, limit = 1L)

  expect_equal(length(listed), 1L)
  expect_equal(listed[[1]]$id, run$id)
  expect_equal(find_analysis_run(connection, run$id)$datasetRows, run$datasetRows)
  expect_null(find_analysis_run(connection, "analysis-missing"))
})

test_that("analysis requests accept only the documented options", {
  expect_false(validate_analysis_body(NULL)$includeCorrelation)
  expect_false(validate_analysis_body(list())$includeCorrelation)
  expect_true(validate_analysis_body(list(includeCorrelation = TRUE))$includeCorrelation)
  expect_true(validate_analysis_body(list(include_correlation = TRUE))$includeCorrelation)
  expect_error(validate_analysis_body(list(includeCorrelation = "yes")), class = "api_error")
  expect_error(validate_analysis_body(list(unknown = TRUE)), class = "api_error")
  expect_error(validate_analysis_body("nope"), class = "api_error")
})
