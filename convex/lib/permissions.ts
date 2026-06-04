export type Role = "owner" | "admin" | "member";

const RANK: Record<Role, number> = { owner: 3, admin: 2, member: 1 };

/** Create, rename and delete channels. */
export const canManageChannels = (role: Role) => RANK[role] >= RANK.admin;

/** Rename the server and rotate its invite code. */
export const canManageServer = (role: Role) => RANK[role] >= RANK.admin;

export const canDeleteServer = (role: Role) => role === "owner";

/** Promote members to admin or demote admins. */
export const canChangeRoles = (role: Role) => role === "owner";

/** Admins can remove members; only the owner can remove admins. Nobody removes the owner. */
export const canKick = (actor: Role, target: Role) =>
  RANK[actor] >= RANK.admin && RANK[actor] > RANK[target];

/** Moderators can delete anyone's channel messages, everyone can delete their own. */
export const canDeleteOthersMessages = (role: Role) => RANK[role] >= RANK.admin;
