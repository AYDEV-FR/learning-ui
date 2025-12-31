---
sidebar_position: 1
---

# Terminal

The terminal is the core feature of Learning UI, providing an interactive shell environment for hands-on learning.

## Features

### Multiple Terminal Tabs

Users can open multiple terminal tabs, all connected to the same shell container but running independent bash sessions.

**Keyboard Shortcuts:**
- `Ctrl+Shift+T`: New tab
- `Ctrl+Shift+W`: Close current tab
- `Ctrl+Tab`: Next tab
- Double-click tab to rename

### Code Block Integration

Code blocks in the instructions panel have interactive buttons:

- **Copy**: Copy code to clipboard
- **Run**: Execute directly in the active terminal

This allows users to quickly run commands without manual copy-paste.

### Resizable Panels

The interface features a draggable divider between the instructions panel and terminal panel. Users can resize according to their preference.

## Configuration

### Enable/Disable Terminal Tab

You can hide the terminal tab if your scenario uses only the editor or custom services:

```yaml
terminal:
  enabled: true  # Set to false to hide terminal tab
```

### Shell Container

The terminal connects to the shell container in the StatefulSet. Configure it in your values:

```yaml
shell:
  image:
    repository: debian
    tag: bookworm
    pullPolicy: IfNotPresent

  command: ["sleep"]
  args: ["infinity"]

  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

## How It Works

1. The UI pod runs a Go server that handles WebSocket connections
2. When a terminal tab is opened, a WebSocket connection is established to `/ws/terminal`
3. The server uses `kubectl exec` to spawn a bash session in the shell pod
4. Input/output is streamed between the browser and the shell container via the WebSocket

### Technical Details

```
Browser (xterm.js)
    ↕ WebSocket
UI Pod (Go Server)
    ↕ kubectl exec -it
Shell Pod (bash)
```

The terminal uses [xterm.js](https://xtermjs.org/) for terminal emulation in the browser, providing a full-featured terminal experience including:

- ANSI color support
- Cursor positioning
- Line editing (readline)
- Terminal resizing

## Troubleshooting

### Terminal not connecting

1. Check that the shell pod is running:
   ```bash
   kubectl get pods -l app.kubernetes.io/component=shell
   ```

2. Verify the UI pod has RBAC permissions:
   ```bash
   kubectl get role,rolebinding -l app.kubernetes.io/instance=<release-name>
   ```

3. Check UI pod logs:
   ```bash
   kubectl logs -l app.kubernetes.io/component=ui
   ```

### Terminal disconnects frequently

This may be due to network timeouts. Check your ingress configuration for WebSocket timeout settings:

```yaml
ingress:
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
```
