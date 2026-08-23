// server.js - Servidor Multiplayer WebSockets
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const players = {}; // Guarda todos os jogadores conectados

console.log("Servidor GTA Roleplay Online rodando na porta 8080...");

wss.on('connection', (ws) => {
    const id = 'player_' + Math.random().toString(36).substr(2, 9);
    
    // Posição inicial do jogador ao entrar
    players[id] = {
        id: id,
        x: 0, y: 0.9, z: 0,
        rotation: 0,
        isPolice: false,
        inVehicle: false
    };

    // Envia o ID para o jogador que acabou de conectar
    ws.send(JSON.stringify({ type: 'init', id: id, players: players }));

    // Avisa todos os outros jogadores que alguém entrou
    broadcast({ type: 'player_joined', id: id, player: players[id] });

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // Atualiza a posição do jogador no servidor
        if (data.type === 'update') {
            if (players[id]) {
                players[id].x = data.x;
                players[id].y = data.y;
                players[id].z = data.z;
                players[id].rotation = data.rotation;
                players[id].isPolice = data.isPolice;

                // Sincroniza com todos os outros jogadores na sala
                broadcast({ type: 'update', id: id, x: data.x, y: data.y, z: data.z, rotation: data.rotation, isPolice: data.isPolice });
            }
        }
    });

    ws.on('close', () => {
        delete players[id];
        broadcast({ type: 'player_left', id: id });
    });
});

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}
