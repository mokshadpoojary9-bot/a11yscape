test_that("report generation writes real content for every supported format", {
  path <- tempfile(fileext = ".sqlite")
  connection <- DBI::dbConnect(RSQLite::SQLite(), path)
  create_schema(connection)
  seed_fixture(connection)
  DBI::dbDisconnect(connection)
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

  for (format in c("csv", "json", "html", "pdf")) {
    result <- report_generate_handler(list(body = list(title = paste("Report", format), format = format)), list())
    file_path <- file.path(tempdir(), "r-engine", "reports", paste0(result$id, ".", format))
    expect_true(file.exists(file_path))
    expect_equal(result$format, format)
    expect_true(result$sizeBytes > 0L)

    if (format == "json") {
      payload <- jsonlite::fromJSON(file_path, simplifyVector = FALSE)
      expect_equal(payload$report$title, paste("Report", format))
      expect_true(length(payload$recommendations) >= 1L)
      expect_true(length(payload$analysis$descriptives) >= 1L)
      expect_match(payload$notes[[length(payload$notes)]], "rule-based", ignore.case = TRUE)
    }
    if (format == "html") {
      html <- paste(readLines(file_path, warn = FALSE), collapse = "\n")
      expect_match(html, "Executive summary", fixed = TRUE)
      expect_match(html, "PCA results", fixed = TRUE)
      expect_match(html, "K-means cluster results", fixed = TRUE)
      expect_match(html, "Limitations and methodology", fixed = TRUE)
    }
    if (format == "pdf") {
      raw <- readBin(file_path, "raw", n = 4L)
      expect_equal(rawToChar(raw), "%PDF")
    }
  }
})

test_that("report generation includes a persisted ML run when available", {
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
  result <- report_generate_handler(list(body = list(title = "ML report", format = "json")), list())
  file_path <- file.path(tempdir(), "r-engine", "reports", paste0(result$id, ".json"))
  payload <- jsonlite::fromJSON(file_path, simplifyVector = FALSE)
  expect_true(!is.null(payload$modelRun))
  expect_true(length(payload$modelRun$pca$explainedVariance) >= 2L)
})

test_that("report listing returns generated reports with download URLs", {
  path <- tempfile(fileext = ".sqlite")
  connection <- DBI::dbConnect(RSQLite::SQLite(), path)
  create_schema(connection)
  seed_fixture(connection)
  DBI::dbDisconnect(connection)
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
  generated <- report_generate_handler(list(body = list(title = "Listed report", format = "csv"), HTTP_HOST = "example.test:8080"), list())
  listed <- reports_handler(list(HTTP_HOST = "example.test:8080"), list(), limit = "10")

  expect_equal(length(listed), 1L)
  expect_equal(listed[[1]]$id, generated$id)
  expect_match(listed[[1]]$downloadUrl, "^http://example.test:8080/reports/")
})

test_that("report validation rejects invalid bodies", {
  expect_error(validate_report_body(NULL), class = "api_error")
  expect_error(validate_report_body(list(title = "ab")), class = "api_error")
  expect_error(validate_report_body(list(title = strrep("a", 121))), class = "api_error")
  expect_error(validate_report_body(list(title = "Valid title", format = "docx")), class = "api_error")
  expect_error(validate_report_body(list(title = "Valid title", extra = TRUE)), class = "api_error")
  expect_equal(validate_report_body(list(title = "Valid title"))$format, "csv")
})

test_that("report routes report a missing database as 503", {
  original_db <- Sys.getenv("DATABASE_PATH", unset = NA_character_)
  original_root <- Sys.getenv("A11YSCAPE_ROOT", unset = NA_character_)
  on.exit({
    if (is.na(original_db)) Sys.unsetenv("DATABASE_PATH") else
      Sys.setenv(DATABASE_PATH = original_db)
    if (is.na(original_root)) Sys.unsetenv("A11YSCAPE_ROOT") else
      Sys.setenv(A11YSCAPE_ROOT = original_root)
  }, add = TRUE, after = FALSE)

  Sys.setenv(DATABASE_PATH = tempfile(fileext = ".sqlite"), A11YSCAPE_ROOT = tempdir())

  get_error <- tryCatch(reports_handler(list(), list()), api_error = function(condition) condition)
  post_error <- tryCatch(
    report_generate_handler(list(body = list(title = "Missing DB report", format = "csv")), list()),
    api_error = function(condition) condition
  )
  expect_s3_class(get_error, "api_error")
  expect_s3_class(post_error, "api_error")
  expect_equal(get_error$status, 503L)
  expect_equal(post_error$status, 503L)
})