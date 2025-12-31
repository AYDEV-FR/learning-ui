---
sidebar_position: 3
---

# VS Code Editor

Learning UI can include an integrated VS Code editor (code-server) for scenarios that require file editing.

## Enabling the Editor

Enable the editor in your values:

```yaml
editor:
  enabled: true
  image:
    repository: codercom/code-server
    tag: latest
    pullPolicy: IfNotPresent
  password: ""  # Leave empty for no password
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
```

## Features

When enabled, the editor provides:

- **Full VS Code experience** in the browser
- **Shared workspace** with the terminal (`/workspace`)
- **Syntax highlighting** for all major languages
- **Extensions support** (pre-install or install on-demand)
- **Integrated terminal** (separate from the main terminal)

## Access

The editor is accessible via:

- **Tab in UI**: Click the "Editor" tab
- **Direct URL**: `https://<your-host>/editor/`

## Configuration

### Password Protection

Set a password for the editor:

```yaml
editor:
  enabled: true
  password: "mysecretpassword"
```

Leave empty for no authentication (default).

### Resources

Adjust resources based on your needs:

```yaml
editor:
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "2Gi"      # Increase for large projects
      cpu: "2000m"
```

### Pre-installed Extensions

To pre-install extensions, create a custom code-server image:

```dockerfile
FROM codercom/code-server:latest

# Install extensions
RUN code-server --install-extension ms-python.python
RUN code-server --install-extension golang.go
RUN code-server --install-extension redhat.vscode-yaml
```

## Architecture

The editor runs as a sidecar container in the shell pod:

```
┌─────────────────────────────────────┐
│           Shell Pod                 │
│  ┌─────────┐     ┌──────────────┐  │
│  │  shell  │     │    editor    │  │
│  │         │     │ (code-server)│  │
│  │         │     │   :8443      │  │
│  └────┬────┘     └──────┬───────┘  │
│       │                 │          │
│       └────────┬────────┘          │
│           /workspace               │
│         (shared PVC)               │
└─────────────────────────────────────┘
```

Both containers share the `/workspace` volume, so files created in the terminal are immediately visible in the editor and vice versa.

## Ingress Configuration

The editor requires proper WebSocket support. The chart automatically creates a separate ingress for the editor with appropriate annotations:

```yaml
# Automatically created by the chart
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: <release>-learning-ui-editor
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
spec:
  rules:
    - host: <your-host>
      http:
        paths:
          - path: /editor(/|$)(.*)
            backend:
              service:
                name: <release>-learning-ui-shell
                port:
                  number: 8443
```

## Use Cases

### Code Development Tutorials

Perfect for programming tutorials where users need to write and edit code:

```yaml
scenario:
  name: "Python Basics"
  steps:
    - name: "01-hello"
      title: "Hello World"
      content: |
        # Your First Python Program

        Open the **Editor** tab and create a file `hello.py`:

        ```python
        print("Hello, World!")
        ```

        Then run it in the terminal:

        ```bash
        python3 hello.py
        ```

editor:
  enabled: true

terminal:
  enabled: true
```

### Kubernetes YAML Editing

For Kubernetes tutorials, the editor provides YAML syntax highlighting:

```yaml
scenario:
  name: "Kubernetes Manifests"
  steps:
    - name: "01-pod"
      title: "Create a Pod Manifest"
      content: |
        # Writing Pod YAML

        Open the Editor and create `pod.yaml`:

        ```yaml
        apiVersion: v1
        kind: Pod
        metadata:
          name: nginx
        spec:
          containers:
          - name: nginx
            image: nginx:alpine
        ```

        Apply it:

        ```bash
        kubectl apply -f pod.yaml
        ```

editor:
  enabled: true
k3s:
  enabled: true
```

## Troubleshooting

### Editor not loading

1. Check the editor container logs:
   ```bash
   kubectl logs <pod-name> -c editor
   ```

2. Verify the service is running:
   ```bash
   kubectl get svc -l app.kubernetes.io/component=shell
   ```

### WebSocket connection issues

Ensure your ingress controller supports WebSockets and has appropriate timeouts:

```yaml
ingress:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
```
