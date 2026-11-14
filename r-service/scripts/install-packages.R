# Install the CRAN packages required by the R analytics engine.
#   Rscript r-service/scripts/install-packages.R

required <- c(
  "plumber", "DBI", "RSQLite", "dplyr", "tidyr", "readr", "jsonlite",
  "testthat"
)

repositories <- c(CRAN = Sys.getenv(
  "CRAN_REPOSITORY", unset = "https://cloud.r-project.org"
))

installed <- rownames(utils::installed.packages())
missing <- setdiff(required, installed)

if (length(missing) == 0) {
  message("All required packages are already installed.")
} else {
  message("Installing: ", paste(missing, collapse = ", "))
  utils::install.packages(missing, repos = repositories)
}

versions <- vapply(required, function(package) {
  if (package %in% rownames(utils::installed.packages())) {
    as.character(utils::packageVersion(package))
  } else {
    "MISSING"
  }
}, character(1))

print(data.frame(package = required, version = versions, row.names = NULL))
