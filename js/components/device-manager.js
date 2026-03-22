import { db } from '../config/firebase-config.js';
import { authManager } from '../auth/auth.js';
import { offlineSync } from '../utils/offline-sync.js';

class DeviceManager {
    constructor() {
        this.devices = [];
        this.setupEventListeners();
    }

    initialize() {
        this.loadDevices();
        this.listenForDeviceChanges();
    }

    async loadDevices() {
        try {
            // Try to get from cache first
            const cachedDevices = offlineSync.getCachedData('devices');
            if (cachedDevices && !navigator.onLine) {
                this.devices = cachedDevices;
                this.renderDevicesTable();
                return;
            }
            
            const devicesSnapshot = await db.collection('devices').orderBy('name').get();
            this.devices = [];
            devicesSnapshot.forEach(doc => {
                this.devices.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Cache devices
            await offlineSync.cacheData('devices', this.devices);
            this.renderDevicesTable();
        } catch (error) {
            console.error('Error loading devices:', error);
            this.renderDevicesTable();
        }
    }

    renderDevicesTable() {
        const container = document.getElementById('devices-table-container');
        if (!container) return;
        
        if (this.devices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-server"></i>
                    <h3>No Devices Found</h3>
                    <p>Click "Add Device" to start managing your network infrastructure.</p>
                </div>
            `;
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
                    <th>VLAN</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    ${authManager.hasPermission('network-engineer') ? '<th>Actions</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${this.devices.map(device => `
                    <tr data-id="${device.id}">
                        <td><strong>${device.name}</strong></td>
                        <td><span class="device-type-badge type-${device.type}">${device.type}</span></td>
                        <td><code>${device.ip}</code></td>
                        <td>${device.vlan || 'N/A'}</td>
                        <td><span class="device-status ${device.status}">${device.status}</span></td>
                        <td>${device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'N/A'}</td>
                        ${authManager.hasPermission('network-engineer') ? `
                            <td class="actions">
                                <button class="action-btn edit-device" data-id="${device.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete-device" data-id="${device.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        ` : ''}
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        container.innerHTML = '';
        container.appendChild(table);
        
        // Add event listeners for action buttons
        if (authManager.hasPermission('network-engineer')) {
            document.querySelectorAll('.edit-device').forEach(btn => {
                btn.addEventListener('click', () => this.editDevice(btn.dataset.id));
            });
            
            document.querySelectorAll('.delete-device').forEach(btn => {
                btn.addEventListener('click', () => this.deleteDevice(btn.dataset.id));
            });
        }
    }

    setupEventListeners() {
        document.getElementById('add-device-btn')?.addEventListener('click', () => this.showDeviceModal());
        
        window.addEventListener('editDevice', (event) => {
            this.editDevice(event.detail.id);
        });
    }

    showDeviceModal(device = null) {
        const modal = document.createElement('div');
        modal.id = 'deviceModal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-effect">
                    <div class="modal-header">
                        <h5 class="modal-title">${device ? 'Edit Device' : 'Add New Device'}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="device-form">
                            <div class="form-group">
                                <label>Device Name</label>
                                <input type="text" id="device-name" class="form-control" value="${device?.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>Device Type</label>
                                <select id="device-type" class="form-control" required>
                                    <option value="router" ${device?.type === 'router' ? 'selected' : ''}>Router</option>
                                    <option value="switch" ${device?.type === 'switch' ? 'selected' : ''}>Switch</option>
                                    <option value="firewall" ${device?.type === 'firewall' ? 'selected' : ''}>Firewall</option>
                                    <option value="server" ${device?.type === 'server' ? 'selected' : ''}>Server</option>
                                    <option value="client" ${device?.type === 'client' ? 'selected' : ''}>Client</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>IP Address</label>
                                <input type="text" id="device-ip" class="form-control" value="${device?.ip || ''}" placeholder="192.168.1.1" required>
                            </div>
                            <div class="form-group">
                                <label>Subnet Mask</label>
                                <input type="text" id="device-subnet" class="form-control" value="${device?.subnet || '255.255.255.0'}" required>
                            </div>
                            <div class="form-group">
                                <label>VLAN ID</label>
                                <input type="number" id="device-vlan" class="form-control" value="${device?.vlan || '1'}">
                            </div>
                            <div class="form-group">
                                <label>Status</label>
                                <select id="device-status" class="form-control">
                                    <option value="active" ${device?.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${device?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="maintenance" ${device?.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" id="save-device-btn" class="btn-primary">${device ? 'Update' : 'Create'} Device</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        document.getElementById('save-device-btn').onclick = () => {
            const deviceData = {
                name: document.getElementById('device-name').value,
                type: document.getElementById('device-type').value,
                ip: document.getElementById('device-ip').value,
                subnet: document.getElementById('device-subnet').value,
                vlan: parseInt(document.getElementById('device-vlan').value),
                status: document.getElementById('device-status').value,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (device) {
                this.updateDevice(device.id, deviceData);
            } else {
                this.createDevice(deviceData);
            }
            
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
            
            // Add to cache if offline
            if (!navigator.onLine) {
                await offlineSync.saveDeviceOffline({ id: docRef.id, ...deviceData });
            }
            
            authManager.showToast('Device created successfully', 'success');
            this.loadDevices();
        } catch (error) {
            console.error('Error creating device:', error);
            authManager.showToast('Failed to create device', 'error');
        }
    }

    async updateDevice(deviceId, deviceData) {
        try {
            await db.collection('devices').doc(deviceId).update(deviceData);
            authManager.showToast('Device updated successfully', 'success');
            this.loadDevices();
        } catch (error) {
            console.error('Error updating device:', error);
            authManager.showToast('Failed to update device', 'error');
        }
    }

    async deleteDevice(deviceId) {
        const confirmModal = confirm('Are you sure you want to delete this device? This action cannot be undone.');
        if (!confirmModal) return;
        
        try {
            await db.collection('devices').doc(deviceId).delete();
            authManager.showToast('Device deleted successfully', 'success');
            this.loadDevices();
        } catch (error) {
            console.error('Error deleting device:', error);
            authManager.showToast('Failed to delete device', 'error');
        }
    }

    editDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (device) {
            this.showDeviceModal(device);
        }
    }

    listenForDeviceChanges() {
        db.collection('devices').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    this.loadDevices();
                } else if (change.type === 'added') {
                    this.loadDevices();
                    authManager.showToast(`New device added: ${change.doc.data().name}`, 'info');
                } else if (change.type === 'removed') {
                    this.loadDevices();
                    authManager.showToast('Device removed from network', 'info');
                }
            });
        });
    }
}

export const deviceManager = new DeviceManager();