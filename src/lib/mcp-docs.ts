export const mcpDocsHtml = (origin: string) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Personal Blog MCP | AI Playground</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #09090b;
            --card: #121215;
            --border: #27272a;
            --primary: #f8fafc;
            --accent: #3b82f6;
            --text-secondary: #94a3b8;
            --glow: rgba(59, 130, 246, 0.15);
            --success: #22c55e;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: var(--bg);
            color: var(--primary);
            font-family: 'Outfit', sans-serif;
            line-height: 1.6;
            overflow-x: hidden;
            padding-bottom: 100px;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 60px 24px;
        }

        header {
            margin-bottom: 60px;
            text-align: center;
        }

        .badge {
            display: inline-block;
            padding: 6px 12px;
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 99px;
            color: var(--accent);
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
            letter-spacing: 0.05em;
        }

        h1 {
            font-size: 48px;
            font-weight: 700;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
            background: linear-gradient(to right, #ffffff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 18px;
            color: var(--text-secondary);
            font-weight: 400;
        }

        .playground-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            margin-top: 60px;
        }

        @media (max-width: 768px) {
            .playground-grid { grid-template-columns: 1fr; }
        }

        .section-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 24px;
            color: var(--primary);
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
            transition: border-color 0.3s ease;
        }

        .tool-select {
            width: 100%;
            background: #000;
            border: 1px solid var(--border);
            color: var(--primary);
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-family: 'Outfit', sans-serif;
            font-size: 16px;
            cursor: pointer;
        }

        .input-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        input, textarea, select {
            width: 100%;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border);
            color: var(--primary);
            padding: 12px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 14px;
        }

        input:focus, textarea:focus {
            outline: none;
            border-color: var(--accent);
        }

        .btn {
            width: 100%;
            background: var(--accent);
            color: white;
            border: none;
            padding: 14px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 24px;
        }

        .btn:hover {
            opacity: 0.9;
            transform: scale(0.995);
        }

        .output-container {
            background: #000;
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            height: 600px;
            display: flex;
            flex-direction: column;
        }

        .output-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 16px;
            font-size: 13px;
            color: var(--text-secondary);
            text-transform: uppercase;
        }

        #output {
            flex: 1;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: #d1d5db;
            overflow-y: auto;
            white-space: pre-wrap;
            line-height: 1.6;
        }

        .status-pill {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--success);
        }

        .dot {
            width: 8px;
            height: 8px;
            background: var(--success);
            border-radius: 50%;
            box-shadow: 0 0 8px var(--success);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <span class="badge">MCP PLAYGROUND</span>
            <h1>AI Controller</h1>
            <p class="subtitle">Interact with your personal blog engine via standardized Model Context Protocol tools.</p>
        </header>

        <div class="playground-grid">
            <div class="controls">
                <h2 class="section-title">Configure Request</h2>
                <div class="card">
                    <label>Select Tool</label>
                    <select id="toolSelect" class="tool-select">
                        <option value="generate_blog_post">generate_blog_post</option>
                        <option value="list_posts">list_posts</option>
                        <option value="read_post">read_post</option>
                    </select>

                    <div id="params-generate_blog_post" class="params-section">
                        <div class="input-group">
                            <label>Topic *</label>
                            <input type="text" id="gen-topic" placeholder="e.g. The Future of AI Agents">
                        </div>
                        <div class="input-group">
                            <label>Context (URL/Text)</label>
                            <textarea id="gen-context" rows="3" placeholder="Additional source material..."></textarea>
                        </div>
                        <div class="input-group">
                            <label>Mode</label>
                            <select id="gen-mode">
                                <option value="prod">Production</option>
                                <option value="draft">Draft</option>
                            </select>
                        </div>
                    </div>

                    <div id="params-list_posts" class="params-section" style="display:none">
                        <p style="color: var(--text-secondary); font-size: 14px;">No parameters required for this tool.</p>
                    </div>

                    <div id="params-read_post" class="params-section" style="display:none">
                        <div class="input-group">
                            <label>Slug *</label>
                            <input type="text" id="read-slug" placeholder="e.g. mastering-agentic-workflows">
                        </div>
                    </div>

                    <button class="btn" id="executeBtn">Execute Tool</button>
                    <p id="localOnlyWarning" style="margin-top: 16px; font-size: 12px; color: #f87171; display: none;">Note: Tools requiring git push are disabled in public demo mode without a secure token.</p>
                </div>
            </div>

            <div class="results">
                <h2 class="section-title">Response Output</h2>
                <div class="output-container">
                    <div class="output-header">
                        <span>Terminal Output</span>
                        <div class="status-pill">
                            <div class="dot"></div>
                            <span>Connected</span>
                        </div>
                    </div>
                    <div id="output">Waiting for execution...</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const toolSelect = document.getElementById('toolSelect');
        const executeBtn = document.getElementById('executeBtn');
        const output = document.getElementById('output');

        toolSelect.addEventListener('change', (e) => {
            const sections = document.querySelectorAll('.params-section');
            sections.forEach(s => s.style.display = 'none');
            document.getElementById('params-' + e.target.value).style.display = 'block';
        });

        executeBtn.addEventListener('click', async () => {
            const tool = toolSelect.value;
            output.innerText = 'Initializing MCP handshake...\\n';
            
            let args = {};
            if (tool === 'generate_blog_post') {
                args = {
                    topic: document.getElementById('gen-topic').value,
                    additional_context: document.getElementById('gen-context').value,
                    mode: document.getElementById('gen-mode').value
                };
            } else if (tool === 'read_post') {
                args = { slug: document.getElementById('read-slug').value };
            }

            try {
                output.innerText += \`Executing \${tool}...\\n\`;
                
                const response = await fetch('${origin}/api/mcp', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/event-stream'
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: Date.now(),
                        method: 'tools/call',
                        params: {
                            name: tool,
                            arguments: args
                        }
                    })
                });

                const data = await response.json();
                
                if (data.result && data.result.content) {
                    output.innerText = data.result.content[0].text;
                } else if (data.error) {
                    output.innerHTML = \`<span style="color:#f87171">Error: \${data.error.message}</span>\`;
                } else {
                    output.innerText = JSON.stringify(data, null, 2);
                }
            } catch (err) {
                output.innerHTML = \`<span style="color:#f87171">Execution Failed: \${err.message}</span>\`;
            }
        });
    </script>
</body>
</html>`;
