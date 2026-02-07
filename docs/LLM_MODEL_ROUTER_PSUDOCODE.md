# --------------------------------------------
# Nova Router (enforces budgets + breaker hooks)
# --------------------------------------------

function run_workflow(workflow_id, task, context, metrics_store):
    cfg = load_json("workflow_budgets.json")
    wf = cfg.workflows[workflow_id]
    assert wf exists

    # 1) Evaluate circuit breaker state (monthly + rolling + tier usage + token spike)
    breaker = evaluate_circuit_breaker(cfg.circuit_breaker, metrics_store)
    safe_mode = breaker.is_tripped

    # 2) Initialize workflow counters
    state = {
        calls_made: 0,
        tokens_in_total: 0,
        tokens_out_total: 0,
        cost_usd_est_total: 0.0,
        tier_calls: {tier_a:0, tier_b:0, tier_b2:0, tier_c:0},
        breaker_tripped: safe_mode,
        breaker_reason: breaker.reason
    }

    # 3) Apply SAFE MODE overrides (if tripped)
    effective_wf = wf
    if safe_mode:
        effective_wf = apply_safe_mode_overrides(wf, cfg.circuit_breaker.safe_mode)

    # 4) Determine initial tier based on workflow + task
    tier = pick_initial_tier(effective_wf, task)  # usually first in escalation_path

    # 5) Main loop: bounded by max_model_calls and token budget
    while true:
        if state.calls_made >= min(effective_wf.max_model_calls, cfg.defaults.max_model_calls_global):
            return stop_with_behavior(effective_wf.stop_behavior, "MAX_CALLS_REACHED", task, state)

        # Check workflow hard budgets before attempting a call
        if (state.tokens_in_total + state.tokens_out_total) >= effective_wf.token_budget_total:
            return stop_with_behavior(effective_wf.stop_behavior, "WORKFLOW_TOKEN_BUDGET_EXCEEDED", task, state)
        if state.tokens_out_total >= effective_wf.output_budget_total:
            return stop_with_behavior(effective_wf.stop_behavior, "WORKFLOW_OUTPUT_BUDGET_EXCEEDED", task, state)

        # Check tier allowed + tier call limits
        if tier not in effective_wf.allowed_tiers:
            # if current tier not allowed, try next tier in path or stop
            tier = next_allowed_tier(effective_wf, tier)
            if tier is null:
                return stop_with_behavior(effective_wf.stop_behavior, "NO_ALLOWED_TIER", task, state)

        if state.tier_calls[tier] >= effective_wf.tier_call_limits[tier]:
            tier = next_tier_in_path(effective_wf.escalation_path, tier)
            if tier is null:
                return stop_with_behavior(effective_wf.stop_behavior, "TIER_CALL_LIMIT_REACHED", task, state)

        # Enforce Tier-C final-only rule if configured
        if tier == "tier_c" and effective_wf.tier_c_rules exists:
            if effective_wf.tier_c_rules.final_only and not task.is_finalization_step:
                # skip Tier C; escalate logic should not route here
                tier = previous_reasoning_tier(effective_wf) or "tier_b2"
                if tier is null:
                    return stop_with_behavior(effective_wf.stop_behavior, "TIER_C_FINAL_ONLY_VIOLATION", task, state)

        # 6) Build prompt/tool context with per-call caps
        caps = effective_wf.per_call_caps[tier] or infer_caps_from_model(cfg.models[tier])
        prompt_bundle = build_prompt_bundle(task, context, caps.max_input)

        # Ensure prompt stays within cap (truncate/summarize in code)
        prompt_bundle = enforce_input_cap(prompt_bundle, caps.max_input)

        # 7) Call the model with max_output cap (hard)
        model_name = cfg.models[tier].name
        response = llm_call(
            model=model_name,
            prompt=prompt_bundle,
            max_output_tokens=caps.max_output,
            # IMPORTANT: avoid "think freely"; keep reasoning bounded
            # (If vendor supports "effort/budget", pass here. For OpenAI, enforce via max tokens.)
        )

        # 8) Update counters (tokens + estimated cost)
        state.calls_made += 1
        state.tier_calls[tier] += 1

        in_tok = response.usage.input_tokens
        out_tok = response.usage.output_tokens
        state.tokens_in_total += in_tok
        state.tokens_out_total += out_tok

        # Estimate cost (use provider pricing table stored elsewhere; keep simple here)
        state.cost_usd_est_total += estimate_cost_usd(model_name, in_tok, out_tok, response.usage.cached_input_tokens)

        # 9) Validate result (schema + confidence + contradiction checks)
        validation = validate_response(
            response,
            require_schema=cfg.defaults.validation.require_json_schema,
            confidence_threshold=cfg.defaults.validation.confidence_threshold,
            fail_on_contradictions=cfg.defaults.validation.fail_on_contradictions
        )

        log_metrics(metrics_store, workflow_id, task, state, tier, validation)

        # 10) Success case
        if validation.ok:
            return format_success(response, state)

        # 11) Decide whether to escalate or stop
        triggers_hit = derive_triggers(validation)
        if not intersects(triggers_hit, effective_wf.escalation_triggers):
            # Not eligible to escalate; stop as per workflow
            return stop_with_behavior(effective_wf.stop_behavior, "VALIDATION_FAILED_NO_ESCALATION_TRIGGER", task, state)

        # Escalation eligibility: check remaining budgets
        if not has_remaining_budget_for_escalation(effective_wf, state):
            return stop_with_behavior(effective_wf.stop_behavior, "NO_BUDGET_LEFT_FOR_ESCALATION", task, state)

        # Escalate tier deterministically
        next_tier = next_tier_in_path(effective_wf.escalation_path, tier)
        if next_tier is null:
            return stop_with_behavior(effective_wf.stop_behavior, "ESCALATION_EXHAUSTED", task, state)

        tier = next_tier
        continue


# -------------------
# Circuit Breaker
# -------------------
function evaluate_circuit_breaker(cb_cfg, metrics_store):
    if not cb_cfg.enabled:
        return { is_tripped: false, reason: null }

    month_cost = metrics_store.get_month_to_date_cost_usd()
    cost_24h = metrics_store.get_rolling_24h_cost_usd()
    tier_c_pct_24h = metrics_store.get_tier_usage_pct("tier_c", "24h")
    spike = metrics_store.is_output_token_spike(factor=cb_cfg.output_token_spike_factor)

    if month_cost >= cb_cfg.monthly_budget_hard_usd:
        return { is_tripped: true, reason: "MONTHLY_BUDGET_HARD" }
    if cost_24h >= cb_cfg.rolling_24h_budget_hard_usd:
        return { is_tripped: true, reason: "ROLLING_24H_BUDGET_HARD" }
    if tier_c_pct_24h > cb_cfg.tier_c_max_pct_24h:
        return { is_tripped: true, reason: "TIER_C_USAGE_SPIKE" }
    if spike:
        return { is_tripped: true, reason: "OUTPUT_TOKEN_SPIKE" }

    return { is_tripped: false, reason: null }


function apply_safe_mode_overrides(wf, safe_mode_cfg):
    wf2 = clone(wf)

    # Disable Tier C if requested
    if safe_mode_cfg.disable_tier_c:
        wf2.allowed_tiers = wf2.allowed_tiers minus ["tier_c"]
        wf2.tier_call_limits["tier_c"] = 0

    # Prefer Tier A
    wf2.escalation_path = rebuild_path_prefer(wf2.escalation_path, safe_mode_cfg.preferred_tier)

    # Reduce output budgets (global and per-call)
    wf2.output_budget_total = floor(wf2.output_budget_total * safe_mode_cfg.output_cap_multiplier)
    for each tier in wf2.per_call_caps:
        wf2.per_call_caps[tier].max_output = floor(wf2.per_call_caps[tier].max_output * safe_mode_cfg.output_cap_multiplier)

    # Reduce max calls
    wf2.max_model_calls = min(wf2.max_model_calls, safe_mode_cfg.max_model_calls_override)

    return wf2


# -------------------
# Stop behaviors
# -------------------
function stop_with_behavior(stop_behavior, reason, task, state):
    if stop_behavior == "PARTIAL_WITH_GAPS":
        return {
            status: "PARTIAL",
            reason: reason,
            output: best_partial_answer_so_far(task),
            gaps: required_missing_inputs(task),
            telemetry: state
        }

    if stop_behavior == "SPLIT_TASK":
        subtasks = split_task(task)
        return {
            status: "SPLIT_REQUIRED",
            reason: reason,
            subtasks: subtasks,
            telemetry: state
        }

    # FAIL_FAST
    return {
        status: "FAILED",
        reason: reason,
        error: {
            code: reason,
            missing_fields: required_missing_inputs(task),
            suggested_fix: suggested_fix_steps(task)
        },
        telemetry: state
    }
