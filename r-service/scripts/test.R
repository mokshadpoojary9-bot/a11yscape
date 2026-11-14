# Run the R service test suite.
#   Rscript r-service/scripts/test.R

arguments <- commandArgs(trailingOnly = FALSE)
file_argument <- grep("^--file=", arguments, value = TRUE)
if (length(file_argument) == 0) {
  stop("Could not determine the location of scripts/test.R.")
}

script_path <- sub("^--file=", "", file_argument[[1]])
script_dir <- dirname(normalizePath(script_path, winslash = "/", mustWork = TRUE))
service_dir <- dirname(script_dir)

Sys.setenv(A11YSCAPE_R_SERVICE_DIR = service_dir)
suppressPackageStartupMessages(library(testthat))

results <- testthat::test_dir(
  file.path(service_dir, "tests", "testthat"),
  reporter = "summary",
  stop_on_failure = TRUE
)

invisible(results)
