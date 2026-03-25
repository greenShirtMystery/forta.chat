---
name: release
description: Create a new Android release — bump version, write release notes, tag, push, wait for CI
user_invocable: true
---

# Android Release

Create and publish a new Android release via GitHub Actions.

## Steps

1. **Sync with master**
   ```bash
   git checkout master && git fetch origin master && git reset --hard origin/master
   ```

2. **Determine next version**
   - List existing tags: `git tag --sort=-v:refname | head -5`
   - If the user specified a version (e.g., `/release 1.4.0`), use it
   - Otherwise, determine the bump type by analyzing commits since the last tag:
     - `feat:` commits → bump minor (1.2.0 → 1.3.0)
     - `fix:` / `perf:` / `chore:` only → bump patch (1.2.0 → 1.2.1)
     - Breaking changes or major features → ask user about major bump
   - Confirm the version with the user before proceeding

3. **Write release notes in ENGLISH**
   - Get commits since last tag: `git log <last_tag>..HEAD --oneline`
   - Group changes into categories and write a human-readable summary in **English**:
     ```
     ## What's New

     ### New Features
     - Description of what changed for the user (NOT commit messages)

     ### Bug Fixes
     - Description from the user's perspective

     ### Performance
     - What got faster/better
     ```
   - Focus on **what changed for the user**, not technical commit messages
   - Skip chore/docs/ci commits unless they affect users
   - Show the draft to the user and ask for confirmation

4. **Create annotated tag and push**
   ```bash
   git tag -a vX.Y.Z -m "Release notes here..."
   git push origin vX.Y.Z
   ```

5. **Wait for CI build**
   - Find the workflow run: `gh run list --repo greenShirtMystery/forta.chat --workflow="Android Release" --limit 1`
   - Poll every 60 seconds until complete (max ~5 min for Gradle build)
   - If failed — show error logs and suggest fix

6. **Update release notes**
   - After CI completes, overwrite the release body with the full release notes via `gh release edit`:
     ```bash
     gh release edit vX.Y.Z --repo greenShirtMystery/forta.chat --notes "$(cat <<'EOF'
     <full release notes here>
     EOF
     )"
     ```
   - This ensures the release description matches exactly what was confirmed, regardless of how the CI workflow parses the tag message

7. **Verify release**
   - `gh release view vX.Y.Z --repo greenShirtMystery/forta.chat`
   - Confirm APK is attached and release notes are correct
   - Print the release URL

## Important
- NEVER force-push tags without user confirmation
- If build fails, diagnose and fix — don't just retry
- Release notes are applied via `gh release edit` after CI, not from the tag message
- Release notes must be in **English**
- Repo: `greenShirtMystery/forta.chat`
