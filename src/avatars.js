// A player's mark.
//
// This used to be a list of 14 emoji, defined verbatim in two files. Emoji
// render differently on every OS (so the product had no fixed appearance), sit
// on the text baseline at inherited size with no alignment control, and carry no
// relationship to the palette. In the poster world a player is a plane: one of
// the four colours in one of four silhouettes, carrying their initial.
//
// Tokens are stored in the existing `avatar` column, so there is no migration.
// Anything that is not a token — every emoji already in the database — is hashed
// to a stable look instead, so nobody's mark changes under them.

export const AVATAR_PLANES = ['indigo', 'vermilion', 'gold', 'black']
export const AVATAR_SHAPES = ['block', 'disc', 'square', 'wedge']

// 16 marks: 4 colours x 4 silhouettes.
export const AVATAR_TOKENS = AVATAR_PLANES.flatMap((_, p) =>
  AVATAR_SHAPES.map((__, s) => `p${p}s${s}`)
)

export const DEFAULT_AVATAR = AVATAR_TOKENS[0]

const TOKEN_RE = /^p([0-3])s([0-3])$/

export function parseAvatarToken(value) {
  const m = TOKEN_RE.exec(String(value || ''))
  return m ? { plane: Number(m[1]), shape: Number(m[2]) } : null
}
