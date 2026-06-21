import { auth, realtimeDb } from "../firebase-init";
import { onValue, ref } from "firebase/database";
import battleBalance from "../data/battleBalance.json";
import { getBattleProfile } from "./avatarStats";

const realtimeTimeoutMs = 8000;
const pollIntervalMs = 2000;

function withTimeout(promise, label) {
  let timeoutId;
  const setTimer = typeof window !== "undefined" ? window.setTimeout : setTimeout;
  const clearTimer = typeof window !== "undefined" ? window.clearTimeout : clearTimeout;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimer(() => {
      reject(new Error(`${label} demorou demais. Confira se o Realtime Database esta ativado e se a URL esta correta.`));
    }, realtimeTimeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimer(timeoutId));
}

function assertDatabaseConfigured() {
  if (!getBattleDatabaseUrl()) {
    throw new Error("URL do Realtime Database nao configurada no .env.");
  }
}

async function getAuthToken() {
  if (!auth.currentUser) throw new Error("Usuario nao autenticado.");
  return withTimeout(auth.currentUser.getIdToken(), "Token de autenticacao");
}

async function restRequest(path, options = {}) {
  assertDatabaseConfigured();
  const token = await getAuthToken();
  const baseUrl = getBattleDatabaseUrl().replace(/\/$/, "");
  const normalizedPath = String(path).replace(/^\/+/, "");
  const response = await withTimeout(
    fetch(`${baseUrl}/${normalizedPath}.json?auth=${encodeURIComponent(token)}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    }),
    "Operacao REST"
  );
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`REST ${response.status}: ${text || response.statusText}`);
  }

  return text ? JSON.parse(text) : null;
}

export function getBattleDatabaseUrl() {
  return realtimeDb.app.options.databaseURL || "";
}

export function subscribeRealtimeConnection(callback) {
  assertDatabaseConfigured();
  return onValue(
    ref(realtimeDb, ".info/connected"),
    (snapshot) => callback(Boolean(snapshot.val())),
    (error) => callback(false, error)
  );
}

export function getFirebaseErrorMessage(error) {
  const code = error?.code || "";
  const message = error?.message || "Erro desconhecido.";

  if (code.includes("permission-denied") || message.includes("PERMISSION_DENIED") || message.includes("403")) {
    return "Permissao negada no Realtime Database. Confira se as rules foram publicadas.";
  }

  if (message.includes("401")) {
    return "Autenticacao recusada pelo Realtime Database. Saia e entre novamente.";
  }

  if (code.includes("network") || message.includes("network")) {
    return "Falha de rede ao conectar no Realtime Database.";
  }

  return message;
}

function makeBattleCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function playerPayload(profile) {
  const battleProfile = getBattleProfile(profile);
  return {
    uid: profile.id,
    name: battleProfile.name,
    avatar: battleProfile.avatar,
    stats: battleProfile.stats,
    baseStats: battleProfile.baseStats,
    effectiveStats: battleProfile.effectiveStats,
    carePenalty: battleProfile.penalty,
    hp: battleProfile.maxHp,
    maxHp: battleProfile.maxHp,
    guarding: false,
    ready: true,
    connectedAt: Date.now(),
    lastSeen: Date.now()
  };
}

function getPlayers(battle) {
  return Object.values(battle?.players || {});
}

function chooseFirstTurn(players) {
  const [first, second] = players;
  if (!second) return first.uid;
  if ((second.stats?.speed || 0) > (first.stats?.speed || 0)) return second.uid;
  return first.uid;
}

function nextPlayerUid(battle, currentUid) {
  return getPlayers(battle).find((player) => player.uid !== currentUid)?.uid || currentUid;
}

function appendLog(battle, message) {
  const logs = Array.isArray(battle?.logs) ? battle.logs.slice(-7) : [];
  logs.push({
    message,
    createdAt: Date.now()
  });
  return logs;
}

function getRandomDamageMultiplier() {
  const config = battleBalance.damage.randomMultiplier;
  if (!config?.enabled) return 1;

  const min = Number(config.min ?? 1);
  const max = Number(config.max ?? 1);
  const precision = Number(config.precision ?? 2);
  const multiplier = min + Math.random() * (max - min);

  return Number(multiplier.toFixed(precision));
}

function roundByConfig(value, mode) {
  if (mode === "ceil") return Math.ceil(value);
  if (mode === "floor") return Math.floor(value);
  return Math.round(value);
}

function resolveAttack(actor, target) {
  const attack = Number(actor.stats?.attack || 10);
  const defense = Number(target.stats?.defense || 8);
  const randomMultiplier = getRandomDamageMultiplier();
  const rawDamage = (attack * battleBalance.damage.attackScale - defense * battleBalance.damage.defenseScale) * randomMultiplier;
  const baseDamage = Math.max(Number(battleBalance.damage.minDamage), roundByConfig(rawDamage, battleBalance.damage.rounding));
  const damage = target.guarding && battleBalance.guard.enabled
    ? Math.max(
        Number(battleBalance.guard.minDamageWhenGuarding),
        roundByConfig(baseDamage * battleBalance.guard.damageMultiplier, battleBalance.guard.rounding)
      )
    : baseDamage;
  const nextHp = Math.max(0, Number(target.hp || 0) - damage);

  return {
    randomMultiplier,
    damage,
    nextHp,
    finished: nextHp <= 0
  };
}

function withUpdatedAt(battle, patch = {}) {
  return {
    ...battle,
    ...patch,
    updatedAt: Date.now()
  };
}

export async function createBattle(profile) {
  if (!profile?.id) {
    throw new Error("Perfil ainda nao carregou. Aguarde alguns segundos e tente novamente.");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeBattleCode();
    const existingBattle = await restRequest(`battles/${code}`);

    if (!existingBattle) {
      await restRequest(`battles/${code}`, {
        method: "PUT",
        body: JSON.stringify({
          code,
          status: "waiting",
          hostUid: profile.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          players: {
            [profile.id]: playerPayload(profile)
          },
          logs: [
            {
              message: `${profile.name || "Jogador"} criou a sala.`,
              createdAt: Date.now()
            }
          ]
        })
      });
      return code;
    }
  }

  throw new Error("Nao foi possivel criar uma sala agora.");
}

export async function joinBattle(code, profile) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) throw new Error("Informe o codigo da sala.");
  if (!profile?.id) throw new Error("Perfil ainda nao carregou. Aguarde alguns segundos e tente novamente.");

  const currentBattle = await restRequest(`battles/${normalizedCode}`);

  if (!currentBattle) {
    throw new Error("Sala nao encontrada. Confira o codigo e se os dois aparelhos estao no mesmo projeto Firebase.");
  }

  const currentPlayers = currentBattle.players || {};
  const playerIds = Object.keys(currentPlayers);

  if (currentPlayers[profile.id]) {
    throw new Error("Voce ja esta nessa sala com esta conta. Para testar batalha, entre com outra conta no segundo aparelho.");
  }

  if (playerIds.length >= 2) {
    throw new Error("Sala cheia.");
  }

  const players = {
    ...currentPlayers,
    [profile.id]: playerPayload(profile)
  };
  const nextBattle = withUpdatedAt(currentBattle, { players });

  if (Object.keys(players).length === 2 && currentBattle.status === "waiting") {
    const playerList = Object.values(players);
    nextBattle.status = "active";
    nextBattle.turn = {
      currentUid: chooseFirstTurn(playerList),
      number: 1
    };
    nextBattle.logs = appendLog(nextBattle, "A batalha comecou.");
  }

  await restRequest(`battles/${normalizedCode}`, {
    method: "PUT",
    body: JSON.stringify(nextBattle)
  });

  return normalizedCode;
}

export function subscribeBattle(code, callback) {
  let active = true;
  let timeoutId;

  async function poll() {
    try {
      const battle = await restRequest(`battles/${code}`);
      if (active) callback(battle || null);
    } catch (error) {
      if (active) callback(null, error);
    } finally {
      if (active) timeoutId = window.setTimeout(poll, pollIntervalMs);
    }
  }

  poll();

  return () => {
    active = false;
    window.clearTimeout(timeoutId);
  };
}

export async function inspectBattleViaRest(code) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) throw new Error("Informe o codigo da sala.");

  const data = await restRequest(`battles/${normalizedCode}`);
  return {
    exists: Boolean(data),
    code: normalizedCode,
    playerCount: data?.players ? Object.keys(data.players).length : 0,
    status: data?.status || "missing",
    rawStatus: 200
  };
}

export async function inspectBattle(code) {
  return inspectBattleViaRest(code);
}

export async function leaveBattle() {
  return Promise.resolve();
}

export async function performBattleAction(code, uid, action) {
  const battle = await restRequest(`battles/${code}`);
  if (!battle || battle.status !== "active") return false;
  if (battle.turn?.currentUid !== uid) return false;

  const players = battle.players || {};
  const actor = players[uid];
  const targetUid = nextPlayerUid(battle, uid);
  const target = players[targetUid];
  if (!actor || !target) return false;

  const nextBattle = withUpdatedAt(battle, {
    players: {
      ...players
    },
    turn: {
      currentUid: targetUid,
      number: Number(battle.turn?.number || 1) + 1
    }
  });

  if (action === "defend") {
    nextBattle.players[uid] = {
      ...actor,
      guarding: true,
      lastSeen: Date.now()
    };
    nextBattle.logs = appendLog(nextBattle, `${actor.name} defendeu.`);
  } else {
    const outcome = resolveAttack(actor, target);
    nextBattle.players[uid] = {
      ...actor,
      guarding: false,
      lastSeen: Date.now()
    };
    nextBattle.players[targetUid] = {
      ...target,
      guarding: false,
      hp: outcome.nextHp
    };
    nextBattle.logs = appendLog(
      nextBattle,
      `${actor.name} atacou e causou ${outcome.damage} de dano. Multiplicador: x${outcome.randomMultiplier}.`
    );

    if (outcome.finished) {
      nextBattle.status = "finished";
      nextBattle.winnerUid = uid;
      nextBattle.loserUid = targetUid;
      nextBattle.finishedAt = Date.now();
      nextBattle.logs = appendLog(nextBattle, `${actor.name} venceu a batalha.`);
    }
  }

  await restRequest(`battles/${code}`, {
    method: "PUT",
    body: JSON.stringify(nextBattle)
  });

  return true;
}

export function touchBattlePresence(code, uid) {
  if (!code || !uid) return Promise.resolve();
  return restRequest(`battles/${code}/players/${uid}/lastSeen`, {
    method: "PUT",
    body: JSON.stringify(Date.now())
  });
}
