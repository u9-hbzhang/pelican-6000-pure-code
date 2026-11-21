// Shared cycling choreography. All era painters consume the same joint contract.
// Pose is a pure function of the supplied phase/time so seeking never needs a simulation warm-up.
const TAU = Math.PI * 2;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Solve a two-link limb by intersecting circles; retain a stable bend direction. */
export function solveTwoBoneIK(rx, ry, tx, ty, L1, L2, bendSign = 1) {
  const dx = tx - rx;
  const dy = ty - ry;
  const distance = Math.hypot(dx, dy);
  const ux = distance > 1e-9 ? dx / distance : 1;
  const uy = distance > 1e-9 ? dy / distance : 0;
  const reach = Math.max(Math.abs(L1 - L2) + 1e-6, Math.min(L1 + L2 - 1e-6, distance));
  const along = (L1 * L1 - L2 * L2 + reach * reach) / (2 * reach);
  const across = Math.sqrt(Math.max(0, L1 * L1 - along * along)) * (bendSign < 0 ? -1 : 1);
  const x = rx + ux * along - uy * across;
  const y = ry + uy * along + ux * across;
  return { x, y, hipAngle: Math.atan2(y - ry, x - rx) };
}

function rotatePoint(px, py, origin, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: origin.x + px * c - py * s, y: origin.y + px * s + py * c };
}

/**
 * A full crank cycle alternates a low, forward power pose with a tall recovery pose.
 * The long neck leads the gesture; torso, pouch and feathers follow at different phases.
 * Keep the seated hip within leg reach while making the upper-body silhouette expressive.
 * Keep wheel geometry,
 * the scene-supplied crank phase, road position and all legacy joint names intact.
 */
export function computePelicanRig({
  x = 500, y = 680, pedalAngle = 0, wheelAngle = null,
  scale = 1, slope = 0, speedScale = 1, poseMode = 'normal',
  lissajousMix = 0, time = 0,
} = {}) {
  const phase = ((pedalAngle % TAU) + TAU) % TAU;
  const effort = Math.max(0, Math.min(1.2, speedScale));
  // No secondary motion at rest. Scene-authored freezes/jumps keep their own trajectory.
  const freeze = poseMode === 'egypt_freeze';
  const motion = freeze ? 0 : effort;
  const p = freeze ? 0 : phase;
  const doubleStroke = Math.cos(2 * p - 0.35);
  const transfer = Math.sin(p - 0.4);
  const drive = Math.sin(p - 0.25);
  const follow = Math.sin(p - 0.85);
  const lift = motion * (4 * doubleStroke + Math.sin(4 * p));
  const surge = motion * (4 * transfer + 1.5 * Math.sin(2 * p));
  const torsoPitch = motion * (0.18 * drive + 0.045 * Math.sin(2 * p - 0.6));
  const wAngle = wheelAngle ?? x / 46;

  // A rigid bicycle: wheel contact and the 172-unit wheelbase do not bounce with the rider.
  const rearWheel = { x: -86, y: -46, r: 46, angle: wAngle };
  const frontWheel = { x: 86, y: -46, r: 46, angle: wAngle };
  const bb = { x: -8, y: -46 };
  const pedal = (a) => ({ x: bb.x + 21 * Math.cos(a), y: bb.y + 21 * Math.sin(a) });
  const rightPedal = pedal(phase);
  const leftPedal = pedal(phase + Math.PI);
  const seatCluster = { x: -33, y: -108 };
  const saddle = { x: -37, y: -115 };
  const headTop = { x: 56, y: -112 };
  const headBot = { x: 63, y: -90 };
  const stemTop = { x: 52, y: -129 };
  const handleGrip = { x: 37, y: -132 };

  // Rock the torso from the saddle, folding forward on the power stroke and opening on recovery.
  const hip = { x: -35 + surge, y: -126 + lift };
  const bodyPoint = (px, py) => rotatePoint(px, py, hip, torsoPitch);
  const bodyCenter = { ...bodyPoint(19, -10), rx: 46, ry: 27, tilt: -0.16 + torsoPitch };
  const chest = bodyPoint(51, -26);
  const tailTip = bodyPoint(-59 - 5 * motion * follow,
    -10 + 16 * motion * Math.sin(p - 1.1));
  const head = {
    x: (freeze ? 22 : 43) + motion * (24 * drive + 3 * Math.sin(2 * p)),
    y: -207 + motion * (18 * drive + 3 * Math.sin(2 * p - 0.7)),
    r: 15.5,
    angle: motion * (0.16 * Math.sin(p - 0.55) + 0.035 * Math.sin(2 * p - 0.95)),
  };
  const neckC1 = { x: chest.x + 29 + motion * 10 * drive, y: chest.y - 23 };
  const neckC2 = { x: head.x - 32 - motion * 11 * follow, y: head.y + 20 };
  // Rotate the whole bill as a unit; elastic throat motion lags the power stroke.
  const headPoint = (px, py) => rotatePoint(px, py, head, head.angle);
  const beakUpperBase = headPoint(9, -6);
  const beakLowerBase = headPoint(4, 8);
  const beakTip = headPoint(76, 7);
  const pouchBelly = headPoint(38 + motion * 7 * Math.sin(p - 1.25),
    39 + motion * (9 * Math.sin(p - 1.25) + 2 * Math.sin(2 * p - 0.7)));
  const crest1 = headPoint(-20 - motion * 6 * Math.sin(p - 1.6),
    -15 + motion * 8 * Math.sin(p - 1.6));
  const crest2 = headPoint(-28 - motion * 7 * Math.sin(p - 1.9),
    -7 + motion * 11 * Math.sin(p - 1.9));

  // The wrist stays on the bar while the elbow folds with the moving shoulder.
  const wingShoulder = bodyPoint(25, -23);
  const wingTip = { x: handleGrip.x, y: handleGrip.y + 2 };
  const wingElbow = solveTwoBoneIK(wingShoulder.x, wingShoulder.y, wingTip.x, wingTip.y, 34, 32, 1);
  const leftHip = { x: hip.x + 3, y: hip.y + 6 };
  const rightHip = { x: hip.x - 2, y: hip.y + 6 };
  const leftFoot = { x: leftPedal.x, y: leftPedal.y - 5 };
  const rightFoot = { x: rightPedal.x, y: rightPedal.y - 5 };
  const knee = (h, f) => solveTwoBoneIK(h.x, h.y, f.x, f.y, 52, 54, -1);
  const leftKnee = knee(leftHip, leftFoot);
  const rightKnee = knee(rightHip, rightFoot);

  const mix = clamp01(lissajousMix);
  const c = Math.cos(slope) * scale, s = Math.sin(slope) * scale;
  const xf = (point) => {
    let px = point.x, py = point.y;
    if (mix > 0) {
      const ph = time * 14 + px * 0.045 + py * 0.035;
      const lx = 115 * Math.sin(15 * time + px * 0.03);
      const ly = 115 * Math.sin(20 * time + py * 0.03 + 0.9) - 115;
      px = px * (1 - mix) + (lx + 6 * Math.sin(ph)) * mix;
      py = py * (1 - mix) + ly * mix;
    }
    return { ...point, x: x + px * c - py * s, y: y + px * s + py * c };
  };
  return {
    root: { x, y, scale, slope }, poseMode, pedalAngle, wheelAngle: wAngle, time,
    rearWheel: { ...xf(rearWheel), r: 46 * scale },
    frontWheel: { ...xf(frontWheel), r: 46 * scale },
    bb: xf(bb), leftPedal: xf(leftPedal), rightPedal: xf(rightPedal),
    seatCluster: xf(seatCluster), saddle: xf(saddle),
    headTop: xf(headTop), headBot: xf(headBot), stemTop: xf(stemTop), handleGrip: xf(handleGrip),
    hip: xf(hip), bodyCenter: { ...xf(bodyCenter), rx: 46 * scale, ry: 27 * scale, tilt: bodyCenter.tilt + slope },
    tailTip: xf(tailTip), chest: xf(chest), neckC1: xf(neckC1), neckC2: xf(neckC2),
    head: { ...xf(head), r: head.r * scale, angle: head.angle + slope },
    beakUpperBase: xf(beakUpperBase), beakLowerBase: xf(beakLowerBase), beakTip: xf(beakTip),
    pouchBelly: xf(pouchBelly), crest1: xf(crest1), crest2: xf(crest2),
    wingShoulder: xf(wingShoulder), wingElbow: xf(wingElbow), wingTip: xf(wingTip),
    leftHip: xf(leftHip), rightHip: xf(rightHip), leftKnee: xf(leftKnee), rightKnee: xf(rightKnee),
    leftFoot: xf(leftFoot), rightFoot: xf(rightFoot),
  };
}


/**
 * Draws a crisp, expressive Pelican + Bicycle on a 2D `CanvasRenderingContext2D` or `p5.Graphics` (2D).
 * Supports palette customization, shadow-only mode (#14 Nosferatu), wireframe phosphor (#15),
 * Bada Shanren roll-eye (#9), etc. Used in Phase 1 animatic & reusable as a base guide.
 */
export function drawRig2D(ctx, rig, style = {}) {
  const s = rig.root.scale;
  const {
    silhouetteColor = null, // if set, renders entire rig in flat silhouette (e.g. Nosferatu shadow!)
    wireframeColor = null, // if set, renders glowing vector lines only (e.g. Oscilloscope!)
    featherFill = '#f8f5ec',
    featherShade = '#dfd7c5',
    wingTipDark = '#2d2b28',
    beakFill = '#f0a22e',
    pouchFill = '#e06d28',
    legFill = '#d96b27',
    frameStroke = '#b63b2e',
    metalStroke = '#3a3835',
    tireStroke = '#23211f',
    inkOutline = '#1d1b18',
    lineScale = 1.0,
    eyeMode = rig.poseMode === 'bada_eye' ? 'bada' : 'normal',
  } = style;

  const isSil = Boolean(silhouetteColor);
  const isWire = Boolean(wireframeColor);
  const strokeMain = isWire ? wireframeColor : isSil ? silhouetteColor : inkOutline;
  const lw = (w) => Math.max(0.8, w * s * lineScale);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const drawWheel = (w) => {
    // Spokes
    ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
    ctx.lineWidth = lw(isWire ? 1.4 : 1.3);
    const numSpokes = 10;
    for (let i = 0; i < numSpokes; i++) {
      const a = w.angle + (i * Math.PI * 2) / numSpokes;
      ctx.beginPath();
      ctx.moveTo(w.x, w.y);
      ctx.lineTo(w.x + Math.cos(a) * (w.r - 3 * s), w.y + Math.sin(a) * (w.r - 3 * s));
      ctx.stroke();
    }
    // Rim & Tire
    if (!isSil && !isWire) {
      ctx.strokeStyle = '#c8c2b4';
      ctx.lineWidth = lw(3.2);
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r - 2.5 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : tireStroke;
    ctx.lineWidth = lw(isWire ? 2.6 : 4.8);
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
    ctx.stroke();

    // Hub
    ctx.fillStyle = strokeMain;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 4.2 * s, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawLeg = (hipPt, kneePt, footPt, pedalPt, darken = false) => {
    // Crank arm behind/front
    ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
    ctx.lineWidth = lw(3.4);
    ctx.beginPath();
    ctx.moveTo(rig.bb.x, rig.bb.y);
    ctx.lineTo(pedalPt.x, pedalPt.y);
    ctx.stroke();

    // Thigh + Shin
    ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : darken ? '#b55219' : legFill;
    ctx.lineWidth = lw(5.2);
    ctx.beginPath();
    ctx.moveTo(hipPt.x, hipPt.y);
    ctx.lineTo(kneePt.x, kneePt.y);
    ctx.lineTo(footPt.x, footPt.y);
    ctx.stroke();

    if (!isSil && !isWire) {
      ctx.strokeStyle = inkOutline;
      ctx.lineWidth = lw(1.5);
      ctx.stroke();
    }

    // Webbed orange foot on pedal
    ctx.fillStyle = isWire ? 'transparent' : isSil ? silhouetteColor : darken ? '#b55219' : legFill;
    ctx.strokeStyle = strokeMain;
    ctx.lineWidth = lw(1.8);
    ctx.beginPath();
    ctx.moveTo(footPt.x - 4 * s, footPt.y);
    ctx.lineTo(footPt.x + 15 * s, footPt.y + 2 * s);
    ctx.lineTo(footPt.x + 9 * s, footPt.y + 7 * s);
    ctx.lineTo(footPt.x - 5 * s, footPt.y + 5 * s);
    ctx.closePath();
    if (!isWire) ctx.fill();
    ctx.stroke();

    // Pedal block
    ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
    ctx.lineWidth = lw(3.8);
    ctx.beginPath();
    ctx.moveTo(pedalPt.x - 8 * s, pedalPt.y + 2 * s);
    ctx.lineTo(pedalPt.x + 8 * s, pedalPt.y + 2 * s);
    ctx.stroke();
  };

  // 1. Far (left) leg & crank
  drawLeg(rig.leftHip, rig.leftKnee, rig.leftFoot, rig.leftPedal, true);

  // 2. Wheels
  drawWheel(rig.rearWheel);
  drawWheel(rig.frontWheel);

  // 3. Chain & chainring
  ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
  ctx.lineWidth = lw(1.8);
  ctx.beginPath();
  ctx.arc(rig.bb.x, rig.bb.y, 12 * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y - 5 * s);
  ctx.lineTo(rig.bb.x, rig.bb.y - 12 * s);
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y + 5 * s);
  ctx.lineTo(rig.bb.x, rig.bb.y + 12 * s);
  ctx.stroke();

  // 4. Bicycle Diamond Frame + Fork + Stem/Handlebar
  ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : frameStroke;
  ctx.lineWidth = lw(4.4);
  ctx.beginPath();
  // Rear triangle
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.lineTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  ctx.closePath();
  // Main triangle
  ctx.moveTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  // Front fork
  ctx.moveTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.frontWheel.x, rig.frontWheel.y);
  ctx.stroke();

  // Seatpost, Saddle & Handlebar
  ctx.strokeStyle = isWire ? wireframeColor : isSil ? silhouetteColor : metalStroke;
  ctx.lineWidth = lw(3.4);
  ctx.beginPath();
  ctx.moveTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.saddle.x, rig.saddle.y);
  ctx.moveTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.stemTop.x, rig.stemTop.y);
  ctx.quadraticCurveTo(rig.stemTop.x - 4 * s, rig.stemTop.y - 5 * s, rig.handleGrip.x, rig.handleGrip.y);
  ctx.stroke();

  // Saddle pad
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(5.5);
  ctx.beginPath();
  ctx.moveTo(rig.saddle.x - 13 * s, rig.saddle.y);
  ctx.lineTo(rig.saddle.x + 12 * s, rig.saddle.y + 1 * s);
  ctx.stroke();

  // 5. Pelican Torso, Tail & S-Neck
  ctx.fillStyle = isWire ? 'transparent' : isSil ? silhouetteColor : featherFill;
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(2.6);

  // Plump torso + pointed tail feathers
  ctx.beginPath();
  ctx.moveTo(rig.tailTip.x, rig.tailTip.y);
  ctx.quadraticCurveTo(
    rig.bodyCenter.x - 36 * s,
    rig.bodyCenter.y - 28 * s,
    rig.chest.x + 8 * s,
    rig.chest.y - 6 * s
  );
  ctx.quadraticCurveTo(
    rig.bodyCenter.x + 34 * s,
    rig.bodyCenter.y + 26 * s,
    rig.hip.x - 14 * s,
    rig.hip.y + 14 * s
  );
  ctx.quadraticCurveTo(
    rig.bodyCenter.x - 46 * s,
    rig.bodyCenter.y + 14 * s,
    rig.tailTip.x,
    rig.tailTip.y
  );
  ctx.closePath();
  if (!isWire) ctx.fill();
  ctx.stroke();

  // S-curved neck (thick stroke + outline)
  if (!isWire) {
    ctx.strokeStyle = isSil ? silhouetteColor : featherFill;
    ctx.lineWidth = lw(19);
    ctx.beginPath();
    ctx.moveTo(rig.chest.x - 2 * s, rig.chest.y + 4 * s);
    ctx.bezierCurveTo(rig.neckC1.x, rig.neckC1.y, rig.neckC2.x, rig.neckC2.y, rig.head.x, rig.head.y);
    ctx.stroke();
  }
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(2.4);
  ctx.beginPath();
  ctx.moveTo(rig.chest.x - 9 * s, rig.chest.y - 1 * s);
  ctx.bezierCurveTo(
    rig.neckC1.x - 8 * s,
    rig.neckC1.y,
    rig.neckC2.x - 9 * s,
    rig.neckC2.y,
    rig.head.x - 10 * s,
    rig.head.y
  );
  ctx.moveTo(rig.chest.x + 7 * s, rig.chest.y + 7 * s);
  ctx.bezierCurveTo(
    rig.neckC1.x + 9 * s,
    rig.neckC1.y + 3 * s,
    rig.neckC2.x + 9 * s,
    rig.neckC2.y + 2 * s,
    rig.head.x + 8 * s,
    rig.head.y + 5 * s
  );
  ctx.stroke();

  // Head + Crown Crest
  ctx.fillStyle = isWire ? 'transparent' : isSil ? silhouetteColor : featherFill;
  ctx.beginPath();
  ctx.arc(rig.head.x, rig.head.y, rig.head.r, 0, Math.PI * 2);
  if (!isWire) ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rig.head.x - 9 * s, rig.head.y - 9 * s);
  ctx.lineTo(rig.crest1.x, rig.crest1.y);
  ctx.moveTo(rig.head.x - 11 * s, rig.head.y - 4 * s);
  ctx.lineTo(rig.crest2.x, rig.crest2.y);
  ctx.stroke();

  // 6. Iconic Pelican Gular Throat Pouch + Long Hooked Beak
  // Gular pouch first (underneath upper mandible)
  ctx.fillStyle = isWire ? 'transparent' : isSil ? silhouetteColor : pouchFill;
  ctx.beginPath();
  ctx.moveTo(rig.beakLowerBase.x, rig.beakLowerBase.y);
  ctx.quadraticCurveTo(rig.pouchBelly.x, rig.pouchBelly.y, rig.beakTip.x - 3 * s, rig.beakTip.y);
  ctx.lineTo(rig.beakUpperBase.x, rig.beakUpperBase.y + 5 * s);
  ctx.closePath();
  if (!isWire) ctx.fill();
  ctx.stroke();

  // Upper mandible with hooked tip
  ctx.fillStyle = isWire ? 'transparent' : isSil ? silhouetteColor : beakFill;
  ctx.beginPath();
  ctx.moveTo(rig.beakUpperBase.x, rig.beakUpperBase.y);
  ctx.lineTo(rig.beakTip.x, rig.beakTip.y - 3 * s);
  ctx.quadraticCurveTo(rig.beakTip.x + 5 * s, rig.beakTip.y + 4 * s, rig.beakTip.x - 2 * s, rig.beakTip.y + 5 * s);
  ctx.lineTo(rig.beakLowerBase.x, rig.beakLowerBase.y + 1 * s);
  ctx.closePath();
  if (!isWire) ctx.fill();
  ctx.stroke();

  // Eye (unless silhouette)
  if (!isSil) {
    const ex = rig.head.x + 4 * s;
    const ey = rig.head.y - 3 * s;
    ctx.fillStyle = isWire ? wireframeColor : '#ffffff';
    ctx.strokeStyle = strokeMain;
    ctx.lineWidth = lw(1.6);
    ctx.beginPath();
    ctx.arc(ex, ey, 4.6 * s, 0, Math.PI * 2);
    if (!isWire) ctx.fill();
    ctx.stroke();

    ctx.fillStyle = strokeMain;
    ctx.beginPath();
    const pupilY = eyeMode === 'bada' ? ey - 2.3 * s : ey;
    const pupilX = eyeMode === 'bada' ? ex - 0.8 * s : ex + 1.2 * s;
    ctx.arc(pupilX, pupilY, 1.9 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Near (right) Leg & Crank
  drawLeg(rig.rightHip, rig.rightKnee, rig.rightFoot, rig.rightPedal, false);

  // 8. Foreground Wing reaching toward handlebar
  ctx.fillStyle = isWire ? 'transparent' : isSil ? silhouetteColor : featherShade;
  ctx.strokeStyle = strokeMain;
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  ctx.moveTo(rig.wingShoulder.x, rig.wingShoulder.y);
  ctx.quadraticCurveTo(
    rig.wingElbow.x - 16 * s,
    rig.wingElbow.y + 18 * s,
    rig.wingTip.x + 4 * s,
    rig.wingTip.y + 2 * s
  );
  ctx.quadraticCurveTo(
    rig.wingElbow.x + 12 * s,
    rig.wingElbow.y - 8 * s,
    rig.wingShoulder.x + 12 * s,
    rig.wingShoulder.y + 2 * s
  );
  ctx.closePath();
  if (!isWire) ctx.fill();
  ctx.stroke();

  // Dark primary feather tips accent
  if (!isSil && !isWire) {
    ctx.strokeStyle = wingTipDark;
    ctx.lineWidth = lw(2.2);
    ctx.beginPath();
    ctx.moveTo(rig.wingTip.x - 8 * s, rig.wingTip.y + 2 * s);
    ctx.lineTo(rig.wingTip.x + 4 * s, rig.wingTip.y + 1 * s);
    ctx.stroke();
  }

  ctx.restore();
}
