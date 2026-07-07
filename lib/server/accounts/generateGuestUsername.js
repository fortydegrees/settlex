import { randomInt } from "node:crypto";
import { buildGeneratedGuestUsername } from "../../shared/guestUsername.js";

export const generateGuestUsername = () =>
  buildGeneratedGuestUsername({
    randomInt: (min, max) => randomInt(min, max + 1),
  });
