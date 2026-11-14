# Request validation. Invalid input is rejected before any database work.

parse_limit <- function(value, default = 10L, maximum = 100L) {
  if (is.null(value) || length(value) == 0 || !nzchar(as.character(value))) {
    return(as.integer(default))
  }
  text <- trimws(as.character(value))
  if (!grepl("^[0-9]+$", text)) {
    stop_api(400L, "limit must be a positive integer.", list(parameter = "limit"))
  }
  parsed <- as.integer(text)
  if (is.na(parsed) || parsed < 1L || parsed > maximum) {
    stop_api(400L, sprintf("limit must be between 1 and %d.", maximum),
             list(parameter = "limit"))
  }
  parsed
}

parse_status <- function(value) {
  allowed <- c("all", "queued", "running", "completed", "partial", "failed")
  if (is.null(value) || length(value) == 0 || !nzchar(as.character(value))) {
    return("all")
  }
  status <- tolower(trimws(as.character(value)))
  if (!status %in% allowed) {
    stop_api(400L, paste0("status must be one of: ", paste(allowed, collapse = ", "), "."),
             list(parameter = "status"))
  }
  status
}

parse_query_text <- function(value) {
  if (is.null(value) || length(value) == 0) return(NULL)
  text <- trimws(as.character(value))
  if (!nzchar(text)) return(NULL)
  if (nchar(text, type = "chars") > 200L) {
    stop_api(400L, "query must be 200 characters or fewer.", list(parameter = "query"))
  }
  text
}

parse_ml_k <- function(value) {
  if (is.null(value) || length(value) == 0 || !nzchar(as.character(value))) {
    return(NULL)
  }
  text <- trimws(as.character(value))
  if (!grepl("^[0-9]+$", text)) {
    stop_api(400L, "k must be a positive integer.", list(parameter = "k"))
  }
  parsed <- as.integer(text)
  if (is.na(parsed) || parsed < 2L || parsed > 10L) {
    stop_api(400L, "k must be between 2 and 10.", list(parameter = "k"))
  }
  parsed
}

validate_ml_body <- function(body) {
  if (is.null(body) || length(body) == 0) return(list(k = NULL))
  if (!is.list(body)) {
    stop_api(400L, "The request body must be a JSON object.")
  }
  unknown <- setdiff(names(body), "k")
  if (length(unknown) > 0) {
    stop_api(
      400L,
      paste0("Unknown ML options: ", paste(unknown, collapse = ", "), "."),
      list(parameter = unknown[[1]])
    )
  }
  list(k = parse_ml_k(body$k))
}

validate_analysis_body <- function(body) {
  if (is.null(body) || length(body) == 0) return(list(includeCorrelation = FALSE))
  if (!is.list(body)) {
    stop_api(400L, "The request body must be a JSON object.")
  }
  unknown <- setdiff(names(body), c("includeCorrelation", "include_correlation"))
  if (length(unknown) > 0) {
    stop_api(
      400L,
      paste0("Unknown analysis options: ", paste(unknown, collapse = ", "), "."),
      list(parameter = unknown[[1]])
    )
  }

  # The Analysis page sends includeCorrelation; the snake_case alias keeps
  # plain curl requests readable.
  value <- body$includeCorrelation %||% body$include_correlation
  if (is.null(value)) return(list(includeCorrelation = FALSE))
  if (!is.logical(value) || length(value) != 1L || is.na(value)) {
    stop_api(
      400L,
      "includeCorrelation must be true or false.",
      list(parameter = "includeCorrelation")
    )
  }
  list(includeCorrelation = isTRUE(value))
}

parse_report_format <- function(value) {
  if (is.null(value) || length(value) == 0 || !nzchar(as.character(value))) {
    return("csv")
  }
  format <- tolower(trimws(as.character(value)))
  if (!format %in% c("csv", "json", "html", "pdf")) {
    stop_api(400L, "format must be one of csv, json, html or pdf.", list(parameter = "format"))
  }
  format
}

validate_report_body <- function(body) {
  if (is.null(body) || length(body) == 0) {
    stop_api(400L, "The request body must be a JSON object.")
  }
  if (!is.list(body)) {
    stop_api(400L, "The request body must be a JSON object.")
  }
  unknown <- setdiff(names(body), c("title", "format"))
  if (length(unknown) > 0) {
    stop_api(
      400L,
      paste0("Unknown report options: ", paste(unknown, collapse = ", "), "."),
      list(parameter = unknown[[1]])
    )
  }
  title <- if (is.null(body$title)) "" else trimws(as.character(body$title))
  if (nchar(title) < 3L || nchar(title) > 120L) {
    stop_api(400L, "title must be between 3 and 120 characters.", list(parameter = "title"))
  }
  list(title = title, format = parse_report_format(body$format))
}

parse_scan_id <- function(value) {
  if (is.null(value) || length(value) == 0 || !nzchar(as.character(value))) {
    stop_api(400L, "A scan id is required.")
  }
  id <- trimws(as.character(value))
  if (!grepl("^[A-Za-z0-9._:-]{1,100}$", id)) {
    stop_api(400L, "The scan id is malformed.", list(parameter = "id"))
  }
  id
}
