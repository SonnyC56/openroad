#!/usr/bin/env node

/**
 * MCP Server for Puppeteer Integration with OpenRoad
 * Allows Claude Code to control browser directly for testing and debugging
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer';

// Global browser and page instances
let browser = null;
let page = null;
let isConnected = false;

class PuppeteerMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'openroad-puppeteer-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'puppeteer_launch',
            description: 'Launch a new browser instance for testing OpenRoad',
            inputSchema: {
              type: 'object',
              properties: {
                headless: {
                  type: 'boolean',
                  description: 'Whether to run browser in headless mode',
                  default: false
                },
                devtools: {
                  type: 'boolean', 
                  description: 'Whether to open DevTools',
                  default: false
                },
                slowMo: {
                  type: 'number',
                  description: 'Slow down operations by specified milliseconds',
                  default: 100
                },
                width: {
                  type: 'number',
                  description: 'Viewport width',
                  default: 1920
                },
                height: {
                  type: 'number',
                  description: 'Viewport height', 
                  default: 1080
                }
              }
            }
          },
          {
            name: 'puppeteer_navigate',
            description: 'Navigate to OpenRoad application',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to navigate to',
                  default: 'http://localhost:5174'
                },
                waitUntil: {
                  type: 'string',
                  description: 'When to consider navigation complete',
                  enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
                  default: 'networkidle2'
                },
                timeout: {
                  type: 'number',
                  description: 'Navigation timeout in milliseconds',
                  default: 30000
                }
              }
            }
          },
          {
            name: 'puppeteer_screenshot',
            description: 'Take a screenshot of the current page',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'File path to save screenshot',
                  default: 'screenshot.png'
                },
                fullPage: {
                  type: 'boolean',
                  description: 'Capture full page',
                  default: true
                }
              }
            }
          },
          {
            name: 'puppeteer_click',
            description: 'Click on an element',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector for element to click'
                },
                timeout: {
                  type: 'number',
                  description: 'Wait timeout for element',
                  default: 5000
                }
              },
              required: ['selector']
            }
          },
          {
            name: 'puppeteer_type',
            description: 'Type text into an input field',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector for input element'
                },
                text: {
                  type: 'string',
                  description: 'Text to type'
                },
                delay: {
                  type: 'number',
                  description: 'Delay between keystrokes',
                  default: 50
                }
              },
              required: ['selector', 'text']
            }
          },
          {
            name: 'puppeteer_wait',
            description: 'Wait for an element or condition',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector to wait for'
                },
                timeout: {
                  type: 'number',
                  description: 'Wait timeout in milliseconds',
                  default: 10000
                },
                visible: {
                  type: 'boolean',
                  description: 'Wait for element to be visible',
                  default: true
                }
              }
            }
          },
          {
            name: 'puppeteer_evaluate',
            description: 'Execute JavaScript in the browser context',
            inputSchema: {
              type: 'object',
              properties: {
                script: {
                  type: 'string',
                  description: 'JavaScript code to execute'
                }
              },
              required: ['script']
            }
          },
          {
            name: 'puppeteer_get_text',
            description: 'Get text content from elements',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector for element(s)'
                }
              },
              required: ['selector']
            }
          },
          {
            name: 'puppeteer_test_openroad',
            description: 'Run comprehensive OpenRoad functionality test',
            inputSchema: {
              type: 'object',
              properties: {
                testType: {
                  type: 'string',
                  description: 'Type of test to run',
                  enum: ['basic', 'ai', 'routing', 'waypoints', 'full'],
                  default: 'basic'
                }
              }
            }
          },
          {
            name: 'puppeteer_close',
            description: 'Close the browser instance',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'puppeteer_launch':
            return await this.launchBrowser(args);
          
          case 'puppeteer_navigate':
            return await this.navigate(args);
          
          case 'puppeteer_screenshot':
            return await this.screenshot(args);
          
          case 'puppeteer_click':
            return await this.click(args);
          
          case 'puppeteer_type':
            return await this.type(args);
          
          case 'puppeteer_wait':
            return await this.wait(args);
          
          case 'puppeteer_evaluate':
            return await this.evaluate(args);
          
          case 'puppeteer_get_text':
            return await this.getText(args);
          
          case 'puppeteer_test_openroad':
            return await this.testOpenRoad(args);
          
          case 'puppeteer_close':
            return await this.closeBrowser();
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async launchBrowser(args = {}) {
    const {
      headless = false,
      devtools = false,
      slowMo = 100,
      width = 1920,
      height = 1080
    } = args;

    if (browser) {
      await browser.close();
    }

    browser = await puppeteer.launch({
      headless,
      devtools,
      defaultViewport: { width, height },
      slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    isConnected = true;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Browser launched successfully\n- Headless: ${headless}\n- DevTools: ${devtools}\n- Viewport: ${width}x${height}\n- Slow Motion: ${slowMo}ms`
        }
      ]
    };
  }

  async navigate(args = {}) {
    if (!page) throw new Error('Browser not launched. Use puppeteer_launch first.');

    const {
      url = 'http://localhost:5174',
      waitUntil = 'networkidle2',
      timeout = 30000
    } = args;

    await page.goto(url, { waitUntil, timeout });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Navigated to ${url}\n- Wait condition: ${waitUntil}\n- Page loaded successfully`
        }
      ]
    };
  }

  async screenshot(args = {}) {
    if (!page) throw new Error('Browser not launched. Use puppeteer_launch first.');

    const { path = 'screenshot.png', fullPage = true } = args;

    await page.screenshot({ path, fullPage });

    return {
      content: [
        {
          type: 'text',
          text: `📸 Screenshot saved to ${path}\n- Full page: ${fullPage}`
        }
      ]
    };
  }

  async click(args) {
    if (!page) throw new Error('Browser not launched. Use puppeteer_launch first.');

    const { selector, timeout = 5000 } = args;

    await page.waitForSelector(selector, { timeout });
    await page.click(selector);

    return {
      content: [
        {
          type: 'text',
          text: `🖱️ Clicked element: ${selector}`
        }
      ]
    };
  }

  async type(args) {
    if (!page) throw new Error('Browser not launched. Use puppeteer_launch first.');

    const { selector, text, delay = 50 } = args;

    await page.waitForSelector(selector);
    await page.type(selector, text, { delay });

    return {
      content: [
        {
          type: 'text',
          text: `⌨️ Typed "${text}" into ${selector}`
        }
      ]
    };
  }

  async wait(args) {
    if (!page) throw new Error('Browser not launched. Use puppeteer_launch first.');

    const { selector, timeout = 10000, visible = true } = args;

    if (selector) {
      await page.waitForSelector(selector, { timeout, visible });
      return {
        content: [
          {
            type: 'text',
            text: `⏳ Waited for element: ${selector} (visible: ${visible})`
          }
        ]
      };
    } else {
      await page.waitForTimeout(timeout);
      return {
        content: [
          {
            type: 'text',
            text: `⏳ Waited for ${timeout}ms`
          }
        ]
      };
    }
  }

  async evaluate(args) {
    if (!page) throw new Error('Browser not launched. Use puppeteer_launch first.');

    const { script } = args;

    const result = await page.evaluate(script);

    return {
      content: [
        {
          type: 'text',
          text: `💻 Executed JavaScript:\n${script}\n\nResult: ${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }

  async getText(args) {
    if (!page) throw new Error('Browser not launched. Use puppeteer_launch first.');

    const { selector } = args;

    const text = await page.$eval(selector, el => el.textContent);

    return {
      content: [
        {
          type: 'text',
          text: `📝 Text from ${selector}: "${text}"`
        }
      ]
    };
  }

  async testOpenRoad(args = {}) {
    if (!page) throw new Error('Browser not launched. Use puppeteer_launch first.');

    const { testType = 'basic' } = args;

    let result = '🧪 OpenRoad Test Results:\n\n';

    try {
      // Ensure we're on the right page
      const currentUrl = page.url();
      if (!currentUrl.includes('localhost:5174')) {
        await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
      }

      // Basic checks
      result += '1️⃣ Basic Page Elements:\n';
      
      const title = await page.title();
      result += `   • Page title: ${title}\n`;

      const headerExists = await page.$('header') !== null;
      result += `   • Header present: ${headerExists ? '✅' : '❌'}\n`;

      const mapExists = await page.$('.leaflet-container') !== null;
      result += `   • Map container: ${mapExists ? '✅' : '❌'}\n`;

      const aiOverlayExists = await page.$('[class*="aiOverlay"]') !== null;
      result += `   • AI overlay: ${aiOverlayExists ? '✅' : '❌'}\n`;

      if (testType === 'full' || testType === 'waypoints') {
        result += '\n2️⃣ Waypoint System:\n';
        
        const waypointInputs = await page.$$('input[type="text"]');
        result += `   • Location inputs: ${waypointInputs.length}\n`;

        if (waypointInputs.length >= 2) {
          // Test adding waypoints
          await waypointInputs[0].type('New York, NY', { delay: 50 });
          await page.keyboard.press('Enter');
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await waypointInputs[1].type('Los Angeles, CA', { delay: 50 });
          await page.keyboard.press('Enter');
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const routeCalculated = await page.evaluate(() => {
            return document.body.textContent.includes('km') || 
                   document.body.textContent.includes('mile');
          });
          
          result += `   • Route calculation: ${routeCalculated ? '✅' : '❌'}\n`;
        }
      }

      if (testType === 'full' || testType === 'ai') {
        result += '\n3️⃣ AI Assistant:\n';
        
        const aiButtons = await page.$$('[class*="aiOverlay"] button');
        result += `   • AI buttons: ${aiButtons.length}\n`;

        // Check if API key is needed
        const needsApiKey = await page.evaluate(() => {
          return document.body.textContent.includes('API key') ||
                 document.body.textContent.includes('Gemini');
        });
        
        result += `   • API setup required: ${needsApiKey ? '⚠️' : '✅'}\n`;
      }

    } catch (error) {
      result += `\n❌ Test failed: ${error.message}\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: result
        }
      ]
    };
  }

  async closeBrowser() {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
      isConnected = false;
    }

    return {
      content: [
        {
          type: 'text',
          text: '🔒 Browser closed successfully'
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OpenRoad Puppeteer MCP server running on stdio');
  }
}

const server = new PuppeteerMCPServer();
server.run().catch(console.error);