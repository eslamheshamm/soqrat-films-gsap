import { ScrollSmoother } from "gsap/ScrollSmoother"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export default class Scroll {
  scroll: number
  s: globalThis.ScrollSmoother | null

  constructor() {
    window.scrollTo(0, 0)
    this.init()
  }

  init() {
    this.scroll = 0
    this.s = null
    ScrollTrigger.refresh()
  }

  reset() {
    window.scrollTo(0, 0)
  }

  destroy() {
    this.s = null
  }

  getScroll() {
    this.scroll = window.scrollY || 0
    return this.scroll
  }
}
