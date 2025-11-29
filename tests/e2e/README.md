# E2E Tests for WPMoveJS

End-to-end tests that run wpmovejs against real WordPress installations in Docker containers with SSH support.

## Architecture

```
┌─────────────────────┐     SSH/rsync      ┌─────────────────────┐
│  "local" container  │ ←───────────────→  │ "remote" container  │
│  - WordPress        │                    │  - WordPress        │
│  - wp-cli           │                    │  - wp-cli           │
│  - wpmovejs         │                    │  - sshd             │
│  - MySQL            │                    │  - MySQL            │
└─────────────────────┘                    └─────────────────────┘
```

## Requirements

- Docker and Docker Compose
- Node.js 18+
- ssh-keygen (for generating test SSH keys)

## Running Tests

### Full E2E Test Suite

```bash
npm run test:e2e
```

This will:
1. Build the project
2. Build Docker images
3. Start containers
4. Run all e2e tests
5. Stop and clean up containers

### Manual Setup (for development)

Start the containers manually:
```bash
npm run test:e2e:setup
```

Run tests (containers must be running):
```bash
npx vitest run --config vitest.e2e.config.ts
```

Stop and clean up:
```bash
npm run test:e2e:teardown
```

## Test Files

- `push.e2e.test.ts` - Tests for push operations (plugins, themes, uploads)
- `pull.e2e.test.ts` - Tests for pull operations
- `forbid.e2e.test.ts` - Tests for the forbid configuration

## Fixtures

- `wpmove.yml` - Standard test configuration
- `wpmove-forbid.yml` - Configuration with forbid rules for testing
- `test-plugin/` - Sample plugin for testing

## Docker Setup

The Docker environment includes:
- WordPress 6.7 with PHP 8.2
- wp-cli installed globally
- OpenSSH server for remote access
- rsync for file syncing
- MariaDB for WordPress database

SSH authentication uses automatically generated ED25519 key pairs stored in `/tmp/wpmovejs-e2e-ssh/`.

## Timeouts

E2E tests have extended timeouts:
- Individual tests: 2 minutes
- Setup/teardown hooks: 3 minutes

## Troubleshooting

### Containers won't start
```bash
# Check Docker logs
docker logs wpmovejs-e2e-local
docker logs wpmovejs-e2e-remote

# Rebuild from scratch
npm run test:e2e:teardown
docker system prune -f
npm run test:e2e:setup
```

### SSH connection issues
```bash
# Test SSH connectivity
docker exec wpmovejs-e2e-local ssh -o StrictHostKeyChecking=no www-data@remote 'echo hello'

# Check SSH keys
docker exec wpmovejs-e2e-remote cat /var/www/.ssh/authorized_keys
```

### WordPress not ready
```bash
# Check WordPress status
docker exec wpmovejs-e2e-local wp core is-installed --allow-root
docker exec wpmovejs-e2e-remote wp core is-installed --allow-root
```
