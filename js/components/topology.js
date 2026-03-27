// js/components/topology.js - COMPLETE FIXED VERSION
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
        this.isInitialized = false;
    }

    initialize() {
        const container = document.getElementById('topology-container');
        if (!container) {
            console.error('[Topology] Container not found');
            return;
        }
        
        // Prevent multiple initializations
        if (this.isInitialized) {
            console.log('[Topology] Already initialized');
            return;
        }
        
        this.isInitialized = true;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        console.log('[Topology] Initializing with dimensions:', this.width, 'x', this.height);
        
        // Clear any existing SVG
        d3.select('#topology-container').selectAll('*').remove();
        
        // Create SVG with zoom
        this.svg = d3.select('#topology-container')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .call(d3.zoom().on('zoom', (event) => {
                if (this.svg) {
                    this.svg.selectAll('g').attr('transform', event.transform);
                }
            }))
            .append('g');

        // Setup force simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(50));

        this.loadTopologyData();
        this.listenForRealTimeUpdates();
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
            console.error('[Topology] Error loading data:', error);
            this.showErrorState();
        }
    }

    showErrorState() {
        const container = document.getElementById('topology-container');
        if (container) {
            container.innerHTML = `
                <div class="error-state glass-effect">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Unable to Load Topology</h3>
                    <p>Please check your connection and refresh the page.</p>
                    <button onclick="location.reload()" class="btn-primary mt-3">Retry</button>
                </div>
            `;
        }
    }

    renderTopology() {
        if (!this.svg) return;
        
        this.svg.selectAll('*').remove();

        // Draw links
        this.linkElements = this.svg.append('g')
            .selectAll('line')
            .data(this.links)
            .enter()
            .append('line')
            .attr('stroke', d => d.type === 'primary' ? '#00d4ff' : 'rgba(0, 212, 255, 0.3)')
            .attr('stroke-width', d => d.bandwidth > 100 ? 3 : 2)
            .attr('stroke-dasharray', d => d.type === 'backup' ? '5,5' : 'none');

        // Draw nodes group
        this.nodeElements = this.svg.append('g')
            .selectAll('g')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('data-id', d => d.id)
            .call(d3.drag()
                .on('start', (event, d) => this.dragStarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragEnded(event, d)))
            .on('click', (event, d) => {
                event.stopPropagation();
                this.showNodeDetails(d);
            });

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
            .attr('font-size', '24px')
            .attr('cursor', 'pointer')
            .text(d => this.getNodeIcon(d.type));

        // Node labels
        this.nodeElements.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '40px')
            .attr('fill', '#fff')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('cursor', 'pointer')
            .text(d => d.name.length > 10 ? d.name.substring(0, 8) + '...' : d.name);

        // Status indicators
        this.nodeElements.append('circle')
            .attr('r', 6)
            .attr('cx', 25)
            .attr('cy', -25)
            .attr('fill', d => d.status === 'active' ? '#00ff9d' : '#ff4757')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1);

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
                        <h5 class="modal-title"><i class="fas ${this.getNodeIcon(node.type)}"></i> ${node.name}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="device-details">
                            <div class="detail-row"><span class="detail-label">Type:</span><span class="detail-value">${node.type}</span></div>
                            <div class="detail-row"><span class="detail-label">IP Address:</span><span class="detail-value">${node.ip}</span></div>
                            <div class="detail-row"><span class="detail-label">Status:</span><span class="device-status ${node.status}">${node.status}</span></div>
                            ${node.vlan ? `<div class="detail-row"><span class="detail-label">VLAN:</span><span class="detail-value">${node.vlan}</span></div>` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    }

    getNodeColor(type) {
        const colors = { 'router': '#ff6b6b', 'switch': '#4ecdc4', 'firewall': '#ffd93d', 'server': '#6c5ce7', 'client': '#a8e6cf' };
        return colors[type] || '#95a5a6';
    }

    getNodeIcon(type) {
        const icons = { 'router': '🔄', 'switch': '🔌', 'firewall': '🛡️', 'server': '💻', 'client': '🖥️' };
        return icons[type] || '⚙️';
    }

    listenForRealTimeUpdates() {
        rtdb.ref('networkUpdates').on('value', (snapshot) => {
            const updates = snapshot.val();
            if (updates) this.updateNodeStatus(updates);
        });
        
        db.collection('devices').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') this.loadTopologyData();
                else if (change.type === 'added' || change.type === 'removed') this.loadTopologyData();
            });
        });
    }

    updateNodeStatus(updates) {
        Object.keys(updates).forEach(nodeId => {
            const node = this.nodes.find(n => n.id === nodeId);
            if (node) node.status = updates[nodeId].status;
        });
        this.renderTopology();
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