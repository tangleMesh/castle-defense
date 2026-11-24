# Live deployment on the Mac mini

The **live** server runs on the Mac mini (Linux, M1), separate from development. Its whole life cycle runs on GitHub releases:

```
 you: git tag + GitHub release vX.Y.Z
   │
   ▼
 GitHub Actions (.github/workflows/release.yml)
   tests → builds the image for arm64 + amd64 → ghcr.io/tanglemesh/castle-defense:vX.Y.Z
   │
   ▼
 Mac mini, every 5 min: systemd timer → deploy/update.sh
   new release? image ready? → waits until no match is running → restarts the server on vX.Y.Z
   │
   ▼
 docker compose (deploy/docker-compose.yml)
   server (127.0.0.1:8080) ── mongo (volume mongo-data) ── backup → AWS S3 (weekly)
   │
   ▼
 cloudflared (already installed on the host) → https://your-domain → http://localhost:8080
```

The dev setup in the repository root (`docker compose up` in the sbx container) stays as it is.

## 1. Prepare the Mac mini (once)

SSH into the Mac mini and check the basics:

```bash
uname -m                      # aarch64 (arm64): the images are built for it
docker --version              # Docker Engine
docker compose version        # Compose plugin v2
git --version && curl --version | head -1
```

If Docker is missing, use Docker's install script (works on Ubuntu, Debian, Fedora and Asahi):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"    # then log out and in again
sudo systemctl enable --now docker
```

MongoDB 7 runs on the M1 (it needs ARMv8.2, which the M1 has).

## 2. First release on GitHub

**Activate the release workflow (once).** The workflow is in `deploy/github/release.yml`. Copy it to `.github/workflows/release.yml` and push it from your own machine:

```bash
mkdir -p .github/workflows && cp deploy/github/release.yml .github/workflows/release.yml
git add .github/workflows/release.yml && git commit -m "Release workflow" && git push
```

Or in the browser: GitHub → **Add file → Create new file**, path `.github/workflows/release.yml`, paste the content, then commit.

The sbx container's GitHub access may not change workflow files. To let Claude do it, give the sandbox a token with the `workflow` scope:

```bash
sbx secret set github --sandbox <name> -t <token>
```

**Then create the release.** The Mac mini installs GitHub releases, so one has to exist. On your dev machine (or ask Claude):

```bash
# package.json "version" should match the tag (the game shows it in the corner)
git tag v0.58.0 && git push origin v0.58.0
gh release create v0.58.0 --title "v0.58.0" --notes "First live release"
```

The **release** workflow (GitHub → Actions) runs the tests and builds the image. That takes about 10–20 minutes; arm64 is built under emulation.

**Make the image public, once:** the first image a workflow pushes is private.
1. Open GitHub → your profile → **Packages** → **castle-defense** → **Package settings**.
2. Under "Danger Zone", choose **Change visibility** → **Public**.

The repository is public anyway, and this way the Mac mini needs no login. If you'd rather keep it private, create a token with `read:packages` and run `docker login ghcr.io -u <github-user>` once on the Mac mini.

## 3. S3 bucket for backups (once)

In the AWS console:

1. **S3 → Create bucket**, e.g. `castle-defense-backups-<something>`, in your region. Keep "Block all public access" on.
2. **IAM → Users → Create user** `castle-defense-backup` (no console access). Attach an inline policy that only allows this bucket:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       { "Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "arn:aws:s3:::castle-defense-backups-<something>" },
       { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"], "Resource": "arn:aws:s3:::castle-defense-backups-<something>/*" }
     ]
   }
   ```
3. **Security credentials → Create access key** ("Application running outside AWS"). Keep the key ID and the secret for step 4.

The backup container keeps the newest `BACKUP_KEEP` backups (default 12) and deletes older ones itself, so no lifecycle rule is needed.

## 4. Install the live server

On the Mac mini:

```bash
git clone https://github.com/tangleMesh/castle-defense.git ~/castle-defense
cd ~/castle-defense
./deploy/install.sh          # first run: creates deploy/.env and stops
nano deploy/.env             # fill in S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
./deploy/install.sh          # second run: installs the update timer, pulls the latest release, starts everything
```

The second run ends with the health check, e.g. `{"ok":true,"version":"0.58.0","liveMatches":0}`, followed by the container list (mongo, server, backup).

Settings in `deploy/.env` (see `deploy/.env.example`):

| Setting | Default | |
|---|---|---|
| `HOST_PORT` | `8080` | Local port for the tunnel, bound to 127.0.0.1 only |
| `CASTLE_VERSION` | set by the updater | The release that runs |
| `AUTO_UPDATE` | `1` | `0` pins `CASTLE_VERSION` (no automatic updates) |
| `UPDATE_MAX_WAIT_MIN` | `120` | How long an update waits for running matches to end |
| `BACKUP_INTERVAL_HOURS` | `168` | Backup interval (168 = weekly) |
| `BACKUP_KEEP` | `12` | Backups kept in S3 (0 = all) |
| `LEARNER` | `always` | Background bot learner: `always`; `idle` (only while no match is running); `off` |
| `ADMIN_TOKEN` | random | For the learner's admin endpoints |
| `LEARNER_MAX_MB` | `256` | Heap cap for the learner's worker (it restarts if it needs more) |

## 5. Cloudflare Tunnel

Point a public hostname at `http://localhost:8080`. WebSockets (the game connection) work through the tunnel by default.

**Tunnel managed in the Cloudflare dashboard** (installed with a token):
1. Go to Zero Trust → Networks → **Tunnels** → your tunnel → **Public Hostname** → **Add a public hostname**.
2. Pick a subdomain (e.g. `castle`) and your domain. Set the service to **HTTP** `localhost:8080`.
3. Save. Nothing to restart.

**Tunnel with a local config file** (`/etc/cloudflared/config.yml`):

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/<your-tunnel-id>.json
ingress:
  - hostname: castle.example.com
    service: http://localhost:8080
  - service: http_status:404
```

Then route the hostname and restart cloudflared:

```bash
cloudflared tunnel route dns <your-tunnel-name> castle.example.com
sudo systemctl restart cloudflared
```

Open `https://castle.example.com`. The version in the lower-right corner is the release.

## 6. Move the players from the dev server (optional, once)

To keep accounts, Elo, history and what the bots learned, copy the database from the sbx container before your friends switch over.

1. In the sbx container, in the repository:

   ```bash
   docker compose exec -T mongo mongodump --db bastion_clash --archive --gzip > castle-dev.archive.gz
   ```

2. Copy `castle-dev.archive.gz` to the Mac mini (e.g. `scp`), then restore it there:

   ```bash
   cd ~/castle-defense/deploy
   docker compose exec -T mongo mongorestore --archive --gzip --drop < ~/castle-dev.archive.gz
   docker compose restart server
   ```

Both setups use the database name `bastion_clash`, so the restore is 1:1.

## 7. Releasing an update

1. Bump `"version"` in `package.json`, add a CHANGELOG entry, commit and push.
2. Create the release:

   ```bash
   gh release create v0.58.0 --generate-notes
   ```

3. Once the workflow has built the image (about 10–20 min), the Mac mini picks it up within 5 minutes.
4. If matches are running, it waits until they end (at most `UPDATE_MAX_WAIT_MIN`). Matches still running at that point are saved and can be resumed.

Only published releases are installed. Drafts and plain tags are ignored.

## 8. Everyday operations (on the Mac mini, in `~/castle-defense/deploy`)

```bash
docker compose ps                                  # status
docker compose logs -f server                      # server log (also: mongo, backup)
journalctl -u castle-defense-update -n 50          # what the updater did
systemctl list-timers castle-defense-update.timer  # next update check
curl -s localhost:8080/api/health                  # version + running matches
curl -s localhost:8080/api/learner | head -c 600   # how the bots are doing

./update.sh --force                                # install the latest release right now

docker compose run --rm backup now                 # backup right now
docker compose run --rm backup list                # backups in S3
```

**Restore a backup from S3:**

```bash
docker compose run --rm --entrypoint bash backup -c \
  'aws s3 cp s3://$S3_BUCKET/$S3_PREFIX/<file>.archive.gz - | mongorestore --uri mongodb://mongo:27017 --archive --gzip --drop'
docker compose restart server
```

**Roll back to an earlier release:** set `CASTLE_VERSION=v0.56.0` and `AUTO_UPDATE=0` in `.env`, then run `docker compose up -d`. Set `AUTO_UPDATE=1` again once a fixed release is out.

**Stop or start everything:** `docker compose down` or `docker compose up -d`. The data stays in the `mongo-data` volume. Never use `down -v` on the live server: it deletes the database.

## Troubleshooting

| Symptom | Check |
|---|---|
| The updater keeps saying "image … not available yet" | Is the release workflow green? Is the package public (step 2)? |
| "no published release yet" | Create a GitHub release (not just a tag). |
| The site doesn't load through the tunnel | `curl localhost:8080/api/health` on the Mac mini. If that works, the tunnel's hostname or service is wrong. |
| The backup log says "disabled" | `S3_BUCKET` or the AWS keys are missing in `.env`. Run `docker compose up -d backup` after fixing them. |
| A backup failed | `docker compose logs backup` (bucket name, region, IAM policy). It retries every hour. |
| `/api/learner` shows `selfPlayRunning: false` or `worker.restarts` keeps growing | Look at `worker.lastError` and `docker compose logs server \| grep learner`. Usually the server is short of memory. With full training buffers it needs about 400–500 MB, so give the server container at least 1 GB (MongoDB needs its own on top). The learner worker's heap is capped at `LEARNER_MAX_MB` (default 256). If it hits the cap, only the worker restarts, never the game server. |
