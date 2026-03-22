class AIAssistant {
    constructor() {
        this.apiKey = 'YOUR_OPENROUTER_API_KEY'; // Get from OpenRouter
        this.conversationHistory = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        const sendButton = document.getElementById('send-message-btn');
        const input = document.getElementById('chat-input');
        
        sendButton.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        input.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await this.callAI(message);
            this.hideTypingIndicator();
            this.addMessage(response, 'ai');
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'ai');
            console.error('AI Error:', error);
        }
    }

    async callAI(userMessage) {
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert network engineer assistant. Help users with network configuration, topology optimization, troubleshooting, and security best practices. Provide detailed, technical, and accurate responses.`
                    },
                    ...this.conversationHistory
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        
        this.conversationHistory.push({
            role: 'assistant',
            content: aiResponse
        });
        
        return aiResponse;
    }

    addMessage(content, sender) {
        const messagesContainer = document.getElementById('chat-messages');
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
        
        // Animate with GSAP
        gsap.from(messageDiv, {
            opacity: 0,
            y: 20,
            duration: 0.3
        });
    }

    formatMessage(content) {
        // Convert markdown-like syntax to HTML
        let formatted = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        
        return formatted;
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        const indicator = document.createElement('div');
        indicator.className = 'message ai-message typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                </div>
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
            Network Topology Summary:
            - Total Devices: ${nodes.length}
            - Device Types: ${nodes.map(n => n.type).join(', ')}
            - Connections: ${links.length}
            - Active Devices: ${nodes.filter(n => n.status === 'active').length}
        `;
        
        const prompt = `Please analyze this network topology and provide optimization suggestions:\n${topologySummary}`;
        return await this.callAI(prompt);
    }

    async detectMisconfigurations(devices) {
        const configSummary = devices.map(d => 
            `${d.name}: IP ${d.ip}, VLAN ${d.vlan}, Type ${d.type}`
        ).join('\n');
        
        const prompt = `Please review these device configurations and identify any potential misconfigurations or security risks:\n${configSummary}`;
        return await this.callAI(prompt);
    }

    async troubleshootIssue(issue, context) {
        const prompt = `Network Issue: ${issue}\nContext: ${context}\nPlease provide step-by-step troubleshooting steps.`;
        return await this.callAI(prompt);
    }
}

export const aiAssistant = new AIAssistant();