SHELL := /usr/bin/env bash

OPENCODE_CONFIG ?= $(HOME)/.config/opencode/opencode.json

.PHONY: setup setup-opencode doctor-opencode show-opencode-config

setup: setup-opencode

setup-opencode:
	@mkdir -p "$(dir $(OPENCODE_CONFIG))"
	@OPENCODE_CONFIG="$(OPENCODE_CONFIG)" node -e 'const fs = require("fs"); const path = process.env.OPENCODE_CONFIG; let config = {}; if (fs.existsSync(path)) { const raw = fs.readFileSync(path, "utf8"); try { config = JSON.parse(raw); } catch (error) { console.error("Invalid JSON in " + path + ". Fix it and re-run make setup-opencode."); process.exit(1); } fs.copyFileSync(path, path + ".bak"); } if (!Array.isArray(config.plugin)) config.plugin = []; if (!config.plugin.includes("ai-mem")) config.plugin.push("ai-mem"); fs.writeFileSync(path, JSON.stringify(config, null, 2) + "\n"); console.log("Configured ai-mem in " + path); if (fs.existsSync(path + ".bak")) console.log("Backup saved to " + path + ".bak");'

doctor-opencode:
	@OPENCODE_CONFIG="$(OPENCODE_CONFIG)" node -e 'const fs = require("fs"); const path = process.env.OPENCODE_CONFIG; if (!fs.existsSync(path)) { console.error("Missing OpenCode config: " + path); console.error("Run: make setup-opencode"); process.exit(1); } let config; try { config = JSON.parse(fs.readFileSync(path, "utf8")); } catch (error) { console.error("Invalid JSON in " + path); process.exit(1); } if (!Array.isArray(config.plugin)) { console.error("Invalid config: plugin must be an array in " + path); process.exit(1); } if (!config.plugin.includes("ai-mem")) { console.error("ai-mem is not enabled in " + path); console.error("Run: make setup-opencode"); process.exit(1); } console.log("OpenCode plugin config is valid: ai-mem enabled in " + path);'

show-opencode-config:
	@OPENCODE_CONFIG="$(OPENCODE_CONFIG)" node -e 'const fs = require("fs"); const path = process.env.OPENCODE_CONFIG; if (!fs.existsSync(path)) { console.log("No config found at " + path); process.exit(0); } console.log(fs.readFileSync(path, "utf8"));'
