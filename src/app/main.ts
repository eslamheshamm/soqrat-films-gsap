import Canvas from "./components/canvas"
import Scroll from "./components/scroll"
//@ts-ignore
import barba from "@barba/core"

import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollSmoother } from "gsap/ScrollSmoother"
//@ts-ignore
import { Flip } from "gsap/Flip"
import { Observer } from "gsap/Observer"
import { ScrollToPlugin } from "gsap/ScrollToPlugin"
import gsap from "gsap"
import Media from "./components/media"
import { SplitText } from "gsap/SplitText"
import TextAnimation from "./components/text-animation"
import FontFaceObserver from "fontfaceobserver"

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, Flip, SplitText, Observer, ScrollToPlugin)

class App {
  canvas: Canvas
  scroll: Scroll
  template: "home" | "detail"

  mediaHomeState: Flip.FlipState
  scrollBlocked: boolean = false
  scrollTop: number
  textAnimation: TextAnimation
  fontLoaded: boolean = false
  filmsObserver: Observer | null = null

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
            this.scroll.s?.paused(true)
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

            this.loadImages(() => {
              this.canvas.medias = []
              this.canvas.createMedias()
              this.textAnimation.animateIn({ delay: 0.3 })
            })

            this.initFilmsScroll()
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
            this.scroll.s?.paused(true)

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

  initFilmsScroll() {
    this.destroyFilmsScroll()

    const panels = gsap.utils.toArray<HTMLElement>("[data-films-panel]")
    if (!panels.length) return

    const sections = panels
    let currentIndex = -1
    let isAnimating = false
    let cooldown = false

    function goToSection(index: number) {
      if (index < -1 || index >= sections.length || isAnimating || cooldown) return
      isAnimating = true
      cooldown = true
      currentIndex = index

      // Scroll back to top (header) when index is -1
      if (index === -1) {
        gsap.to(window, {
          scrollTo: { y: 0, autoKill: false },
          duration: 0.8,
          ease: "power3.inOut",
          onComplete: () => {
            isAnimating = false
            gsap.delayedCall(0.4, () => { cooldown = false })
          },
        })
        return
      }

      const el = sections[index]
      const elTop = el.offsetTop
      const elHeight = el.offsetHeight
      const viewportHeight = window.innerHeight
      const targetScroll = elTop - (viewportHeight - elHeight) / 2

      gsap.to(window, {
        scrollTo: { y: Math.max(0, targetScroll), autoKill: false },
        duration: 0.8,
        ease: "power3.inOut",
        onComplete: () => {
          isAnimating = false
          gsap.delayedCall(0.4, () => { cooldown = false })
        },
      })
    }

    this.filmsObserver = Observer.create({
      type: "wheel,touch,pointer",
      wheelSpeed: -1,
      tolerance: 50,
      onUp: () => goToSection(currentIndex + 1),
      onDown: () => goToSection(currentIndex - 1),
      preventDefault: true,
    })
  }

  destroyFilmsScroll() {
    if (this.filmsObserver) {
      this.filmsObserver.kill()
      this.filmsObserver = null
    }
  }

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
