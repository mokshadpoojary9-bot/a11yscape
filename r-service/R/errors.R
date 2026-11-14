# Typed API errors keep HTTP status handling out of the analytical functions.

api_error <- function(status, message, details = NULL) {
  structure(
    class = c("api_error", "error", "condition"),
    list(
      message = as.character(message),
      call = NULL,
      status = as.integer(status),
      details = details
    )
  )
}

stop_api <- function(status, message, details = NULL) {
  stop(api_error(status, message, details))
}

error_body <- function(message) {
  list(error = as.character(message))
}
