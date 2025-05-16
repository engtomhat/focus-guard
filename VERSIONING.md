# Focus Guard Version Management Guide

## Workflow

1. **Version Bump**:
   ```bash
   npm version [patch|minor|major] -m "v%s - description"
   ```
   - Updates `package.json` and manifests
   - Creates git commit + tag

2. **Push Changes**:
   ```bash
   git push --follow-tags
   ```

## Commands

| Purpose | Command |
|---------|---------|
| Patch update | `npm version patch -m "v%s - bug fixes"` |
| Minor update | `npm version minor -m "v%s - new features"` |
| Major update | `npm version major -m "v%s - breaking changes"` |
| Push updates | `git push --follow-tags` |

## File Roles

| File | Purpose | Managed By |
|------|---------|------------|
| `package.json` | Source of truth | `npm version` |
| `manifests/*.json` | Browser extension versions | Sync script |
| `package-lock.json` | Dependency tree | npm |

## Troubleshooting

### Manifest Versions Out of Sync
```bash
npm run version --force
```

### Tag Correction
```bash
git tag -d vX.Y.Z          # Delete local tag
git push origin :vX.Y.Z    # Delete remote tag
npm version patch          # Retry
```

> **Note**: Always use `npm version` rather than manual edits to ensure consistency.
