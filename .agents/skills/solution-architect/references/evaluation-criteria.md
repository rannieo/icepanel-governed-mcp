# Evaluation Criteria

Use this matrix when comparing candidate technologies or architecture options.

## Technology Assessment Dimensions

- **Maturity** - production readiness, release stability, breaking-change frequency
- **Community** - activity, issue responsiveness, ecosystem support
- **Documentation** - clarity, examples, migration guidance
- **Performance** - latency, throughput, resource efficiency
- **Scalability** - horizontal scaling characteristics and practical limits
- **Security** - security defaults, CVE history, compliance support
- **Operations** - debuggability, observability support, upgrade ergonomics
- **Cost** - licensing, infrastructure, and hidden operational costs
- **Team Fit** - current team capability, learning curve, hiring market
- **Ecosystem** - integrations, tooling, library maturity

## Suggested Scoring Method

1. Assign weight (1-5) for each dimension based on project priorities.
2. Score each candidate (1-5) per dimension.
3. Compute weighted score and review qualitative risks.
4. Do not select solely by score; use scores to support judgment, not replace it.

## Architecture Health Checklist

- [ ] No single points of failure
- [ ] Horizontal scale path is clear
- [ ] Backup and recovery strategy exists
- [ ] Security controls use defense-in-depth
- [ ] Logs, metrics, and traces are planned
- [ ] Graceful degradation under load is defined
- [ ] Service boundaries and contracts are explicit
- [ ] Deployment automation is feasible
- [ ] Rollback strategy is defined
- [ ] Cost optimization opportunities are identified

## Risk Framing

For each major risk, document:

- **Risk**: what could fail
- **Impact**: what breaks if it fails
- **Likelihood**: low/medium/high
- **Mitigation**: preventative controls
- **Validation**: concrete test/PoC to reduce uncertainty
