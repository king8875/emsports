/* =========================================================
   EMSPORTS main — GSAP + ScrollTrigger
   Revolut 메인의 스크롤 연출(고정 히어로 → 시트 덮기, 카드 스케일 인,
   가로 스크롤 갤러리, 풀블리드 영상 확장, 마퀴, 하단 도크 CTA)을 재해석
   ========================================================= */
(function () {
	"use strict";

	if (!window.gsap || !window.ScrollTrigger) return;
	gsap.registerPlugin(ScrollTrigger, window.ScrollToPlugin);
	gsap.defaults({ ease: "power3.out", duration: 1 });

	var $ = function (s, c) { return (c || document).querySelector(s); };
	var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

	var header = $("#header");
	var totop = $("#totop");

	/* ---------------------------------------------------------
	   Mobile navigation (모션 설정과 무관하게 동작)
	   --------------------------------------------------------- */
	(function mobileNav() {
		var burger = $("#burger");
		var mnav = $("#mnav");
		if (!burger || !mnav) return;
		var items = $$(".mnav__list > li, .mnav__cta", mnav);
		var open = false;

		var tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } })
			.set(mnav, { visibility: "visible" })
			.fromTo(mnav, { autoAlpha: 0, clipPath: "circle(0% at calc(100% - 40px) 32px)" },
				{ autoAlpha: 1, clipPath: "circle(150% at calc(100% - 40px) 32px)", duration: .7 }, 0)
			.fromTo(items, { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: .06, duration: .6 }, .2)
			.eventCallback("onReverseComplete", function () { gsap.set(mnav, { clearProps: "clipPath" }); });

		function toggle(force) {
			open = typeof force === "boolean" ? force : !open;
			burger.setAttribute("aria-expanded", open);
			burger.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
			mnav.setAttribute("aria-hidden", !open);
			mnav.classList.toggle("is-open", open);
			header.classList.toggle("is-menu-open", open);
			document.body.classList.toggle("is-locked", open);
			open ? tl.timeScale(1).play() : tl.timeScale(1.4).reverse();
		}
		burger.addEventListener("click", function () { toggle(); });
		$$("a", mnav).forEach(function (a) { a.addEventListener("click", function () { toggle(false); }); });
		window.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) toggle(false); });
		window.matchMedia("(min-width: 1101px)").addEventListener("change", function (e) { if (e.matches && open) toggle(false); });
	})();

	/* Back to top */
	if (totop) {
		totop.addEventListener("click", function () {
			gsap.to(window, { scrollTo: 0, duration: 1.2, ease: "power3.inOut" });
		});
	}

	/* ---------------------------------------------------------
	   helpers
	   --------------------------------------------------------- */
	// <br> 기준으로 줄을 나눠 마스크(overflow hidden)로 감싼다.
	function splitLines(el) {
		if (el.dataset.split) return $$(".line__in", el);
		var parts = el.innerHTML.split(/<br\s*\/?>/i);
		el.innerHTML = parts.map(function (p) {
			return '<span class="line"><span class="line__in">' + p + "</span></span>";
		}).join("");
		el.dataset.split = "1";
		return $$(".line__in", el);
	}


	/* ---------------------------------------------------------
	   Rental carousel (Swiper)
	   --------------------------------------------------------- */
	if (window.Swiper && $(".rental-swiper")) {
		new Swiper(".rental-swiper", {
			slidesPerView: "auto",
			spaceBetween: 20,
			grabCursor: true,
			speed: 600
		});
	}

	/* ---------------------------------------------------------
	   Scroll animations
	   --------------------------------------------------------- */
	var mm = gsap.matchMedia();

	mm.add({
		motion: "(prefers-reduced-motion: no-preference)",
		desktop: "(min-width: 768px)"
	}, function (ctx) {
		var c = ctx.conditions;
		if (!c.motion) return;

		/* ---- 헤더: 히어로를 지나면 흰색 바 ---- */
		ScrollTrigger.create({
			trigger: "#intro", start: "top 72px", end: "max",
			toggleClass: { targets: header, className: "is-solid" }
		});

		/* ---- 1. HERO ---- */
		var heroLines = $$("[data-hero-title] .line__in");
		var introTl = gsap.timeline({ defaults: { ease: "power4.out" } });
		introTl
			.from(".hero__bg", { scale: 1.3, duration: 2.2, ease: "power2.out" }, 0)
			.from(heroLines, { yPercent: 115, duration: 1.2, stagger: .12 }, .15)
			.from("[data-hero-fade]", { y: 28, autoAlpha: 0, duration: 1, stagger: .12 }, .6);

		// 히어로 고정 + 다음 섹션이 시트처럼 덮고 올라옴
		var heroTl = gsap.timeline({
			defaults: { ease: "none" },
			scrollTrigger: { trigger: "#hero", start: "top top", end: "+=100%", pin: ".hero__pin", pinSpacing: false, scrub: true }
		});
		heroTl
			.to(".hero__content", { yPercent: -18, autoAlpha: 0, duration: .7 }, 0)
			.to(".hero__bg img", { scale: 1.12 }, 0)
			.to(".hero__overlay", { opacity: 1.6 }, 0);

		/* ---- 공통: 줄 단위 마스크 리빌 ---- */
		$$("[data-lines]").forEach(function (el) {
			var lines = splitLines(el);
			gsap.from(lines, {
				yPercent: 115, duration: 1.1, stagger: .1, ease: "power4.out",
				scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" }
			});
		});

		/* ---- 공통: 페이드 업 ---- */
		$$("[data-fade]").forEach(function (el) {
			gsap.from(el, {
				y: 36, autoAlpha: 0, duration: 1,
				scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" }
			});
		});

		/* ---- 2. 서비스 카드: 스케일 인 + 이미지 패럴랙스 ---- */
		$$("[data-card]").forEach(function (card, i) {
			var img = $("img", card);
			gsap.fromTo(card,
				{ y: 120, scale: .86, autoAlpha: 0 },
				{
					y: 0, scale: 1, autoAlpha: 1, ease: "none",
					scrollTrigger: { trigger: card, start: "top 100%", end: "top 55%", scrub: .6 }
				});
			gsap.fromTo(img, { scale: 1.18 }, {
				scale: 1, ease: "none",
				scrollTrigger: { trigger: card, start: "top 100%", end: "bottom 30%", scrub: true }
			});
		});

		/* ---- 4. 레슨: 영상이 카드에서 풀 사이즈로 확장 ---- */
		gsap.fromTo("[data-video]", { y: 90, scale: .9 }, {
			y: 0, scale: 1, ease: "none",
			scrollTrigger: { trigger: ".lesson", start: "top 70%", end: "top 10%", scrub: .6 }
		});
		gsap.from("[data-lesson-text] .btn", {
			y: 30, autoAlpha: 0,
			scrollTrigger: { trigger: "[data-lesson-text]", start: "top 85%", toggleActions: "play none none none" }
		});
		gsap.from("[data-lesson-text] .lead", {
			y: 30, autoAlpha: 0,
			scrollTrigger: { trigger: "[data-lesson-text]", start: "top 85%", toggleActions: "play none none none" }
		});

		/* ---- 5. 파트너: 2줄 마퀴(반대 방향) + 스크롤 속도 연동 ---- */
		var marquees = $$("[data-marquee]");
		var loops = marquees.map(function (m, i) {
			var t = $(".marquee__track", m);
			var n = t.children.length;
			t.innerHTML += t.innerHTML; // 이음새 없는 루프를 위해 복제
			for (var k = n; k < t.children.length; k++) t.children[k].setAttribute("aria-hidden", "true");
			var tw = m.dataset.dir === "-1"
				? gsap.fromTo(t, { xPercent: -50 }, { xPercent: 0, ease: "none", duration: 46, repeat: -1 })
				: gsap.to(t, { xPercent: -50, ease: "none", duration: 40, repeat: -1 });
			m.addEventListener("mouseenter", function () { gsap.to(tw, { timeScale: 0, duration: .6, overwrite: true }); });
			m.addEventListener("mouseleave", function () { gsap.to(tw, { timeScale: 1, duration: .6, overwrite: true }); });
			gsap.from(m, {
				autoAlpha: 0, y: 40, delay: i * .12,
				scrollTrigger: { trigger: m, start: "top 95%", toggleActions: "play none none none" }
			});
			return tw;
		});
		ScrollTrigger.create({
			trigger: ".partners", start: "top bottom", end: "bottom top",
			onUpdate: function (self) {
				var v = Math.min(Math.abs(self.getVelocity()) / 350, 6);
				loops.forEach(function (tw) {
					gsap.to(tw, { timeScale: 1 + v, duration: .25, overwrite: true });
					gsap.to(tw, { timeScale: 1, duration: 1.2, delay: .25, overwrite: false });
				});
			}
		});

		/* ---- 6. 인스타: 배경 패럴랙스 ---- */
		gsap.fromTo(".insta__bg", { yPercent: -9 }, {
			yPercent: 9, ease: "none",
			scrollTrigger: { trigger: ".insta", start: "top bottom", end: "bottom top", scrub: true }
		});

		/* ---- 푸터 ---- */
		$$("[data-footer-reveal]").forEach(function (el, i) {
			gsap.from(el, {
				y: 50, autoAlpha: 0, duration: 1, delay: i * .1,
				scrollTrigger: { trigger: el, start: "top 95%", toggleActions: "play none none none" }
			});
		});

		/* ---- 퀵메뉴: 로드 후 우측에서 등장 ---- */
		gsap.from(".quick__item", { x: 40, autoAlpha: 0, duration: .8, stagger: .08, delay: 1.2 });

		return function () {
			// matchMedia revert 시 마퀴 복제 노드 정리
			marquees.forEach(function (m) {
				var t = $(".marquee__track", m);
				var half = t.children.length / 2;
				while (t.children.length > half) t.removeChild(t.lastChild);
			});
		};
	});

	/* 이미지/폰트 로딩 후 위치 재계산 */
	window.addEventListener("load", function () { ScrollTrigger.refresh(); });
	if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
