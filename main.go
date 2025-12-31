package main

import (
	"embed"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/creack/pty"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/websocket/v2"
	"gopkg.in/yaml.v3"
)

//go:embed web/*
var webFS embed.FS

// Scenario represents the scenario metadata
type Scenario struct {
	Name          string `yaml:"name" json:"name"`
	Description   string `yaml:"description" json:"description"`
	Difficulty    string `yaml:"difficulty" json:"difficulty"`
	EstimatedTime string `yaml:"estimatedTime" json:"estimatedTime"`
	TotalSteps    int    `json:"totalSteps"`
}

// Step represents a single step in the scenario
type Step struct {
	Number   int    `json:"number"`
	Title    string `json:"title"`
	Content  string `json:"content"`
	HasCheck bool   `json:"hasCheck"`
}

// CheckResult represents the result of a check execution
type CheckResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// StepInfo holds info about a step file
type StepInfo struct {
	Name    string
	Title   string
	Order   int
	Content string
	Check   string
}

// TabConfig represents an optional IDE/desktop tab
type TabConfig struct {
	ID      string `yaml:"id" json:"id"`
	Name    string `yaml:"name" json:"name"`
	Icon    string `yaml:"icon" json:"icon"`
	URL     string `yaml:"url" json:"url"`
	Enabled bool   `yaml:"-" json:"enabled"`
}

// TabsFileConfig represents the tabs.yaml configuration
type TabsFileConfig struct {
	Terminal struct {
		Enabled bool `yaml:"enabled"`
	} `yaml:"terminal"`
	CustomTabs []TabConfig `yaml:"customTabs"`
}

// TabsResponse is the API response for /api/tabs
type TabsResponse struct {
	Tabs            []TabConfig `json:"tabs"`
	TerminalEnabled bool        `json:"terminalEnabled"`
}

var (
	scenarioPath  string
	shellPodName  string
	shellService  string
	namespace     string
	stepsCache    []StepInfo
	editorEnabled bool
	tabsConfig    TabsFileConfig
)

func main() {
	// Configuration from environment
	port := getEnv("PORT", "8080")
	scenarioPath = getEnv("SCENARIO_PATH", "/scenarios")
	shellPodName = getEnv("SHELL_POD_NAME", "learning-ui-shell-0")
	shellService = getEnv("SHELL_SERVICE", "learning-ui-shell")
	namespace = getEnv("NAMESPACE", "default")

	// Optional tabs configuration
	editorEnabled = getEnv("EDITOR_ENABLED", "false") == "true"

	// Load steps at startup
	if err := loadSteps(); err != nil {
		log.Printf("Warning: failed to load steps: %v", err)
	}

	// Load tabs configuration
	if err := loadTabsConfig(); err != nil {
		log.Printf("Warning: failed to load tabs config: %v", err)
		// Default to terminal enabled
		tabsConfig.Terminal.Enabled = true
	}

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// WebSocket for terminal
	app.Use("/ws/terminal", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws/terminal", websocket.New(handleTerminal))

	// API routes
	api := app.Group("/api")
	api.Get("/scenario", getScenario)
	api.Get("/steps", getSteps)
	api.Get("/steps/:number", getStep)
	api.Post("/steps/:number/check", checkStep)
	api.Get("/tabs", getTabs)
	api.Get("/health", health)

	// Editor is handled by ingress directly for WebSocket support
	if editorEnabled {
		log.Printf("Editor enabled (routed via ingress to shell pod)")
	}

	// Serve static files from embedded filesystem
	app.Use("/", filesystem.New(filesystem.Config{
		Root:         http.FS(webFS),
		PathPrefix:   "web",
		Browse:       false,
		Index:        "index.html",
		NotFoundFile: "web/index.html",
	}))

	log.Printf("Starting Learning UI on port %s", port)
	log.Printf("Scenario path: %s", scenarioPath)
	log.Printf("Shell pod: %s in namespace %s", shellPodName, namespace)
	log.Printf("Loaded %d steps", len(stepsCache))

	if err := app.Listen(":" + port); err != nil {
		log.Fatal(err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// handleTerminal handles WebSocket connections for the terminal
func handleTerminal(c *websocket.Conn) {
	log.Printf("Terminal WebSocket connected")

	// Start kubectl exec process with PTY
	cmd := exec.Command("kubectl", "exec", "-n", namespace, shellPodName, "-it", "-c", "shell", "--", "/bin/bash")

	// Start command with a PTY
	ptmx, err := pty.Start(cmd)
	if err != nil {
		log.Printf("Failed to start PTY: %v", err)
		c.WriteMessage(websocket.TextMessage, []byte("Failed to start terminal: "+err.Error()))
		return
	}

	// Handle cleanup
	defer func() {
		ptmx.Close()
		cmd.Process.Kill()
		cmd.Wait()
		log.Printf("Terminal WebSocket disconnected")
	}()

	// Set initial terminal size
	pty.Setsize(ptmx, &pty.Winsize{Rows: 24, Cols: 80})

	// Read from PTY and send to WebSocket
	go func() {
		buf := make([]byte, 4096)
		for {
			n, err := ptmx.Read(buf)
			if err != nil {
				if err != io.EOF {
					log.Printf("PTY read error: %v", err)
				}
				c.Close()
				return
			}
			if n > 0 {
				if err := c.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
					log.Printf("WebSocket write error: %v", err)
					return
				}
			}
		}
	}()

	// Read from WebSocket and send to PTY
	for {
		_, msg, err := c.ReadMessage()
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			return
		}
		if _, err := ptmx.Write(msg); err != nil {
			log.Printf("PTY write error: %v", err)
			return
		}
	}
}

// loadSteps reads all step files from the scenario directory
func loadSteps() error {
	stepsCache = nil

	entries, err := os.ReadDir(scenarioPath)
	if err != nil {
		return err
	}

	// Regex to parse step files
	contentRe := regexp.MustCompile(`^(\d+)-(.+)-content\.md$`)
	checkRe := regexp.MustCompile(`^(\d+)-(.+)-check\.sh$`)

	stepMap := make(map[string]*StepInfo)

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()

		if matches := contentRe.FindStringSubmatch(name); matches != nil {
			order, _ := strconv.Atoi(matches[1])
			stepName := matches[1] + "-" + matches[2]

			content, err := os.ReadFile(filepath.Join(scenarioPath, name))
			if err != nil {
				continue
			}

			if step, ok := stepMap[stepName]; ok {
				step.Content = string(content)
			} else {
				stepMap[stepName] = &StepInfo{
					Name:    stepName,
					Title:   formatTitle(matches[2]),
					Order:   order,
					Content: string(content),
				}
			}
		} else if matches := checkRe.FindStringSubmatch(name); matches != nil {
			order, _ := strconv.Atoi(matches[1])
			stepName := matches[1] + "-" + matches[2]

			check, err := os.ReadFile(filepath.Join(scenarioPath, name))
			if err != nil {
				continue
			}

			if step, ok := stepMap[stepName]; ok {
				step.Check = string(check)
			} else {
				stepMap[stepName] = &StepInfo{
					Name:  stepName,
					Title: formatTitle(matches[2]),
					Order: order,
					Check: string(check),
				}
			}
		}
	}

	for _, step := range stepMap {
		if step.Content != "" {
			stepsCache = append(stepsCache, *step)
		}
	}

	sort.Slice(stepsCache, func(i, j int) bool {
		return stepsCache[i].Order < stepsCache[j].Order
	})

	return nil
}

// loadTabsConfig reads the tabs configuration from tabs.yaml
func loadTabsConfig() error {
	tabsFile := filepath.Join(scenarioPath, "tabs.yaml")
	data, err := os.ReadFile(tabsFile)
	if err != nil {
		return err
	}

	if err := yaml.Unmarshal(data, &tabsConfig); err != nil {
		return err
	}

	log.Printf("Loaded tabs config: terminal.enabled=%v, customTabs=%d",
		tabsConfig.Terminal.Enabled, len(tabsConfig.CustomTabs))

	return nil
}

func formatTitle(name string) string {
	words := strings.Split(name, "-")
	for i, word := range words {
		if len(word) > 0 {
			words[i] = strings.ToUpper(word[:1]) + word[1:]
		}
	}
	return strings.Join(words, " ")
}

func getScenario(c *fiber.Ctx) error {
	scenarioFile := filepath.Join(scenarioPath, "scenario.yaml")
	data, err := os.ReadFile(scenarioFile)
	if err != nil {
		return fiber.NewError(fiber.StatusNotFound, "scenario.yaml not found")
	}

	var scenario Scenario
	if err := yaml.Unmarshal(data, &scenario); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to parse scenario.yaml")
	}

	scenario.TotalSteps = len(stepsCache)
	return c.JSON(scenario)
}

func getSteps(c *fiber.Ctx) error {
	var steps []Step
	for i, info := range stepsCache {
		steps = append(steps, Step{
			Number:   i + 1,
			Title:    info.Title,
			HasCheck: info.Check != "",
		})
	}
	return c.JSON(steps)
}

func getStep(c *fiber.Ctx) error {
	number, err := strconv.Atoi(c.Params("number"))
	if err != nil || number < 1 {
		return fiber.NewError(fiber.StatusBadRequest, "invalid step number")
	}

	if number > len(stepsCache) {
		return fiber.NewError(fiber.StatusNotFound, "step not found")
	}

	info := stepsCache[number-1]
	step := Step{
		Number:   number,
		Title:    info.Title,
		Content:  info.Content,
		HasCheck: info.Check != "",
	}

	return c.JSON(step)
}

func checkStep(c *fiber.Ctx) error {
	number, err := strconv.Atoi(c.Params("number"))
	if err != nil || number < 1 {
		return fiber.NewError(fiber.StatusBadRequest, "invalid step number")
	}

	if number > len(stepsCache) {
		return fiber.NewError(fiber.StatusNotFound, "step not found")
	}

	info := stepsCache[number-1]
	if info.Check == "" {
		return fiber.NewError(fiber.StatusNotFound, "no check script for this step")
	}

	result := executeCheck(info.Check)
	return c.JSON(result)
}

func executeCheck(script string) CheckResult {
	cmd := exec.Command("kubectl", "exec", "-n", namespace, shellPodName, "-c", "shell", "--", "bash", "-c", script)
	output, err := cmd.CombinedOutput()

	msg := strings.TrimSpace(string(output))
	if err != nil {
		return CheckResult{Success: false, Message: msg}
	}
	return CheckResult{Success: true, Message: msg}
}

func health(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
		"steps":  len(stepsCache),
	})
}

func getTabs(c *fiber.Ctx) error {
	tabs := []TabConfig{}

	// Get the host from the request to build proper URLs
	host := c.Get("Host")
	scheme := "http"
	if c.Get("X-Forwarded-Proto") == "https" || c.Protocol() == "https" {
		scheme = "https"
	}

	// Add editor tab if enabled
	if editorEnabled {
		editorPath := "/editor/"
		if host != "" {
			editorPath = scheme + "://" + host + "/editor/"
		}
		tabs = append(tabs, TabConfig{
			ID:      "editor",
			Name:    "Editor",
			Icon:    "code",
			URL:     editorPath,
			Enabled: true,
		})
	}

	// Add custom tabs from configuration
	for _, customTab := range tabsConfig.CustomTabs {
		tabURL := customTab.URL
		// Build full URL if it's a relative path
		if host != "" && strings.HasPrefix(customTab.URL, "/") {
			tabURL = scheme + "://" + host + customTab.URL
		}
		tabs = append(tabs, TabConfig{
			ID:      customTab.ID,
			Name:    customTab.Name,
			Icon:    customTab.Icon,
			URL:     tabURL,
			Enabled: true,
		})
	}

	return c.JSON(TabsResponse{
		Tabs:            tabs,
		TerminalEnabled: tabsConfig.Terminal.Enabled,
	})
}
