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
