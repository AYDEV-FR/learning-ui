---
sidebar_position: 2
---

# Custom Shell Containers

The shell container is where users execute commands. Customize it based on your scenario's requirements.

## Using Standard Images

For simple scenarios, use standard container images:

```yaml
shell:
  image:
    repository: debian
    tag: bookworm
    pullPolicy: IfNotPresent

  command: ["sleep"]
  args: ["infinity"]
```

### Common Base Images

| Image | Use Case |
|-------|----------|
| `debian:bookworm` | General purpose, most tools available |
| `ubuntu:22.04` | Similar to Debian, some prefer it |
| `alpine:3.19` | Minimal, fast, uses `apk` |
| `python:3.11` | Python development |
| `node:20` | Node.js development |
| `golang:1.22` | Go development |

## Building Custom Images

For scenarios requiring specific tools, build a custom image.

### Basic Template

```dockerfile
# Containerfile.my-scenario
FROM debian:bookworm

# Install required tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    vim \
    git \
    jq \
    # Add your tools here
    && rm -rf /var/lib/apt/lists/*

# Create workspace
RUN mkdir -p /workspace && chmod 777 /workspace
WORKDIR /workspace

# Custom prompt
RUN echo 'export PS1="\[\e[32m\]\u@learning\[\e[0m\]:\[\e[34m\]\w\[\e[0m\]\$ "' >> /etc/bash.bashrc

CMD ["sleep", "infinity"]
```

### Build and Push

```bash
# Build
docker build -f Containerfile.my-scenario -t myregistry/my-learning-shell:v1 .

# Push to registry
docker push myregistry/my-learning-shell:v1
```

### Use in Values

```yaml
shell:
  image:
    repository: myregistry/my-learning-shell
    tag: v1
    pullPolicy: IfNotPresent
```

## Example: Kubernetes Shell

Shell with kubectl, helm, and k9s:

```dockerfile
FROM debian:bookworm

ARG TARGETARCH

# Install base tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    ca-certificates \
    bash-completion \
    vim \
    nano \
    less \
    jq \
    git \
    tree \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN ARCH=${TARGETARCH:-amd64} && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/${ARCH}/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Install helm
RUN ARCH=${TARGETARCH:-amd64} && \
    curl -fsSL https://get.helm.sh/helm-v3.14.0-linux-${ARCH}.tar.gz | tar xz && \
    mv linux-${ARCH}/helm /usr/local/bin/ && \
    rm -rf linux-${ARCH}

# Install k9s
RUN ARCH=${TARGETARCH:-amd64} && \
    curl -fsSL "https://github.com/derailed/k9s/releases/download/v0.32.4/k9s_Linux_${ARCH}.tar.gz" | tar xz -C /usr/local/bin k9s

# Setup bash completion
RUN echo 'source /etc/bash_completion 2>/dev/null || true' >> /etc/bash.bashrc && \
    echo 'source <(kubectl completion bash)' >> /etc/bash.bashrc && \
    echo 'source <(helm completion bash)' >> /etc/bash.bashrc && \
    echo 'alias k=kubectl' >> /etc/bash.bashrc && \
    echo 'complete -o default -F __start_kubectl k' >> /etc/bash.bashrc

WORKDIR /workspace
CMD ["sleep", "infinity"]
```

## Example: Python Data Science

Shell for data science tutorials:

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install data science packages
RUN pip install --no-cache-dir \
    pandas \
    numpy \
    matplotlib \
    seaborn \
    scikit-learn \
    jupyter \
    ipython

WORKDIR /workspace
CMD ["sleep", "infinity"]
```

## Example: Network Tools

Shell for networking tutorials:

```dockerfile
FROM debian:bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    net-tools \
    iputils-ping \
    dnsutils \
    tcpdump \
    nmap \
    netcat-openbsd \
    iproute2 \
    iptables \
    curl \
    wget \
    vim \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
CMD ["sleep", "infinity"]
```

## Example: Cryptography

Shell for cryptography tutorials:

```dockerfile
FROM debian:bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    gnupg \
    xxd \
    vim \
    less \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
CMD ["sleep", "infinity"]
```

## Local Development with Kind

For local development, load images directly into Kind:

```bash
# Build locally
docker build -f Containerfile.my-scenario -t my-learning-shell:latest .

# Load into Kind cluster
kind load docker-image my-learning-shell:latest --name my-cluster
```

Configure to use local image:

```yaml
shell:
  image:
    repository: my-learning-shell
    tag: latest
    pullPolicy: IfNotPresent  # Important: don't try to pull
```

## Security Considerations

### Capabilities

By default, drop all capabilities and add only what's needed:

```yaml
shell:
  securityContext:
    capabilities:
      drop:
        - ALL
      add:
        - SETGID    # For sudo/su
        - SETUID    # For sudo/su
        - NET_RAW   # For ping, tcpdump
    allowPrivilegeEscalation: false
```

### Read-Only Root Filesystem

For extra security (may break some tools):

```yaml
shell:
  securityContext:
    readOnlyRootFilesystem: true
```

### Non-Root User

Run as non-root (may require image changes):

```yaml
shell:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
```

## Troubleshooting

### Image not pulling

For local images in Kind:
```yaml
shell:
  image:
    pullPolicy: IfNotPresent  # Not "Always"
```

### Missing tools

If a tool is missing at runtime, either:
1. Add it to the Containerfile and rebuild
2. Install at runtime (not recommended for production)

### Permission issues

Check the security context and ensure the workspace is writable:
```dockerfile
RUN mkdir -p /workspace && chmod 777 /workspace
```
