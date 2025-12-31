---
sidebar_position: 2
---

# Writing Scenarios

A scenario is defined entirely in a `values.yaml` file. Each scenario contains:
- Metadata (name, description, difficulty)
- Steps with markdown content
- Optional validation checks
- Shell container configuration

## Minimal Example

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

## Step Structure

Each step has the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (e.g., `01-introduction`) |
| `title` | Yes | Display title in the UI |
| `content` | Yes | Markdown content with instructions |
| `check` | No | Bash script to validate completion |

## Writing Check Scripts

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

### Check Script Tips

1. **Always provide helpful error messages** - Tell users exactly what to do
2. **Use proper exit codes** - `0` for success, `1` for failure
3. **Check prerequisites first** - Verify directories exist before checking files
4. **Be specific** - Check for exact expected values when possible

## Markdown Features

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

### Code Block Actions

Code blocks with language hints get syntax highlighting. Bash blocks show **Copy** and **Run** buttons on hover:

- **Copy**: Copies the code to clipboard
- **Run**: Executes the code directly in the active terminal

## Scenario Configuration Reference

```yaml
scenario:
  name: "Tutorial Name"           # Required: Display name
  description: "Description"      # Required: Short description
  difficulty: beginner            # Optional: beginner/intermediate/advanced
  estimatedTime: 30m              # Optional: Estimated completion time
  steps: []                       # Required: List of steps
```

## Example Scenarios

The chart includes example scenario files:

- `values.yaml` - Kubernetes Basics (default)
- `values-kubernetes.yaml` - Kubernetes with embedded K3S
- `values-openssl-aes.yaml` - OpenSSL & AES Cryptography

Use them as templates for your own scenarios:

```bash
# Deploy with a specific scenario
helm install my-learning ./chart -f chart/values-openssl-aes.yaml
```
