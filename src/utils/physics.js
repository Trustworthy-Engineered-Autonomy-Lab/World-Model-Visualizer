
// src/visualizers/piwm/utils/physics.js
export const GRAVITY = 9.8;
export const MASS_CART = 1.0;
export const MASS_POLE = 0.1;
export const TOTAL_MASS = MASS_POLE + MASS_CART;
export const LENGTH = 0.5;
export const POLEMASS_LENGTH = MASS_POLE * LENGTH;
export const FORCE_MAG = 10.0;
export const TAU = 0.02;

export function transitionModel(state, action) {
  const { x, xDot, theta, thetaDot } = state;
  const force = action === 1 ? FORCE_MAG : -FORCE_MAG;

  const costheta = Math.cos(theta);
  const sintheta = Math.sin(theta);

  const temp = (force + POLEMASS_LENGTH * thetaDot * thetaDot * sintheta) / TOTAL_MASS;
  const thetaAcc =
    (GRAVITY * sintheta - costheta * temp) /
    (LENGTH * (4.0 / 3.0 - (MASS_POLE * costheta * costheta) / TOTAL_MASS));
  const xAcc = temp - (POLEMASS_LENGTH * thetaAcc * costheta) / TOTAL_MASS;

  return {
    x: x + TAU * xDot,
    xDot: xDot + TAU * xAcc,
    theta: theta + TAU * thetaDot,
    thetaDot: thetaDot + TAU * thetaAcc,
  };
}

export function learnedTransitionModel(
  state,
  action,
  { force_mag = 11.26, mass_cart = 1.017, mass_pole = 0.103, length = 0.5 } = {}
) {
  const { x, xDot, theta, thetaDot } = state;

  const total_mass = mass_cart + mass_pole;
  const polemass_length = mass_pole * length;
  const force = action === 1 ? force_mag : -force_mag;

  const costheta = Math.cos(theta);
  const sintheta = Math.sin(theta);

  const temp = (force + polemass_length * thetaDot * thetaDot * sintheta) / total_mass;
  const thetaAcc =
    (GRAVITY * sintheta - costheta * temp) /
    (length * (4.0 / 3.0 - (mass_pole * costheta * costheta) / total_mass));
  const xAcc = temp - (polemass_length * thetaAcc * costheta) / total_mass;

  return {
    x: x + TAU * xDot,
    xDot: xDot + TAU * xAcc,
    theta: theta + TAU * thetaDot,
    thetaDot: thetaDot + TAU * thetaAcc,
  };
}
