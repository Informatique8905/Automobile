import assert from "node:assert/strict";
import { preFiltrer } from "./pre-filtre.js";
import { agentsSecurite } from "./agents/index.js";
assert.equal(preFiltrer("bonjour").autorise, true);
assert.equal(preFiltrer("mon mot de passe est x").autorise, false);
assert.ok(agentsSecurite.length > 0);
