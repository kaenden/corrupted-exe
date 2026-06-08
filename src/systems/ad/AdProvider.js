// The interface every ad provider implements (GDD §12). All methods are safe to call
// with no SDK — the base class is the NullProvider used in production when no SDK loaded.
export class AdProvider {
  async init() {}
  loadingStart() {}
  loadingStop() {}
  gameplayStart() {}
  gameplayStop() {}
  async showInterstitial() {}
  async showRewarded() { return false; } // no free reward when no real ad ran
}
