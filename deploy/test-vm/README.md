# Hosted test environment — deployment guide

One small Azure VM runs the whole app from `compose.yaml`, so one or two business analysts or testers can
use it in a browser without installing anything (ADR-0021, constitution 4.10.0). The data is the fictitious
demo seed; never put real Shell data here. Set up on 2026-11-03.

| | |
|---|---|
| URL | https://mapp-test-northstar.centralindia.cloudapp.azure.com |
| Sign-in | the app's own demo sign-in: pick a demo person, no typing needed (demo password `mapp`) |
| Who can open it | anyone with the URL; there is no extra login in front of the app (see Known limits) |
| Shuts down | every day at 15:30 UTC (21:00 IST); start it again with `az vm start` (below) |
| Cost | about USD 30 a month if left on all the time, less with the nightly shutdown |

## How a request travels

```
browser ──HTTPS 443──▶ NSG (allow-web) ──▶ VM: Caddy ──▶ web (nginx) ──/api──▶ api (Go) ──▶ postgres
           HTTP 80 only redirects to HTTPS     │ Let's Encrypt certificate
```

There is no VPN and no private network to join: the VM has a public IP address. The firewall rules below open
only HTTPS (and HTTP for the certificate); the app's demo sign-in is the only login. Only Caddy publishes
ports on the VM; PostgreSQL and the web container listen on `127.0.0.1` of the VM only.

## Azure resources

Subscription **Azure subscription - dvortex** (`8f5fce97-f4fa-42ba-877f-07aba0fb8e33`), tenant Zensar
Technologies Ltd (`207c3e32-7115-4ed3-8a55-22f7edb77dc9`). Everything is in one resource group, so deleting
the group removes it all.

| Resource | Exact name | Details |
|---|---|---|
| Resource group | `mapp-test-rg` | Central India (`centralindia`) |
| Virtual machine | `mapp-test-vm` | `Standard_B2als_v2` (2 vCPU, 4 GB), Ubuntu 24.04 LTS (`Ubuntu2404`), admin user `azureuser`, SSH key only |
| OS disk | `mapp-test-vm_OsDisk_1_7b4bdaf7b2d24875bb7280349f1de5e3` | 32 GB, StandardSSD_LRS |
| Public IP | `mapp-test-vmPublicIP` | `20.219.251.125`, Static, Standard SKU, DNS label `mapp-test-northstar` |
| DNS name | `mapp-test-northstar.centralindia.cloudapp.azure.com` | from the public IP's DNS label; no custom domain |
| Virtual network | `mapp-test-vmVNET` | `10.0.0.0/16` |
| Subnet | `mapp-test-vmSubnet` | `10.0.0.0/24`; the VM's private IP is `10.0.0.4` |
| Network interface | `mapp-test-vmVMNic` | the NSG below is attached here |
| Network security group | `mapp-test-vmNSG` | rules below |
| Auto-shutdown schedule | `shutdown-computevm-mapp-test-vm` | daily 15:30 UTC; registered the `Microsoft.DevTestLab` provider on the subscription |

Removed the same day: the Static Web App `SPA` (resource group `dvortex_rg`) and its workflow
`.github/workflows/azure-static-web-apps-purple-rock-0def4000f.yml`. It served the web app without the API.
Its GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN_PURPLE_ROCK_0DEF4000F` is no longer used; delete it in
the repository's Settings → Secrets and variables → Actions.

### Firewall rules (`mapp-test-vmNSG`, inbound)

| Priority | Name | Port | Source | Action | Why |
|---|---|---|---|---|---|
| 100 | `allow-web` | TCP 80, 443 | Any | Allow | the app; Let's Encrypt must reach port 80 to issue the certificate |
| 110 | `allow-ssh-me` | TCP 22 | `115.110.105.36/32` | Allow | SSH for the maintainer only |
| 65000–65500 | Azure defaults | — | — | — | allow inside the virtual network and from the load balancer; deny everything else |

Outbound is Azure's default (everything allowed): the VM pulls images, packages and certificates.

### On the VM

| What | Where |
|---|---|
| App files (a copy of the deployed commit) | `/home/azureuser/mapp` |
| Secrets | `/home/azureuser/mapp/.env` (mode 600, never committed) |
| Containers (Compose project `mapp`) | `postgres`, `seed` (runs once, then exits), `api`, `web`, `caddy` |
| Data volumes | `mapp_postgres-data` (database), `mapp_caddy-data` (certificate) |
| Installed by `cloud-init.yaml` | `docker.io`, `docker-compose-v2`; `azureuser` in the `docker` group |

`.env` variables:

| Variable | Meaning |
|---|---|
| `MAPP_HOST` | the VM's host name; Caddy's certificate and the API's `PUBLIC_HOSTS` |
| `DEMO_PASSWORD` | the demo sign-in's password |

### On the maintainer's computer

| What | Where |
|---|---|
| SSH key | `~/.ssh/mapp-test-vm` (private) and `~/.ssh/mapp-test-vm.pub` |
| SSH alias | `Host mapp-test` in `~/.ssh/config`, so `ssh mapp-test` works |
| Passwords | `~/mapp-test-credentials.txt` |

## Deploy a new version

From a clean checkout of the commit to test (usually `develop`, after `git pull`):

```sh
deploy/test-vm/deploy.sh mapp-test
```

The script sends the committed files (`git archive HEAD`), never uncommitted changes, rebuilds the images on
the VM and restarts what changed: about five minutes the first time, less afterwards. The database and
`.env` are kept, so testers' data survives a redeploy. The VM must be running.

## Everyday tasks

```sh
az vm start -g mapp-test-rg -n mapp-test-vm        # after the nightly shutdown; the app starts by itself
az vm deallocate -g mapp-test-rg -n mapp-test-vm   # stop paying for compute (disk and IP still cost a little)
az vm auto-shutdown -g mapp-test-rg -n mapp-test-vm --off   # no nightly shutdown
ssh mapp-test 'cd ~/mapp && docker compose -f compose.yaml -f deploy/test-vm/compose.yaml ps'
ssh mapp-test 'cd ~/mapp && docker compose -f compose.yaml -f deploy/test-vm/compose.yaml logs -f api'
```

**SSH times out?** Your IP address changed. Allow the new one:

```sh
az network nsg rule update -g mapp-test-rg --nsg-name mapp-test-vmNSG -n allow-ssh-me \
  --source-address-prefixes "$(curl -s https://api.ipify.org)/32"
```

**Change the demo password:** edit `DEMO_PASSWORD` in the VM's `.env`, then
`ssh mapp-test 'cd ~/mapp && docker compose -f compose.yaml -f deploy/test-vm/compose.yaml up -d api'`.

**Restrict it to the office network later:** change `allow-web` to port 443 from the office IP only (keep port
80 open so Let's Encrypt can renew the certificate):

```sh
az network nsg rule update -g mapp-test-rg --nsg-name mapp-test-vmNSG -n allow-web \
  --destination-port-ranges 443 --source-address-prefixes 115.110.105.36/32
az network nsg rule create -g mapp-test-rg --nsg-name mapp-test-vmNSG -n allow-http-acme --priority 105 \
  --protocol Tcp --destination-port-ranges 80 --access Allow
```

**Fresh demo data** (deletes everything testers entered):

```sh
ssh mapp-test 'cd ~/mapp && docker compose -f compose.yaml -f deploy/test-vm/compose.yaml down -v'
deploy/test-vm/deploy.sh mapp-test
```

`down -v` also deletes the certificate volume; Caddy gets a new certificate on the next start.

## Building it again from nothing

```sh
ssh-keygen -t ed25519 -f ~/.ssh/mapp-test-vm -N "" -C mapp-test-vm
az group create -n mapp-test-rg -l centralindia
az vm create -g mapp-test-rg -n mapp-test-vm --image Ubuntu2404 --size Standard_B2als_v2 \
  --admin-username azureuser --ssh-key-values ~/.ssh/mapp-test-vm.pub \
  --custom-data deploy/test-vm/cloud-init.yaml --public-ip-sku Standard \
  --public-ip-address-dns-name mapp-test-northstar --nsg-rule NONE --os-disk-size-gb 32 --storage-sku StandardSSD_LRS
az network nsg rule create -g mapp-test-rg --nsg-name mapp-test-vmNSG -n allow-web --priority 100 \
  --protocol Tcp --destination-port-ranges 80 443 --access Allow
az network nsg rule create -g mapp-test-rg --nsg-name mapp-test-vmNSG -n allow-ssh-me --priority 110 \
  --protocol Tcp --destination-port-ranges 22 --source-address-prefixes "$(curl -s https://api.ipify.org)/32" --access Allow
az vm auto-shutdown -g mapp-test-rg -n mapp-test-vm --time 1530
```

Add the `mapp-test` SSH alias, write the VM's `.env` (above), then deploy.

## Removing it all

```sh
az group delete -n mapp-test-rg --yes
```

This deletes every resource listed above, data included, and cannot be undone. Then remove the
`mapp-test` entry from `~/.ssh/config` and the key files.

## Known limits

- **Open to the internet.** Anyone who finds the URL can sign in as a demo person, read and change the demo
  data. Only the fictitious demo seed is loaded, so nothing real can leak. A shared HTTP basic-auth login was
  tried first and removed: browsers forget it as soon as the app answers 401 ("not signed in"), so testers
  were asked for it again and again.

- Not a production environment: Shell's release gates (CSPM scanning, ServiceNow) apply when MAPP moves to
  Shell's environment.
- The session cookie is not marked `Secure` behind the proxy (the browser still only reaches the site over
  HTTPS).
- All testers reach the API through the same proxy address, so the sign-in attempt limit counts them
  together: repeated wrong passwords from one tester can briefly block the other.
- Deploying is a manual step; pushing to `develop` does not deploy.
