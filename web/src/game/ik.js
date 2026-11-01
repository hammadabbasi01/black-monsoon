import * as THREE from 'three';

const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3(), E = new THREE.Vector3(), T = new THREE.Vector3();
const n = new THREE.Vector3(), m = new THREE.Vector3(), u0 = new THREE.Vector3(), u1 = new THREE.Vector3();
const q = new THREE.Quaternion(), qw = new THREE.Quaternion(), qp = new THREE.Quaternion();

// rotate `bone` (in world space) so the direction from `from` to `child` matches `to`-`from`, blended by w
function aimBone(bone, from, childPos, target, w) {
  u0.copy(childPos).sub(from).normalize(); u1.copy(target).sub(from).normalize();
  q.setFromUnitVectors(u0, u1);
  if (w < 1) q.slerp(qw.identity(), 1 - w);
  bone.getWorldQuaternion(qw); qw.premultiply(q);
  bone.parent.getWorldQuaternion(qp); bone.quaternion.copy(qp.invert().multiply(qw));
  bone.updateMatrixWorld(true);
}

// Analytic two-bone IK: places `end` at `target`, bending toward `pole`. Blend with weight w.
export function twoBoneIK(upper, lower, end, target, pole, w = 1) {
  upper.getWorldPosition(pA); lower.getWorldPosition(pB); end.getWorldPosition(pC);
  const a = pA.distanceTo(pB), b = pB.distanceTo(pC);
  T.copy(target); let d = T.distanceTo(pA); const maxD = (a + b) * 0.999;
  if (d > maxD) { T.sub(pA).setLength(maxD).add(pA); d = maxD; }
  n.copy(T).sub(pA).normalize();
  const cosA = THREE.MathUtils.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  m.copy(pole).sub(pA); m.addScaledVector(n, -m.dot(n)); if (m.lengthSq() < 1e-8) m.set(0, -1, 0); m.normalize();
  E.copy(pA).addScaledVector(n, a * cosA).addScaledVector(m, a * sinA);
  aimBone(upper, pA, pB, E, w);
  lower.getWorldPosition(pB); end.getWorldPosition(pC);
  aimBone(lower, pB, pC, T, w);
}
