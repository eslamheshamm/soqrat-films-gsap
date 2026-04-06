import Canvas from "./components/canvas"
import Scroll from "./components/scroll"
//@ts-ignore
import barba from "@barba/core"

import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollSmoother } from "gsap/ScrollSmoother"
//@ts-ignore
import { Flip } from "gsap/Flip"
import gsap from "gsap"
import Media from "./components/media"
import { SplitText } from "gsap/SplitText"
import TextAnimation from "./components/text-animation"
import FontFaceObserver from "fontfaceobserver"

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, Flip, SplitText)

class App {
  canvas: Canvas
  scroll: Scroll
  template: "home" | "detail"

  mediaHomeState: Flip.FlipState
  scrollBlocked: boolean = false
  scrollTop: number
  textAnimation: TextAnimation
  fontLoaded: boolean = false
  sliderCleanup: (() => void) | null = null

  constructor() {
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual"
    }

    this.scroll = new Scroll()
    this.canvas = new Canvas()
    this.textAnimation = new TextAnimation()
    this.loadFont(() => {
      this.textAnimation.init()
    })

    this.template = this.getCurrentTemplate()
    this.initMobileMenu()

    this.initSlider()

    this.loadImages(() => {
      this.canvas.createMedias()
      this.initFilmsScroll()
      this.entryAnimation()
      if (this.fontLoaded) {
        this.textAnimation.init()
        this.textAnimation.animateIn()
      } else {
        window.addEventListener("fontLoaded", () => {
          gsap.delayedCall(0, () => {
            gsap.delayedCall(0, () => {
              this.textAnimation.init()
              this.textAnimation.animateIn({ delay: 0.3 })
            })
          })
        })
      }
    })

    let activeLinkImage: HTMLImageElement
    let scrollTop: number

    barba.init({
      prefetchIgnore: true,
      transitions: [
        {
          name: "default-transition",
          before: () => {
            this.scrollBlocked = true
            this.scroll.lenis?.stop()
          },
          leave: () => {
            const medias = this.canvas.medias && this.canvas.medias

            medias?.forEach((media) => {
              if (!media) return
              media.onResize(this.canvas.sizes)
              gsap.set(media.element, {
                visibility: "hidden",
                opacity: 0,
              })
            })

            return new Promise<void>((resolve) => {
              const tl = this.textAnimation.animateOut()

              this.canvas.medias?.forEach((media) => {
                if (!media) return
                tl.fromTo(
                  media.material.uniforms.uProgress,
                  { value: 1 },
                  {
                    duration: 1,
                    ease: "linear",
                    value: 0,
                  },
                  0,
                )
              })

              tl.call(() => {
                this.textAnimation.destroy()
                resolve()
              })
            })
          },
          beforeEnter: () => {
            this.canvas.medias?.forEach((media) => {
              media?.destroy()
              media = null
            })

            this.destroyFilmsScroll()
            this.destroySlider()
            this.scrollBlocked = false

            this.scroll.reset()
            this.scroll.destroy()
          },
          after: () => {
            this.scroll.init()
            this.textAnimation.init()

            const template = this.getCurrentTemplate()
            this.setTemplate(template)

            this.entryAnimation()
            this.initSlider()

            this.loadImages(() => {
              this.canvas.medias = []
              this.canvas.createMedias()
              this.textAnimation.animateIn({ delay: 0.3 })
            })

            this.initFilmsScroll()
            this.initMobileMenu()
          },
        },
        {
          name: "home-detail",
          from: {
            custom: () => {
              const activeLink = document.querySelector(
                'a[data-home-link-active="true"]',
              )
              if (!activeLink) return false

              return true
            },
          },
          before: () => {
            this.scrollBlocked = true
            this.scroll.lenis?.stop()

            const tl = this.textAnimation.animateOut()

            activeLinkImage = document.querySelector(
              'a[data-home-link-active="true"] img',
            ) as HTMLImageElement

            this.canvas.medias?.forEach((media) => {
              if (!media) return
              media.scrollTrigger.kill()

              const currentProgress = media.material.uniforms.uProgress.value
              const totalDuration = 1.2

              if (media.element !== activeLinkImage) {
                const remainingDuration = totalDuration * currentProgress

                tl.to(
                  media.material.uniforms.uProgress,
                  {
                    duration: remainingDuration,
                    value: 0,
                    ease: "linear",
                  },
                  0,
                )
              } else {
                const remainingDuration = totalDuration * (1 - currentProgress)

                tl.to(
                  media.material.uniforms.uProgress,
                  {
                    value: 1,
                    duration: remainingDuration,
                    ease: "linear",
                    onComplete: () => {
                      media.element.style.opacity = "1"
                      media.element.style.visibility = "visible"
                      gsap.set(media.material.uniforms.uProgress, { value: 0 })
                    },
                  },
                  0,
                )
              }
            })

            return new Promise<void>((resolve) => {
              tl.call(() => {
                resolve()
              })
            })
          },

          leave: () => {
            scrollTop = this.scroll.getScroll()

            const container = document.querySelector(
              ".container",
            ) as HTMLElement
            container.style.position = "fixed"
            container.style.top = `-${scrollTop}px`
            container.style.width = "100%"
            container.style.zIndex = "1000"

            this.mediaHomeState = Flip.getState(activeLinkImage)
            this.textAnimation.destroy()
          },
          beforeEnter: () => {
            this.scroll.reset()
            this.scroll.destroy()
          },
          after: () => {
            this.scroll.init()
            this.textAnimation.init()
            this.initMobileMenu()

            const detailContainer = document.querySelector(
              ".details-container",
            ) as HTMLElement

            detailContainer.innerHTML = ""
            detailContainer.append(activeLinkImage)

            const template = this.getCurrentTemplate()
            this.setTemplate(template)

            return new Promise<void>((resolve) => {
              let activeMedia: Media | null = null

              this.textAnimation.animateIn({ delay: 0.3 })

              Flip.from(this.mediaHomeState, {
                absolute: true,

                duration: 1,
                ease: "power3.inOut",

                onComplete: () => {
                  this.scrollBlocked = false
                  this.canvas.medias?.forEach((media) => {
                    if (!media) return
                    if (media.element !== activeLinkImage) {
                      media.destroy()
                      media = null
                    } else {
                      activeMedia = media
                    }
                  })

                  this.canvas.medias = [activeMedia]

                  resolve()
                },
              })
            })
          },
        },
      ],
    })

    window.addEventListener("resize", this.onResize.bind(this))

    this.render = this.render.bind(this)
    gsap.ticker.add(this.render)
  }

  entryAnimation() {
    const header = document.querySelector(".frame") as HTMLElement
    const gridContainer = document.querySelector(".grid-container") as HTMLElement

    if (header) {
      gsap.fromTo(header, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: "power2.out" })
    }

    if (gridContainer) {
      gsap.fromTo(gridContainer, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: "power2.out", delay: 0.2 })
    }
  }

  initMobileMenu() {
    const hamburger = document.querySelector("[data-hamburger]") as HTMLElement
    const menu = document.querySelector("[data-mobile-menu]") as HTMLElement
    const bg = document.querySelector("[data-mobile-menu-bg]") as HTMLElement
    const overlay = menu?.querySelector(".mobile-menu__overlay") as HTMLElement
    const closeBtn = menu?.querySelector("[data-mobile-menu-close]") as HTMLElement
    const links = menu?.querySelectorAll("[data-mobile-menu-nav] a")

    if (!hamburger || !menu || !bg || !links?.length) return

    let isOpen = false
    let tl: gsap.core.Timeline | null = null

    const open = () => {
      isOpen = true
      hamburger.classList.add("is-open")
      menu.classList.add("is-open")
      this.scroll.lenis?.stop()

      tl = gsap.timeline()

      tl.to(bg, {
        y: 0,
        duration: 0.8,
        ease: "power3.inOut",
      })

      tl.to(overlay, {
        opacity: 1,
        duration: 0.5,
        ease: "power2.out",
      }, 0.3)

      tl.to(links, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: "power3.out",
      }, 0.5)

      tl.to(closeBtn, {
        opacity: 1,
        duration: 0.4,
        ease: "power2.out",
      }, 0.6)
    }

    const close = () => {
      isOpen = false
      hamburger.classList.remove("is-open")

      const closeTl = gsap.timeline({
        onComplete: () => {
          menu.classList.remove("is-open")
          this.scroll.lenis?.start()
        },
      })

      closeTl.to(closeBtn, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.in",
      })

      closeTl.to(links, {
        opacity: 0,
        y: 20,
        duration: 0.3,
        stagger: 0.04,
        ease: "power2.in",
      }, 0.05)

      closeTl.to(overlay, {
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
      }, 0.15)

      closeTl.to(bg, {
        y: "-100%",
        duration: 0.6,
        ease: "power3.inOut",
      }, 0.2)
    }

    hamburger.addEventListener("click", () => {
      if (isOpen) close()
      else open()
    })

    closeBtn?.addEventListener("click", close)

    links.forEach((link) => {
      link.addEventListener("click", () => {
        if (isOpen) close()
      })
    })
  }

  initSlider() {
    this.destroySlider()

    const slider = document.querySelector("[data-slider]")
    if (!slider) return

    const slides = slider.querySelectorAll<HTMLElement>(".slider__slide")
    const prevBtn = slider.querySelector("[data-slider-prev]")
    const nextBtn = slider.querySelector("[data-slider-next]")
    const total = slides.length
    if (total === 0) return

    let current = 0
    let isAnimating = false
    let autoTimer: ReturnType<typeof setTimeout>

    // Reset all slides to initial state
    slides.forEach((s, i) => {
      s.classList.toggle("slider__slide--active", i === 0)
      gsap.set(s, { opacity: i === 0 ? 1 : 0, filter: "blur(0px)", scale: 1 })
    })

    const goTo = (index: number) => {
      if (isAnimating || index === current) return
      isAnimating = true

      const outSlide = slides[current]
      const inSlide = slides[index]

      const tl = gsap.timeline({
        onComplete: () => {
          outSlide.classList.remove("slider__slide--active")
          isAnimating = false
          current = index
          resetAutoPlay()
        },
      })

      inSlide.classList.add("slider__slide--active")

      tl.to(outSlide, {
        opacity: 0,
        filter: "blur(20px)",
        scale: 1.05,
        duration: 1,
        ease: "power2.inOut",
      }, 0)

      tl.fromTo(inSlide, {
        opacity: 0,
        filter: "blur(20px)",
        scale: 1.05,
      }, {
        opacity: 1,
        filter: "blur(0px)",
        scale: 1,
        duration: 1,
        ease: "power2.inOut",
      }, 0.15)
    }

    const next = () => goTo((current + 1) % total)
    const prev = () => goTo((current - 1 + total) % total)

    const resetAutoPlay = () => {
      clearTimeout(autoTimer)
      autoTimer = setTimeout(next, 2000)
    }

    prevBtn?.addEventListener("click", prev)
    nextBtn?.addEventListener("click", next)
    resetAutoPlay()

    this.sliderCleanup = () => {
      clearTimeout(autoTimer)
      prevBtn?.removeEventListener("click", prev)
      nextBtn?.removeEventListener("click", next)
    }
  }

  destroySlider() {
    if (this.sliderCleanup) {
      this.sliderCleanup()
      this.sliderCleanup = null
    }
  }

  initFilmsScroll() {}

  destroyFilmsScroll() {}

  getCurrentTemplate() {
    return document
      .querySelector("[data-page-template]")
      ?.getAttribute("data-page-template") as "home" | "detail"
  }

  setTemplate(template: string) {
    this.template = template as "home" | "detail"
  }

  loadImages(callback?: () => void) {
    const medias = document.querySelectorAll("img")
    let loadedImages = 0
    const totalImages = medias.length

    medias.forEach((img) => {
      if (img.complete) {
        loadedImages++
      } else {
        img.addEventListener("load", () => {
          loadedImages++
          if (loadedImages === totalImages) {
            this.onReady(callback)
          }
        })
      }
    })

    if (loadedImages === totalImages) {
      this.onReady(callback)
    }
  }

  onReady(callback?: () => void) {
    if (callback) callback()
    ScrollTrigger.refresh()
  }

  loadFont(onLoaded: () => void) {
    const satoshi = new FontFaceObserver("Satoshi")

    satoshi.load().then(() => {
      onLoaded()
      this.fontLoaded = true
      window.dispatchEvent(new Event("fontLoaded"))
    })
  }

  onResize() {
    this.textAnimation?.onResize()
    this.canvas?.onResize()
  }

  render() {
    this.scrollTop = this.scroll?.getScroll() || 0
    this.canvas?.render(this.scrollTop, !this.scrollBlocked)
  }
}

export default new App()
