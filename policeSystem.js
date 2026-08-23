/**
 * policeSystem.js - Sistema de Polícia, Punições, Infrações e Cadeia
 * Design para integração com o jogo GTA San Andreas Web (Three.js)
 */

class PoliceSystem {
    constructor(playerData) {
        this.player = playerData || {
            id: "player_01",
            name: "Jogador 1",
            isPolice: false,
            rank: "Recruta", // Recruta, Cabo, Sargento, Tenente, Capitão
            warningCount: 0, // Infrações acumuladas no ciclo de 45 dias
            lastWarningTimestamp: null,
            punishmentLevel: 0, // 0 = Nenhum, 1 = Afastado 1 sem, 2 = Afastado 2 sem, 3 = Demitido (3 meses)
            suspendedUntil: null, // Timestamp de até quando está sem farda
            bannedFromPoliceUntil: null, // Timestamp de bloqueio de 3 meses se for expulso
            isJailed: false,
            jailTimeRemaining: 0, // Tempo em segundos
            crimeRecord: []
        };

        this.POLICE_HQ_POS = { x: 40, y: 0, z: -40, radius: 15 }; // Coordenadas do Quartel General
        this.JAIL_POS = { x: 50, y: 0, z: -50 }; // Coordenadas da Cadeia
    }

    /**
     * Verifica status de suspensão ou banimento antes de permitir assumir serviço policial
     */
    checkPoliceEligibility() {
        const now = Date.now();

        // Verificar se está suspenso temporariamente (1 ou 2 semanas)
        if (this.player.suspendedUntil && now < this.player.suspendedUntil) {
            const daysLeft = Math.ceil((this.player.suspendedUntil - now) / (1000 * 60 * 60 * 24));
            return {
                canWork: false,
                reason: `Você está afastado da polícia por punição. Faltam ${daysLeft} dia(s).`
            };
        }

        // Verificar se foi demitido e banido por 3 meses (Azaralho / Crimes)
        if (this.player.bannedFromPoliceUntil && now < this.player.bannedFromPoliceUntil) {
            const daysLeft = Math.ceil((this.player.bannedFromPoliceUntil - now) / (1000 * 60 * 60 * 24));
            return {
                canWork: false,
                reason: `Você foi demitido e exonerado do cargo. Proibido de voltar por ${daysLeft} dia(s).`
            };
        }

        return { canWork: true, reason: "Elegível para o cargo de Policial." };
    }

    /**
     * Registrar Infração de Policial (Regra dos 45 dias / 3 Infrações)
     * @param {string} reason Motivo da infração
     */
    registerPoliceInfraction(reason) {
        if (!this.player.isPolice) return "O jogador não é um policial ativo.";

        const now = Date.now();
        this.player.warningCount += 1;
        this.player.lastWarningTimestamp = now;

        let penaltyMessage = "";

        // Punição 1: Primeira infração -> Afastamento de 1 semana (7 dias)
        if (this.player.warningCount === 1) {
            this.player.punishmentLevel = 1;
            const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
            this.player.suspendedUntil = now + oneWeekMs;
            this.player.isPolice = false; // Perde a farda e poder de polícia
            penaltyMessage = "1ª Infração: Afastamento de 1 semana sem farda e sem poder de polícia!";
        }
        // Punição 2: Segunda infração no mês -> Afastamento de 2 semanas (14 dias)
        else if (this.player.warningCount === 2) {
            this.player.punishmentLevel = 2;
            const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
            this.player.suspendedUntil = now + twoWeeksMs;
            this.player.isPolice = false;
            penaltyMessage = "2ª Infração no mês: Afastamento de 2 semanas sem farda e sem poder de polícia!";
        }
        // Punição 3: 3 Infrações no período de 45 dias -> Punição de 1 mês
        else if (this.player.warningCount >= 3) {
            this.player.punishmentLevel = 3;
            const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
            this.player.suspendedUntil = now + oneMonthMs;
            this.player.isPolice = false;
            penaltyMessage = "3ª Infração (45 dias): Punido por 1 mês como 'Cidadão de Bem Vigiado'!";
        }

        return penaltyMessage;
    }

    /**
     * Se o policial em punição/vigiado fizer azaralho (matar sem motivo, roubar, desacatar)
     */
    triggerExileAndDismissal(crimeReason) {
        const now = Date.now();
        const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;

        this.player.isPolice = false;
        this.player.bannedFromPoliceUntil = now + threeMonthsMs;
        this.player.warningCount = 0; // Reseta após demissão definitiva

        return `EXPULSÃO DO QUARTEL: Devido a '${crimeReason}', você foi solto do quartel e PROIBIDO de ser policial por 3 meses!`;
    }

    /**
     * Sistema de Apreensão e Prisão de Cidadãos
     * @param {string} crimeType Tipo do crime cometido
     * @param {number} jailTimeMonths Tempo estipulado em meses (Convertido proporcionalmente no jogo)
     */
    arrestPlayer(crimeType, jailTimeMonths = 1) {
        this.player.isJailed = true;
        
        // No jogo: 1 mês de cadeia = 30 minutos reais de jogo preso
        const realMinutesPerMonth = 30;
        this.player.jailTimeRemaining = jailTimeMonths * realMinutesPerMonth * 60; // em segundos

        this.player.crimeRecord.push({
            crime: crimeType,
            date: new Date().toLocaleDateString(),
            durationMonths: jailTimeMonths
        });

        return `CIDADÃO PRESO! Motivo: ${crimeType}. Pena: ${jailTimeMonths} mês(es) de cadeia (${jailTimeMonths * realMinutesPerMonth} min reais).`;
    }

    /**
     * Atualização contínua do tempo de cadeia e reset automático de 45 dias
     * @param {number} deltaTime em segundos
     */
    update(deltaTime) {
        // Reduz tempo de cadeia se estiver preso
        if (this.player.isJailed && this.player.jailTimeRemaining > 0) {
            this.player.jailTimeRemaining -= deltaTime;
            if (this.player.jailTimeRemaining <= 0) {
                this.player.isJailed = false;
                this.player.jailTimeRemaining = 0;
                console.log("Liberado da cadeia! Você cumpriu sua pena.");
            }
        }

        // Checar expiração do ciclo de 45 dias para resetar infrações de policiais limpos
        if (this.player.lastWarningTimestamp) {
            const fortyFiveDaysMs = 45 * 24 * 60 * 60 * 1000;
            if (Date.now() - this.player.lastWarningTimestamp > fortyFiveDaysMs) {
                this.player.warningCount = 0;
                this.player.lastWarningTimestamp = null;
            }
        }
    }
}

// Exportar para ser usado globalmente no index.html
window.PoliceSystem = PoliceSystem;
