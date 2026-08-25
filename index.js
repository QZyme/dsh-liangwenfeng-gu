'use strict';
/**
 * dsh-liangwenfeng-gu — installed (bundle) HOST half.
 *
 * This module is the cordis plugin the loader mounts when the package is
 * installed through the official CLI:
 *
 *   dsh plugin --profile web add github:QZyme/dsh-liangwenfeng-gu
 *
 * The `dsh.bundle.patch` layer (cordis.patch.yml) inserts this package's row;
 * the loader requires this main entry and uses its `name` + `apply` exports.
 * The feature is pure client-side (browser): a status badge injected into the
 * `conversation.input.overlay` slot and a global stylesheet reserving the
 * composer's right space, both in the client half (`exports["./client"]` ->
 * client.js). The host half is intentionally a no-op.
 */
const NAME = 'dsh-liangwenfeng-gu';

function apply() {
  // Pure client-side plugin — nothing to do in the host realm.
}

module.exports = {
  name: NAME,
  apply
};
