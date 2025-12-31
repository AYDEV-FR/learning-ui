---
sidebar_position: 4
---

# Custom Tabs

Learning UI supports adding custom tabs for additional services like Jupyter notebooks, Grafana dashboards, documentation sites, and more.

## Configuration

Add custom tabs in your values:

```yaml
customTabs:
  - id: "jupyter"
    name: "Jupyter"
    icon: "book"
    url: "/jupyter/"
  - id: "grafana"
    name: "Grafana"
    icon: "chart"
    url: "/grafana/"
  - id: "docs"
    name: "Documentation"
    icon: "globe"
    url: "https://docs.example.com"
```

## Tab Properties

| Property | Required | Description |
|----------|----------|-------------|
| `id` | Yes | Unique identifier for the tab |
| `name` | Yes | Display name shown in the UI |
| `icon` | Yes | Icon to display (see available icons) |
| `url` | Yes | URL to load in the iframe (relative or absolute) |

## Available Icons

- `terminal` - Terminal icon
- `code` - Code/editor icon
- `book` - Book/notebook icon
- `chart` - Chart/graph icon
- `globe` - Globe/web icon
- `database` - Database icon
- `settings` - Settings/gear icon

## Tab Order

Tabs appear in this order:
1. Editor (if enabled)
2. Custom tabs (in order defined)
3. Terminal (if enabled)

## Examples

### Jupyter Notebook

Add a Jupyter notebook service alongside Learning UI:

```yaml
customTabs:
  - id: "jupyter"
    name: "Jupyter"
    icon: "book"
    url: "/jupyter/"

# You'll need to deploy Jupyter separately and configure ingress
```

### Documentation Site

Link to external documentation:

```yaml
customTabs:
  - id: "docs"
    name: "Docs"
    icon: "globe"
    url: "https://kubernetes.io/docs/"
```

### Monitoring Dashboard

Add Grafana for monitoring tutorials:

```yaml
customTabs:
  - id: "grafana"
    name: "Grafana"
    icon: "chart"
    url: "/grafana/"
```

## Deploying Custom Services

To add services that appear as tabs, you need to:

1. **Deploy the service** in the same namespace
2. **Configure ingress** to route to the service
3. **Add the tab** in your values

### Example: Adding Jupyter

#### 1. Deploy Jupyter

Create a deployment for Jupyter:

```yaml
# jupyter-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jupyter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jupyter
  template:
    metadata:
      labels:
        app: jupyter
    spec:
      containers:
        - name: jupyter
          image: jupyter/scipy-notebook:latest
          ports:
            - containerPort: 8888
          env:
            - name: JUPYTER_TOKEN
              value: ""  # No token for simplicity
---
apiVersion: v1
kind: Service
metadata:
  name: jupyter
spec:
  ports:
    - port: 8888
  selector:
    app: jupyter
```

#### 2. Configure Ingress

Add ingress rules for Jupyter:

```yaml
# jupyter-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jupyter
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
    - host: <your-learning-ui-host>
      http:
        paths:
          - path: /jupyter(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: jupyter
                port:
                  number: 8888
```

#### 3. Add the Tab

```yaml
customTabs:
  - id: "jupyter"
    name: "Jupyter"
    icon: "book"
    url: "/jupyter/"
```

## Hiding the Terminal

For scenarios where you only want custom services (e.g., only Jupyter):

```yaml
terminal:
  enabled: false

customTabs:
  - id: "jupyter"
    name: "Jupyter"
    icon: "book"
    url: "/jupyter/"
```

## Using as a Dependency

When using Learning UI as a Helm dependency, you can add custom tabs and services in your parent chart. See [Complex Scenarios](../advanced/complex-scenarios) for details.
