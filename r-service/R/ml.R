# Unsupervised analysis over the real scan corpus.
#
# PCA and K-means are computed in this process with base R. Only scans with
# status "completed" or "partial" are eligible, matching the retrieval API.
# Derived runs are persisted in the additive model_runs table; scanner-owned
# scan and violation rows are never modified.

ml_seed <- 20261114L

ml_features <- c(
  "issue_count",
  "pages_scanned",
  "duration_ms",
  "severity_critical",
  "severity_serious",
  "severity_moderate",
  "severity_minor"
)

new_model_id <- function() {
  paste0(
    "ml-",
    format(Sys.time(), "%Y%m%dT%H%M%OS3", tz = "UTC"),
    "-",
    sprintf("%04d", sample.int(9999L, 1L))
  )
}

query_ml_scans <- function(connection) {
  DBI::dbGetQuery(
    connection,
    paste(
      scan_select,
      "WHERE s.status IN ('completed', 'partial')",
      "ORDER BY s.started_at ASC, s.id ASC"
    )
  )
}

prepare_ml_data <- function(scans) {
  if (nrow(scans) < 3L) {
    stop_api(
      422L,
      paste0(
        "At least 3 completed or partial scans are required for PCA and ",
        "K-means; found ", nrow(scans), "."
      )
    )
  }

  for (column in ml_features) {
    if (!column %in% names(scans)) {
      stop_api(422L, paste0("The scan corpus is missing the feature: ", column, "."))
    }
    scans[[column]] <- suppressWarnings(as.numeric(scans[[column]]))
  }

  feature_frame <- scans[, ml_features, drop = FALSE]
  complete <- stats::complete.cases(feature_frame)
  usable <- scans[complete, , drop = FALSE]
  excluded <- sum(!complete)

  if (nrow(usable) < 3L) {
    stop_api(
      422L,
      paste0(
        "At least 3 scans need complete numeric features; ",
        nrow(usable), " remain after excluding ", excluded,
        " with missing values."
      )
    )
  }

  feature_frame <- usable[, ml_features, drop = FALSE]
  variances <- vapply(feature_frame, stats::sd, numeric(1))
  keep <- names(variances)[is.finite(variances) & variances > 0]
  dropped <- setdiff(ml_features, keep)

  if (length(keep) < 2L) {
    stop_api(
      422L,
      paste0(
        "At least 2 numeric features with variance are required; ",
        length(keep), " remain after removing constant features."
      )
    )
  }

  matrix <- scale(as.matrix(feature_frame[, keep, drop = FALSE]))
  if (!all(is.finite(matrix))) {
    stop_api(422L, "Feature standardization produced non-finite values.")
  }

  list(
    scans = usable,
    features = keep,
    matrix = matrix,
    dropped = dropped,
    excluded = as.integer(excluded)
  )
}

pca_payload <- function(prepared) {
  fit <- stats::prcomp(prepared$matrix, center = FALSE, scale. = FALSE)
  variance <- fit$sdev^2
  total <- sum(variance)
  if (!is.finite(total) || total <= 0) {
    stop_api(422L, "PCA could not explain any variance in the available features.")
  }

  explained <- variance / total
  component_count <- min(2L, ncol(fit$rotation))
  scores <- fit$x[, seq_len(component_count), drop = FALSE]
  loadings <- fit$rotation[, seq_len(component_count), drop = FALSE]

  score_records <- lapply(seq_len(nrow(scores)), function(index) {
    list(
      scanId = prepared$scans$id[[index]],
      domain = prepared$scans$domain[[index]],
      pc1 = as.numeric(scores[index, 1L]),
      pc2 = if (component_count >= 2L) as.numeric(scores[index, 2L]) else 0
    )
  })

  loading_records <- lapply(seq_len(nrow(loadings)), function(index) {
    list(
      feature = rownames(loadings)[[index]],
      pc1 = as.numeric(loadings[index, 1L]),
      pc2 = if (component_count >= 2L) as.numeric(loadings[index, 2L]) else 0
    )
  })

  list(
    features = as.list(prepared$features),
    explainedVariance = as.numeric(explained),
    cumulativeVariance = as.numeric(cumsum(explained)),
    loadings = loading_records,
    scores = score_records,
    excludedScans = prepared$excluded,
    droppedFeatures = as.list(prepared$dropped)
  )
}

silhouette_values <- function(x, cluster_ids) {
  distances <- as.matrix(stats::dist(x))
  cluster_ids <- as.integer(cluster_ids)
  vapply(seq_len(nrow(x)), function(index) {
    own <- which(cluster_ids == cluster_ids[[index]])
    own <- own[own != index]
    if (length(own) == 0L) return(0)

    first <- mean(distances[index, own])
    others <- setdiff(unique(cluster_ids), cluster_ids[[index]])
    if (length(others) == 0L) return(0)

    second <- min(vapply(others, function(other) {
      mean(distances[index, which(cluster_ids == other)])
    }, numeric(1)))

    denominator <- max(first, second)
    if (!is.finite(denominator) || denominator == 0) 0 else (second - first) / denominator
  }, numeric(1))
}

fit_kmeans <- function(x, k) {
  set.seed(ml_seed + as.integer(k))
  stats::kmeans(x, centers = as.integer(k), nstart = 25L, iter.max = 100L)
}

kmeans_payload <- function(prepared, requested_k = NULL) {
  x <- prepared$matrix
  max_k <- min(6L, nrow(x) - 1L)
  if (max_k < 2L) {
    stop_api(422L, "At least 3 rows are required to evaluate K-means clusters.")
  }

  candidates <- seq.int(2L, max_k)
  evaluations <- lapply(candidates, function(k) {
    fit <- tryCatch(fit_kmeans(x, k), error = function(error) NULL)
    if (is.null(fit)) return(NULL)
    silhouette <- silhouette_values(x, fit$cluster)
    list(
      k = as.integer(k),
      fit = fit,
      silhouette = mean(silhouette)
    )
  })
  evaluations <- Filter(Negate(is.null), evaluations)

  if (length(evaluations) == 0L) {
    stop_api(422L, "K-means could not be fitted to the available feature values.")
  }

  if (is.null(requested_k)) {
    means <- vapply(evaluations, function(item) item$silhouette, numeric(1))
    best <- which.max(means)
    selected <- evaluations[[best]]
  } else {
    selected <- Filter(function(item) item$k == as.integer(requested_k), evaluations)
    if (length(selected) == 0L) {
      stop_api(
        422L,
        sprintf("k must be between 2 and %d for this dataset.", max_k),
        list(parameter = "k")
      )
    }
    selected <- selected[[1]]
  }

  selected_fit <- selected$fit
  selected_silhouette <- selected$silhouette
  assignments <- as.integer(selected_fit$cluster)
  scan_ids <- prepared$scans$id
  domains <- prepared$scans$domain

  cluster_records <- lapply(sort(unique(assignments)), function(cluster_id) {
    indices <- which(assignments == cluster_id)
    subset <- prepared$scans[indices, , drop = FALSE]
    centroid <- colMeans(subset[, prepared$features, drop = FALSE])

    severity_totals <- c(
      critical = sum(subset$severity_critical),
      serious = sum(subset$severity_serious),
      moderate = sum(subset$severity_moderate),
      minor = sum(subset$severity_minor)
    )
    dominant <- if (max(severity_totals) == 0) "none" else {
      severity_levels[[which.max(severity_totals)]]
    }

    list(
      clusterId = as.integer(cluster_id),
      label = paste("Cluster", cluster_id),
      size = as.integer(length(indices)),
      meanIssueCount = as.numeric(mean(subset$issue_count)),
      dominantSeverity = dominant,
      centroid = as.list(centroid)
    )
  })

  list(
    fit = selected_fit,
    assignments = assignments,
    silhouette = as.numeric(selected_silhouette),
    selectedK = as.integer(selected$k),
    maxK = as.integer(max_k),
    clusters = cluster_records,
    evaluations = lapply(evaluations, function(item) {
      list(k = as.integer(item$k), silhouette = as.numeric(item$silhouette))
    }),
    scanIds = scan_ids,
    domains = domains
  )
}

cluster_rule_records <- function(connection, assignments, scan_ids, clusters) {
  violations <- query_violations(connection)
  lapply(clusters, function(cluster) {
    ids <- scan_ids[assignments == cluster$clusterId]
    rules <- violations$rule_id[violations$scan_id %in% ids]
    counts <- sort(table(rules), decreasing = TRUE)
    top <- names(counts)[seq_len(min(3L, length(counts)))]
    cluster$topRules <- as.list(top)
    cluster
  })
}

compute_ml_run <- function(connection, requested_k = NULL) {
  scans <- query_ml_scans(connection)
  prepared <- prepare_ml_data(scans)
  pca <- pca_payload(prepared)
  kmeans <- kmeans_payload(prepared, requested_k)
  clusters <- cluster_rule_records(
    connection, kmeans$assignments, kmeans$scanIds, kmeans$clusters
  )

  assignments <- lapply(seq_along(kmeans$scanIds), function(index) {
    list(
      scanId = kmeans$scanIds[[index]],
      domain = kmeans$domains[[index]],
      clusterId = as.integer(kmeans$assignments[[index]])
    )
  })

  pca$scores <- lapply(seq_along(pca$scores), function(index) {
    pca$scores[[index]]$clusterId <- as.integer(kmeans$assignments[[index]])
    pca$scores[[index]]
  })

  notes <- c(
    sprintf(
      "PCA used %d standardized numeric features across %d scans: %s.",
      length(prepared$features), nrow(prepared$scans),
      paste(prepared$features, collapse = ", ")
    ),
    if (length(prepared$dropped) > 0) {
      sprintf(
        "Constant features were dropped before standardization: %s.",
        paste(prepared$dropped, collapse = ", ")
      )
    } else {
      "No constant features remained after complete-case filtering."
    },
    if (prepared$excluded > 0) {
      sprintf(
        "%d scan(s) with missing feature values were excluded from this run.",
        prepared$excluded
      )
    } else {
      "All eligible scans had complete numeric features."
    },
    sprintf(
      paste(
        "K-means evaluated k = %s using mean silhouette; selected k = %d",
        "with score %.3f (seed %d)."
      ),
      paste(vapply(kmeans$evaluations, function(item) item$k, integer(1)), collapse = ", "),
      kmeans$selectedK, kmeans$silhouette, ml_seed
    ),
    "Component signs are arbitrary and PCA axes are descriptive, not causal.",
    "Unsupervised structure describes this corpus only; no accuracy or predictive claim is made.",
    if (nrow(prepared$scans) < 10L) {
      "The sample is small, so component and cluster structure may change as scans are added."
    } else {
      "Cluster separation should be re-checked as the corpus grows."
    }
  )

  list(
    id = new_model_id(),
    createdAt = utc_now(),
    algorithm = "kmeans",
    datasetRows = as.integer(nrow(prepared$scans)),
    status = "completed",
    silhouette = as.numeric(kmeans$silhouette),
    clusters = clusters,
    outliers = list(),
    notes = notes,
    pca = pca,
    kSelection = list(
      method = "silhouette",
      candidates = kmeans$evaluations,
      selectedK = kmeans$selectedK
    ),
    assignments = assignments
  )
}

run_ml_and_store <- function(connection, requested_k = NULL) {
  run <- compute_ml_run(connection, requested_k)
  save_model_run(connection, run)
  run
}
