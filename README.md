# Learning UI Chart

Interactive learning environment with step-by-step instructions and web terminal. A self-hosted alternative to KillerKoda/Katacoda for hands-on tutorials.

![Learning Environment Screenshot](screenshot.png)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Creating a Scenario](#creating-a-scenario)
  - [Minimal Example](#minimal-example)
  - [Step Structure](#step-structure)
  - [Writing Check Scripts](#writing-check-scripts)
  - [Markdown Features](#markdown-features)
- [Customizing the Shell Container](#customizing-the-shell-container)
  - [Using a Standard Image](#using-a-standard-image)
  - [Building a Custom Image](#building-a-custom-image)
  - [For Local Development (Kind)](#for-local-development-kind)
  - [Shell Container Examples](#shell-container-examples)
- [Configuration Reference](#configuration-reference)
  - [Scenario Configuration](#scenario-configuration)
  - [Shell Configuration](#shell-configuration)
  - [UI Configuration](#ui-configuration)
  - [Storage Configuration](#storage-configuration)
  - [Ingress Configuration](#ingress-configuration)
  - [Values Injected by Dploy](#values-injected-by-dploy)
- [UI Features](#ui-features)
  - [Multiple Terminal Tabs](#multiple-terminal-tabs)
  - [Code Block Actions](#code-block-actions)
  - [Resizable Panels](#resizable-panels)
- [API Endpoints](#api-endpoints)
- [Example Scenarios](#example-scenarios)
  - [Git Basics](#git-basics-default)
  - [OpenSSL & AES](#openssl--aes-cryptography)
  - [Kubernetes Basics](#kubernetes-basics-with-embedded-k3s)
- [Integration with Dploy](#integration-with-dploy)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- Split-pane interface with markdown instructions and web terminal
- Multiple terminal tabs (same container, independent shells)
- Step-by-step progression with optional validation checks
- Copy/Run buttons on code blocks for quick execution
- Syntax highlighting for code examples
- Resizable panels
- Persistent workspace storage
- Customizable shell container per scenario
- **Optional IDE**: Integrated code-server (VS Code in browser)
- **Optional K3S**: Embedded Kubernetes cluster for K8s tutorials

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Ingress                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Learning UI Pod                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Go Server (embedded web UI)                        │   │
│  │  - Serves HTML/CSS/JS                               │   │
│  │  - API: /api/scenario, /api/steps, /api/steps/check │   │
│  │  - WebSocket: /ws/terminal                          │   │
│  │  - Reverse proxy: /editor → code-server             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │ kubectl exec                 │ Read ConfigMap
         ▼                              ▼
┌───────────────────────────────────────┐  ┌──────────────────────────────┐
│      Shell Pod (StatefulSet)          │  │   Scenario ConfigMap         │
│  ┌──────────┐ ┌───────┐ ┌─────────┐   │  │  - scenario.yaml             │
│  │  shell   │ │editor │ │   k3s   │   │  │  - 01-intro-content.md       │
│  │container │ │(opt)  │ │  (opt)  │   │  │  - 01-intro-check.sh         │
│  │          │ │       │ │         │   │  │  - 02-step-content.md        │
│  │ kubectl ─┼─┼───────┼─┼─► API   │   │  │  - ...                       │
│  └──────────┘ └───────┘ └─────────┘   │  └──────────────────────────────┘
│        /workspace (PVC)               │
│        /etc/rancher/k3s (shared)      │
└───────────────────────────────────────┘
```

## Quick Start

### 1. Install with Helm

```bash
# Basic installation (Kubernetes Basics scenario)
helm install my-learning ./learning-ui

# With code editor enabled
helm install my-learning ./learning-ui --set editor.enabled=true

# With embedded K3S cluster (for Kubernetes tutorials)
helm install my-learning ./learning-ui --set k3s.enabled=true --set editor.enabled=true

# Using a custom scenario file
helm install openssl-learning ./learning-ui -f values-openssl-aes.yaml
```

### 2. Access the UI

```bash
# Port-forward if no ingress
kubectl port-forward svc/my-learning 8080:8080

# Open http://localhost:8080
```

### 3. Optional Components

| Component | Flag | Description |
|-----------|------|-------------|
| Editor | `--set editor.enabled=true` | VS Code in browser (code-server) |
| K3S | `--set k3s.enabled=true` | Embedded Kubernetes cluster |

## Creating a Scenario

A scenario is defined entirely in a `values.yaml` file. Each scenario contains:
- Metadata (name, description, difficulty)
- Steps with markdown content
- Optional validation checks
- Shell container configuration

### Minimal Example

```yaml
# values-my-scenario.yaml

scenario:
  name: "My Tutorial"
  description: "Learn something new"
  difficulty: beginner
  estimatedTime: 15m
  steps:
    - name: "01-intro"
      title: "Introduction"
      content: |
        # Welcome

        This is the first step. Run this command:

        ```bash
        echo "Hello World"
        ```

    - name: "02-task"
      title: "Your Task"
      content: |
        # Do Something

        Create a file:

        ```bash
        echo "content" > myfile.txt
        ```
      check: |
        #!/bin/bash
        if [ -f "/workspace/myfile.txt" ]; then
            echo "File created successfully!"
            exit 0
        else
            echo "Please create myfile.txt"
            exit 1
        fi

# Use default debian container
shell:
  image:
    repository: debian
    tag: bookworm
```

### Step Structure

Each step has:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (e.g., `01-introduction`) |
| `title` | Yes | Display title in the UI |
| `content` | Yes | Markdown content with instructions |
| `check` | No | Bash script to validate completion |

### Writing Check Scripts

Check scripts run inside the shell container via `kubectl exec`. They should:
- Exit `0` on success
- Exit `1` on failure
- Print a helpful message explaining the result

```yaml
check: |
  #!/bin/bash
  cd /workspace/my-project 2>/dev/null || {
      echo "Directory not found. Run: mkdir /workspace/my-project"
      exit 1
  }

  if [ -f "config.json" ]; then
      echo "Configuration file found!"
      exit 0
  else
      echo "Missing config.json - create it with the editor"
      exit 1
  fi
```

### Markdown Features

The content field supports GitHub-flavored markdown:

```yaml
content: |
  # Heading 1
  ## Heading 2

  Regular paragraph with **bold** and *italic*.

  - Bullet list
  - Another item

  1. Numbered list
  2. Second item

  > Blockquote for tips or warnings

  Inline `code` or code blocks:

  ```bash
  kubectl get pods
  ```

  ```python
  print("Hello")
  ```
```

Code blocks with language hints get syntax highlighting. Bash blocks show Copy and Run buttons on hover.

## Customizing the Shell Container

The shell container is where users execute commands. Customize it based on your scenario's needs.

### Using a Standard Image

```yaml
shell:
  image:
    repository: debian
    tag: bookworm
    pullPolicy: IfNotPresent

  command: ["sleep"]
  args: ["infinity"]
```

### Building a Custom Image

Create a `Containerfile` with the tools your scenario needs:

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
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages if needed
RUN pip3 install requests pyyaml

# Create workspace
RUN mkdir -p /workspace && chmod 777 /workspace
WORKDIR /workspace

# Custom prompt
RUN echo 'export PS1="\[\e[32m\]\u@learning\[\e[0m\]:\[\e[34m\]\w\[\e[0m\]\$ "' >> /etc/bash.bashrc

CMD ["sleep", "infinity"]
```

Build and use it:

```bash
# Build
docker build -f Containerfile.my-scenario -t myregistry/my-learning-shell:v1 .

# Push to registry
docker push myregistry/my-learning-shell:v1
```

```yaml
# values-my-scenario.yaml
shell:
  image:
    repository: myregistry/my-learning-shell
    tag: v1
    pullPolicy: IfNotPresent
```

### For Local Development (Kind)

```bash
# Build locally
docker build -f Containerfile.my-scenario -t my-learning-shell:latest .

# Load into Kind cluster
kind load docker-image my-learning-shell:latest --name my-cluster
```

```yaml
shell:
  image:
    repository: my-learning-shell
    tag: latest
    pullPolicy: IfNotPresent  # Important for local images
```

### Shell Container Examples

**Kubernetes Training:**
```dockerfile
FROM debian:bookworm
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && mv kubectl /usr/local/bin/
```

**Python Development:**
```dockerfile
FROM python:3.11-slim
RUN pip install flask pytest requests
```

**Network Tools:**
```dockerfile
FROM debian:bookworm
RUN apt-get update && apt-get install -y \
    net-tools iputils-ping dnsutils tcpdump nmap netcat-openbsd
```

**Cryptography (OpenSSL):**
```dockerfile
FROM debian:bookworm
RUN apt-get update && apt-get install -y openssl xxd
```

## Configuration Reference

### Scenario Configuration

```yaml
scenario:
  name: "Tutorial Name"           # Required: Display name
  description: "Description"      # Required: Short description
  difficulty: beginner            # Optional: beginner/intermediate/advanced
  estimatedTime: 30m              # Optional: Estimated completion time
  steps: []                       # Required: List of steps
```

### Shell Configuration

```yaml
shell:
  image:
    repository: debian            # Container image
    tag: bookworm                 # Image tag
    pullPolicy: IfNotPresent      # Always/IfNotPresent/Never

  command: ["sleep"]              # Override entrypoint
  args: ["infinity"]              # Command arguments

  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"

  securityContext:
    capabilities:
      drop: ["ALL"]
      add: ["SETGID", "SETUID"]   # Add capabilities if needed
    allowPrivilegeEscalation: false
```

### UI Configuration

```yaml
ui:
  image:
    repository: aydev/learning-ui
    tag: latest
    pullPolicy: IfNotPresent

  resources:
    requests:
      memory: "64Mi"
      cpu: "50m"
    limits:
      memory: "128Mi"
      cpu: "200m"
```

### Editor Configuration (code-server)

```yaml
editor:
  enabled: false                  # Enable VS Code in browser
  image:
    repository: codercom/code-server
    tag: latest
    pullPolicy: IfNotPresent
  password: ""                    # Leave empty for no password
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
```

When enabled, the editor is accessible via the `/editor` path and appears as a tab in the UI.

### K3S Configuration (embedded Kubernetes)

```yaml
k3s:
  enabled: false                  # Enable embedded K3S cluster
  image:
    repository: rancher/k3s
    tag: latest
    pullPolicy: IfNotPresent
  resources:
    requests:
      memory: "512Mi"
      cpu: "200m"
    limits:
      memory: "2Gi"
      cpu: "2000m"
```

When enabled:
- K3S runs as a sidecar in the shell pod
- The kubeconfig is generated at `/etc/rancher/k3s/k3s.yaml`
- The shell container copies it to `~/.kube/config` with proper permissions (600)
- `kubectl` commands in the shell connect to the embedded K3S cluster

### Terminal Configuration

```yaml
terminal:
  enabled: true                   # Set to false to hide terminal tab
```

When `terminal.enabled: false`, the terminal tab is hidden from the UI. Useful when you want users to only interact via the editor or custom tabs.

### Custom Tabs Configuration

Add custom tabs to the UI for additional services (Jupyter, Grafana, documentation, etc.):

```yaml
customTabs:
  - id: "jupyter"
    name: "Jupyter"
    icon: "book"                  # Icon: terminal, code, book, chart, globe, database, settings
    url: "/jupyter/"              # Relative or absolute URL
  - id: "docs"
    name: "Documentation"
    icon: "globe"
    url: "https://docs.example.com"
```

Custom tabs appear after the editor tab (if enabled) and before the terminal tab.

**Available icons:** `terminal`, `code`, `book`, `chart`, `globe`, `database`, `settings`

### Storage Configuration

```yaml
persistence:
  enabled: true                   # Enable persistent workspace
  storageClass: ""                # Use default storage class
  accessModes:
    - ReadWriteOnce
  size: "1Gi"                     # Workspace size
  mountPath: "/workspace"         # Mount path in container
```

### Ingress Configuration

```yaml
ingress:
  enabled: true
  className: "nginx"              # Ingress class
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
  tls:
    - secretName: learning-tls
      hosts:
        - learning.example.com
```

### Values Injected by Dploy

When deployed via dploy API, these values are automatically injected:

```yaml
username: "john-doe"              # User's username
uuid: "a1b2c3d4"                  # Unique environment ID
ingressHost: "john-doe-a1b2c3d4.env.dploy.dev"
```

## UI Features

### Multiple Terminal Tabs

- Click `+` to open a new terminal tab
- `Ctrl+Shift+T`: New tab
- `Ctrl+Shift+W`: Close current tab
- `Ctrl+Tab`: Next tab
- Double-click tab to rename

### Code Block Actions

Hover over code blocks to see:
- **Copy**: Copy code to clipboard
- **Run**: Execute directly in the active terminal

### Resizable Panels

Drag the divider between instructions and terminal to resize.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scenario` | GET | Get scenario metadata |
| `/api/steps` | GET | List all steps |
| `/api/steps/:n` | GET | Get step content |
| `/api/steps/:n/check` | POST | Run verification |
| `/api/tabs` | GET | Get available tabs (editor, etc.) |
| `/api/health` | GET | Health check |
| `/ws/terminal` | WebSocket | Terminal connection |
| `/editor/*` | ALL | Reverse proxy to code-server (if enabled) |

## Example Scenarios

### Kubernetes Basics (default)

```bash
# Basic (uses host cluster's kubectl context)
helm install k8s-learning ./learning-ui

# With embedded K3S cluster
helm install k8s-learning ./learning-ui --set k3s.enabled=true

# With K3S + code editor
helm install k8s-learning ./learning-ui --set k3s.enabled=true --set editor.enabled=true
```

### Git Basics

```bash
# Create a values-git.yaml with Git scenario steps
helm install git-learning ./learning-ui -f values-git.yaml
```

### OpenSSL & AES Cryptography

```bash
helm install openssl-learning ./learning-ui -f values-openssl-aes.yaml
```

### Kubernetes Basics (with embedded K3S)

This scenario uses the default Kubernetes Basics course with an embedded K3S cluster:

```bash
# Deploy with K3S and editor
helm install k8s-learning ./learning-ui \
  --set k3s.enabled=true \
  --set editor.enabled=true
```

**Architecture:**
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

All containers run in the same pod and share:
- `/workspace` - persistent workspace storage
- `/etc/rancher/k3s/` - kubeconfig directory (emptyDir volume)

The shell container copies the kubeconfig to `~/.kube/config` with secure permissions.

> **Note:** The K3S sidecar requires `privileged: true` security context.

## Using as a Dependency

You can use this chart as a dependency in your own chart to deploy additional services (Jupyter, Grafana, databases, etc.) alongside the learning environment.

### Chart.yaml

```yaml
# my-learning-chart/Chart.yaml
apiVersion: v2
name: my-data-science-learning
version: 1.0.0
dependencies:
  - name: learning-ui
    version: "1.0.0"
    repository: "oci://ghcr.io/myorg/charts"
    # Or local path for development:
    # repository: "file://../learning-ui"
```

### values.yaml

```yaml
# my-learning-chart/values.yaml

# Training chart configuration (prefixed with dependency name)
learning-ui:
  scenario:
    name: "Data Science Workshop"
    description: "Learn data science with Jupyter"
    difficulty: intermediate
    estimatedTime: 60m
    steps:
      - name: "01-intro"
        title: "Introduction"
        content: |
          # Welcome to Data Science
          Open the **Jupyter** tab to start coding!

  # Hide terminal, use only Jupyter
  terminal:
    enabled: false

  # Add Jupyter as a custom tab
  customTabs:
    - id: "jupyter"
      name: "Jupyter"
      icon: "book"
      url: "/jupyter/"

  # Ingress will route /jupyter/ to your Jupyter service
  ingress:
    enabled: true
    annotations:
      nginx.ingress.kubernetes.io/rewrite-target: /$2

# Your additional services
jupyter:
  enabled: true
  image: jupyter/scipy-notebook:latest
  # ... your Jupyter configuration
```

### Adding Ingress Rules for Custom Services

In your parent chart, create an additional ingress for custom services:

```yaml
# my-learning-chart/templates/ingress-jupyter.yaml
{{- if .Values.jupyter.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}-jupyter
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
    - host: {{ .Values.learning-ui.ingressHost | quote }}
      http:
        paths:
          - path: /jupyter(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: {{ .Release.Name }}-jupyter
                port:
                  number: 8888
{{- end }}
```

### Example: Data Science Training with Jupyter

```
my-data-science-learning/
├── Chart.yaml                    # Dependencies declaration
├── values.yaml                   # Configuration
└── templates/
    ├── deployment-jupyter.yaml   # Jupyter deployment
    ├── service-jupyter.yaml      # Jupyter service
    └── ingress-jupyter.yaml      # Ingress for /jupyter/
```

This pattern lets you:
- Reuse the learning UI and step system
- Add any additional services your scenario needs
- Route them via custom tabs in the UI
- Keep everything in a single Helm release

## Integration with Dploy

Add to your `environments.yaml`:

```yaml
- name: git-learning
  description: "Learn Git basics"
  oci: "oci://ghcr.io/myorg/charts/learning-ui"
  version: "1.0.0"
  enabled: true
  icon: "graduation-cap"
  ttlHours: 2
  maxPerUser: 1
```

## Development

### Building Images

```bash
# Build UI image
docker build -f Containerfile.ui -t aydev/learning-ui:latest .

# Build scenario shell image
docker build -f Containerfile.scenario -t aydev/learning-shell:latest .
```

### Local Testing with Kind

```bash
# Load images
kind load docker-image aydev/learning-ui:latest --name my-cluster
kind load docker-image aydev/learning-shell:latest --name my-cluster

# Install chart
helm install test ./learning-ui -f values-openssl-aes.yaml

# Port-forward
kubectl port-forward svc/test-learning-ui 8080:8080
```

## Troubleshooting

### Terminal not connecting

Check that the shell pod is running:
```bash
kubectl get pods -l app.kubernetes.io/component=shell
```

### Check script not working

Ensure the script is executable and uses proper shebang:
```yaml
check: |
  #!/bin/bash
  # Your script here
```

### Images not pulling (ImagePullBackOff)

For local images in Kind:
```yaml
shell:
  image:
    pullPolicy: IfNotPresent  # Not "Always"
```

## License

MIT
