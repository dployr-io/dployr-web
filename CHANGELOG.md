## [0.1.39] - 2026-01-17

### 🚜 Refactor

- *(metrics)* Add interactive chart with process snapshot tooltips and timestamp locking
- *(console)* Update connection status labels and rephrase description
## [0.1.38] - 2026-01-17

### 🚜 Refactor

- *(settings)* Remove configuration page and clean up integrations sections
- *(services)* Add branch selector in create domain form
- *(console)* Add terminal session management with instance selection and fullscreen mode
## [0.1.37] - 2026-01-14

### 🚜 Refactor

- *(deployments)* Extract specific deployment blueprint from config
## [0.1.36] - 2026-01-13

### 🚜 Refactor

- *(dns)* Consolidate domain queries and remove provider display for unknown providers
## [0.1.35] - 2026-01-13

### 🚜 Refactor

- *(create-service)* Add domain configuration info dialog
- *(dns)* Replace polling with manual verification and add cooldown mechanism
## [0.1.34] - 2026-01-11

### 🚜 Refactor

- *(hooks)* Add comprehensive debug logging for WebSocket instance update flow
## [0.1.31] - 2026-01-10

### 🚜 Refactor

- *(proxy-graph)* Update service node to use consolidated proxy routes
## [0.1.30] - 2026-01-10

### 🚜 Refactor

- *(types)* Migrate to modular schema system and consolidate type definitions
- *(types)* Standardized components to use normalized schema types
- *(hooks)* Bug fixes and improvements
## [0.1.29] - 2026-01-06

### 🚜 Refactor

- *(ui)* Remove CirclePlus icons from buttons and update button labels
- *(proxy)* Redesign add dialog UI
- *(proxy-graph)* Redesign detail panels and improve UI consistency
- *(ui)* Normalize data formats and improve visual consistency across components
## [0.1.28] - 2026-01-03

### 🚀 Features

- *(proxy)* Update service selector to use dropdown
- *(deps)* Add js-yaml and smol-toml for configuration parsing

### 🚜 Refactor

- *(create-service)* Style fixes
- *(blueprint)* Improve blueprint parsing, validation, and sync logic
- *(code-editor)* Add instance selector prop
## [0.1.27] - 2026-01-03

### 🚀 Features

- *(hooks)* Add standardized WebSocket operation hook with request/response handling
- *(proxy)* Implement graph page with visualizer components

### 🚜 Refactor

- *(hooks)* Remove unused use-projects hook
## [0.1.26] - 2026-01-01

### 🐛 Bug Fixes

- *(resource-viewer)* Add null safety for CPU and memory percentages in process display
## [0.1.24] - 2025-12-31

### 🚀 Features

- *(settings)* Update footer links
## [0.1.23] - 2025-12-31

### 🚀 Features

- *(ci)* Move Cloudflare Pages deployment before Discord notification and add job dependency
## [0.1.22] - 2025-12-31

### 🚀 Features

- *(config)* Move public directory configuration from wrangler.toml to vite.config.ts
## [0.1.21] - 2025-12-31

### 🚀 Features

- *(assets)* Add public directory with static assets and configuration files
## [0.1.20] - 2025-12-31

### 🚀 Features

- *(config)* Add assets directory configuration for Cloudflare Pages
## [0.1.18] - 2025-12-31

### 🎨 Styling

- *(fix)* Typo "Changelogs" to "Changelog"
## [0.1.17] - 2025-12-31

### 🚀 Features

- *(navigation)* Update footer and sidebar links to point to actual documentation and legal pages
## [0.1.16] - 2025-12-31

### 🚀 Features

- *(ci)* Add automated changelog generation using git-cliff
## [0.1.14] - 2025-12-30

### 🚀 Features

- *(ci)* Move build-time environment variables from deployment to build step
## [0.1.13] - 2025-12-30

### 🚀 Features

- *(ci)* Add wrangler dependency for Cloudflare deployment tooling
## [0.1.12] - 2025-12-30

### 🚀 Features

- *(ci)* Change deployment from Cloudflare Workers to Cloudflare Pages
## [0.1.11] - 2025-12-30

### 🚀 Features

- *(deployments)* Add URL state management for deployment creation flow
- *(services)* Add blueprint tab to service page
- *(ci)* Add Cloudflare Workers deployment to release workflow
## [0.1.10] - 2025-12-29

### 🚀 Features

- *(websocket)* Add request IDs to all WebSocket messages and centralize error handling
- *(editor)* Replace custom text editor with CodeMirror-based editor with syntax highlighting and validation
- *(deployments)* Add deployment list query with WebSocket protocol and display created timestamp

### 🚜 Refactor

- *(instances)* Use instance name instead of ID for WebSocket operations
- *(logs)* Move LogTimeRange type to shared types and improve version sorting with pre-release support
- *(navigation)* Replace window.history.back() with router.history.back() and improve deployment creation flow
## [0.1.9] - 2025-12-23

### 🚀 Features

- *(instance-operations)* Migrate system operations to WebSocket-based hook with request-response protocol

### 🚜 Refactor

- *(file-system)* Migrate to map-based tree with live watching, search, and lazy loading
- *(hooks)* Improve deployment and service management with instance resolution and error handling
## [0.1.8] - 2025-12-21

### 🚀 Features

- *(logs)* Add deployment logs hook and refactor shared log utilities
- *(deps)* Add Radix UI components and recharts for enhanced UI capabilities
- *(file-system)* Migrate file operations to WebSocket-based hook with task management

### 🐛 Bug Fixes

- *(ui)* Add type safety to nav-footer href and migrate TextLink to TanStack Router Link component

### 🚜 Refactor

- *(hooks)* Migrate instance status and deployments to React Query cache with localStorage persistence
- *(ui)* Show count of running services
- *(ui)* Consolidate StatusChip into StatusBadge with icon support and type-specific styling
- *(services)* Migrate to unified Service type to improve domain label
- *(logs)* Consolidate log streaming hooks and add shared deployment utility
- *(file-system)* Migrate to request-response protocol with retry logic and rate limiting
## [0.1.7] - 2025-12-16

### 🚀 Features

- *(ci)* Add automated changelog generation to release workflow
- *(vite)* Add app.dployr.dev to allowed hosts for development environment
- *(ui)* Enhance logs window with expandable metadata and improve version selector with compatibility warnings
- *(ui)* Service creation form and blueprint text editor
- *(ui)* Add connection status indicator, log time range selector, and remote integration improvements

### 🐛 Bug Fixes

- *(ui)* Add null safety checks and improve error handling across multiple components
- *(instances)* Add timestamp validation and conversion for instance creation date display

### 🚜 Refactor

- *(api)* Update instance-scoped endpoints and WebSocket connections

### 📚 Documentation

- *(branding)* Update domain references from dployr.dev to dployr.io across all files
## [0.1.6] - 2025-12-01

### 🚀 Features

- *(docker)* Add runtime API base URL injection via DPLOYR_BASE_URL environment variable
## [0.1.5] - 2025-12-01

### 📚 Documentation

- *(readme)* Update Docker quick start port from 8080 to 7877
## [0.1.4] - 2025-12-01

### 🚀 Features

- *(ci)* Add Discord webhook notification to release workflow

### 📚 Documentation

- *(readme)* Update Docker quick start to use latest tag instead of version-specific tag
## [0.1.1] - 2025-12-01

### 🚀 Features

- *(docker)* Inline Caddyfile configuration in Dockerfile
## [0.1.0] - 2025-12-01

### 🚀 Features

- *(auth)* Refactor authentication flow and user management to orginate from dployr base
- *(ui)* Refactor app header, sidebar, and theme management
- *(integrations)* Add integrations management with two-factor authentication
- *(ui)* Add activity modal with user activity tracking and management
- *(ui)* Add invite user dialog and refactor URL state management
- *(ui)* Implement comprehensive user invitation system with received/sent invites split
- *(ui)* Implement comprehensive user invitation system with received/sent invites split
- *(ui)* Add integration connection dialogs system for domain, email, and remote providers
- *(ui)* Add instances management page and rename resources to graph
- *(ui)* Add instance details page with real-time status streaming and metrics visualization
- *(ui)* Enhance logs-window with dynamic filters, scroll tracking, and DEBUG level support
- *(ui)* Implement virtual scrolling and log batching for improved performance in logs-window
- *(ci)* Add GitHub Actions release workflow with Docker image publishing and static bundle artifacts

### 💼 Other

- *(ui)* Cleanup

### 🚜 Refactor

- *(ui)* Consolidate URL state management into unified useUrlState hook
- *(ui)* Centralize confirmation dialog handling across settings pages
- *(auth,ui)* Streamline GitHub integration flow and URL state management
- *(routing)* Restructure application with cluster-based routing architecture
- *(routing)* Streamline cluster-based navigation and routing logic
- *(ui)* Rename notifications to events and implement event filtering
- *(ui)* Rename email-connect-dialog to notifications-connect-dialog and improve event filtering

### ⚙️ Miscellaneous Tasks

- *(config)* Update Vite server configuration for allowed hosts
- *(license)* Migrate from MIT to Apache-2.0 and add copyright headers to all source files
