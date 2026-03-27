// js/components/device-manager.js - COMPLETE FIXED VERSION
import { db } from '../config/firebase-config.js';
import { authManager } from '../auth/auth.js';
import { offlineSync } from '../utils/offline-sync.js';

class DeviceManager {
    constructor() {
        this.devices = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.hasMore = true;
        this.isInitialized = false;
        this.setupEventListeners();
    }

    initialize() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.loadDevices();
        this.listenForDeviceChanges();
    }

    async loadDevices(reset = true) {
        try {
            const container = document.getElementById('devices-table-container');
            if (!container) {
                console.error('[Devices] Container not found');
                return;
            }
            
            if (reset) {
                this.currentPage = 1;
                this.hasMore = true;
                this.devices = [];
            }
            
            // Show loading state
            container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading devices...</div>';
            
            const cachedDevices = offlineSync.getCachedData('devices');
            if (cachedDevices && !navigator.onLine) {
                this.devices = cachedDevices;
                this.renderDevicesTable();
                return;
            }
            
            const devicesSnapshot = await db.collection('devices').get();
            this.devices = [];
            devicesSnapshot.forEach(doc => {
                this.devices.push({ id: doc.id, ...doc.data() });
            });
            
            this.devices.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            await offlineSync.cacheData('devices', this.devices);
            this.renderDevicesTable();
            
        } catch (error) {
            console.error('[Devices] Error loading devices:', error);
            this.renderEmptyState();
        }
    }

    async loadMoreDevices() {
        if (this.hasMore && navigator.onLine) {
            await this.loadDevices(false);
        }
    }

    renderDevicesTable() {
        const container = document.getElementById('devices-table-container');
        if (!container) return;
        
        if (this.devices.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        const table = document.createElement('table');
        table.className = 'devices-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Device Name</th>
                    <th>Type</th>
                    <th>IP Address</th>
                    <th>Subnet Mask</th>
                    <th>VLAN</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    ${authManager.hasPermission('network-engineer') ? '<th>Actions</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${this.devices.map(device => `
                    <tr data-id="${device.id}">
                        <td><strong>${this.escapeHtml(device.name)}</strong></td>
                        <td><span class="device-type-badge type-${device.type}">${device.type}</span></td>
                        <td><code>${device.ip || 'N/A'}</code></td>
                        <td><code>${device.subnet || '255.255.255.0'}</code></td>
                        <td>${device.vlan || 'N/A'}</td>
                        <td><span class="device-status ${device.status}">${device.status || 'unknown'}</span></td>
                        <td>${device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'N/A'}</td>
                        ${authManager.hasPermission('network-engineer') ? `
                            <td class="actions">
                                <button class="action-btn edit-device" data-id="${device.id}" title="Edit Device"><i class="fas fa-edit"></i></button>
                                <button class="action-btn delete-device" data-id="${device.id}" title="Delete Device"><i class="fas fa-trash"></i></button>
                                <button class="action-btn view-details" data-id="${device.id}" title="View Details"><i class="fas fa-info-circle"></i></button>
                            </td>
                        ` : ''}
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        container.innerHTML = '';
        container.appendChild(table);
        
        if (authManager.hasPermission('network-engineer')) {
            document.querySelectorAll('.edit-device').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editDevice(btn.dataset.id);
                });
            });
            document.querySelectorAll('.delete-device').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteDevice(btn.dataset.id);
                });
            });
            document.querySelectorAll('.view-details').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewDeviceDetails(btn.dataset.id);
                });
            });
        }
        
        document.querySelectorAll('.devices-table tbody tr').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn')) {
                    this.viewDeviceDetails(row.dataset.id);
                }
            });
        });
    }

    renderEmptyState() {
        const container = document.getElementById('devices-table-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-server"></i>
                <h3>No Devices Found</h3>
                <p>Click "Add Device" to start managing your network infrastructure.</p>
                ${authManager.hasPermission('network-engineer') ? '<button id="empty-add-device" class="btn-primary mt-3">Add Your First Device</button>' : ''}
            </div>
        `;
        
        const addBtn = document.getElementById('empty-add-device');
        if (addBtn) addBtn.addEventListener('click', () => this.showDeviceModal());
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    setupEventListeners() {
        const addBtn = document.getElementById('add-device-btn');
        if (addBtn) addBtn.addEventListener('click', () => this.showDeviceModal());
        window.addEventListener('editDevice', (event) => this.editDevice(event.detail.id));
    }

    showDeviceModal(device = null) {
        const modal = document.createElement('div');
        modal.id = 'deviceModal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content glass-effect">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas ${device ? 'fa-edit' : 'fa-plus-circle'}"></i> ${device ? 'Edit Device' : 'Add New Device'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="device-form">
                            <div class="row">
                                <div class="col-md-6"><div class="form-group"><label>Device Name <span class="text-danger">*</span></label><input type="text" id="device-name" class="form-control" value="${this.escapeHtml(device?.name || '')}" required></div></div>
                                <div class="col-md-6"><div class="form-group"><label>Device Type <span class="text-danger">*</span></label><select id="device-type" class="form-control" required>
                                    <option value="router" ${device?.type === 'router' ? 'selected' : ''}>Router</option>
                                    <option value="switch" ${device?.type === 'switch' ? 'selected' : ''}>Switch</option>
                                    <option value="firewall" ${device?.type === 'firewall' ? 'selected' : ''}>Firewall</option>
                                    <option value="server" ${device?.type === 'server' ? 'selected' : ''}>Server</option>
                                    <option value="client" ${device?.type === 'client' ? 'selected' : ''}>Client</option>
                                </select></div></div>
                            </div>
                            <div class="row">
                                <div class="col-md-6"><div class="form-group"><label>IP Address <span class="text-danger">*</span></label><input type="text" id="device-ip" class="form-control" value="${device?.ip || ''}" placeholder="192.168.1.1" required></div></div>
                                <div class="col-md-6"><div class="form-group"><label>Subnet Mask</label><input type="text" id="device-subnet" class="form-control" value="${device?.subnet || '255.255.255.0'}"></div></div>
                            </div>
                            <div class="row">
                                <div class="col-md-6"><div class="form-group"><label>VLAN ID</label><input type="number" id="device-vlan" class="form-control" value="${device?.vlan || '1'}" min="1" max="4094"></div></div>
                                <div class="col-md-6"><div class="form-group"><label>Status</label><select id="device-status" class="form-control">
                                    <option value="active" ${device?.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${device?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="maintenance" ${device?.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                                </select></div></div>
                            </div>
                            <div class="form-group"><label>Configuration Notes</label><textarea id="device-config" class="form-control" rows="3">${this.escapeHtml(device?.config || '')}</textarea></div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" id="save-device-btn" class="btn-primary"><i class="fas fa-save"></i> ${device ? 'Update' : 'Create'} Device</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        document.getElementById('save-device-btn').onclick = async () => {
            const deviceData = {
                name: document.getElementById('device-name').value.trim(),
                type: document.getElementById('device-type').value,
                ip: document.getElementById('device-ip').value.trim(),
                subnet: document.getElementById('device-subnet').value.trim(),
                vlan: parseInt(document.getElementById('device-vlan').value),
                status: document.getElementById('device-status').value,
                config: document.getElementById('device-config').value,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (!deviceData.name) {
                authManager.showToast('Device name is required', 'error');
                return;
            }
            
            const saveBtn = document.getElementById('save-device-btn');
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            if (device) await this.updateDevice(device.id, deviceData);
            else await this.createDevice(deviceData);
            
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fas fa-save"></i> ${device ? 'Update' : 'Create'} Device`;
            modalInstance.hide();
            modal.remove();
        };
        
        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    }

    async createDevice(deviceData) {
        try {
            const docRef = await db.collection('devices').add({
                ...deviceData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (!navigator.onLine) await offlineSync.saveDeviceOffline({ id: docRef.id, ...deviceData });
            authManager.showToast(`Device "${deviceData.name}" created successfully`, 'success');
            this.loadDevices();
        } catch (error) {
            console.error('Error creating device:', error);
            authManager.showToast('Failed to create device: ' + error.message, 'error');
        }
    }

    async updateDevice(deviceId, deviceData) {
        try {
            await db.collection('devices').doc(deviceId).update(deviceData);
            authManager.showToast(`Device "${deviceData.name}" updated successfully`, 'success');
            this.loadDevices();
        } catch (error) {
            console.error('Error updating device:', error);
            authManager.showToast('Failed to update device: ' + error.message, 'error');
        }
    }

    async deleteDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!confirm(`Are you sure you want to delete "${device?.name || 'this device'}"?`)) return;
        
        try {
            await db.collection('devices').doc(deviceId).delete();
            authManager.showToast('Device deleted successfully', 'success');
            this.loadDevices();
        } catch (error) {
            console.error('Error deleting device:', error);
            authManager.showToast('Failed to delete device: ' + error.message, 'error');
        }
    }

    editDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (device) this.showDeviceModal(device);
    }

    viewDeviceDetails(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;
        
        const modal = document.createElement('div');
        modal.id = 'deviceDetailsModal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-effect">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas fa-info-circle"></i> Device Details: ${this.escapeHtml(device.name)}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="device-details-panel">
                            <div class="detail-row"><span class="detail-label">Device Name:</span><span class="detail-value">${this.escapeHtml(device.name)}</span></div>
                            <div class="detail-row"><span class="detail-label">Type:</span><span class="detail-value">${device.type}</span></div>
                            <div class="detail-row"><span class="detail-label">IP Address:</span><span class="detail-value"><code>${device.ip || 'N/A'}</code></span></div>
                            <div class="detail-row"><span class="detail-label">Subnet Mask:</span><span class="detail-value"><code>${device.subnet || '255.255.255.0'}</code></span></div>
                            <div class="detail-row"><span class="detail-label">VLAN:</span><span class="detail-value">${device.vlan || 'N/A'}</span></div>
                            <div class="detail-row"><span class="detail-label">Status:</span><span class="detail-value"><span class="device-status ${device.status}">${device.status}</span></span></div>
                            ${device.config ? `<div class="detail-row"><span class="detail-label">Configuration:</span><span class="detail-value"><pre class="config-preview">${this.escapeHtml(device.config)}</pre></span></div>` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        ${authManager.hasPermission('network-engineer') ? `<button id="edit-from-details" class="btn-primary"><i class="fas fa-edit"></i> Edit Device</button>` : ''}
                        <button class="btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        const editBtn = document.getElementById('edit-from-details');
        if (editBtn) editBtn.onclick = () => { modalInstance.hide(); setTimeout(() => this.editDevice(deviceId), 300); };
        
        modal.addEventListener('hidden.bs.modal', () => modal.remove());
    }

    listenForDeviceChanges() {
        if (!db) return;
        db.collection('devices').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') this.loadDevices();
                else if (change.type === 'added') { this.loadDevices(); authManager.showToast(`New device added: ${change.doc.data().name}`, 'info'); }
                else if (change.type === 'removed') { this.loadDevices(); authManager.showToast('Device removed from network', 'info'); }
            });
        }, (error) => console.error('Snapshot listener error:', error));
    }
}

export const deviceManager = new DeviceManager();