import { rtdb, db } from '../config/firebase-config.js';
import { authManager } from '../auth/auth.js';

class TopologyManager {
    constructor() {
        this.svg = null;
        this.nodes = [];
        this.links = [];
        this.simulation = null;
        this.nodeElements = null;
        this.linkElements = null;
        this.selectedNode = null;
        this.setupEventListeners();
    }

    initialize() {
        const container = document.getElementById('topology-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Create SVG
        this.svg = d3.select('#topology-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .call(d3.zoom().on('zoom', (event) => {
                this.svg.selectAll('g').attr('transform', event.transform);
            }))
            .append('g');

        // Setup force simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(50));

        this.loadTopologyData();
        this.listenForRealTimeUpdates();
    }

    async loadTopologyData() {
        try {
            const devicesSnapshot = await db.collection('devices').get();
            this.nodes = [];
            this.links = [];

            devicesSnapshot.forEach(doc => {
                const device = doc.data();
                this.nodes.push({
                    id: doc.id,
                    name: device.name,
                    type: device.type,
                    ip: device.ip,
                    status: device.status,
                    x: device.x || Math.random() * 800,
                    y: device.y || Math.random() * 400
                });
            });

            // Load connections
            const connectionsSnapshot = await db.collection('connections').get();
            connectionsSnapshot.forEach(doc => {
                const conn = doc.data();
                this.links.push({
                    source: conn.source,
                    target: conn.target,
                    bandwidth: conn.bandwidth
                });
            });

            this.renderTopology();
        } catch (error) {
            console.error('Error loading topology:', error);
        }
    }

    renderTopology() {
        // Clear existing
        this.svg.selectAll('*').remove();

        // Draw links
        this.linkElements = this.svg.append('g')
            .selectAll('line')
            .data(this.links)
            .enter()
            .append('line')
            .attr('stroke', 'rgba(0, 212, 255, 0.5)')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', d => d.bandwidth > 100 ? 'none' : '5,5');

        // Draw nodes
        this.nodeElements = this.svg.append('g')
            .selectAll('g')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', this.dragStarted.bind(this))
                .on('drag', this.dragged.bind(this))
                .on('end', this.dragEnded.bind(this)))
            .on('click', (event, d) => this.showNodeDetails(d));

        // Node circles
        this.nodeElements.append('circle')
            .attr('r', 30)
            .attr('fill', d => this.getNodeColor(d.type))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('cursor', 'pointer');

        // Node icons
        this.nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.3em')
            .attr('fill', '#fff')
            .attr('font-size', '20px')
            .attr('cursor', 'pointer')
            .text(d => this.getNodeIcon(d.type));

        // Node labels
        this.nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '40px')
            .attr('fill', '#fff')
            .attr('font-size', '12px')
            .text(d => d.name);

        // Update simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link').links(this.links);
        this.simulation.on('tick', () => this.ticked());

        this.simulation.alpha(1).restart();
    }

    ticked() {
        this.linkElements
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        this.nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    dragStarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragEnded(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        
        // Save position to database
        this.saveNodePosition(d);
    }

    async saveNodePosition(node) {
        if (authManager.hasPermission('network-engineer')) {
            await db.collection('devices').doc(node.id).update({
                x: node.x,
                y: node.y,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    showNodeDetails(node) {
        this.selectedNode = node;
        const modal = `
            <div class="modal fade" id="nodeModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content glass-effect">
                        <div class="modal-header">
                            <h5 class="modal-title">${node.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>Type:</strong> ${node.type}</p>
                            <p><strong>IP Address:</strong> ${node.ip}</p>
                            <p><strong>Status:</strong> <span class="device-status ${node.status}">${node.status}</span></p>
                            ${authManager.hasPermission('network-engineer') ? `
                                <div class="mt-3">
                                    <label>Configuration:</label>
                                    <textarea id="node-config" class="form-control" rows="3">${node.config || ''}</textarea>
                                    <button id="save-config" class="btn-primary mt-2">Save Configuration</button>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modal);
        const modalElement = new bootstrap.Modal(document.getElementById('nodeModal'));
        modalElement.show();
        
        if (authManager.hasPermission('network-engineer')) {
            document.getElementById('save-config').onclick = () => this.saveNodeConfig(node);
        }
        
        document.getElementById('nodeModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('nodeModal').remove();
        });
    }

    async saveNodeConfig(node) {
        const config = document.getElementById('node-config').value;
        await db.collection('devices').doc(node.id).update({
            config: config,
            lastConfigured: firebase.firestore.FieldValue.serverTimestamp()
        });
        authManager.showToast('Configuration saved successfully', 'success');
    }

    getNodeColor(type) {
        const colors = {
            'router': '#ff6b6b',
            'switch': '#4ecdc4',
            'firewall': '#ffd93d',
            'server': '#6c5ce7',
            'client': '#a8e6cf'
        };
        return colors[type] || '#95a5a6';
    }

    getNodeIcon(type) {
        const icons = {
            'router': '🔄',
            'switch': '🔌',
            'firewall': '🛡️',
            'server': '💻',
            'client': '🖥️'
        };
        return icons[type] || '⚙️';
    }

    listenForRealTimeUpdates() {
        rtdb.ref('networkUpdates').on('value', (snapshot) => {
            const updates = snapshot.val();
            if (updates) {
                this.updateNodeStatus(updates);
            }
        });
    }

    updateNodeStatus(updates) {
        Object.keys(updates).forEach(nodeId => {
            const node = this.nodes.find(n => n.id === nodeId);
            if (node) {
                node.status = updates[nodeId].status;
                // Update visual indicator
                const circle = this.svg.select(`g[node-id="${nodeId}"] circle`);
                circle.attr('stroke', node.status === 'active' ? '#00ff9d' : '#ff4757');
            }
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            const container = document.getElementById('topology-container');
            this.svg.attr('width', container.clientWidth)
                .attr('height', container.clientHeight);
        });
    }
}

export const topologyManager = new TopologyManager();