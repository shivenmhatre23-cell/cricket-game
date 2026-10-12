import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { TEAMS, GameState } from '../src/gameState.js';
import { CharacterManager, createFaceMaterial, createJerseyMaterials } from '../src/scene/characters.js';

describe('Player Character Identity, Custom Faces & Team Kits Test Suite', () => {
  it('1. All 11 players in all 4 teams define unique jersey numbers and roles', () => {
    TEAMS.forEach(team => {
      assert.strictEqual(team.players.length, 11, `${team.name} must have 11 players`);
      const seenNumbers = new Set();
      team.players.forEach(player => {
        assert.ok(player.name, 'Player must have a name');
        assert.ok(typeof player.number === 'number', `${player.name} in ${team.name} must have a jersey number`);
        assert.ok(player.number > 0, `${player.name} jersey number must be positive`);
        assert.ok(!seenNumbers.has(player.number), `${team.name} must not have duplicate jersey number ${player.number}`);
        seenNumbers.add(player.number);
        assert.ok(['BAT', 'BOWL', 'ALL', 'WK'].includes(player.role), `${player.name} must have a valid cricket role`);
      });
    });
  });

  it('2. All players define distinct facial characteristics (skin, beard, hair, eyes)', () => {
    TEAMS.forEach(team => {
      team.players.forEach(player => {
        assert.ok(player.face, `${player.name} must have a face definition`);
        assert.ok(player.face.skin, `${player.name} must have a skin color`);
        assert.match(player.face.skin, /^#[0-9a-fA-F]{6}$/, `${player.name} skin must be a valid hex color`);
        assert.ok(player.face.beard, `${player.name} must have a beard/moustache style`);
        assert.ok(player.face.hair, `${player.name} must have a hair color`);
        assert.ok(player.face.eyes, `${player.name} must have an eye color`);
      });
    });
  });

  it('3. All teams define authentic kit specifications with distinct color schemes', () => {
    const requiredKits = ['India', 'Australia', 'England', 'Pakistan'];
    requiredKits.forEach(name => {
      const team = TEAMS.find(t => t.name === name);
      assert.ok(team, `Team ${name} must exist in TEAMS`);
      assert.ok(team.kit, `Team ${name} must have kit object`);
      assert.ok(team.kit.primary, `Team ${name} must have primary color`);
      assert.ok(team.kit.secondary, `Team ${name} must have secondary color`);
      assert.ok(team.kit.pants, `Team ${name} must have pants color`);
      assert.ok(team.kit.pads, `Team ${name} must have pads color`);
      assert.ok(team.kit.helmet, `Team ${name} must have helmet color`);
      assert.ok(team.kit.countryText, `Team ${name} must have country text`);
    });

    // Verify visual differentiation
    const ind = TEAMS.find(t => t.name === 'India');
    const aus = TEAMS.find(t => t.name === 'Australia');
    const eng = TEAMS.find(t => t.name === 'England');
    const pak = TEAMS.find(t => t.name === 'Pakistan');

    assert.notStrictEqual(ind.kit.primary, aus.kit.primary, 'India and Australia kit colors must be distinct');
    assert.notStrictEqual(ind.kit.primary, pak.kit.primary, 'India and Pakistan kit colors must be distinct');
    assert.notStrictEqual(eng.kit.primary, aus.kit.primary, 'England and Australia kit colors must be distinct');
  });

  it('4. createFaceMaterial returns valid material with player skin color', () => {
    const player = {
      name: 'V. Kohli',
      number: 18,
      face: {
        skin: '#d59868',
        beard: 'STYLED_BEARD',
        hair: '#140e09',
        eyes: '#2c1e13'
      }
    };

    const mat = createFaceMaterial(player);
    assert.ok(mat, 'Face material must be created');
    assert.ok(mat instanceof THREE.MeshStandardMaterial);
    const expectedColor = new THREE.Color('#d59868');
    assert.strictEqual(mat.color.getHexString(), expectedColor.getHexString());
  });

  it('5. createJerseyMaterials returns 6-face material array for box torso', () => {
    const player = { name: 'V. Kohli', number: 18 };
    const team = TEAMS.find(t => t.name === 'India');

    const mats = createJerseyMaterials(player, team);
    assert.ok(Array.isArray(mats), 'Jersey materials must be an array of 6 materials');
    assert.strictEqual(mats.length, 6, 'Must have 6 materials for BoxGeometry faces');
    mats.forEach(m => {
      assert.ok(m instanceof THREE.MeshStandardMaterial);
    });
  });

  it('6. CharacterManager.applyPlayerIdentity applies custom jersey and face to player', () => {
    const scene = new THREE.Scene();
    const charMgr = new CharacterManager(scene);

    const player = {
      name: 'R. Sharma (C)',
      number: 45,
      role: 'BAT',
      face: { skin: '#d89b6a', beard: 'FULL_TRIMMED', hair: '#1a120b', eyes: '#2c1e13' }
    };
    const team = TEAMS.find(t => t.name === 'India');

    charMgr.applyPlayerIdentity(charMgr.batter, player, team);

    assert.strictEqual(charMgr.batter.userData.player.name, 'R. Sharma (C)');
    assert.strictEqual(charMgr.batter.userData.player.number, 45);
    assert.strictEqual(charMgr.batter.userData.team.name, 'India');
    assert.ok(charMgr.batter.headMesh.material, 'Head must have material');
    assert.ok(charMgr.batter.torso.material, 'Torso must have material');
  });

  it('7. CharacterManager.updateActivePlayers binds live match rosters to 3D characters', () => {
    const gameState = new GameState();
    gameState.initMatch(0, 1, 2); // India (0) vs Australia (1)
    gameState.applyTossDecision(true); // User bats first

    const scene = new THREE.Scene();
    const charMgr = new CharacterManager(scene);

    charMgr.updateActivePlayers(gameState);

    // Striker (India #1: R. Sharma)
    const striker = gameState.getStriker();
    assert.strictEqual(charMgr.batter.userData.player.name, striker.name);
    assert.strictEqual(charMgr.batter.userData.team.name, 'India');

    // Bowler (Australia frontline bowler)
    const bowler = gameState.getCurrentBowler();
    assert.strictEqual(charMgr.bowler.userData.player.name, bowler.name);
    assert.strictEqual(charMgr.bowler.userData.team.name, 'Australia');

    // Fielders (Australia team members)
    assert.ok(charMgr.fielders.length > 0);
    charMgr.fielders.forEach(f => {
      assert.strictEqual(f.userData.team.name, 'Australia', 'Fielders must belong to bowling team');
      assert.ok(typeof f.userData.player.number === 'number', 'Fielder must have valid jersey number');
    });
  });
});
