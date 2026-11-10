# Private study notes

Build with `mkdocs build -f mkdocs.private.yml`. Preview on this Mac with
`mkdocs serve -f mkdocs.private.yml`. The course material index is at
`/course-materials/`. The public build continues to use `mkdocs.yml`.

Local copies of files removed from public Git are in
`.private-course-materials/docs/`. After syncing the public removals, restore
them to their original relative paths with
`rsync -a --ignore-existing .private-course-materials/docs/ docs/`.
The public MkDocs configuration excludes those paths.

## Automatic deployment

The public repository owns the note source and the Worker configuration. The
private course repository owns the assets, their SHA-256 manifest, and the
deployment workflow. A push to either repository's `main` branch can trigger a
build. The private workflow checks out the current `main` of both repositories
and deploys to the existing `study-notes-private` Worker. It runs on a
GitHub-hosted runner.

### First-time setup

Build the complete private site on the Mac. From the public checkout, prepare
a separate course repository directory outside the public worktree:

```sh
mkdocs build -f mkdocs.private.yml
course_dir=$(mktemp -d)
python3 private-notes/course_assets.py export "$course_dir"
mkdir -p "$course_dir/.github/workflows"
cp private-notes/deploy-private-notes.yml "$course_dir/.github/workflows/"
git -C "$course_dir" init -b main
git -C "$course_dir" add course-assets.json docs .github/workflows/deploy-private-notes.yml
git -C "$course_dir" commit -m "Add course assets and private deployment"
```

Create a **private** GitHub repository for this checkout, then push its
`main` branch. Keep this checkout separate from the public notes checkout.

| Repository | GitHub Actions setting | Value |
| --- | --- | --- |
| Private course repo | Variable `CLOUDFLARE_ACCOUNT_ID` | Account that owns `study-notes-private` |
| Private course repo | Secret `CLOUDFLARE_API_TOKEN` | Account-scoped token with the Edit Cloudflare Workers permissions |
| Public notes repo | Variable `PRIVATE_COURSE_REPOSITORY` | Private repository's `owner/name` |
| Public notes repo | Secret `PRIVATE_NOTES_DISPATCH_TOKEN` | Fine-grained token scoped to the private repo with Actions write permission |

Push the public deployment files to `main` before enabling the public trigger.
Set the public variable last to activate dispatches. Run **Deploy private
notes** manually from the private repo once to confirm the setup. Then verify
that the home page and a direct PDF URL require Access, and that both load
after signing in. The public workflow reports whether GitHub accepted the
dispatch. Build and deployment results appear in the private repository.

### Updating course materials

Export from a fresh private build into a temporary directory. Review the
manifest and sync only its `docs/` tree and `course-assets.json` into the
private course checkout. Commit them together, including any removed files.
A push to private `main` starts a new deployment. To update the workflow,
copy the template from this directory to the private checkout's
`.github/workflows/`.

The importer rejects manifest paths that overlap the public source tree. The
workflow also verifies each asset against the manifest in the built site before
publishing. Keep the existing Worker Access application and its `ACCESS_TEAM`,
`ACCESS_AUD`, and `ACCESS_EMAIL` secrets. The Worker validates Access before
serving static assets, and version URLs are disabled in Wrangler.

[Cloudflare GitHub Actions deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
· [GitHub workflow dispatch permissions](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
· [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
