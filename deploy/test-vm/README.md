# Hosted test VM

One small Azure VM runs the whole app from `compose.yaml`, so one or two business analysts or testers can
use it without installing anything (ADR-0021). Caddy in front gets an HTTPS certificate from Let's Encrypt
and asks for one shared tester sign-in before anything else, because the demo sign-in shows its password to
anyone who opens it. The data is the fictitious demo seed; never put real Shell data here.

| | |
|---|---|
| URL | https://mapp-test-northstar.centralindia.cloudapp.azure.com |
| Azure | subscription "Azure subscription - dvortex", resource group `mapp-test-rg` (Central India) |
| VM | `mapp-test-vm`, Ubuntu 24.04, `Standard_B2als_v2` (2 vCPU, 4 GB), 32 GB StandardSSD |
| Firewall | 80 and 443 from anywhere; 22 only from the maintainer's IP address |
| Shuts down | every day at 15:30 UTC (21:00 IST); it does not start by itself |

## Deploy a new version

From a clean checkout of the commit to test (usually `develop`):

```sh
deploy/test-vm/deploy.sh azureuser@mapp-test-northstar.centralindia.cloudapp.azure.com
```

The script sends the committed files (`git archive HEAD`), never uncommitted changes, rebuilds the images on
the VM and restarts what changed. The database and `~/mapp/.env` are kept. The SSH key is
`~/.ssh/mapp-test-vm`; add it to `ssh-agent` or `~/.ssh/config`.

## Everyday tasks

```sh
az vm start -g mapp-test-rg -n mapp-test-vm        # after the nightly shutdown
az vm deallocate -g mapp-test-rg -n mapp-test-vm   # stop paying for compute
ssh azureuser@<host> 'cd ~/mapp && docker compose -f compose.yaml -f deploy/test-vm/compose.yaml logs -f api'
```

SSH refused? Your IP address changed: update the `allow-ssh-me` rule of `mapp-test-vmNSG`.

Start again with fresh demo data (deletes everything testers entered):

```sh
ssh azureuser@<host> 'cd ~/mapp && docker compose -f compose.yaml -f deploy/test-vm/compose.yaml down -v'
```

then deploy again.

## The VM's `.env`

`~/mapp/.env` on the VM, never committed:

| Variable | Meaning |
|---|---|
| `MAPP_HOST` | the VM's host name; Caddy's certificate and the API's `PUBLIC_HOSTS` |
| `DEMO_PASSWORD` | the demo sign-in's password |
| `TESTER_USER`, `TESTER_PASSWORD_HASH` | the shared tester sign-in; make the hash with `docker run --rm caddy:2.10-alpine caddy hash-password`, in single quotes |

## Building it again from nothing

```sh
az group create -n mapp-test-rg -l centralindia
az vm create -g mapp-test-rg -n mapp-test-vm --image Ubuntu2404 --size Standard_B2als_v2 \
  --admin-username azureuser --ssh-key-values ~/.ssh/mapp-test-vm.pub \
  --custom-data deploy/test-vm/cloud-init.yaml --public-ip-sku Standard \
  --public-ip-address-dns-name mapp-test-northstar --nsg-rule NONE --os-disk-size-gb 32 --storage-sku StandardSSD_LRS
az network nsg rule create -g mapp-test-rg --nsg-name mapp-test-vmNSG -n allow-web --priority 100 \
  --protocol Tcp --destination-port-ranges 80 443 --access Allow
az network nsg rule create -g mapp-test-rg --nsg-name mapp-test-vmNSG -n allow-ssh-me --priority 110 \
  --protocol Tcp --destination-port-ranges 22 --source-address-prefixes <your-ip>/32 --access Allow
az vm auto-shutdown -g mapp-test-rg -n mapp-test-vm --time 1530
```

Write `~/mapp/.env` as above, then deploy. Remove it all with `az group delete -n mapp-test-rg`.
