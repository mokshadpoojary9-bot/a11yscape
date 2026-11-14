# Start the A11YSCAPE Plumber API.
#
#   Rscript r-service/scripts/run.R
#
# Environment variables:
#   R_PORT        listening port (default 8000)
#   R_HOST        bind address (default 127.0.0.1)
#   DATABASE_PATH SQLite path (default database/a11yscape.sqlite from repo root)
#   CORS_ORIGIN   comma-separated allowed origins

arguments <- commandArgs(trailingOnly = FALSE)
file_argument <- grep("^--file=", arguments, value = TRUE)
if (length(file_argument) == 0) {
  stop("Could not determine the location of scripts/run.R.")
}

script_path <- sub("^--file=", "", file_argument[[1]])
script_dir <- dirname(normalizePath(script_path, winslash = "/", mustWork = TRUE))
service_dir <- dirname(script_dir)
repo_root <- dirname(service_dir)

Sys.setenv(A11YSCAPE_ROOT = repo_root)
setwd(service_dir)

port <- suppressWarnings(as.integer(Sys.getenv("R_PORT", unset = "8000")))
if (is.na(port) || port < 1L || port > 65535L) {
  stop("R_PORT must be an integer between 1 and 65535.")
}
host <- Sys.getenv("R_HOST", unset = "127.0.0.1")

message("[r-analytics] repository root: ", repo_root)
message("[r-analytics] database: ", file.path(
  repo_root,
  Sys.getenv("DATABASE_PATH", unset = "database/a11yscape.sqlite")
))
message("[r-analytics] listening on http://", host, ":", port)

# plumber.R builds its router programmatically; plumb() only parses annotation-
# style files, so source the router and run the returned Plumber object.
source(file.path(service_dir, "plumber.R"))
api$run(host = host, port = port, swagger = TRUE)
