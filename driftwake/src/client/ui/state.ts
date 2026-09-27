/** Small piece of cross-window mutable state that doesn't belong on the bus. */
export const uiState = {
  /** Shop currently open (so Inventory's context menu can offer "Sell"). */
  openShopId: null as string | null,
  /** Profession trainer NPC currently open at (so Professions window can allow learn/buy). */
  trainerNpcId: null as string | null,
  trainerProfessionId: null as string | null,
};
