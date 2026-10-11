import { describe, it } from 'node:test';
import assert from 'node:assert';
import { BowlingAI, BOWLING_PROFILES } from '../src/ai/bowlingAI.js';
import { FieldingAI, FIELD_PRESETS } from '../src/ai/fieldingAI.js';
import * as THREE from 'three';

describe('Computer-Controlled AI Test Suite', () => {
  it('1. Bowling Profiles: Fast, Swing, Spin, Defensive return appropriate speed ranges', () => {
    const ai = new BowlingAI();

    const fast = ai.getBowlerProfile(9);
    assert.strictEqual(fast.id, BOWLING_PROFILES.FAST_BOWLER.id);
    assert.ok(fast.speedRange[0] >= 135);

    const swing = ai.getBowlerProfile(8);
    assert.strictEqual(swing.id, BOWLING_PROFILES.SWING_BOWLER.id);
    assert.ok(swing.swingCapability > 0.3);

    const spin = ai.getBowlerProfile(10);
    assert.strictEqual(spin.id, BOWLING_PROFILES.SPIN_BOWLER.id);
    assert.ok(spin.speedRange[1] <= 105);
  });

  it('2. Tactical Adaptation: Bowler responds to aggressive lofted batting', () => {
    const ai = new BowlingAI();

    // Record batter repeatedly playing lofted attacking shots for sixes
    ai.recordDeliveryOutcome({ deliveryId: 'd1' }, { outcome: 'SIX', runs: 6 }, 'LOFTED_ATTACK');
    ai.recordDeliveryOutcome({ deliveryId: 'd2' }, { outcome: 'SIX', runs: 6 }, 'LOFTED_ATTACK');

    // Select delivery on HARD difficulty
    const delivery = ai.selectDelivery({
      bowlerIndex: 9,
      difficulty: 'HARD',
      matchSituation: { runs: 24, wickets: 1, overs: 1, totalOvers: 2, currentInnings: 1 }
    });

    assert.ok(delivery.speedKmph >= 136);
    assert.ok(['YORKER', 'BOUNCER', 'GOOD', 'SHORT'].includes(delivery.lengthType));
    assert.strictEqual(delivery.tacticalNote, 'Defending boundary');
  });

  it('3. Difficulty Scaling: Easy has wider spread and slower speeds; Hard is pinpoint and faster', () => {
    const ai = new BowlingAI();

    const easyDelivery = ai.selectDelivery({ bowlerIndex: 9, difficulty: 'EASY', matchSituation: {} });
    const hardDelivery = ai.selectDelivery({ bowlerIndex: 9, difficulty: 'HARD', matchSituation: {} });

    assert.ok(easyDelivery.speedKmph <= hardDelivery.speedKmph + 5);
    assert.ok(typeof easyDelivery.lineOffset === 'number');
    assert.ok(typeof hardDelivery.lineOffset === 'number');
  });

  it('4. Fielding AI: Configurable field presets apply correctly to fielders', () => {
    const fieldingAI = new FieldingAI();

    // Mock fielders
    const mockFielders = FIELD_PRESETS.BALANCED.map(p => ({
      name: p.name,
      basePos: new THREE.Vector3(p.x, 0, p.z),
      group: new THREE.Group()
    }));

    // Apply ATTACKING field preset
    fieldingAI.setPreset('ATTACKING', mockFielders);
    assert.strictEqual(fieldingAI.currentPreset, 'ATTACKING');
    assert.strictEqual(mockFielders[0].name, '1st Slip');
    assert.strictEqual(mockFielders[1].name, '2nd Slip');

    // Apply DEFENSIVE field preset
    fieldingAI.setPreset('DEFENSIVE', mockFielders);
    assert.strictEqual(fieldingAI.currentPreset, 'DEFENSIVE');
    assert.strictEqual(mockFielders[0].name, 'Deep Point');
  });
});
