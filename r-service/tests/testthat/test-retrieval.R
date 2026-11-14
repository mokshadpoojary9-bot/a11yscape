test_that("summary reports only values stored in SQLite", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  summary <- build_summary(connection, recent_limit = 2L)

  expect_equal(summary$totalScans, 3L)
  expect_equal(summary$totalWebsites, 2L)
  expect_equal(summary$completedScans, 1L)
  expect_equal(summary$failedScans, 1L)
  expect_equal(summary$totalViolations, 4L)
  expect_equal(summary$latestScanAt, "2026-01-03T10:00:00Z")
  expect_equal(
    unlist(summary$severityTotals),
    c(critical = 1, serious = 3, moderate = 0, minor = 0)
  )
  expect_equal(length(summary$recentScans), 2L)
  expect_equal(summary$recentScans[[1]]$id, "scan-3")
  expect_equal(summary$recentScans[[1]]$errorMessage, "Navigation timeout")
  expect_equal(summary$topRules[[1]]$ruleId, "image-alt")
  expect_equal(summary$topRules[[1]]$affectedNodes, 4L)
})

test_that("recent scans filter by query and status without fabricating rows", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  result <- recent_scan_payload(connection, query = "alpha", status = "completed", limit = 5L)

  expect_equal(result$total, 1L)
  expect_equal(length(result$records), 1L)
  expect_equal(result$records[[1]]$id, "scan-1")
  expect_equal(result$records[[1]]$pageTitle, "Alpha page")
  expect_equal(result$records[[1]]$issueCount, 3L)
  expect_null(result$records[[1]]$issues)

  empty <- recent_scan_payload(connection, query = "does-not-exist", limit = 5L)
  expect_equal(empty$total, 0L)
  expect_equal(empty$records, list())
})

test_that("scan detail returns stored violations and parsed metadata", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  detail <- scan_detail_payload(connection, "scan-1")

  expect_equal(detail$id, "scan-1")
  expect_equal(detail$domain, "a.example")
  expect_equal(length(detail$issues), 2L)
  expect_equal(detail$issues[[1]]$ruleId, "color-contrast")
  expect_equal(detail$issues[[1]]$impact, "critical")
  expect_equal(detail$issues[[1]]$wcagTags, c("wcag2a", "wcag2aa", "wcag143"))
  expect_equal(detail$issues[[1]]$elements, "h1")
  expect_equal(detail$issues[[1]]$nodeCount, 2L)

  expect_null(scan_detail_payload(connection, "missing-scan"))
})

test_that("failed scans are excluded from violation retrieval", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  insert_violation(
    connection, "v-failed", "scan-3", "https://a.example/offline", "html-lang",
    "moderate", "The document must have a lang attribute.", '["wcag2a","wcag311"]', 1L
  )

  expect_equal(nrow(query_violations(connection)), 3L)
  expect_equal(nrow(query_violations(connection, scan_id = "scan-3")), 0L)
})
