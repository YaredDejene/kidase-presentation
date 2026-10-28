# Deploying the server (web + api)

Target: single-node k3s on Hetzner behind Cloudflare, manifests in `k8s/` (Kustomize). Background and first-time provisioning: `.claude/plans/deployment-plan.md`.

## Release

1. Merge to `main` through a pull request (the `main` ruleset requires green CI).
2. Bump the version where it is shown (`apps/api/package.json`, `apps/web`, desktop `tauri.conf.json`), merge.
3. Publish a GitHub Release with tag `vX.Y.Z`. `deploy.yml` builds `kidase-api` and `kidase-web`, pushes them to GHCR tagged `X.Y.Z`, `<12-char sha>` and `latest`, and applies `k8s/` with the SHA tag. `release.yml` ships the desktop installers from the same event.
4. Watch the repo's Deployments page (environment `production`). `rollout status` fails the job if a pod does not become ready within 120 s.

## Rollback

Fast, no build, back to the previous ReplicaSet of each Deployment:
```sh
kubectl -n kidase rollout undo deployment/kidase-api
kubectl -n kidase rollout undo deployment/kidase-web
```
Exact, redeploy an image that already exists in GHCR (any release tag or SHA tag):
```sh
gh workflow run deploy.yml -f tag=<release-tag-or-sha> -f skip_build=true
```
Or run the "Deploy (server)" workflow from the Actions tab with "skip_build" ticked.

## Secrets

The API reads its secrets from the `kidase-api` Secret (`MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`). In production the API refuses to start if any of the first, third or fifth is missing or still a development default, so a typo in the Secret shows up as a failed rollout, not a running pod with a known password.

Create or rotate it from an env file kept in a password manager (never in the repo):
```sh
JWT_SECRET=$(openssl rand -base64 48)
ADMIN_PASSWORD=$(openssl rand -base64 24)
kubectl -n kidase create secret generic kidase-api \
  --from-literal=MONGODB_URI='mongodb+srv://...' --from-literal=MONGODB_DB=kidase \
  --from-literal=JWT_SECRET="$JWT_SECRET" --from-literal=ADMIN_EMAIL=... --from-literal=ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl -n kidase rollout restart deployment/kidase-api
```
Rotating `JWT_SECRET` signs every admin session out, which is the point.

## Deployer identity for GitHub Actions

`KUBE_CONFIG` (GitHub environment `production`) should be a kubeconfig for the namespace-scoped `github-deployer` ServiceAccount, not the cluster-admin config from the node. One-time setup on the server:
```sh
kubectl apply -f deploy/k8s/deployer-rbac.yaml
TOKEN=$(kubectl -n kidase get secret github-deployer-token -o jsonpath='{.data.token}' | base64 -d)
CA=$(kubectl -n kidase get secret github-deployer-token -o jsonpath='{.data.ca\.crt}')
cat <<KC
apiVersion: v1
kind: Config
clusters: [{ name: k3s, cluster: { server: https://<server-public-ip>:6443, certificate-authority-data: $CA } }]
users: [{ name: github-deployer, user: { token: $TOKEN } }]
contexts: [{ name: deploy, context: { cluster: k3s, user: github-deployer, namespace: kidase } }]
current-context: deploy
KC
```
Paste the output into the `KUBE_CONFIG` secret of the `production` environment. Verify from a laptop with that file: `kubectl get deploy` works, `kubectl get nodes` is forbidden.
