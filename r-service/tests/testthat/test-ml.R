test_that("PCA and K-means are computed from eligible real rows", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  insert_scan(
    connection, "scan-4", "site-b", "https://b.example/gamma", "Gamma page",
    "completed", "2026-01-04T10:00:00Z", "2026-01-04T10:00:01Z", 500L, 1L, 0L
  )

  run <- compute_ml_run(connection)

  expect_equal(run$datasetRows, 3L)
  expect_equal(run$algorithm, "kmeans")
  expect_equal(run$status, "completed")
  expect_true(length(run$pca$explainedVariance) >= 2L)
  expect_equal(sum(run$pca$explainedVariance), 1, tolerance = 1e-8)
  expect_equal(
    run$pca$cumulativeVariance[[length(run$pca$cumulativeVariance)]],
    1,
    tolerance = 1e-8
  )
  expect_equal(length(run$pca$scores), 3L)
  expect_equal(length(run$pca$loadings), length(run$pca$features))
  expect_true(all(vapply(run$pca$scores, function(score) {
    is.numeric(score$pc1) && is.numeric(score$pc2) &&
      is.numeric(score$clusterId)
  }, logical(1))))
  expect_true("duration_ms" %in% unlist(run$pca$features))
  expect_false("severity_moderate" %in% unlist(run$pca$features))

  expect_equal(length(run$assignments), 3L)
  expect_equal(length(run$clusters), 2L)
  expect_equal(sum(vapply(run$clusters, function(cluster) cluster$size, numeric(1))), 3)
  expect_true(all(vapply(run$clusters, function(cluster) {
    length(cluster$topRules) >= 0L && is.numeric(cluster$centroid$issue_count)
  }, logical(1))))
  expect_equal(run$kSelection$method, "silhouette")
  expect_equal(run$kSelection$selectedK, 2L)
  expect_true(is.finite(run$silhouette))
  expect_equal(length(run$notes), 7L)
})

test_that("model runs are persisted and returned newest first", {
  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)

  insert_scan(
    connection, "scan-4", "site-b", "https://b.example/gamma", "Gamma page",
    "completed", "2026-01-04T10:00:00Z", "2026-01-04T10:00:01Z", 500L, 1L, 0L
  )

  first <- compute_ml_run(connection)
  save_model_run(connection, first)
  second <- compute_ml_run(connection, requested_k = 2L)
  save_model_run(connection, second)
  expect_equal(first$assignments, second$assignments)

  stored <- list_model_runs(connection, limit = 10L)
  expect_equal(length(stored), 2L)
  expect_equal(stored[[1]]$id, second$id)
  expect_equal(stored[[1]]$datasetRows, 3L)
  expect_equal(stored[[1]]$pca$explainedVariance[[1]], second$pca$explainedVariance[[1]])
  expect_equal(length(stored[[1]]$assignments), 3L)
})

test_that("ML request validation accepts only explicit integer k values", {
  expect_null(parse_ml_k(NULL))
  expect_null(parse_ml_k(""))
  expect_equal(parse_ml_k("3"), 3L)
  expect_error(parse_ml_k("3.5"), class = "api_error")
  expect_error(parse_ml_k(11L), class = "api_error")
  expect_error(validate_ml_body(list(k = 1L)), class = "api_error")
  expect_error(validate_ml_body(list(k = 2L, scale = TRUE)), class = "api_error")
  expect_equal(validate_ml_body(list(k = 2L))$k, 2L)
})

test_that("ML rejects insufficient data, invalid k, and constant features", {
  empty <- DBI::dbConnect(RSQLite::SQLite(), ":memory:")
  create_schema(empty)
  expect_error(compute_ml_run(empty), class = "api_error")
  DBI::dbDisconnect(empty)

  connection <- open_fixture_database()
  on.exit(DBI::dbDisconnect(connection), add = TRUE)
  insert_scan(
    connection, "scan-4", "site-b", "https://b.example/gamma", "Gamma page",
    "completed", "2026-01-04T10:00:00Z", "2026-01-04T10:00:01Z", 500L, 1L, 0L
  )
  expect_error(compute_ml_run(connection, requested_k = 7L), class = "api_error")

  constant <- DBI::dbConnect(RSQLite::SQLite(), ":memory:")
  create_schema(constant)
  DBI::dbExecute(
    constant,
    "INSERT INTO websites (id, hostname, first_seen_at, last_seen_at)
     VALUES ('site-a', 'a.example', '2026-01-01', '2026-01-01')"
  )
  for (index in seq_len(3L)) {
    insert_scan(
      constant, paste0("constant-", index), "site-a",
      paste0("https://a.example/", index), "Page", "completed",
      paste0("2026-01-0", index, "T10:00:00Z"),
      paste0("2026-01-0", index, "T10:00:01Z"),
      1000L, 1L, 0L
    )
  }
  expect_error(compute_ml_run(constant), class = "api_error")
  DBI::dbDisconnect(constant)
})
