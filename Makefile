SHELL := /usr/bin/env bash

OPENCODE_CONFIG ?= $(HOME)/.config/opencode/opencode.json

.PHONY: setup setup-opencode doctor-opencode show-opencode-config

setup: setup-opencode

setup-opencode:
	@mkdir -p "$(dir $(OPENCODE_CONFIG))"
	@OPENCODE_CONFIG="$(OPENCODE_CONFIG)" node -e 'const fs = require("fs"); const path = require("path"); const { pathToFileURL } = require("url"); const configPath = process.env.OPENCODE_CONFIG; const pluginPath = pathToFileURL(path.resolve(process.cwd(), "src/plugin/opencode.ts")).href; let config = {}; if (fs.existsSync(configPath)) { const raw = fs.readFileSync(configPath, "utf8"); try { config = JSON.parse(raw); } catch (error) { console.error("Invalid JSON in " + configPath + ". Fix it and re-run make setup-opencode."); process.exit(1); } fs.copyFileSync(configPath, configPath + ".bak"); } if (!Array.isArray(config.plugin)) config.plugin = []; config.plugin = config.plugin.filter((entry) => entry !== "ai-mem" && entry !== "ai-mem/plugin/opencode"); if (!config.plugin.includes(pluginPath)) config.plugin.push(pluginPath); fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n"); console.log("Configured ai-mem in " + configPath); console.log("OpenCode plugin entry: " + pluginPath); if (fs.existsSync(configPath + ".bak")) console.log("Backup saved to " + configPath + ".bak");'

doctor-opencode:
	@OPENCODE_CONFIG="$(OPENCODE_CONFIG)" node -e 'const fs = require("fs"); const path = require("path"); const { pathToFileURL } = require("url"); const configPath = process.env.OPENCODE_CONFIG; const pluginPath = pathToFileURL(path.resolve(process.cwd(), "src/plugin/opencode.ts")).href; if (!fs.existsSync(configPath)) { console.error("Missing OpenCode config: " + configPath); console.error("Run: make setup-opencode"); process.exit(1); } let config; try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch (error) { console.error("Invalid JSON in " + configPath); process.exit(1); } if (!Array.isArray(config.plugin)) { console.error("Invalid config: plugin must be an array in " + configPath); process.exit(1); } if (!config.plugin.includes(pluginPath)) { console.error("ai-mem OpenCode plugin is not enabled in " + configPath); console.error("Expected plugin entry: " + pluginPath); console.error("Run: make setup-opencode"); process.exit(1); } console.log("OpenCode plugin config is valid: ai-mem enabled in " + configPath); console.log("OpenCode plugin entry: " + pluginPath);'

show-opencode-config:
	@OPENCODE_CONFIG="$(OPENCODE_CONFIG)" node -e 'const fs = require("fs"); const path = process.env.OPENCODE_CONFIG; if (!fs.existsSync(path)) { console.log("No config found at " + path); process.exit(0); } console.log(fs.readFileSync(path, "utf8"));'
