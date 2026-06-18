import React, { useEffect, useMemo, useState } from "react";
import { Copy, Shield, Swords, UsersRound } from "lucide-react";
import AvatarPreview from "../components/AvatarPreview.jsx";
import {
  createBattle,
  getBattleDatabaseUrl,
  getFirebaseErrorMessage,
  inspectBattle,
  inspectBattleViaRest,
  joinBattle,
  performBattleAction,
  subscribeRealtimeConnection,
  subscribeBattle,
  touchBattlePresence
} from "../services/battleService";
import { useAuth } from "../services/authService.jsx";
import { consumeBattleEnergy, getPetCareState } from "../services/petCareService";

function getPlayers(battle) {
  return Object.values(battle?.players || {});
}

function hpPercent(player) {
  if (!player?.maxHp) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(player.hp || 0) / Number(player.maxHp)) * 100)));
}

export default function BattlePage() {
  const { profile, refreshProfile } = useAuth();
  const [codeInput, setCodeInput] = useState("");
  const [battleCode, setBattleCode] = useState("");
  const [battle, setBattle] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [debugMessage, setDebugMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [operation, setOperation] = useState("");

  const players = useMemo(() => getPlayers(battle), [battle]);
  const me = players.find((player) => player.uid === profile?.id);
  const opponent = players.find((player) => player.uid !== profile?.id);
  const isMyTurn = battle?.status === "active" && battle?.turn?.currentUid === profile?.id;

  useEffect(() => {
    if (!battleCode) return undefined;
    return subscribeBattle(battleCode, (nextBattle, error) => {
      if (error) {
        setMessage(getFirebaseErrorMessage(error));
        return;
      }
      setBattle(nextBattle);
    });
  }, [battleCode]);

  useEffect(() => {
    return subscribeRealtimeConnection((isConnected, error) => {
      setConnected(isConnected);
      if (error) {
        setDebugMessage(getFirebaseErrorMessage(error));
      }
    });
  }, []);

  useEffect(() => {
    if (!battleCode || !profile?.id) return undefined;
    touchBattlePresence(battleCode, profile.id).catch(() => {});
    const intervalId = window.setInterval(() => {
      touchBattlePresence(battleCode, profile.id).catch(() => {});
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, [battleCode, profile?.id]);

  async function handleCreateBattle() {
    const care = getPetCareState(profile?.petCare);
    if (!care.canBattle) {
      setMessage(`Energia baixa (${care.energy}/${care.maxEnergy}). Alimente o personagem antes de batalhar.`);
      return;
    }

    setBusy(true);
    setMessage("");
    setOperation("create");
    const watchdogId = window.setTimeout(() => {
      setMessage("Criacao demorando demais. Recarregue a pagina e confira a URL/rules do Realtime Database.");
      setBusy(false);
      setOperation("");
    }, 10000);
    try {
      setDebugMessage("Criando sala no Realtime Database...");
      const code = await createBattle(profile);
      const energyResult = await consumeBattleEnergy(profile.id);
      if (!energyResult.consumed) {
        setMessage("Energia insuficiente para iniciar batalha.");
        return;
      }
      await refreshProfile?.();
      setBattleCode(code);
      setCodeInput(code);
      setDebugMessage(`Sala ${code} criada. Energia restante: ${energyResult.energy}.`);
    } catch (error) {
      setMessage(getFirebaseErrorMessage(error));
    } finally {
      window.clearTimeout(watchdogId);
      setBusy(false);
      setOperation("");
    }
  }

  async function handleJoinBattle(event) {
    event.preventDefault();
    const care = getPetCareState(profile?.petCare);
    if (!care.canBattle) {
      setMessage(`Energia baixa (${care.energy}/${care.maxEnergy}). Alimente o personagem antes de batalhar.`);
      return;
    }

    setBusy(true);
    setMessage("");
    setOperation("join");
    const watchdogId = window.setTimeout(() => {
      setMessage("Entrada demorando demais. Tente o botao Teste REST; se ele falhar, o problema e URL/rules/RTDB.");
      setBusy(false);
      setOperation("");
    }, 10000);
    try {
      setDebugMessage("Verificando sala...");
      const code = await joinBattle(codeInput, profile);
      const energyResult = await consumeBattleEnergy(profile.id);
      if (!energyResult.consumed) {
        setMessage("Energia insuficiente para entrar na batalha.");
        return;
      }
      await refreshProfile?.();
      setBattleCode(code);
      setDebugMessage(`Entrou na sala ${code}. Energia restante: ${energyResult.energy}.`);
    } catch (error) {
      setMessage(getFirebaseErrorMessage(error));
    } finally {
      window.clearTimeout(watchdogId);
      setBusy(false);
      setOperation("");
    }
  }

  async function handleInspectBattle() {
    setBusy(true);
    setMessage("");
    setOperation("inspect");
    const watchdogId = window.setTimeout(() => {
      setMessage("Verificacao SDK demorando demais. Use o botao Teste REST para confirmar a sala.");
      setBusy(false);
      setOperation("");
    }, 10000);
    try {
      const info = await inspectBattle(codeInput);
      setDebugMessage(
        info.exists
          ? `Sala ${info.code} existe. Status: ${info.status}. Jogadores: ${info.playerCount}.`
          : `Sala ${info.code} nao existe neste Realtime Database.`
      );
    } catch (error) {
      setMessage(getFirebaseErrorMessage(error));
    } finally {
      window.clearTimeout(watchdogId);
      setBusy(false);
      setOperation("");
    }
  }

  async function handleInspectBattleRest() {
    setBusy(true);
    setMessage("");
    setOperation("rest");
    const watchdogId = window.setTimeout(() => {
      setMessage("Teste REST demorou demais. O aparelho pode estar sem acesso ao dominio do Realtime Database.");
      setBusy(false);
      setOperation("");
    }, 10000);
    try {
      setDebugMessage("Testando sala via REST...");
      const info = await inspectBattleViaRest(codeInput);
      setDebugMessage(
        info.exists
          ? `REST OK. Sala ${info.code} existe. Status: ${info.status}. Jogadores: ${info.playerCount}.`
          : `REST OK. Sala ${info.code} nao existe neste banco.`
      );
    } catch (error) {
      setMessage(getFirebaseErrorMessage(error));
    } finally {
      window.clearTimeout(watchdogId);
      setBusy(false);
      setOperation("");
    }
  }

  async function handleAction(action) {
    if (!battleCode || !isMyTurn) return;
    setBusy(true);
    setMessage("");
    try {
      await performBattleAction(battleCode, profile.id, action);
    } catch (error) {
      setMessage(getFirebaseErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (!battleCode) return;
    navigator.clipboard?.writeText(battleCode);
    setMessage("Codigo copiado.");
  }

  return (
    <section className="page-stack">
      <div className="avatar-hero">
        <div>
          <p className="eyebrow">Batalha sincronizada</p>
          <h2>Crie uma sala e batalhe por turnos.</h2>
          <span>Por enquanto: atacar ou defender. Os golpes entram na proxima camada.</span>
        </div>
        <Swords size={42} />
      </div>

      <section className="battle-lobby">
        <button type="button" onClick={handleCreateBattle} disabled={busy}>
          <UsersRound size={18} />
          Criar sala
        </button>

        <form onSubmit={handleJoinBattle}>
          <label>
            Codigo da sala
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={8}
            />
          </label>
          <button type="submit" disabled={busy}>Entrar</button>
          <button type="button" onClick={handleInspectBattle} disabled={busy || !codeInput.trim()}>
            Verificar
          </button>
          <button type="button" onClick={handleInspectBattleRest} disabled={busy || !codeInput.trim()}>
            Teste REST
          </button>
        </form>
      </section>

      <section className="battle-debug">
        <span>RTDB: {connected ? "conectado" : "desconectado"}</span>
        <span>Perfil: {profile?.id ? `${profile.name || "sem nome"} · ${profile.id.slice(0, 6)}` : "carregando"}</span>
        <span>URL: {getBattleDatabaseUrl() || "nao configurada"}</span>
        {operation && <span>Operacao: {operation}</span>}
        {debugMessage && <strong>{debugMessage}</strong>}
      </section>

      {battleCode && (
        <section className="battle-room">
          <div className="battle-code">
            <span>Sala</span>
            <strong>{battleCode}</strong>
            <button type="button" className="icon-button" onClick={copyCode} aria-label="Copiar codigo">
              <Copy size={18} />
            </button>
          </div>

          <div className="battle-board">
            {[me, opponent].map((player, index) => (
              <article className="battle-player-card" key={player?.uid || index}>
                {player ? (
                  <>
                    <AvatarPreview avatar={player.avatar} size={118} />
                    <h3>{player.name}</h3>
                    <div className="hp-bar" aria-label={`HP ${player.hp} de ${player.maxHp}`}>
                      <span style={{ width: `${hpPercent(player)}%` }} />
                    </div>
                    <p>{player.hp}/{player.maxHp} HP</p>
                    <div className="battle-stat-row">
                      <span>ATK {player.stats?.attack}</span>
                      <span>DEF {player.stats?.defense}</span>
                      <span>VEL {player.stats?.speed}</span>
                    </div>
                    {player.carePenalty?.id !== "full" && (
                      <p className="battle-penalty">
                        {player.carePenalty?.label}: {player.carePenalty?.description}
                      </p>
                    )}
                    {battle?.turn?.currentUid === player.uid && battle.status === "active" && <strong>Turno atual</strong>}
                  </>
                ) : (
                  <div className="battle-waiting">
                    <UsersRound size={28} />
                    <span>Aguardando jogador</span>
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="battle-actions">
            <button type="button" onClick={() => handleAction("attack")} disabled={!isMyTurn || busy}>
              <Swords size={18} />
              Atacar
            </button>
            <button type="button" onClick={() => handleAction("defend")} disabled={!isMyTurn || busy}>
              <Shield size={18} />
              Defender
            </button>
          </div>

          {battle?.status === "waiting" && (
            <div className="battle-help">
              <p className="battle-message">Compartilhe o codigo para outro aluno entrar.</p>
              <span>Use outra conta no segundo aparelho. A mesma conta nao vira oponente.</span>
            </div>
          )}
          {battle?.status === "finished" && (
            <p className="battle-message">
              {battle.winnerUid === profile.id ? "Voce venceu." : "Batalha encerrada."}
            </p>
          )}

          <div className="battle-log">
            {(battle?.logs || []).slice().reverse().map((item, index) => (
              <p key={`${item.createdAt}-${index}`}>{item.message}</p>
            ))}
          </div>
        </section>
      )}

      {message && <p className="form-error">{message}</p>}
    </section>
  );
}
