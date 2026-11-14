# Rule-based recommendations derived from stored scan findings.
#
# These are not produced by a generative model. Every recommendation is tied to
# a recorded axe-core rule and its affected scans/domains.

severity_weight <- function(impact) {
  switch(
    as.character(impact),
    critical = 4L,
    serious = 3L,
    moderate = 2L,
    minor = 1L,
    0L
  )
}

remediation_for_rule <- function(rule_id) {
  switch(
    as.character(rule_id),
    "color-contrast" = "Adjust foreground and background colours so every text and non-text element meets the required contrast ratio, then re-test all affected pages.",
    "image-alt" = "Provide concise, meaningful alternative text for informative images and mark decorative images appropriately.",
    "label" = "Associate every form control with a visible or programmatic label and verify screen-reader announcements.",
    "html-has-lang" = "Set a valid lang attribute on the document element and on any content in a different language.",
    "link-name" = "Give every link an accessible name that describes its destination or purpose.",
    "button-name" = "Give every button an accessible name, including icon-only buttons.",
    "document-title" = "Provide a unique, descriptive title for every document.",
    "heading-order" = "Use a logical heading hierarchy without skipped levels.",
    "region" = "Wrap page content in appropriate landmarks so assistive technologies can navigate it.",
    "aria-required-attr" = "Add all required ARIA attributes and remove unsupported or redundant ARIA markup.",
    "Review each affected element against the axe-core guidance for this rule, apply the fix to every recorded instance, and rerun the scan to confirm resolution."
  )
}

recommendation_title <- function(rule_id) {
  paste("Remediate", rule_id, "violations")
}

recommendation_priority <- function(impact, affected_scans, affected_domains) {
  domain_count <- length(affected_domains)
  if (identical(impact, "critical")) return("high")
  if (identical(impact, "serious")) {
    if (affected_scans >= 2L || domain_count >= 2L) return("high")
    return("medium")
  }
  if (identical(impact, "moderate")) return("medium")
  "low"
}

why_it_matters <- function(impact) {
  switch(
    as.character(impact),
    critical = "Critical issues can prevent users from perceiving or operating essential content.",
    serious = "Serious issues can block task completion for assistive-technology users.",
    moderate = "Moderate issues reduce usability and consistency across the interface.",
    minor = "Minor issues are lower priority but still reduce polish and predictability.",
    "This issue was recorded in the scan corpus."
  )
}

recommendations_payload <- function(connection, model_run = NULL) {
  scans <- normalise_scans(query_scans(connection))
  violations <- query_violations(connection)
  total_scans <- nrow(scans)

  if (nrow(violations) == 0) return(list())

  rules <- unique(violations$rule_id)
  top_rule_ids <- vapply(
    top_rule_records(violations, limit = 10L),
    function(record) record$ruleId,
    character(1)
  )

  ml_rules <- character(0)
  if (!is.null(model_run) && !is.null(model_run$clusters)) {
    ml_rules <- unique(unlist(lapply(model_run$clusters, function(cluster) {
      cluster$topRules %||% character(0)
    }), use.names = FALSE))
  }

  records <- lapply(rules, function(rule_id) {
    rule_rows <- violations[violations$rule_id == rule_id, , drop = FALSE]
    impact <- rule_rows$impact[[which.min(match(rule_rows$impact, severity_levels))]]
    affected_scans <- length(unique(rule_rows$scan_id))
    affected_domains <- sort(unique(rule_rows$domain))
    wcag_criteria <- sort(unique(unlist(lapply(rule_rows$wcag_tags, parse_json_array))))
    source_scan_ids <- sort(unique(rule_rows$scan_id))
    node_count <- sum(rule_rows$node_count, na.rm = TRUE)
    violation_count <- nrow(rule_rows)

    analytics_evidence <- c(
      sprintf(
        "Recorded %d time(s) across %d of %d scans (%.0f%%).",
        violation_count, affected_scans, total_scans,
        if (total_scans > 0) 100 * affected_scans / total_scans else 0
      ),
      sprintf("Affected %d node(s) on %d domain(s).", node_count, length(affected_domains)),
      sprintf("Highest recorded severity: %s.", impact)
    )
    if (rule_id %in% top_rule_ids) {
      analytics_evidence <- c(
        analytics_evidence,
        sprintf("Ranked among the most frequent recorded rules (%d violations).", violation_count)
      )
    }

    ml_evidence <- character(0)
    if (rule_id %in% ml_rules && !is.null(model_run)) {
      cluster_labels <- vapply(model_run$clusters, function(cluster) {
        if (rule_id %in% (cluster$topRules %||% character(0))) cluster$label else NA_character_
      }, character(1))
      cluster_labels <- cluster_labels[!is.na(cluster_labels)]
      if (length(cluster_labels) > 0) {
        ml_evidence <- c(
          ml_evidence,
          sprintf(
            "Appears among the top rules for %s in the latest K-means run.",
            paste(cluster_labels, collapse = ", ")
          )
        )
      }
      if (!is.null(model_run$silhouette)) {
        ml_evidence <- c(
          ml_evidence,
          sprintf(
            "Latest K-means run selected k=%d with mean silhouette %.3f.",
            model_run$kSelection$selectedK %||% NA_integer_,
            model_run$silhouette
          )
        )
      }
    }

    list(
      id = paste0("rec-", rule_id),
      ruleId = rule_id,
      title = recommendation_title(rule_id),
      rationale = sprintf(
        "%s severity issue recorded %d time(s) across %d scan(s) and %d domain(s). %s",
        tools::toTitleCase(impact), violation_count, affected_scans,
        length(affected_domains), why_it_matters(impact)
      ),
      priority = recommendation_priority(impact, affected_scans, affected_domains),
      affectedScans = as.integer(affected_scans),
      affectedDomains = as.list(affected_domains),
      wcagCriteria = as.list(wcag_criteria),
      remediation = remediation_for_rule(rule_id),
      evidence = list(
        severity = impact,
        violations = as.integer(violation_count),
        affectedNodes = as.integer(node_count),
        affectedScans = as.integer(affected_scans),
        affectedDomains = as.integer(length(affected_domains)),
        wcagCriteria = as.list(wcag_criteria)
      ),
      sourceScanIds = as.list(source_scan_ids),
      analyticsEvidence = as.list(analytics_evidence),
      mlEvidence = as.list(ml_evidence)
    )
  })

  priority_order <- c(high = 1L, medium = 2L, low = 3L)
  records[order(
    vapply(records, function(record) priority_order[[record$priority]], integer(1)),
    vapply(records, function(record) -record$evidence$violations, numeric(1)),
    vapply(records, function(record) record$ruleId, character(1))
  )]
}
