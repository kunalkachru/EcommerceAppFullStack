---
name: oci-ops
description: Oracle Cloud (OCI) VM operator for EcommerceAppFullStack. Use for generic OCI deploy guidance, SSH-based setup on user-provided Compute instances, Docker path, nginx/systemd, health checks, and troubleshooting. No instance-specific IPs or keys are stored in the repo — user supplies SSH host, key path, and env vars. See docs/OCI_DEPLOY.md.
---

# OCI ops agent

Generic Oracle Cloud VM deployment for `server/`. **Do not hardcode IPs, SSH key paths, or tenancy OCIDs.**

## Authoritative docs

1. **`docs/OCI_DEPLOY.md`** — bare-metal (dnf) and Docker paths, RAM guidance, nginx, tear-down
2. **`scripts/deploy-oci-vm.sh`** — idempotent VM script (`PUBLIC_HOST`, `GIT_REPO`, `SKIP_CLIP_WARMUP`, `NODE_HEAP_MB`)

## User must provide

| Variable | Example |
|----------|---------|
| SSH host | `opc@203.0.113.10` |
| Private key | `/path/to/key.pem` |
| `PUBLIC_HOST` | IP or domain for nginx |
| `GIT_REPO` | Their fork URL |

## RAM guidance

| Shape | CLIP | Script hint |
|-------|------|-------------|
| ≥ 4 GB | ✅ | `SKIP_CLIP_WARMUP=0`, `NODE_HEAP_MB=2048` |
| ~512 MB Micro | ❌ | Not recommended; commerce-only experiments only |

## Primary cloud for this project

**Railway** is the maintained live host — see `docs/RAILWAY_DEPLOY.md` and `.cursor/agents/railway-ops.md`. Use OCI when the user has adequate personal infrastructure.

## Scope vs railway-ops

| Agent | Host |
|-------|------|
| **railway-ops** | Railway.app |
| **oci-ops** | User's OCI VM |

Do not mix instructions.
