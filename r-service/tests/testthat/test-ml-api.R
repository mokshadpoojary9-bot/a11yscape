# Plumber-level contract tests for the ML run routes. These call the handlers
# directly with a throwaway SQLite database so the real corpus is never touched.

setwd(service_dir)
source(file.path(service_dir, "plumber.R"))

make_ml_fixture <- function() {
  path <- tempfile(fileext = ".sqlite")
  connection <- DBI::dbConnect(RSQLite::SQLite(), path)
  create_schema(connection)
  seed_fixture(connection)
  insert_scan(
    connection, "scan-4", "site-b", "https://b.example/gamma", "Gamma page",
    "completed", "2026-01-04T10:00:00Z", "2026-01-04T10:00:01Z", 500L, 1L, 0L
  )
  DBI::dbDisconnect(connection)
  path
}

test_that("ML GET route returns an empty list before any run", {
  path <- make_ml_fixture()
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

  result <- ml_runs_handler(list(), list())
  expect_equal(result, list())
})

test_that("ML POST route runs, persists, and is returned by GET", {
  path <- make_ml_fixture()
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

  first <- ml_run_handler(list(body = list()), list())
  expect_equal(first$datasetRows, 3L)
  expect_equal(first$algorithm, "kmeans")
  expect_true(is.list(first$pca))
  expect_true(is.list(first$kSelection))

  second <- ml_run_handler(list(body = list(k = 2L)), list())
  expect_equal(second$kSelection$selectedK, 2L)

  stored <- ml_runs_handler(list(), list())
  expect_equal(length(stored), 2L)
  expect_equal(stored[[1]]$id, second$id)
  expect_equal(stored[[2]]$id, first$id)
  expect_equal(length(stored[[1]]$assignments), 3L)
})

test_that("ML GET route honours and validates limit", {
  path <- make_ml_fixture()
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
  ml_run_handler(list(body = list()), list())
  ml_run_handler(list(body = list()), list())

  limited <- ml_runs_handler(list(), list(), limit = "1")
  expect_equal(length(limited), 1L)

  error <- tryCatch(
    ml_runs_handler(list(), list(), limit = "0"),
    api_error = function(condition) condition
  )
  expect_s3_class(error, "api_error")
  expect_equal(error$status, 400L)
})

test_that("ML POST route rejects invalid request bodies", {
  path <- make_ml_fixture()
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

  before <- length(ml_runs_handler(list(), list()))

  for (body in list(
    list(k = 1L),
    list(k = "three"),
    list(scale = TRUE)
  )) {
    error <- tryCatch(
      ml_run_handler(list(body = body), list()),
      api_error = function(condition) condition
    )
    expect_s3_class(error, "api_error")
    expect_equal(error$status, 400L)
  }

  after <- length(ml_runs_handler(list(), list()))
  expect_equal(after, before)
})

test_that("ML POST route rejects out-of-range k and insufficient data", {
  path <- make_ml_fixture()
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
    ml_run_handler(list(body = list(k = 7L)), list()),
    api_error = function(condition) condition
  )
  expect_s3_class(error, "api_error")
  expect_equal(error$status, 422L)

  empty_path <- tempfile(fileext = ".sqlite")
  empty_connection <- DBI::dbConnect(RSQLite::SQLite(), empty_path)
  create_schema(empty_connection)
  DBI::dbDisconnect(empty_connection)
  on.exit(unlink(empty_path), add = TRUE)

  Sys.setenv(DATABASE_PATH = empty_path, A11YSCAPE_ROOT = tempdir())
  insufficient <- tryCatch(
    ml_run_handler(list(body = list()), list()),
    api_error = function(condition) condition
  )
  expect_s3_class(insufficient, "api_error")
  expect_equal(insufficient$status, 422L)
})

test_that("ML routes report a missing database as 503", {
  original_db <- Sys.getenv("DATABASE_PATH", unset = NA_character_)
  original_root <- Sys.getenv("A11YSCAPE_ROOT", unset = NA_character_)
  on.exit({
    if (is.na(original_db)) Sys.unsetenv("DATABASE_PATH") else
      Sys.setenv(DATABASE_PATH = original_db)
    if (is.na(original_root)) Sys.unsetenv("A11YSCAPE_ROOT") else
      Sys.setenv(A11YSCAPE_ROOT = original_root)
  }, add = TRUE, after = FALSE)

  Sys.setenv(DATABASE_PATH = tempfile(fileext = ".sqlite"), A11YSCAPE_ROOT = tempdir())

  get_error <- tryCatch(
    ml_runs_handler(list(), list()),
    api_error = function(condition) condition
  )
  post_error <- tryCatch(
    ml_run_handler(list(body = list()), list()),
    api_error = function(condition) condition
  )
  expect_s3_class(get_error, "api_error")
  expect_s3_class(post_error, "api_error")
  expect_equal(get_error$status, 503L)
  expect_equal(post_error$status, 503L)
})
