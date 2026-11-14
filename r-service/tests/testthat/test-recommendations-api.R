setwd(service_dir)
source(file.path(service_dir, "plumber.R"))

make_recommendation_fixture <- function() {
  path <- tempfile(fileext = ".sqlite")
  connection <- DBI::dbConnect(RSQLite::SQLite(), path)
  create_schema(connection)
  seed_fixture(connection)
  insert_scan(
    connection, "scan-4", "site-b", "https://b.example/gamma", "Gamma page",
    "completed", "2026-01-04T10:00:00Z", "2026-01-04T10:00:01Z", 500L, 1L, 0L
  )
  run <- compute_ml_run(connection)
  save_model_run(connection, run)
  DBI::dbDisconnect(connection)
  path
}

test_that("recommendations GET route returns rule-based recommendations", {
  path <- make_recommendation_fixture()
  on.exit(unlink(path), add = TRUE)

  original_db <- Sys.getenv("DATABASE_PATH", unset = NA_character_)
  original_root <- Sys.getenv("A11YSCAPE_ROOT", unset = NA_character_)
  on.exit({
    if (is.na(original_db)) Sys.unsetenv("DATABASE_PATH") else
      Sys.setenv(DATABASE_PATH = original_db)
    if (is.na(original_root)) Sys.unsetenv("A11YSCAPE_ROOT") else
      Sys.setenv(A11YSCAPE_ROOT = original_root)
  }, add = TRUE, after = FALSE)

  Sys.setenv(DATABASE_PATH = path, A11YSCAPE_ROOT = tempdir())

  result <- recommendations_handler(list(), list())
  expect_true(length(result) >= 3L)
  expect_true(all(vapply(result, function(item) {
    is.character(item$ruleId) && is.character(item$priority) &&
      is.list(item$evidence) && is.list(item$sourceScanIds)
  }, logical(1))))
  expect_true(any(vapply(result, function(item) {
    identical(item$ruleId, "color-contrast")
  }, logical(1))))
})

test_that("reports GET route is empty before generation", {
  path <- make_recommendation_fixture()
  on.exit(unlink(path), add = TRUE)

  original_db <- Sys.getenv("DATABASE_PATH", unset = NA_character_)
  original_root <- Sys.getenv("A11YSCAPE_ROOT", unset = NA_character_)
  on.exit({
    if (is.na(original_db)) Sys.unsetenv("DATABASE_PATH") else
      Sys.setenv(DATABASE_PATH = original_db)
    if (is.na(original_root)) Sys.unsetenv("A11YSCAPE_ROOT") else
      Sys.setenv(A11YSCAPE_ROOT = original_root)
  }, add = TRUE, after = FALSE)

  Sys.setenv(DATABASE_PATH = path, A11YSCAPE_ROOT = tempdir())

  result <- reports_handler(list(), list(), limit = "10")
  expect_equal(result, list())
})

test_that("reports POST route generates and lists a report", {
  path <- make_recommendation_fixture()
  on.exit(unlink(path), add = TRUE)

  original_db <- Sys.getenv("DATABASE_PATH", unset = NA_character_)
  original_root <- Sys.getenv("A11YSCAPE_ROOT", unset = NA_character_)
  on.exit({
    if (is.na(original_db)) Sys.unsetenv("DATABASE_PATH") else
      Sys.setenv(DATABASE_PATH = original_db)
    if (is.na(original_root)) Sys.unsetenv("A11YSCAPE_ROOT") else
      Sys.setenv(A11YSCAPE_ROOT = original_root)
  }, add = TRUE, after = FALSE)

  Sys.setenv(DATABASE_PATH = path, A11YSCAPE_ROOT = tempdir())

  created <- report_generate_handler(
    list(body = list(title = "API report", format = "json"), HTTP_HOST = "localhost:8000"),
    list()
  )
  expect_equal(created$title, "API report")
  expect_equal(created$format, "json")
  expect_match(created$downloadUrl, "^http://localhost:8000/reports/")

  listed <- reports_handler(list(HTTP_HOST = "localhost:8000"), list(), limit = "10")
  expect_equal(length(listed), 1L)
  expect_equal(listed[[1]]$id, created$id)
})

test_that("report POST route rejects invalid bodies", {
  path <- make_recommendation_fixture()
  on.exit(unlink(path), add = TRUE)

  original_db <- Sys.getenv("DATABASE_PATH", unset = NA_character_)
  original_root <- Sys.getenv("A11YSCAPE_ROOT", unset = NA_character_)
  on.exit({
    if (is.na(original_db)) Sys.unsetenv("DATABASE_PATH") else
      Sys.setenv(DATABASE_PATH = original_db)
    if (is.na(original_root)) Sys.unsetenv("A11YSCAPE_ROOT") else
      Sys.setenv(A11YSCAPE_ROOT = original_root)
  }, add = TRUE, after = FALSE)

  Sys.setenv(DATABASE_PATH = path, A11YSCAPE_ROOT = tempdir())

  error <- tryCatch(
    report_generate_handler(list(body = list(title = "x")), list()),
    api_error = function(condition) condition
  )
  expect_s3_class(error, "api_error")
  expect_equal(error$status, 400L)
})

test_that("recommendation and report routes report a missing database as 503", {
  original_db <- Sys.getenv("DATABASE_PATH", unset = NA_character_)
  original_root <- Sys.getenv("A11YSCAPE_ROOT", unset = NA_character_)
  on.exit({
    if (is.na(original_db)) Sys.unsetenv("DATABASE_PATH") else
      Sys.setenv(DATABASE_PATH = original_db)
    if (is.na(original_root)) Sys.unsetenv("A11YSCAPE_ROOT") else
      Sys.setenv(A11YSCAPE_ROOT = original_root)
  }, add = TRUE, after = FALSE)

  Sys.setenv(DATABASE_PATH = tempfile(fileext = ".sqlite"), A11YSCAPE_ROOT = tempdir())

  rec_error <- tryCatch(recommendations_handler(list(), list()), api_error = function(condition) condition)
  rep_error <- tryCatch(reports_handler(list(), list()), api_error = function(condition) condition)
  post_error <- tryCatch(
    report_generate_handler(list(body = list(title = "Missing DB", format = "csv")), list()),
    api_error = function(condition) condition
  )
  expect_s3_class(rec_error, "api_error")
  expect_s3_class(rep_error, "api_error")
  expect_s3_class(post_error, "api_error")
  expect_equal(rec_error$status, 503L)
  expect_equal(rep_error$status, 503L)
  expect_equal(post_error$status, 503L)
})