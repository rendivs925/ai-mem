SHELL := /usr/bin/env bash

OPENCODE_CONFIG ?= $(HOME)/.config/opencode/opencode.json

.PHONY: setup setup-opencode doctor-opencode show-opencode-config

setup: setup-opencode

setup-opencode:
	@mkdir -p "$(dir $(OPENCODE_CONFIG))"
	@OPENCODE_CONFIG="$(OPENCODE_CONFIG)" node -e 'const fs = require("fs"); const path = require("path"); const { pathToFileURL } = require("url"); const configPath = process.env.OPENCODE_CONFIG; const pluginPath = pathToFileURL(path.resolve(process.cwd(), "src/plugin/opencode.ts")).href; let config = {}; if (fs.existsSync(configPath)) { const raw = fs.readFileSync(configPath, "utf8"); try { config = JSON.parse(raw); } catch (error) { console.error("Invalid JSON in " + configPath + ". Fix it and re-run make setup-opencode."); process.exit(1); } fs.copyFileSync(configPath, configPath + ".bak"); } if (config.plugin !== undefined && !Array.isArray(config.plugin)) { console.error("Invalid config: plugin must be an array in " + configPath); process.exit(1); } const before = Array.isArray(config.plugin) ? config.plugin : []; const after = before.filter((entry) => entry !== "ai-mem" && entry !== "ai-mem/plugin/opencode" && entry !== pluginPath); if (after.length > 0) { config.plugin = after; } else { delete config.plugin; } fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n"); console.log("ai-mem is built in for local OpenCode installs; no plugin entry is required."); if (before.length !== after.length) console.log("Removed legacy ai-mem plugin config from " + configPath); else console.log("No legacy ai-mem plugin config found in " + configPath); if (fs.existsSync(configPath + ".bak")) console.log("Backup saved to " + configPath + ".bak");'

doctor-opencode:
	@OPENCODE_CONFIG="$(OPENCODE_CONFIG)" node -e 'const fs = require("fs"); const path = require("path"); const { pathToFileURL } = require("url"); const configPath = process.env.OPENCODE_CONFIG; const pluginPath = pathToFileURL(path.resolve(process.cwd(), "src/plugin/opencode.ts")).href; if (!fs.existsSync(configPath)) { console.log("No OpenCode config found at " + configPath + ". This is fine for built-in ai-mem."); process.exit(0); } let config; try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch (error) { console.error("Invalid JSON in " + configPath); process.exit(1); } if (config.plugin !== undefined && !Array.isArray(config.plugin)) { console.error("Invalid config: plugin must be an array in " + configPath); process.exit(1); } const plugins = Array.isArray(config.plugin) ? config.plugin : []; const hasLegacy = plugins.includes("ai-mem") || plugins.includes("ai-mem/plugin/opencode") || plugins.includes(pluginPath); if (hasLegacy) { console.error("Legacy ai-mem plugin config still exists in " + configPath); console.error("Run: make setup-opencode"); process.exit(1); } console.log("OpenCode config is valid for built-in ai-mem: no legacy plugin entry found in " + configPath);'

show-opencode-config:
	@OPENCODE_CONFIG="$(OPENCODE_CONFIG)" node -e 'const fs = require("fs"); const path = process.env.OPENCODE_CONFIG; if (!fs.existsSync(path)) { console.log("No config found at " + path); process.exit(0); } console.log(fs.readFileSync(path, "utf8"));'
