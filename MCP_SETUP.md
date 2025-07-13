# OpenRoad MCP (Model Context Protocol) Setup

This guide explains how to set up MCP with Puppeteer for interactive browser testing of your OpenRoad application directly through Claude Code.

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Claude Desktop

You have two options for configuration:

#### Option A: Use the project-specific config (Recommended)
Copy the provided configuration to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "cwd": "/Users/sonnycirasuolo/openroad",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

#### Option B: Add to your existing config
If you already have other MCP servers configured, add the puppeteer section to your existing `mcpServers` object.

### 3. Restart Claude Desktop
After updating the configuration, restart Claude Desktop completely.

### 4. Start Your Development Server
Make sure your OpenRoad app is running:

```bash
npm run dev
```

## 🧪 Available MCP Tools

Once configured, Claude Code will have access to these Puppeteer tools:

### Browser Management
- `puppeteer_launch` - Launch a new browser instance
- `puppeteer_navigate` - Navigate to a URL (defaults to http://localhost:5174)
- `puppeteer_close` - Close the browser
- `puppeteer_screenshot` - Take screenshots

### Element Interaction
- `puppeteer_click` - Click on elements using CSS selectors
- `puppeteer_type` - Type text into input fields
- `puppeteer_wait_for_selector` - Wait for elements to appear
- `puppeteer_get_element_text` - Get text content from elements

### Advanced Operations
- `puppeteer_evaluate` - Execute JavaScript in the browser context
- `puppeteer_pdf` - Generate PDFs of pages
- `puppeteer_query_selector_all` - Find multiple elements

## 🎯 Example Usage

Ask Claude to help you test your OpenRoad application:

```
"Launch a browser and test my OpenRoad trip planning functionality. Navigate to the app, add a trip from New York to Los Angeles, and take a screenshot of the result."
```

Claude will:
1. Launch a browser using `puppeteer_launch`
2. Navigate to your app using `puppeteer_navigate`
3. Interact with the trip planner using `puppeteer_click` and `puppeteer_type`
4. Take a screenshot using `puppeteer_screenshot`

## 🔧 Advanced Testing Scenarios

### Test AI Assistant Integration
```
"Test the AI assistant feature by launching the browser, opening the AI overlay, and trying to ask for route suggestions."
```

### Test Route Calculation
```
"Verify that route calculation works by adding waypoints from Dallas to Austin and checking if the route appears on the map."
```

### Test Responsive Design
```
"Launch the browser with mobile viewport settings and test how the app looks on different screen sizes."
```

### Debug Issues
```
"Help me debug why waypoints aren't being added correctly. Launch the browser, inspect the DOM, and show me what happens when I try to add a waypoint."
```

## 📝 Benefits of MCP Integration

### vs. Standalone Puppeteer Tests
- **Interactive debugging** - Claude can adapt tests based on what it finds
- **Real-time problem solving** - No need to write test scripts in advance
- **Intelligent exploration** - Claude can discover issues you didn't think to test
- **Cross-session state** - Browser stays open between questions

### vs. Manual Testing
- **Automation** - Claude can perform complex test sequences
- **Documentation** - All actions are logged and can be repeated
- **Screenshots** - Visual evidence of test results
- **Consistent testing** - Same actions performed exactly each time

## 🛠️ Troubleshooting

### MCP Server Not Found
- Ensure Claude Desktop is restarted after config changes
- Verify the path in `cwd` points to your project directory
- Check that `@modelcontextprotocol/server-puppeteer` is installed

### Browser Launch Issues
- Make sure you have Chrome/Chromium installed
- On Linux, you may need additional dependencies
- Try launching with `headless: false` to see what's happening

### App Not Loading
- Verify your dev server is running on http://localhost:5174
- Check that there are no console errors in your app
- Use `puppeteer_navigate` with specific wait conditions

## 🔄 Migrating from Standalone Tests

Your existing Puppeteer test files will continue to work. The MCP integration is additive and provides:

- **Interactive testing** alongside automated tests
- **Real-time debugging** when tests fail
- **Exploratory testing** for new features
- **Cross-browser consistency checking**

You can keep both approaches - use standalone tests for CI/CD and MCP for development and debugging.

## 📚 Next Steps

1. **Configure Claude Desktop** with the provided config
2. **Restart Claude Desktop** completely
3. **Start your dev server** (`npm run dev`)
4. **Ask Claude to test your app** - it now has direct browser control!

The MCP integration makes Claude Code a powerful testing and debugging partner for your OpenRoad application.