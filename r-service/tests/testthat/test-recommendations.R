test_that("recommendations are derived from recorded violations", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  recommendations <- recommendations_payload(connection)

  expect_equal(length(recommendations), 3L)
  expect_equal(recommendations[[1]]$ruleId, "color-contrast")
  expect_equal(recommendations[[1]]$priority, "high")
  expect_equal(recommendations[[1]]$affectedScans, 1L)
  expect_equal(recommendations[[1]]$affectedDomains, "a.example")
  expect_equal(recommendations[[1]]$evidence$violations, 1L)
  expect_equal(recommendations[[1]]$evidence$affectedNodes, 2L)
  expect_equal(recommendations[[1]]$sourceScanIds, "scan-1")
  expect_true(length(recommendations[[1]]$analyticsEvidence) >= 3L)
  expect_equal(recommendations[[1]]$mlEvidence, list())
  expect_equal(recommendations[[2]]$ruleId, "image-alt")
  expect_equal(recommendations[[2]]$priority, "medium")
  expect_equal(recommendations[[3]]$ruleId, "label")
})

test_that("recommendations include ML evidence when a model run is supplied", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  insert_scan(
    connection, "scan-4", "site-b", "https://b.example/gamma", "Gamma page",
    "completed", "2026-01-04T10:00:00Z", "2026-01-04T10:00:01Z", 500L, 1L, 0L
  )
  run <- compute_ml_run(connection)
  save_model_run(connection, run)

  recommendations <- recommendations_payload(connection, run)
  image_alt <- Filter(function(item) identical(item$ruleId, "image-alt"), recommendations)[[1]]

  expect_true(length(image_alt$mlEvidence) >= 1L)
  expect_match(image_alt$mlEvidence[[1]], "K-means")
})

test_that("recommendations return an empty list when there are no violations", {
  connection <- DBI::dbConnect(RSQLite::SQLite(), ":memory:")
  on.exit(DBI::dbDisconnect(connection), add = TRUE)
  create_schema(connection)

  expect_equal(recommendations_payload(connection), list())
})