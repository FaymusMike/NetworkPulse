import { db, rtdb } from '../config/firebase-config.js';
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
        this.width = 0;
        this.height = 0;
    }

    initialize() {
        const container = document.getElementById('topology-container');
        if (!container) return;
        
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        // Clear any existing SVG
        d3.select('#topology-container').selectAll('*').remove();
        
        // Create SVG with zoom
        this.svg = d3.select('#topology-container')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .call(d3.zoom().on('zoom', (event) => {
                this.svg.selectAll('g').attr('transform', event.transform);
            }))
            .append('g');

        // Setup force simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(50))
            .force('x', d3.forceX(this.width / 2).strength(0.05))
            .force('y', d3.forceY(this.height / 2).strength(0.05));

        this.loadTopologyData();
        this.listenForRealTimeUpdates();
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
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
                    vlan: device.vlan,
                    x: device.x || Math.random() * (this.width - 200) + 100,
                    y: device.y || Math.random() * (this.height - 200) + 100
                });
            });

            // Load connections
            const connectionsSnapshot = await db.collection('connections').get();
            connectionsSnapshot.forEach(doc => {
                const conn = doc.data();
                this.links.push({
                    source: conn.source,
                    target: conn.target,
                    bandwidth: conn.bandwidth,
                    type: conn.type
                });
            });

            this.renderTopology();
        } catch (error) {
            console.error('Error loading topology:', error);
        }
    }

    renderTopology() {
        if (!this.svg) return;
        
        // Clear existing
        this.svg.selectAll('*').remove();

        // Draw links with gradient
        this.linkElements = this.svg.append('g')
            .selectAll('line')
            .data(this.links)
            .enter()
            .append('line')
            .attr('stroke', d => d.type === 'primary' ? '#00d4ff' : 'rgba(0, 212, 255, 0.3)')
            .attr('stroke-width', d => d.bandwidth > 100 ? 3 : 2)
            .attr('stroke-dasharray', d => d.type === 'backup' ? '5,5' : 'none')
            .attr('class', 'network-link');

        // Draw nodes group
        this.nodeElements = this.svg.append('g')
            .selectAll('g')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('data-id', d => d.id)
            .call(d3.drag()
                .on('start', this.dragStarted.bind(this))
                .on('drag', this.dragged.bind(this))
                .on('end', this.dragEnded.bind(this)))
            .on('click', (event, d) => {
                event.stopPropagation();
                this.showNodeDetails(d);
            })
            .on('mouseenter', (event, d) => this.highlightNode(d))
            .on('mouseleave', () => this.unhighlightNode());

        // Node glow effect
        this.nodeElements.append('circle')
            .attr('r', 32)
            .attr('fill', d => this.getNodeColor(d.type))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('cursor', 'pointer')
            .attr('filter', 'url(#glow)');

        // Node icons
        this.nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.3em')
            .attr('fill', '#fff')
            .attr('font-size', '24px')
            .attr('cursor', 'pointer')
            .text(d => this.getNodeIcon(d.type));

        // Node labels with background
        this.nodeElements.append('rect')
            .attr('x', -40)
            .attr('y', 40)
            .attr('width', 80)
            .attr('height', 24)
            .attr('rx', 12)
            .attr('fill', 'rgba(0,0,0,0.6)')
            .attr('cursor', 'pointer');
            
        this.nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '56px')
            .attr('fill', '#fff')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('cursor', 'pointer')
            .text(d => d.name.length > 10 ? d.name.substring(0, 8) + '...' : d.name);

        // Add status indicators
        this.nodeElements.append('circle')
            .attr('r', 6)
            .attr('cx', 25)
            .attr('cy', -25)
            .attr('fill', d => d.status === 'active' ? '#00ff9d' : '#ff4757')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);

        // Add glow filter
        const defs = this.svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'glow')
            .attr('x', '-50%')
            .attr('y', '-50%')
            .attr('width', '200%')
            .attr('height', '200%');
        
        filter.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        
        filter.append('feMerge')
            .selectAll('feMergeNode')
            .data(['coloredBlur', 'SourceGraphic'])
            .enter()
            .append('feMergeNode')
            .attr('in', d => d);

        // Update simulation
        this.simulation.nodes(this.nodes);
        this.simulation.force('link').links(this.links);
        this.simulation.on('tick', () => this.ticked());

        this.simulation.alpha(1).restart();
    }

    ticked() {
        if (this.linkElements) {
            this.linkElements
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
        }

        if (this.nodeElements) {
            this.nodeElements.attr('transform', d => `translate(${d.x},${d.y})`);
        }
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
        
        // Check if modal already exists and remove it
        const existingModal = document.getElementById('nodeModal');
        if (existingModal) existingModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'nodeModal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-effect">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas ${this.getNodeIcon(node.type)}"></i>
                            ${node.name}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="device-details">
                            <div class="detail-row">
                                <span class="detail-label">Type:</span>
                                <span class="detail-value">${node.type.charAt(0).toUpperCase() + node.type.slice(1)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">IP Address:</span>
                                <span class="detail-value">${node.ip}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Status:</span>
                                <span class="device-status ${node.status}">${node.status.toUpperCase()}</span>
                            </div>
                            ${node.vlan ? `
                            <div class="detail-row">
                                <span class="detail-label">VLAN:</span>
                                <span class="detail-value">${node.vlan}</span>
                            </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Last Seen:</span>
                                <span class="detail-value">${node.lastSeen ? new Date(node.lastSeen).toLocaleString() : 'N/A'}</span>
                            </div>
                        </div>
                        ${authManager.hasPermission('network-engineer') ? `
                            <hr class="my-3">
                            <div class="configuration-section">
                                <label class="form-label">Configuration</label>
                                <textarea id="node-config" class="form-control" rows="5" placeholder="Enter device configuration...">${node.config || ''}</textarea>
                                <button id="save-config-btn" class="btn-primary btn-sm mt-2">Save Configuration</button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" data-bs-dismiss="modal">Close</button>
                        ${authManager.hasPermission('network-engineer') ? `
                            <button id="edit-device-btn" class="btn-primary">Edit Device</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        if (authManager.hasPermission('network-engineer')) {
            document.getElementById('save-config-btn')?.addEventListener('click', () => this.saveNodeConfig(node));
            document.getElementById('edit-device-btn')?.addEventListener('click', () => this.editDevice(node));
        }
        
        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    }

    async saveNodeConfig(node) {
        const config = document.getElementById('node-config').value;
        await db.collection('devices').doc(node.id).update({
            config: config,
            lastConfigured: firebase.firestore.FieldValue.serverTimestamp()
        });
        authManager.showToast('Configuration saved successfully', 'success');
    }

    editDevice(node) {
        // Close modal and trigger device edit
        bootstrap.Modal.getInstance(document.getElementById('nodeModal')).hide();
        window.dispatchEvent(new CustomEvent('editDevice', { detail: node }));
    }

    highlightNode(node) {
        this.svg.selectAll(`g[data-id="${node.id}"] circle`)
            .transition()
            .duration(200)
            .attr('r', 38)
            .attr('stroke-width', 3);
    }

    unhighlightNode() {
        this.svg.selectAll('g circle')
            .transition()
            .duration(200)
            .attr('r', 32)
            .attr('stroke-width', 2);
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
        
        // Listen for device changes
        db.collection('devices').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const device = change.doc.data();
                    const node = this.nodes.find(n => n.id === change.doc.id);
                    if (node) {
                        node.status = device.status;
                        this.renderTopology();
                    }
                } else if (change.type === 'added' || change.type === 'removed') {
                    this.loadTopologyData();
                }
            });
        });
    }

    updateNodeStatus(updates) {
        Object.keys(updates).forEach(nodeId => {
            const node = this.nodes.find(n => n.id === nodeId);
            if (node) {
                node.status = updates[nodeId].status;
                this.renderTopology();
            }
        });
    }

    handleResize() {
        const container = document.getElementById('topology-container');
        if (container && this.svg) {
            this.width = container.clientWidth;
            this.height = container.clientHeight;
            this.svg.attr('width', this.width).attr('height', this.height);
            this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
            this.simulation.alpha(0.3).restart();
        }
    }
}

export const topologyManager = new TopologyManager();