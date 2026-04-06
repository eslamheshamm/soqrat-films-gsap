import Lenis from "lenis"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export default class Scroll {
  scroll: number
  lenis: Lenis | null

  constructor() {
    window.scrollTo(0, 0)
    this.scroll = 0
    this.lenis = null
    this.init()
  }

  init() {
    this.scroll = 0

    this.lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    })

    this.lenis.on("scroll", ScrollTrigger.update)

    gsap.ticker.add((time) => {
      this.lenis?.raf(time * 1000)
    })

    gsap.ticker.lagSmoothing(0)
  }

  reset() {
    window.scrollTo(0, 0)
    this.lenis?.scrollTo(0, { immediate: true })
  }

  destroy() {
    this.lenis?.destroy()
    this.lenis = null
  }

  getScroll() {
    this.scroll = this.lenis?.scroll || window.scrollY || 0
    return this.scroll
  }
}
