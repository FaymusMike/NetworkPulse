class AIAssistant {
    constructor() {
        // Get API key from global window object
        this.apiKey = window.getAPIKey ? window.getAPIKey('OPENROUTER_API_KEY') : null;
        this.isConfigured = !!this.apiKey;
        this.conversationHistory = [];
        this.isTyping = false;
        this.setupEventListeners();
        
        if (!this.isConfigured) {
            console.warn('[AI] OpenRouter API key not configured. AI features will use demo mode.');
            this.addWelcomeDemoMessage();
        }
    }

    setupEventListeners() {
        const sendButton = document.getElementById('send-message-btn');
        const input = document.getElementById('chat-input');
        
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    addWelcomeDemoMessage() {
        const demoMessage = `🔧 **AI Assistant - Demo Mode**

I'm currently running in demo mode because the OpenRouter API key is not configured.

To enable full AI capabilities:
1. Get an API key from [OpenRouter](https://openrouter.ai/keys)
2. Add it as an environment variable \`OPENROUTER_API_KEY\` in your deployment platform
3. Refresh the page

In the meantime, you can use these features:
- **Network Intelligence**: IP geolocation, DNS lookup, WHOIS
- **Security Insights**: Password checker, IP threat lookup
- **Device Management**: Add/edit/delete devices
- **Real-time Monitoring**: View network metrics
- **Network Topology**: Visualize and manage your network

What would you like to do?`;
        
        this.addMessage(demoMessage, 'ai');
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message || this.isTyping) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        input.value = '';
        input.style.height = 'auto';
        
        this.showTypingIndicator();
        this.isTyping = true;
        
        try {
            const response = await this.callAI(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'ai');
        } catch (error) {
            console.error('AI Error:', error);
            this.hideTypingIndicator();
            this.addMessage('I apologize, but I encountered an error. Please check your network connection and try again.', 'ai');
        } finally {
            this.isTyping = false;
        }
    }

    async callAI(userMessage) {
        // Demo mode when no API key
        if (!this.isConfigured || !this.apiKey) {
            return this.getDemoResponse(userMessage);
        }
        
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });
        
        if (this.conversationHistory.length > 10) {
            this.conversationHistory = this.conversationHistory.slice(-10);
        }
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'NetworkPulse Platform'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are NetWise, an expert AI network engineer assistant for the NetworkPulse platform. 
                            Your expertise includes:
                            - Network topology design and optimization
                            - Device configuration and best practices
                            - Troubleshooting network issues
                            - Security recommendations
                            - Performance optimization
                            - VLAN and subnet planning
                            - Firewall rules and security policies
                            
                            Provide detailed, technical, and actionable responses. Use markdown formatting for code blocks and lists.
                            Keep responses concise but thorough. If asked about network configuration, provide specific commands or steps.
                            Always prioritize security best practices in your recommendations.`
                        },
                        ...this.conversationHistory
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    top_p: 0.9
                })
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            
            this.conversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });
            
            return aiResponse;
        } catch (error) {
            console.error('OpenRouter API Error:', error);
            return this.getDemoResponse(userMessage);
        }
    }

    getDemoResponse(userMessage) {
        const lowerMsg = userMessage.toLowerCase();
        
        if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
            return "👋 Hello! I'm NetWise, your AI network assistant. I'm currently in demo mode. To enable full AI capabilities, please configure your OpenRouter API key. In the meantime, I can help you navigate the NetworkPulse platform. What would you like to know?";
        }
        
        if (lowerMsg.includes('device') || lowerMsg.includes('configure')) {
            return "📡 **Device Management Help**\n\nYou can manage your network devices in the Device Management section:\n\n1. **Add Device**: Click the 'Add Device' button\n2. **Edit Device**: Click the edit icon next to any device\n3. **Delete Device**: Click the trash icon\n4. **View Details**: Click on any device row\n\nWould you like me to explain any specific device configuration?";
        }
        
        if (lowerMsg.includes('topology') || lowerMsg.includes('network map')) {
            return "🗺️ **Network Topology**\n\nThe Network Topology view shows an interactive graph of your network:\n\n- **Nodes**: Routers, Switches, Firewalls, Servers, Clients\n- **Connections**: Network links between devices\n- **Drag & Drop**: Reposition nodes\n- **Click**: View device details\n\nWould you like help with optimizing your network layout?";
        }
        
        if (lowerMsg.includes('security') || lowerMsg.includes('password')) {
            return "🔒 **Security Features**\n\nNetworkPulse provides several security tools:\n\n1. **Password Leak Checker**: Test if passwords have been exposed\n2. **IP Threat Lookup**: Check IP reputation\n3. **DNS Resolution**: Verify domain records\n4. **Geo-IP Tracking**: Locate IP addresses\n\nCheck the Security Insights panel for these tools!";
        }
        
        if (lowerMsg.includes('monitoring') || lowerMsg.includes('metrics')) {
            return "📊 **Real-Time Monitoring**\n\nThe Monitoring dashboard shows live network metrics:\n\n- **Bandwidth Usage**: Current network traffic\n- **Latency**: Response times\n- **Packet Loss**: Network reliability\n\nThese metrics update every 2 seconds and can help identify network issues.";
        }
        
        return "🔧 **NetworkPulse Help**\n\nI'm currently in demo mode. Here's what you can do:\n\n- **Dashboard**: View network overview\n- **Device Management**: Add/edit network devices\n- **Topology**: Visualize network structure\n- **Monitoring**: See real-time metrics\n- **Security**: Check passwords and IP threats\n- **Reports**: Generate network reports\n\nTo enable full AI assistance, configure your OpenRouter API key in the environment variables.\n\nWhat would you like help with?";
    }

    addMessage(content, sender) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${sender === 'ai' ? 'fa-robot' : 'fa-user'}"></i>
            </div>
            <div class="message-content">
                ${this.formatMessage(content)}
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        gsap.from(messageDiv, {
            opacity: 0,
            y: 20,
            duration: 0.3,
            ease: 'power2.out'
        });
        
        if (sender === 'ai') {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-message-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(content);
                this.showToast('Copied to clipboard!', 'success');
            };
            messageDiv.querySelector('.message-content').appendChild(copyBtn);
        }
    }

    formatMessage(content) {
        let formatted = content
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>')
            .replace(/^- (.*?)$/gm, '<li>$1</li>')
            .replace(/<li>(.*?)<\/li>/g, '<ul><li>$1</li></ul>')
            .replace(/<\/ul><ul>/g, '');
        
        formatted = formatted.replace(/<\/ul><ul>/g, '');
        formatted = formatted.replace(/<\/ul>/g, '</ul><br>');
        
        return formatted;
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'message ai-message typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span class="typing-text">NetWise is thinking...</span>
            </div>
        `;
        
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    async analyzeNetworkTopology(nodes, links) {
        const topologySummary = `
            Network Topology Analysis Request:
            - Total Devices: ${nodes.length}
            - Device Types: ${nodes.map(n => n.type).join(', ')}
            - Active Connections: ${links.length}
            - Active Devices: ${nodes.filter(n => n.status === 'active').length}
            
            Please analyze and provide:
            1. Topology optimization suggestions
            2. Redundancy recommendations
            3. Potential bottlenecks
            4. Security considerations
        `;
        
        return await this.callAI(topologySummary);
    }

    async detectMisconfigurations(devices) {
        const configSummary = devices.map(d => 
            `${d.name} (${d.type}): IP ${d.ip}, VLAN ${d.vlan}, Status ${d.status}`
        ).join('\n');
        
        const prompt = `Please review these network device configurations and identify any misconfigurations, security risks, or optimization opportunities:\n\n${configSummary}\n\nProvide specific recommendations for each device if issues are found.`;
        
        return await this.callAI(prompt);
    }

    async troubleshootIssue(issue, context = '') {
        const prompt = `Network Issue: ${issue}\nContext: ${context}\n\nPlease provide:
        1. Step-by-step troubleshooting process
        2. Common causes for this issue
        3. Diagnostic commands to run
        4. Resolution steps if known
        5. Prevention measures`;
        
        return await this.callAI(prompt);
    }

    showToast(message, type) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

export const aiAssistant = new AIAssistant();