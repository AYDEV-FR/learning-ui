---
sidebar_position: 2
---

# Kubernetes Environment

Learning UI can include an embedded Kubernetes cluster (K3S) for Kubernetes tutorials, allowing users to practice with a real cluster.

## Enabling K3S

Enable the embedded K3S cluster in your values:

```yaml
k3s:
  enabled: true
  image:
    repository: rancher/k3s
    tag: v1.29.0-k3s1
    pullPolicy: IfNotPresent
  resources:
    requests:
      memory: "512Mi"
      cpu: "500m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
```

## Architecture

When K3S is enabled, it runs as a sidecar container in the shell pod:

```
┌─────────────────────────────────────────────────┐
│                  Shell Pod                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  shell  │  │  editor  │  │     k3s       │  │
│  │         │  │  (VS    │  │    server     │  │
│  │ kubectl │  │  Code)   │  │  (privileged) │  │
│  │  helm   │  │          │  │               │  │
│  └────┬────┘  └──────────┘  └───────┬───────┘  │
│       │                             │          │
│       └─────────────────────────────┘          │
│              /etc/rancher/k3s/k3s.yaml         │
│                  (shared kubeconfig)           │
└─────────────────────────────────────────────────┘
```

All containers share:
- `/workspace` - persistent workspace storage
- `/etc/rancher/k3s/` - kubeconfig directory (emptyDir volume)

## Using the Kubernetes Shell Image

For Kubernetes scenarios, use the pre-built shell image with kubectl, helm, and k9s:

```yaml
shell:
  image:
    repository: ghcr.io/aydev-fr/learning-kubernetes
    tag: latest
    pullPolicy: IfNotPresent
```

This image includes:
- `kubectl` - Kubernetes CLI
- `helm` - Kubernetes package manager
- `k9s` - Terminal UI for Kubernetes
- Bash completion for kubectl and helm

## Customizing with Init Scripts

You can run initialization scripts when the shell container starts. This is useful for:
- Pre-installing tools
- Setting up demo applications
- Configuring the environment

### Method 1: Custom Command

Override the shell command to run setup scripts:

```yaml
shell:
  image:
    repository: ghcr.io/aydev-fr/learning-kubernetes
    tag: latest

  command:
    - /bin/bash
    - -c
    - |
      # Wait for K3S to be ready
      while [ ! -f /etc/rancher/k3s/k3s.yaml ]; do sleep 1; done

      # Copy kubeconfig
      mkdir -p ~/.kube
      cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
      chmod 600 ~/.kube/config

      # Wait for cluster to be ready
      until kubectl get nodes 2>/dev/null | grep -q "Ready"; do sleep 2; done

      # Install your applications
      kubectl create namespace demo
      kubectl apply -f https://example.com/demo-app.yaml

      # Keep container running
      exec sleep infinity
```

### Method 2: Custom Container Image

Build a custom shell image with your tools pre-installed:

```dockerfile
FROM ghcr.io/aydev-fr/learning-kubernetes:latest

# Install additional tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install kubernetes

# Add custom scripts
COPY scripts/ /usr/local/bin/

# Add demo manifests
COPY manifests/ /opt/demo/
```

### Method 3: Init Container

Use an init container to prepare the environment:

```yaml
# In your parent chart's values
shell:
  initContainers:
    - name: setup
      image: bitnami/kubectl:latest
      command:
        - /bin/sh
        - -c
        - |
          # Wait for K3S
          until kubectl get nodes; do sleep 2; done

          # Deploy demo apps
          kubectl apply -f /manifests/
      volumeMounts:
        - name: manifests
          mountPath: /manifests
```

## Example: Kubernetes Basics Scenario

```yaml
# values-kubernetes.yaml
scenario:
  name: "Kubernetes Basics"
  description: "Learn Kubernetes fundamentals"
  steps:
    - name: "01-intro"
      title: "Introduction"
      content: |
        # Welcome to Kubernetes

        Check your cluster:

        ```bash
        kubectl cluster-info
        kubectl get nodes
        ```
      check: |
        #!/bin/bash
        if kubectl get nodes | grep -q "Ready"; then
            echo "Cluster is ready!"
            exit 0
        fi
        echo "Waiting for cluster..."
        exit 1

shell:
  image:
    repository: ghcr.io/aydev-fr/learning-kubernetes
    tag: latest

k3s:
  enabled: true
  resources:
    limits:
      memory: "2Gi"
      cpu: "2000m"

editor:
  enabled: true  # VS Code for editing YAML manifests
```

## Resource Considerations

K3S requires significant resources:

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Memory | 512Mi | 1-2Gi |
| CPU | 500m | 1-2 cores |

:::warning
The K3S sidecar requires `privileged: true` security context. This is necessary for running a container runtime inside the pod.
:::

## Troubleshooting

### K3S not starting

Check the K3S container logs:
```bash
kubectl logs <pod-name> -c k3s
```

### kubectl can't connect

The shell container copies the kubeconfig on startup. If it fails:
```bash
# Inside the shell
cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
chmod 600 ~/.kube/config
```

### Pods stuck in Pending

K3S may need more resources. Increase limits:
```yaml
k3s:
  resources:
    limits:
      memory: "4Gi"
      cpu: "4000m"
```
