test_that("limit parsing rejects invalid and out-of-range values", {
  expect_equal(parse_limit(NULL, default = 10L, maximum = 100L), 10L)
  expect_equal(parse_limit("5", default = 10L, maximum = 100L), 5L)
  expect_error(parse_limit("0"), class = "api_error")
  expect_error(parse_limit("abc"), class = "api_error")
  expect_error(parse_limit("101", maximum = 100L), class = "api_error")
})

test_that("status and query validation reject unsupported values", {
  expect_equal(parse_status(NULL), "all")
  expect_equal(parse_status("COMPLETED"), "completed")
  expect_error(parse_status("unknown"), class = "api_error")

  expect_null(parse_query_text(""))
  expect_equal(parse_query_text("  alpha  "), "alpha")
  expect_error(parse_query_text(strrep("a", 201)), class = "api_error")
})

test_that("scan ids are validated before querying", {
  expect_equal(parse_scan_id("scan-1"), "scan-1")
  expect_error(parse_scan_id(""), class = "api_error")
  expect_error(parse_scan_id("bad id"), class = "api_error")
  expect_error(parse_scan_id("../etc/passwd"), class = "api_error")
})

test_that("a missing database produces a typed 503", {
  original <- Sys.getenv("DATABASE_PATH", unset = NA_character_)
  on.exit({
    if (is.na(original)) Sys.unsetenv("DATABASE_PATH") else Sys.setenv(DATABASE_PATH = original)
  }, add = TRUE)

  Sys.setenv(DATABASE_PATH = tempfile(fileext = ".sqlite"))
  error <- tryCatch(db_connect(), api_error = function(condition) condition)

  expect_s3_class(error, "api_error")
  expect_equal(error$status, 503L)
  expect_match(conditionMessage(error), "Analytics database not found")
})

test_that("database status reports live schema and row counts", {
  path <- tempfile(fileext = ".sqlite")
  connection <- DBI::dbConnect(RSQLite::SQLite(), path)
  create_schema(connection)
  seed_fixture(connection)
  DBI::dbDisconnect(connection)
  on.exit(unlink(path), add = TRUE)

  original <- Sys.getenv("DATABASE_PATH", unset = NA_character_)
  original_root <- Sys.getenv("A11YSCAPE_ROOT", unset = NA_character_)
  on.exit({
    if (is.na(original)) Sys.unsetenv("DATABASE_PATH") else Sys.setenv(DATABASE_PATH = original)
    if (is.na(original_root)) Sys.unsetenv("A11YSCAPE_ROOT") else
      Sys.setenv(A11YSCAPE_ROOT = original_root)
  }, add = TRUE, after = FALSE)

  Sys.setenv(DATABASE_PATH = path, A11YSCAPE_ROOT = tempdir())
  status <- database_status()

  expect_true(status$ok)
  expect_equal(status$scans, 3L)
})
