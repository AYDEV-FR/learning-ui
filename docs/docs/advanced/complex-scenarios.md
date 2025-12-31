---
sidebar_position: 1
---

# Complex Scenarios with Dependencies

For complex scenarios that require additional services (databases, message queues, monitoring tools, etc.), you can use Learning UI as a Helm dependency in your own chart.

## Why Use Dependencies?

Using Learning UI as a dependency allows you to:

- **Add custom services** alongside the learning environment
- **Configure ingress** for additional services
- **Manage everything** in a single Helm release
- **Customize** the shell container and scenario

## Creating a Parent Chart

### 1. Chart Structure

```
my-data-science-training/
├── Chart.yaml                    # Dependencies declaration
├── values.yaml                   # Configuration
└── templates/
    ├── deployment-jupyter.yaml   # Jupyter deployment
    ├── service-jupyter.yaml      # Jupyter service
    └── ingress-jupyter.yaml      # Ingress for /jupyter/
```

### 2. Chart.yaml

Declare Learning UI as a dependency:

```yaml
# my-data-science-training/Chart.yaml
apiVersion: v2
name: my-data-science-training
description: Data science training with Jupyter
version: 1.0.0
appVersion: "1.0.0"

dependencies:
  - name: learning-ui
    version: "1.0.0"
    repository: "oci://ghcr.io/aydev-fr/charts"
    # Or for local development:
    # repository: "file://../learning-ui/chart"
```

### 3. values.yaml

Configure both Learning UI and your custom services:

```yaml
# my-data-science-training/values.yaml

# Learning UI configuration (prefixed with dependency name)
learning-ui:
  scenario:
    name: "Data Science Workshop"
    description: "Learn data science with Jupyter and Python"
    difficulty: intermediate
    estimatedTime: 60m
    steps:
      - name: "01-intro"
        title: "Introduction"
        content: |
          # Welcome to Data Science

          In this workshop, you'll learn:
          - Python data analysis with Pandas
          - Data visualization with Matplotlib
          - Machine learning with Scikit-learn

          Open the **Jupyter** tab to start coding!

      - name: "02-pandas"
        title: "Pandas Basics"
        content: |
          # Working with Pandas

          Create a new notebook in Jupyter and run:

          ```python
          import pandas as pd
          import numpy as np

          # Create a DataFrame
          df = pd.DataFrame({
              'name': ['Alice', 'Bob', 'Charlie'],
              'age': [25, 30, 35],
              'score': [85, 92, 78]
          })

          print(df)
          ```
        check: |
          #!/bin/bash
          # Check if any notebook was created
          if ls /workspace/*.ipynb 2>/dev/null; then
              echo "Notebook found!"
              exit 0
          fi
          echo "Create a notebook in Jupyter first"
          exit 1

  # Hide terminal, focus on Jupyter
  terminal:
    enabled: false

  # Add Jupyter as a custom tab
  customTabs:
    - id: "jupyter"
      name: "Jupyter"
      icon: "book"
      url: "/jupyter/"

  # Shell with Python data science tools
  shell:
    image:
      repository: python
      tag: "3.11-slim"

  # Ingress configuration
  ingress:
    enabled: true

# Your Jupyter configuration
jupyter:
  enabled: true
  image:
    repository: jupyter/scipy-notebook
    tag: latest
  resources:
    limits:
      memory: "2Gi"
      cpu: "2000m"
```

### 4. Jupyter Deployment Template

```yaml
# templates/deployment-jupyter.yaml
{{- if .Values.jupyter.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-jupyter
  labels:
    app.kubernetes.io/name: jupyter
    app.kubernetes.io/instance: {{ .Release.Name }}
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: jupyter
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: jupyter
        app.kubernetes.io/instance: {{ .Release.Name }}
    spec:
      containers:
        - name: jupyter
          image: "{{ .Values.jupyter.image.repository }}:{{ .Values.jupyter.image.tag }}"
          ports:
            - name: http
              containerPort: 8888
          env:
            - name: JUPYTER_TOKEN
              value: ""
            - name: JUPYTER_ENABLE_LAB
              value: "yes"
          {{- with .Values.jupyter.resources }}
          resources:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          volumeMounts:
            - name: workspace
              mountPath: /home/jovyan/work
      volumes:
        - name: workspace
          persistentVolumeClaim:
            claimName: {{ .Release.Name }}-learning-ui-shell-workspace-0
{{- end }}
```

### 5. Jupyter Service Template

```yaml
# templates/service-jupyter.yaml
{{- if .Values.jupyter.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-jupyter
  labels:
    app.kubernetes.io/name: jupyter
    app.kubernetes.io/instance: {{ .Release.Name }}
spec:
  type: ClusterIP
  ports:
    - port: 8888
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app.kubernetes.io/name: jupyter
    app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### 6. Jupyter Ingress Template

```yaml
# templates/ingress-jupyter.yaml
{{- if .Values.jupyter.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}-jupyter
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/proxy-http-version: "1.1"
spec:
  {{- if .Values.learning-ui.ingress.className }}
  ingressClassName: {{ index .Values "learning-ui" "ingress" "className" }}
  {{- end }}
  rules:
    - host: {{ index .Values "learning-ui" "ingressHost" }}
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

## Installing the Chart

```bash
# Update dependencies
helm dependency update ./my-data-science-training

# Install
helm install ds-workshop ./my-data-science-training \
  --set learning-ui.ingressHost=workshop.localhost
```

## More Examples

### Kubernetes Training with Monitoring

```yaml
# values.yaml
learning-ui:
  scenario:
    name: "Kubernetes Monitoring"
    steps:
      - name: "01-intro"
        content: |
          # Monitoring Kubernetes

          Open **Grafana** to see cluster metrics.

  k3s:
    enabled: true

  customTabs:
    - id: "grafana"
      name: "Grafana"
      icon: "chart"
      url: "/grafana/"
    - id: "prometheus"
      name: "Prometheus"
      icon: "database"
      url: "/prometheus/"

# Deploy kube-prometheus-stack
prometheus:
  enabled: true
```

### Database Training

```yaml
# values.yaml
learning-ui:
  scenario:
    name: "PostgreSQL Basics"
    steps:
      - name: "01-connect"
        content: |
          # Connect to PostgreSQL

          ```bash
          psql -h localhost -U postgres
          ```

  customTabs:
    - id: "pgadmin"
      name: "pgAdmin"
      icon: "database"
      url: "/pgadmin/"

  shell:
    image:
      repository: postgres
      tag: "16-alpine"

# Deploy PostgreSQL and pgAdmin
postgresql:
  enabled: true
pgadmin:
  enabled: true
```

## Best Practices

1. **Share the workspace volume** between services when possible
2. **Use consistent ingress paths** (e.g., `/jupyter/`, `/grafana/`)
3. **Configure appropriate resources** for each service
4. **Test locally** with port-forward before deploying with ingress
5. **Document the scenario** clearly for users
