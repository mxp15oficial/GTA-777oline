// network.js - Cliente de Rede para Conexão Multiplayer
class NetworkManager {
    constructor(scene, playerGroup) {
        this.scene = scene;
        this.playerGroup = playerGroup;
        this.remotePlayers = {}; // Guarda os modelos 3D dos outros jogadores
        
        // Conecta ao servidor local ou remoto
        this.socket = new WebSocket('ws://localhost:8080');

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'init') {
                this.myId = data.id;
            } 
            else if (data.type === 'player_joined') {
                if (data.id !== this.myId) this.createRemotePlayer(data.id, data.player);
            } 
            else if (data.type === 'update') {
                if (data.id !== this.myId) this.updateRemotePlayer(data.id, data);
            } 
            else if (data.type === 'player_left') {
                this.removeRemotePlayer(data.id);
            }
        };
    }

    createRemotePlayer(id, data) {
        // Criar modelo 3D para representar outro jogador real
        const group = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color: data.isPolice ? 0x0000ff : 0xffff00 });
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8), mat);
        mesh.position.y = 0.9;
        group.add(mesh);
        
        group.position.set(data.x, data.y, data.z);
        this.scene.add(group);

        this.remotePlayers[id] = { group, mat };
    }

    updateRemotePlayer(id, data) {
        if (!this.remotePlayers[id]) {
            this.createRemotePlayer(id, data);
            return;
        }

        const p = this.remotePlayers[id];
        p.group.position.set(data.x, data.y, data.z);
        p.group.rotation.y = data.rotation;
        p.mat.color.setHex(data.isPolice ? 0x0000ff : 0xffff00);
    }

    removeRemotePlayer(id) {
        if (this.remotePlayers[id]) {
            this.scene.remove(this.remotePlayers[id].group);
            delete this.remotePlayers[id];
        }
    }

    // Envia a posição do jogador atual para o servidor
    sendUpdate(x, y, z, rotation, isPolice) {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'update',
                x, y, z, rotation, isPolice
            }));
        }
    }
}

window.NetworkManager = NetworkManager;
