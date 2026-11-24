import * as THREE from 'three';
import { GameTextureSet } from './textures';
import { LANE_POSITIONS, ObstacleKind, PowerUpType } from './types';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  shadow: THREE.Mesh;
  magnetRing?: THREE.Mesh;
  jetpackGroup?: THREE.Group;
  sneakerGlowL?: THREE.Mesh;
  sneakerGlowR?: THREE.Mesh;
}

export function buildHujurCharacter(textures: GameTextureSet): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc28a69,
    roughness: 0.68,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x17181d,
    roughness: 0.85,
    metalness: 0.05,
  });
  const panjabiMat = new THREE.MeshStandardMaterial({
    map: textures.hujurPanjabiPattern,
    roughness: 0.82,
    metalness: 0.04,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: 0x1e2128,
    roughness: 0.55,
    metalness: 0.12,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x202632,
    roughness: 0.78,
    metalness: 0.04,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0xf0f2f5,
    roughness: 0.35,
    metalness: 0.1,
  });
  const shoeSoleMat = new THREE.MeshStandardMaterial({
    color: 0xe63946,
    roughness: 0.45,
    metalness: 0.08,
  });

  // Torso (Dark blue patterned panjabi + open black jacket)
  const torso = new THREE.Group();
  torso.position.set(0, 0.92, 0);
  bodyPivot.add(torso);

  const panjabiCore = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.64, 0.26), panjabiMat);
  panjabiCore.position.y = 0.24;
  panjabiCore.castShadow = true;
  torso.add(panjabiCore);

  // Panjabi lower hem
  const panjabiHem = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.24, 0.28), panjabiMat);
  panjabiHem.position.y = -0.14;
  panjabiHem.castShadow = true;
  torso.add(panjabiHem);

  // Open black jacket panels (left, right, back, collar)
  const jacketBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.64, 0.08), jacketMat);
  jacketBack.position.set(0, 0.23, 0.12);
  jacketBack.castShadow = true;
  torso.add(jacketBack);

  const jacketLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.64, 0.28), jacketMat);
  jacketLeft.position.set(-0.18, 0.23, 0.01);
  jacketLeft.castShadow = true;
  torso.add(jacketLeft);

  const jacketRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.64, 0.28), jacketMat);
  jacketRight.position.set(0.18, 0.23, 0.01);
  jacketRight.castShadow = true;
  torso.add(jacketRight);

  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.11, 0.24), jacketMat);
  collar.position.set(0, 0.56, 0.03);
  torso.add(collar);

  // Head
  const head = new THREE.Group();
  head.position.set(0, 0.66, 0);
  torso.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.12, 12), skinMat);
  neck.position.y = 0.02;
  head.add(neck);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 18), skinMat);
  cranium.position.y = 0.21;
  cranium.scale.set(0.95, 1.05, 0.98);
  cranium.castShadow = true;
  head.add(cranium);

  // Sculpted short dark hair (matches Photo 2)
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.228, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
  hairTop.position.set(0, 0.235, 0.01);
  hairTop.rotation.x = 0.18;
  hairTop.castShadow = true;
  head.add(hairTop);

  const hairBangs = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.12), hairMat);
  hairBangs.position.set(0.02, 0.36, -0.15);
  hairBangs.rotation.z = -0.12;
  head.add(hairBangs);

  // Photo face portrait on front (-Z since character runs toward -Z)
  const facePlane = new THREE.Mesh(
    new THREE.CircleGeometry(0.165, 24),
    new THREE.MeshBasicMaterial({ map: textures.hujurFace })
  );
  facePlane.position.set(0, 0.2, -0.212);
  facePlane.rotation.y = Math.PI;
  head.add(facePlane);

  // Arms
  const makeArm = (side: -1 | 1): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.31, 0.48, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.44, 10), jacketMat);
    sleeve.position.y = -0.2;
    sleeve.castShadow = true;
    armGroup.add(sleeve);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), skinMat);
    hand.position.y = -0.45;
    armGroup.add(hand);
    torso.add(armGroup);
    return armGroup;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs
  const makeLeg = (side: -1 | 1): { leg: THREE.Group; glow: THREE.Mesh } => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.13, 0.86, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.08, 0.45, 10), pantsMat);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    legGroup.add(thigh);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.38, 10), pantsMat);
    shin.position.y = -0.6;
    shin.castShadow = true;
    legGroup.add(shin);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.3), shoeMat);
    shoe.position.set(0, -0.81, -0.05);
    shoe.castShadow = true;
    legGroup.add(shoe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.31), shoeSoleMat);
    sole.position.set(0, -0.845, -0.05);
    legGroup.add(sole);

    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.025, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.set(0, -0.82, -0.04);
    glow.visible = false;
    legGroup.add(glow);

    bodyPivot.add(legGroup);
    return { leg: legGroup, glow };
  };
  const leftLegData = makeLeg(-1);
  const rightLegData = makeLeg(1);

  // Magnet ring visual
  const magnetRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.04, 10, 28),
    new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 })
  );
  magnetRing.rotation.x = Math.PI / 2;
  magnetRing.position.y = 1.05;
  magnetRing.visible = false;
  bodyPivot.add(magnetRing);

  // Jetpack visual (on back +Z)
  const jetpackGroup = new THREE.Group();
  jetpackGroup.position.set(0, 0.25, 0.21);
  const packMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3, metalness: 0.7 });
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.85 });
  const tankL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.44, 12), packMat);
  tankL.position.x = -0.1;
  const tankR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.44, 12), packMat);
  tankR.position.x = 0.1;
  const nozL = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.14, 10, 1, true), nozzleMat);
  nozL.position.set(-0.1, -0.26, 0);
  const nozR = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.14, 10, 1, true), nozzleMat);
  nozR.position.set(0.1, -0.26, 0);
  jetpackGroup.add(tankL, tankR, nozL, nozR);
  jetpackGroup.visible = false;
  torso.add(jetpackGroup);

  // Ground contact shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 1.15),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  return {
    root,
    bodyPivot,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg: leftLegData.leg,
    rightLeg: rightLegData.leg,
    shadow,
    magnetRing,
    jetpackGroup,
    sneakerGlowL: leftLegData.glow,
    sneakerGlowR: rightLegData.glow,
  };
}

export function buildRuhulCharacter(textures: GameTextureSet): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc99674,
    roughness: 0.65,
    metalness: 0.02,
  });
  const beardMat = new THREE.MeshStandardMaterial({
    color: 0x161414,
    roughness: 0.9,
    metalness: 0.02,
  });
  const blazerMat = new THREE.MeshStandardMaterial({
    color: 0x181a20,
    roughness: 0.48,
    metalness: 0.14,
  });
  const thobeMat = new THREE.MeshStandardMaterial({
    color: 0xf4f4f6,
    roughness: 0.78,
    metalness: 0.02,
  });
  const capMat = new THREE.MeshStandardMaterial({
    map: textures.ruhulCapPattern,
    roughness: 0.75,
    metalness: 0.05,
  });
  const glassesMat = new THREE.MeshStandardMaterial({
    color: 0x3b4252,
    roughness: 0.2,
    metalness: 0.85,
  });
  const leatherShoeMat = new THREE.MeshStandardMaterial({
    color: 0x6b3a2e,
    roughness: 0.3,
    metalness: 0.2,
  });

  // Torso (Black blazer over crisp white thobe)
  const torso = new THREE.Group();
  torso.position.set(0, 0.95, 0);
  bodyPivot.add(torso);

  const blazerBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.28), blazerMat);
  blazerBody.position.y = 0.25;
  blazerBody.castShadow = true;
  torso.add(blazerBody);

  // White inner shirt strip & collar
  const whiteFront = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.04), thobeMat);
  whiteFront.position.set(0, 0.37, -0.13);
  torso.add(whiteFront);

  // White thobe lower skirt/robe
  const thobeSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.31, 0.72, 16), thobeMat);
  thobeSkirt.position.y = -0.32;
  thobeSkirt.castShadow = true;
  torso.add(thobeSkirt);

  // Head + Beard + Glasses + Tupi Cap
  const head = new THREE.Group();
  head.position.set(0, 0.68, 0);
  torso.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.12, 12), skinMat);
  neck.position.y = 0.02;
  head.add(neck);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 18), skinMat);
  cranium.position.y = 0.21;
  cranium.scale.set(0.92, 1.08, 0.96);
  cranium.castShadow = true;
  head.add(cranium);

  // Signature dark beard
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.22, 12), beardMat);
  beard.rotation.x = Math.PI;
  beard.position.set(0, 0.04, -0.09);
  head.add(beard);

  // Glasses frames
  const frameL = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 6, 16), glassesMat);
  frameL.position.set(-0.075, 0.24, -0.21);
  const frameR = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 6, 16), glassesMat);
  frameR.position.set(0.075, 0.24, -0.21);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.012), glassesMat);
  bridge.position.set(0, 0.24, -0.21);
  head.add(frameL, frameR, bridge);

  // Embroidered Tupi / Kufi Cap (matches Photo 1)
  const capBody = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.215, 0.17, 20), capMat);
  capBody.position.y = 0.37;
  capBody.castShadow = true;
  head.add(capBody);

  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.195, 0.04, 20), capMat);
  capTop.position.y = 0.47;
  head.add(capTop);

  // Photo face portrait on front (-Z)
  const facePlane = new THREE.Mesh(
    new THREE.CircleGeometry(0.165, 24),
    new THREE.MeshBasicMaterial({ map: textures.ruhulFace })
  );
  facePlane.position.set(0, 0.21, -0.215);
  facePlane.rotation.y = Math.PI;
  head.add(facePlane);

  // Arms
  const makeArm = (side: -1 | 1): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.32, 0.5, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.46, 10), blazerMat);
    sleeve.position.y = -0.21;
    sleeve.castShadow = true;
    armGroup.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), skinMat);
    hand.position.y = -0.46;
    armGroup.add(hand);
    torso.add(armGroup);
    return armGroup;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs with brown leather dress shoes
  const makeLeg = (side: -1 | 1): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.13, 0.62, 0);
    const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.52, 10), thobeMat);
    legMesh.position.y = -0.26;
    legGroup.add(legMesh);

    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.32), leatherShoeMat);
    shoe.position.set(0, -0.56, -0.06);
    shoe.castShadow = true;
    legGroup.add(shoe);

    bodyPivot.add(legGroup);
    return legGroup;
  };
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 1.2),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  root.add(shadow);

  return {
    root,
    bodyPivot,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    shadow,
  };
}

export function buildTrainModel(
  variant: 0 | 1 | 2,
  textures: GameTextureSet,
  withRamp: boolean
): THREE.Group {
  const group = new THREE.Group();
  const liveryMaps = [
    textures.trainLiveryEmerald,
    textures.trainLiveryCrimson,
    textures.trainLiveryCobalt,
  ];
  const liveryMat = new THREE.MeshStandardMaterial({
    map: liveryMaps[variant],
    roughness: 0.38,
    metalness: 0.28,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xd0d6de,
    roughness: 0.45,
    metalness: 0.55,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x20252e,
    roughness: 0.5,
    metalness: 0.75,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x162231,
    roughness: 0.12,
    metalness: 0.85,
  });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });

  const bodyLen = withRamp ? 10.0 : 13.5;
  const bodyCenterZ = withRamp ? -1.75 : 0;

  // 1. Main hull
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.85, bodyLen), liveryMat);
  hull.position.set(0, 1.85, bodyCenterZ);
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 2. Curved / stepped roof cap
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.24, bodyLen - 0.15), roofMat);
  roof.position.set(0, 3.32, bodyCenterZ);
  roof.receiveShadow = true;
  group.add(roof);

  // 3. AC Roof Units
  for (let i = -1; i <= 1; i += 2) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 1.8), darkMetalMat);
    ac.position.set(0, 3.52, bodyCenterZ + i * (bodyLen * 0.26));
    group.add(ac);
  }

  // 4. Undercarriage & Bogies
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.42, bodyLen - 0.3), darkMetalMat);
  skirt.position.set(0, 0.32, bodyCenterZ);
  group.add(skirt);

  // 5. Front cab & windshield (facing +Z toward player)
  const frontZ = bodyCenterZ + bodyLen * 0.5;
  if (!withRamp) {
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.95, 0.08), glassMat);
    windshield.position.set(0, 2.45, frontZ + 0.03);
    group.add(windshield);

    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.32, 0.25), darkMetalMat);
    bumper.position.set(0, 0.56, frontZ + 0.08);
    group.add(bumper);

    const hlL = new THREE.Mesh(new THREE.CircleGeometry(0.19, 14), headlightMat);
    hlL.position.set(-0.78, 1.15, frontZ + 0.05);
    const hlR = new THREE.Mesh(new THREE.CircleGeometry(0.19, 14), headlightMat);
    hlR.position.set(0.78, 1.15, frontZ + 0.05);
    group.add(hlL, hlR);
  } else {
    // Walkable angled boarding ramp in front (+Z side: z from +3.25 to +7.25)
    // Ramp rises from y=0 at z=+7.0 to y=3.38 at z=+3.25 (length = 3.75 along Z)
    const rampLen = Math.hypot(3.75, 3.38);
    const rampAngle = Math.atan2(3.38, 3.75);
    const rampDeck = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.2, rampLen),
      new THREE.MeshStandardMaterial({
        map: textures.barrierStripes,
        roughness: 0.65,
        metalness: 0.15,
      })
    );
    rampDeck.position.set(0, 3.38 * 0.5 - 0.05, 3.25 + 3.75 * 0.5);
    rampDeck.rotation.x = rampAngle;
    rampDeck.receiveShadow = true;
    group.add(rampDeck);

    // Side rails on ramp
    for (const sx of [-1.2, 1.2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, rampLen), darkMetalMat);
      rail.position.set(sx, 3.38 * 0.5 + 0.1, 3.25 + 3.75 * 0.5);
      rail.rotation.x = rampAngle;
      group.add(rail);
    }
  }

  return group;
}

export function buildBarrierModel(
  kind: Extract<ObstacleKind, 'low_barrier' | 'high_gate' | 'tall_barrier'>,
  textures: GameTextureSet
): THREE.Group {
  const group = new THREE.Group();
  const stripeMat = new THREE.MeshStandardMaterial({
    map: textures.barrierStripes,
    roughness: 0.55,
    metalness: 0.12,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x333c4a,
    roughness: 0.4,
    metalness: 0.8,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.2,
  });

  if (kind === 'low_barrier') {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.44, 0.18), stripeMat);
    board.position.y = 0.78;
    board.castShadow = true;
    group.add(board);

    for (const sx of [-1.05, 1.05]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.0, 0.5), steelMat);
      leg.position.set(sx, 0.5, 0);
      leg.castShadow = true;
      group.add(leg);

      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 10), beaconMat);
      beacon.position.set(sx, 1.06, 0);
      group.add(beacon);
    }
  } else if (kind === 'high_gate') {
    // Tall pylons on edges, open underneath up to y = 1.32 so rolling clears it!
    for (const sx of [-1.2, 1.2]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.75, 0.2), steelMat);
      post.position.set(sx, 1.375, 0);
      post.castShadow = true;
      group.add(post);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.55), steelMat);
      foot.position.set(sx, 0.06, 0);
      group.add(foot);
    }

    const header = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.72, 0.22), stripeMat);
    header.position.set(0, 1.78, 0);
    header.castShadow = true;
    group.add(header);

    const signTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.42, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.45, metalness: 0.25 })
    );
    signTop.position.set(0, 2.42, 0);
    group.add(signTop);
  } else {
    // Full-height double barricade (must switch lane)
    for (const sx of [-1.1, 1.1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.45, 0.35), steelMat);
      post.position.set(sx, 1.225, 0);
      post.castShadow = true;
      group.add(post);
    }
    const lowerBoard = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.65, 0.2), stripeMat);
    lowerBoard.position.y = 0.75;
    lowerBoard.castShadow = true;
    const upperBoard = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.65, 0.2), stripeMat);
    upperBoard.position.y = 1.8;
    upperBoard.castShadow = true;
    group.add(lowerBoard, upperBoard);
  }

  return group;
}

export function buildPowerUpPickup(type: PowerUpType): THREE.Group {
  const group = new THREE.Group();
  const colors: Record<PowerUpType, number> = {
    magnet: 0xef4444,
    jetpack: 0xf97316,
    multiplier: 0x3b82f6,
    sneakers: 0x10b981,
  };
  const coreMat = new THREE.MeshStandardMaterial({
    color: colors[type],
    emissive: colors[type],
    emissiveIntensity: 0.35,
    roughness: 0.22,
    metalness: 0.65,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.9,
  });

  // Outer aura ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.54, 0.045, 10, 24),
    new THREE.MeshBasicMaterial({ color: colors[type] })
  );
  group.add(ring);

  if (type === 'magnet') {
    const uShape = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.085, 10, 20, Math.PI), coreMat);
    uShape.rotation.z = Math.PI;
    uShape.position.y = 0.1;
    const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.17), metalMat);
    tipL.position.set(-0.28, 0.18, 0);
    const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, 0.17), metalMat);
    tipR.position.set(0.28, 0.18, 0);
    group.add(uShape, tipL, tipR);
  } else if (type === 'jetpack') {
    const tL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.48, 12), coreMat);
    tL.position.x = -0.12;
    const tR = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.48, 12), coreMat);
    tR.position.x = 0.12;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.18), metalMat);
    cap.position.y = 0.24;
    group.add(tL, tR, cap);
  } else if (type === 'multiplier') {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), coreMat);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 8, 18), metalMat);
    band.rotation.x = Math.PI / 3;
    group.add(star, band);
  } else {
    // Sneakers
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.48), coreMat);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.09, 0.51), metalMat);
    sole.position.y = -0.14;
    group.add(boot, sole);
  }

  return group;
}

export function buildTrackSegment(
  length: number,
  textures: GameTextureSet,
  withStationCanopy: boolean
): THREE.Group {
  const seg = new THREE.Group();

  // 1. Track ballast bed
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(11.4, length),
    new THREE.MeshStandardMaterial({
      map: textures.trackBed,
      roughness: 0.92,
      metalness: 0.05,
    })
  );
  bed.rotation.x = -Math.PI / 2;
  bed.receiveShadow = true;
  seg.add(bed);

  // 2. Outer terrain embankments (no empty void!)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x4b5b42,
    roughness: 0.95,
    metalness: 0.0,
  });
  for (const side of [-1, 1]) {
    const outerGround = new THREE.Mesh(new THREE.PlaneGeometry(60, length), groundMat);
    outerGround.rotation.x = -Math.PI / 2;
    outerGround.position.set(side * 38, -0.04, 0);
    outerGround.receiveShadow = true;
    seg.add(outerGround);
  }

  // 3. Elevated side platforms
  const platMat = new THREE.MeshStandardMaterial({
    map: textures.platform,
    roughness: 0.85,
    metalness: 0.05,
  });
  const platWallMat = new THREE.MeshStandardMaterial({
    color: 0x454a54,
    roughness: 0.88,
    metalness: 0.08,
  });

  for (const side of [-1, 1]) {
    const platTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.65, length), platMat);
    platTop.position.set(side * 8.1, 0.325, 0);
    platTop.receiveShadow = true;
    seg.add(platTop);

    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.72, length), platWallMat);
    curb.position.set(side * 5.75, 0.34, 0);
    seg.add(curb);
  }

  // 4. Steel rails across all 3 lanes
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xb0b8c4,
    roughness: 0.25,
    metalness: 0.88,
  });
  for (const laneX of LANE_POSITIONS) {
    for (const rx of [-0.72, 0.72]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, length), railMat);
      rail.position.set(laneX + rx, 0.085, 0);
      seg.add(rail);
    }
  }

  // 5. Concrete/wood sleepers (instanced within segment)
  const sleeperGeo = new THREE.BoxGeometry(2.1, 0.07, 0.32);
  const sleeperMat = new THREE.MeshStandardMaterial({
    color: 0x4d433b,
    roughness: 0.9,
    metalness: 0.04,
  });
  const rows = Math.floor(length / 1.5);
  const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, rows * 3);
  sleepers.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const z = -length * 0.5 + 0.75 + r * 1.5;
    for (const laneX of LANE_POSITIONS) {
      dummy.position.set(laneX, 0.035, z);
      dummy.updateMatrix();
      sleepers.setMatrixAt(idx++, dummy.matrix);
    }
  }
  sleepers.instanceMatrix.needsUpdate = true;
  sleepers.computeBoundingSphere();
  seg.add(sleepers);

  // 6. Overhead catenary gantry arch & city backdrop buildings
  const gantryMat = new THREE.MeshStandardMaterial({
    color: 0x2f3745,
    roughness: 0.42,
    metalness: 0.72,
  });
  for (const side of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, 6.4, 0.32), gantryMat);
    col.position.set(side * 6.0, 3.2, 0);
    col.castShadow = true;
    seg.add(col);
  }
  const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.28, 0.28), gantryMat);
  crossBeam.position.set(0, 6.25, 0);
  seg.add(crossBeam);

  // Station canopy on alternating segments
  if (withStationCanopy) {
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.45,
      metalness: 0.3,
    });
    for (const side of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.18, length * 0.86), canopyMat);
      roof.position.set(side * 8.2, 4.4, 0);
      seg.add(roof);

      const lampGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 3.5),
        new THREE.MeshBasicMaterial({ color: 0xfef3c7 })
      );
      lampGlow.position.set(side * 7.6, 4.26, 0);
      seg.add(lampGlow);
    }
  }

  // City buildings flanking both sides
  const bldgMatA = new THREE.MeshStandardMaterial({
    map: textures.buildingFacadeA,
    roughness: 0.78,
    metalness: 0.1,
  });
  const bldgMatB = new THREE.MeshStandardMaterial({
    map: textures.buildingFacadeB,
    roughness: 0.78,
    metalness: 0.1,
  });
  for (const side of [-1, 1]) {
    const h1 = 11 + ((Math.abs(side * 7) + (withStationCanopy ? 5 : 2)) % 9);
    const b1 = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, h1, length * 0.45),
      side < 0 ? bldgMatA : bldgMatB
    );
    b1.position.set(side * 15.2, h1 * 0.5 - 0.1, -length * 0.24);
    seg.add(b1);

    const h2 = 14 + ((withStationCanopy ? 3 : 8) % 10);
    const b2 = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, h2, length * 0.44),
      side < 0 ? bldgMatB : bldgMatA
    );
    b2.position.set(side * 15.8, h2 * 0.5 - 0.1, length * 0.25);
    seg.add(b2);
  }

  return seg;
}
